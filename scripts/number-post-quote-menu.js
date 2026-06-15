const { Client } = require("pg");

const client = new Client({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "whaticket",
  password: process.env.DB_PASS || "strongpassword",
  database: process.env.DB_NAME || "whaticket_pg"
});

const OPTION_1 = "Confirmar disponibilidade/reserva com a equipe";
const OPTION_2 = "Fazer uma nova simula\u00e7\u00e3o";
const OPTION_3 = "Tenho outra d\u00favida";

function numberMenu(body = "") {
  return body
    .replace(new RegExp(`(^|\\n)${OPTION_1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\n)`, "g"), `$11. ${OPTION_1}`)
    .replace(new RegExp(`(^|\\n)${OPTION_2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\n)`, "g"), `$12. ${OPTION_2}`)
    .replace(new RegExp(`(^|\\n)${OPTION_3.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\n|$)`, "g"), `$13. ${OPTION_3}`);
}

async function main() {
  await client.connect();
  const { rows } = await client.query(
    `
      SELECT id, body
      FROM "Messages"
      WHERE body LIKE '%Como deseja prosseguir?%'
        AND body LIKE '%Confirmar disponibilidade/reserva com a equipe%'
    `
  );

  let changed = 0;
  for (const row of rows) {
    const next = numberMenu(row.body);
    if (next !== row.body) {
      await client.query('UPDATE "Messages" SET body = $1 WHERE id = $2', [next, row.id]);
      changed += 1;
    }
  }

  console.log(`Messages updated: ${changed}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end().catch(() => undefined));
