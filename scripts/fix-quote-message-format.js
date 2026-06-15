const { Client } = require("pg");

const client = new Client({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "whaticket",
  password: process.env.DB_PASS || "strongpassword",
  database: process.env.DB_NAME || "whaticket_pg"
});

const CLOCK = "\u23f1\ufe0f";
const FLEX = "Pacote flex\u00edvel ";
const BEST = "Melhor op\u00e7\u00e3o encontrada:";
const SIMULATION =
  "Simula\u00e7\u00e3o informativa: este or\u00e7amento precisa ser validado por um atendente, assim como disponibilidade, reserva e condi\u00e7\u00f5es finais.";
const MENU_2 = "Fazer uma nova simula\u00e7\u00e3o";
const MENU_3 = "Tenho outra d\u00favida";

function fixBody(value) {
  return (value || "")
    .split(/\r?\n/)
    .map(line => {
      if (line.includes("Total:") && !line.includes("Total estimado")) {
        return `${CLOCK} ${line.slice(line.indexOf("Total:"))}`;
      }
      return line;
    })
    .join("\n")
    .replace(/Composi(?:ção|Ã§Ã£o):/g, BEST)
    .replace(/Melhor op\?\?o encontrada:/g, BEST)
    .replace(/Pacote flexivel de /g, FLEX)
    .replace(/Pacote flexivel /g, FLEX)
    .replace(/Pacote flexÃ­vel de /g, FLEX)
    .replace(/Pacote flexÃ­vel /g, FLEX)
    .replace(/1\. Confirmar disponibilidade\/reserva com a equipe/g, "Confirmar disponibilidade/reserva com a equipe")
    .replace(/2\. Fazer uma nova simula(?:ção|Ã§Ã£o)/g, MENU_2)
    .replace(/3\. Tenho outra d(?:ú|Ãº)vida/g, MENU_3)
    .replace(/Simula(?:ção|Ã§Ã£o) informativa: este or(?:ç|Ã§)amento precisa ser validado por um atendente, assim como disponibilidade, reserva e condi(?:ç|Ã§)(?:õ|Ãµ)es finais\./g, SIMULATION);
}

async function main() {
  await client.connect();
  const { rows } = await client.query(`
    SELECT id, body
    FROM "Messages"
    WHERE body LIKE '%Total:%'
       OR body LIKE '%Composição:%'
       OR body LIKE '%ComposiÃ§Ã£o:%'
       OR body LIKE '%Melhor op??o%'
       OR body LIKE '%Pacote flexivel%'
       OR body LIKE '%Pacote flexÃ­vel%'
       OR body LIKE '%1. Confirmar disponibilidade%'
       OR body LIKE '%2. Fazer uma nova simula%'
       OR body LIKE '%3. Tenho outra d%'
       OR body LIKE '%SimulaÃ§Ã£o informativa%'
       OR body LIKE '%Simulação informativa%'
  `);

  let changed = 0;
  for (const row of rows) {
    const next = fixBody(row.body);
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
