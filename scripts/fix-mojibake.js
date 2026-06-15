const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const iconv = require("iconv-lite");
const { Client } = require("pg");

const suspiciousPattern = /[ÃÂâð][\u0080-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u02c6\u02dc\u2018-\u201e\u2020-\u2026\u2030\u2039\u203a\u20ac\u2122]+/g;
const hasMojibake = value => typeof value === "string" && /Ã|Â|ðŸ|â[€\u0080-\u009f]/.test(value);
const cleanupReplacements = value => {
  if (typeof value !== "string") return value;
  return value
    .replace(/SIMULAÇ�ƒO/g, "SIMULAÇÃO")
    .replace(/ALTERAÇ�ƒO/g, "ALTERAÇÃO")
    .replace(/RECOMENDAÇ�ƒO/g, "RECOMENDAÇÃO")
    .replace(/COMPARAÇ�ƒO/g, "COMPARAÇÃO")
    .replace(/REC�LCULO/g, "RECÁLCULO")
    .replace(/C�LCULO/g, "CÁLCULO")
    .replace(/REC”LCULO/g, "RECÁLCULO")
    .replace(/C”LCULO/g, "CÁLCULO")
    .replace(/NÃƒO/g, "NÃO")
    .replace(/Ã—/g, "×")
    .replace(/�\?/g, "”");
};

function decodeSegment(segment) {
  try {
    return iconv.decode(iconv.encode(segment, "win1252"), "utf8");
  } catch (_) {
    return segment;
  }
}

function fixMojibake(value) {
  if (!hasMojibake(value) && !/�/.test(value || "")) return value;

  let next = value;
  for (let i = 0; i < 3; i += 1) {
    const previous = next;
    next = next.replace(suspiciousPattern, decodeSegment);
    if (next === previous || !hasMojibake(next)) break;
  }
  return cleanupReplacements(next);
}

const contentHash = value => crypto.createHash("sha1").update(value).digest("hex");

const stripHtml = (value = "") =>
  value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r\n/g, "\n")
    .trim();

const splitLongBlock = (text, maxLength = 1600) => {
  if (text.length <= maxLength) return [text];

  const paragraphs = text.split(/\n{2,}/).map(item => item.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (`${current}\n\n${paragraph}`.trim().length > maxLength && current) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = `${current}\n\n${paragraph}`.trim();
    }
  }

  if (current) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLength)];
};

const splitArticleIntoChunks = article => {
  const source = stripHtml(article.contentHtml || article.content || "");
  const lines = source.split("\n");
  const sections = [];
  let currentSection = article.title || "Geral";
  let currentLines = [];

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (!content) return;
    for (const part of splitLongBlock(content)) {
      sections.push({ section: currentSection, content: part });
    }
    currentLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const cleanLine = line.replace(/[*_`]/g, "").trim();
    const titleLike =
      !heading &&
      line.length >= 4 &&
      line.length <= 90 &&
      !/[.!?;]$/.test(line) &&
      /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9]/.test(line) &&
      currentLines.length > 0 &&
      (
        /:$/.test(line) ||
        /^\d+(?:\.\d+)*\.\s+/.test(line) ||
        cleanLine === cleanLine.toUpperCase()
      );

    if (heading || titleLike) {
      flush();
      currentSection = (heading ? heading[2] : line).trim();
      continue;
    }

    currentLines.push(rawLine);
  }

  flush();
  return sections.length ? sections : splitLongBlock(source).map((content, index) => ({
    section: index === 0 ? article.title || "Geral" : `${article.title || "Geral"} ${index + 1}`,
    content
  }));
};

async function fixTable(client, table, idColumn, columns) {
  const quotedTable = `"${table}"`;
  const quotedId = `"${idColumn}"`;
  const selectColumns = [quotedId, ...columns.map(column => `"${column}"`)].join(", ");
  const where = columns.map(column => `"${column}" ~ 'Ã|Â|ðŸ|â[€\u0080-\u009f]'`).join(" OR ");
  const { rows } = await client.query(`SELECT ${selectColumns} FROM ${quotedTable} WHERE ${where}`);

  let changed = 0;
  for (const row of rows) {
    const updates = {};
    for (const column of columns) {
      const fixed = fixMojibake(row[column]);
      if (fixed !== row[column]) updates[column] = fixed;
    }

    const updateColumns = Object.keys(updates);
    if (!updateColumns.length) continue;

    const setSql = updateColumns.map((column, index) => `"${column}" = $${index + 1}`).join(", ");
    const values = updateColumns.map(column => updates[column]);
    values.push(row[idColumn]);
    await client.query(`UPDATE ${quotedTable} SET ${setSql} WHERE ${quotedId} = $${values.length}`, values);
    changed += 1;
  }

  console.log(`${table}: ${changed} row(s) fixed`);
}

async function rebuildKnowledgeBaseChunks(client) {
  const { rows: articles } = await client.query(`
    SELECT id, title, content, "contentHtml", tags
    FROM "KnowledgeBaseArticles"
    WHERE active = true
    ORDER BY id
  `);

  let chunkCount = 0;
  for (const article of articles) {
    const sections = splitArticleIntoChunks(article);

    await client.query(`DELETE FROM "KnowledgeBaseChunks" WHERE "articleId" = $1`, [article.id]);

    for (const section of sections) {
      const payload = [
        article.title || "",
        section.section || "",
        article.tags || "",
        section.content
      ].join("\n");

      await client.query(
        `
          INSERT INTO "KnowledgeBaseChunks"
            ("articleId", "aiSettingId", title, section, content, tags, embedding, "contentHash", active, "createdAt", "updatedAt")
          VALUES
            ($1, NULL, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [
          article.id,
          article.title,
          section.section,
          section.content,
          article.tags,
          "[]",
          contentHash(payload)
        ]
      );
      chunkCount += 1;
    }
  }

  console.log(`KnowledgeBaseChunks: ${chunkCount} regenerated chunk(s)`);
}

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const original = fs.readFileSync(filePath, "utf8");
  const fixed = fixMojibake(original);
  if (fixed !== original) {
    fs.writeFileSync(filePath, fixed, "utf8");
    console.log(`${filePath}: fixed`);
  } else {
    console.log(`${filePath}: no change`);
  }
}

async function main() {
  fixFile(path.resolve(__dirname, "..", "backend", "src", "database", "seed-data", "salinha_meier_base_conhecimento_revisada.txt"));

  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || process.env.POSTGRES_USER || "whaticket",
    password: process.env.DB_PASS || process.env.POSTGRES_PASSWORD || "strongpassword",
    database: process.env.DB_NAME || process.env.POSTGRES_DB || "whaticket_pg"
  });

  await client.connect();
  try {
    await client.query("BEGIN");
    await fixTable(client, "Messages", "id", ["body"]);
    await fixTable(client, "KnowledgeBaseArticles", "id", ["title", "content", "contentHtml"]);
    await fixTable(client, "KnowledgeBaseChunks", "id", ["title", "section", "content"]);
    await client.query(`UPDATE "Messages" SET body = replace(body, '�?��? Total:', '⏱️ Total:') WHERE body LIKE '%�?��? Total:%'`);
    await rebuildKnowledgeBaseChunks(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
