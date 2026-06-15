import fs from "fs";
import path from "path";
import { QueryInterface } from "sequelize";

interface AiSettingRow {
  id: number;
  allowedTools: string | null;
}

interface ArticleRow {
  id: number;
}

const readSeedText = (fileName: string): string => {
  const candidates = [
    path.resolve(process.cwd(), "src", "database", "seed-data", fileName),
    path.resolve(__dirname, "..", "seed-data", fileName)
  ];
  const seedPath = candidates.find(candidate => fs.existsSync(candidate));
  if (!seedPath) {
    throw new Error(`Arquivo de seed nao encontrado: ${fileName}`);
  }

  return fs.readFileSync(seedPath, "utf8").trim();
};

const parseAllowedTools = (value: string | null): string[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === "string");
    }
  } catch (err) {
    return value
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
};

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const behaviorPrompt = readSeedText("salinha_meier_prompt_mari_atualizado.txt");
    const knowledgeBase = readSeedText("salinha_meier_base_conhecimento_revisada.txt");
    const systemPrompt = [
      "Voce e a Mari, assistente virtual da Salinha Meier.",
      "Use a base de conhecimento e ferramentas reais antes de responder assuntos comerciais.",
      "Nunca calcule valores manualmente fora do motor oficial de orcamento.",
      "Nunca confirme disponibilidade, reserva, pagamento ou recebimento; encaminhe para a equipe.",
      "Depois de orcamento, use somente o menu oficial pos-orcamento 1/2/3, sem tratar como URA obrigatoria."
    ].join("\n");

    const [settings] = await queryInterface.sequelize.query(`
      SELECT id, "allowedTools"
      FROM "AiSettings"
      WHERE
        lower(coalesce("companyName", '') || ' ' || coalesce(name, '') || ' ' || coalesce("serviceType", '')) LIKE '%salinha%'
        OR lower(coalesce(name, '')) LIKE '%mari%'
      ORDER BY id
    `) as [AiSettingRow[], unknown];

    for (const setting of settings) {
      const allowedTools = Array.from(new Set([
        ...parseAllowedTools(setting.allowedTools),
        "calcularOrcamento",
        "transferirParaFila",
        "gerarResumoParaAtendente"
      ]));

      await queryInterface.sequelize.query(
        `
          UPDATE "AiSettings"
          SET
            name = 'Mari',
            "companyName" = COALESCE(NULLIF("companyName", ''), 'Salinha Meier'),
            "behaviorPrompt" = :behaviorPrompt,
            "systemPrompt" = :systemPrompt,
            "allowedTools" = :allowedTools,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = :id
        `,
        {
          replacements: {
            id: setting.id,
            behaviorPrompt,
            systemPrompt,
            allowedTools: JSON.stringify(allowedTools)
          }
        }
      );
    }

    const [articles] = await queryInterface.sequelize.query(`
      SELECT id
      FROM "KnowledgeBaseArticles"
      WHERE
        lower(coalesce(title, '') || ' ' || coalesce(tags, '')) LIKE '%salinha%'
        OR lower(coalesce(title, '') || ' ' || coalesce(tags, '')) LIKE '%meier%'
        OR lower(coalesce(title, '') || ' ' || coalesce(tags, '')) LIKE '%méier%'
      ORDER BY id
      LIMIT 1
    `) as [ArticleRow[], unknown];

    const article = articles[0];
    const activeArticleId = article?.id || null;

    if (activeArticleId) {
      await queryInterface.sequelize.query(
        `
          UPDATE "KnowledgeBaseArticles"
          SET active = false, "updatedAt" = CURRENT_TIMESTAMP
          WHERE id <> :activeArticleId
            AND (
              lower(coalesce(title, '') || ' ' || coalesce(tags, '')) LIKE '%desconto%'
              OR lower(coalesce(title, '') || ' ' || coalesce(tags, '')) LIKE '%matriz de simulacao%'
              OR lower(coalesce(title, '') || ' ' || coalesce(tags, '')) LIKE '%matriz de simulação%'
            )
        `,
        { replacements: { activeArticleId } }
      );
    }

    if (article) {
      await queryInterface.sequelize.query(
        `
          UPDATE "KnowledgeBaseArticles"
          SET
            title = 'Salinha Meier - Base de conhecimento revisada',
            content = :knowledgeBase,
            "contentHtml" = NULL,
            tags = 'salinha,meier,mari,orcamento,reserva,disponibilidade',
            active = true,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = :id
        `,
        { replacements: { id: article.id, knowledgeBase } }
      );
      return;
    }

    await queryInterface.sequelize.query(
      `
        INSERT INTO "KnowledgeBaseArticles"
          (title, content, "contentHtml", tags, active, "createdAt", "updatedAt")
        VALUES
          ('Salinha Meier - Base de conhecimento revisada', :knowledgeBase, NULL, 'salinha,meier,mari,orcamento,reserva,disponibilidade', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      { replacements: { knowledgeBase } }
    );

    await queryInterface.sequelize.query(`
      UPDATE "KnowledgeBaseArticles"
      SET active = false, "updatedAt" = CURRENT_TIMESTAMP
      WHERE lower(coalesce(title, '') || ' ' || coalesce(tags, '')) LIKE '%desconto%'
        OR lower(coalesce(title, '') || ' ' || coalesce(tags, '')) LIKE '%matriz de simulacao%'
        OR lower(coalesce(title, '') || ' ' || coalesce(tags, '')) LIKE '%matriz de simulação%'
    `);
  },

  down: async (): Promise<void> => {
    return undefined;
  }
};
