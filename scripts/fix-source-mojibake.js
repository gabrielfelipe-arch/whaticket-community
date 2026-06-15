const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");

const root = path.resolve(__dirname, "..", "backend", "src");
const extensions = new Set([".ts", ".js", ".txt"]);
const suspiciousPattern = /[ÃÂâð][\u0080-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u02c6\u02dc\u2018-\u201e\u2020-\u2026\u2030\u2039\u203a\u20ac\u2122]+/g;

const hasMojibake = value => /Ã|Â|ðŸ|â[€\u0080-\u009f]/.test(value);

function decodeSegment(segment) {
  try {
    return iconv.decode(iconv.encode(segment, "win1252"), "utf8");
  } catch (_) {
    return segment;
  }
}

function cleanup(value) {
  return value
    .replace(/REC�LCULO|REC”LCULO/g, "RECÁLCULO")
    .replace(/C�LCULO|C”LCULO/g, "CÁLCULO")
    .replace(/SIMULAÇ�ƒO/g, "SIMULAÇÃO")
    .replace(/ALTERAÇ�ƒO/g, "ALTERAÇÃO")
    .replace(/RECOMENDAÇ�ƒO/g, "RECOMENDAÇÃO")
    .replace(/COMPARAÇ�ƒO/g, "COMPARAÇÃO")
    .replace(/NÃƒO/g, "NÃO")
    .replace(/Ã—/g, "×")
    .replace(/�\?/g, "”");
}

function fix(value) {
  let next = value;
  for (let i = 0; i < 4; i += 1) {
    const previous = next;
    next = next.replace(suspiciousPattern, decodeSegment);
    next = cleanup(next);
    if (next === previous || !hasMojibake(next)) break;
  }
  return cleanup(next);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!extensions.has(path.extname(entry.name))) continue;

    const original = fs.readFileSync(fullPath, "utf8");
    if (!hasMojibake(original) && !original.includes("\uFFFD")) continue;

    const fixed = fix(original);
    if (fixed !== original) {
      fs.writeFileSync(fullPath, fixed, "utf8");
      console.log(path.relative(path.resolve(__dirname, ".."), fullPath));
    }
  }
}

walk(root);
