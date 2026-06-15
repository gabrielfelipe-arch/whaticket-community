const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const promptPath = path.resolve(__dirname, "..", "backend", "src", "database", "seed-data", "salinha_meier_prompt_mari_atualizado.txt");
  const behaviorPrompt = fs.readFileSync(promptPath, "utf8").replace(/^\uFEFF/, "").trim();
  const systemPrompt = [
    "Você é a Mari, assistente virtual da Salinha Méier.",
    "Use a base de conhecimento e ferramentas reais antes de responder assuntos comerciais.",
    "Nunca calcule valores manualmente fora do motor oficial de orçamento.",
    "Nunca confirme disponibilidade, reserva, pagamento ou recebimento; encaminhe para a equipe.",
    "Depois de orçamento, use somente o menu oficial pós-orçamento 1/2/3, sem tratar como URA obrigatória."
  ].join("\n");

  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || process.env.POSTGRES_USER || "whaticket",
    password: process.env.DB_PASS || process.env.POSTGRES_PASSWORD || "strongpassword",
    database: process.env.DB_NAME || process.env.POSTGRES_DB || "whaticket_pg"
  });

  await client.connect();
  try {
    const result = await client.query(
      `
        UPDATE "AiSettings"
        SET
          "behaviorPrompt" = $1,
          "systemPrompt" = $2,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE lower(coalesce(name, '') || ' ' || coalesce("companyName", '') || ' ' || coalesce("serviceType", '')) LIKE '%mari%'
           OR lower(coalesce(name, '') || ' ' || coalesce("companyName", '') || ' ' || coalesce("serviceType", '')) LIKE '%salinha%'
      `,
      [behaviorPrompt, systemPrompt]
    );
    console.log(`AiSettings updated: ${result.rowCount}`);
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
