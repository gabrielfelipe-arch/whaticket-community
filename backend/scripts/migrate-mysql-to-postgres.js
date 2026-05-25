const mysql = require("mysql2/promise");
const { Client } = require("pg");

const tableOrder = [
  "Settings",
  "Users",
  "Contacts",
  "Whatsapps",
  "Queues",
  "TicketCategories",
  "ClosingReasons",
  "UraFlows",
  "AiSettings",
  "KnowledgeBaseArticles",
  "Tags",
  "QuickAnswers",
  "UraOptions",
  "UserQueues",
  "WhatsappQueues",
  "ContactCustomFields",
  "ContactTags",
  "Tickets",
  "Messages",
  "WppKeys",
  "Campaigns",
  "CampaignContacts",
  "ScheduledMessages",
  "AiTaggerHistories",
  "SatisfactionSurveys",
  "SatisfactionSurveyResponses",
  "AuditLogs"
];

const mysqlConfig = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3307),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASS || "strongpassword",
  database: process.env.MYSQL_DATABASE || "whaticket",
  dateStrings: false
};

const pgConfig = {
  host: process.env.PGHOST || process.env.POSTGRES_HOST || "127.0.0.1",
  port: Number(process.env.PGPORT || process.env.POSTGRES_PORT || 55432),
  user: process.env.PGUSER || process.env.POSTGRES_USER || "whaticket",
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || "strongpassword",
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || "whaticket_pg"
};

function quotePg(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function quoteMysql(identifier) {
  return `\`${identifier.replace(/`/g, "``")}\``;
}

function normalizeBoolean(value) {
  if (value === null || value === undefined) return value;
  if (Buffer.isBuffer(value)) return value[0] === 1;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return ["1", "true", "t", "yes", "sim"].includes(value.toLowerCase());
  }
  return Boolean(value);
}

async function getPgTables(pg) {
  const result = await pg.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `);
  return result.rows.map(row => row.table_name);
}

async function getMysqlTables(mysqlConn) {
  const [rows] = await mysqlConn.query("show tables");
  return rows.map(row => Object.values(row)[0]);
}

async function getPgColumns(pg, table) {
  const result = await pg.query(
    `
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
      order by ordinal_position
    `,
    [table]
  );
  return result.rows;
}

async function getMysqlColumns(mysqlConn, table) {
  const [rows] = await mysqlConn.query(`show columns from ${quoteMysql(table)}`);
  return rows.map(row => row.Field);
}

async function truncatePgTables(pg, tables) {
  if (!tables.length) return;
  const sql = `truncate table ${tables.map(quotePg).join(", ")} restart identity cascade`;
  await pg.query(sql);
}

async function fetchRows(mysqlConn, table, columns) {
  const mysqlColumns = columns.map(quoteMysql).join(", ");
  const orderBy = columns.includes("id") ? " order by `id`" : "";
  const [rows] = await mysqlConn.query(
    `select ${mysqlColumns} from ${quoteMysql(table)}${orderBy}`
  );
  return rows;
}

async function insertRows(pg, table, columns, rows, booleanColumns) {
  if (!rows.length) return;

  const batchSize = Math.max(1, Math.min(500, Math.floor(60000 / columns.length)));
  const insertColumns = columns.map(quotePg).join(", ");

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const values = [];
    const placeholders = batch.map((row, rowIndex) => {
      const rowPlaceholders = columns.map((column, columnIndex) => {
        let value = row[column];
        if (booleanColumns.has(column)) {
          value = normalizeBoolean(value);
        }
        values.push(value);
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });
      return `(${rowPlaceholders.join(", ")})`;
    });

    await pg.query(
      `insert into ${quotePg(table)} (${insertColumns}) values ${placeholders.join(", ")}`,
      values
    );
  }
}

async function resetSequences(pg) {
  const result = await pg.query(`
    select
      table_name,
      column_name,
      pg_get_serial_sequence(format('%I.%I', 'public', table_name), column_name) as sequence_name
    from information_schema.columns
    where table_schema = 'public'
      and column_default like 'nextval%'
    order by table_name, column_name
  `);

  for (const row of result.rows) {
    const sequenceName = row.sequence_name;
    if (!sequenceName) continue;

    await pg.query(
      `
        select setval(
          $1::regclass,
          coalesce((select max(${quotePg(row.column_name)}) from ${quotePg(row.table_name)}), 0) + 1,
          false
        )
      `,
      [sequenceName]
    );
  }
}

async function main() {
  const mysqlConn = await mysql.createConnection(mysqlConfig);
  const pg = new Client(pgConfig);
  await pg.connect();

  try {
    const [mysqlTables, pgTables] = await Promise.all([
      getMysqlTables(mysqlConn),
      getPgTables(pg)
    ]);
    const mysqlTableSet = new Set(mysqlTables);
    const pgTableSet = new Set(pgTables);
    const tables = tableOrder.filter(
      table => table !== "SequelizeMeta" && mysqlTableSet.has(table) && pgTableSet.has(table)
    );
    const missingInPg = mysqlTables.filter(table => table !== "SequelizeMeta" && !pgTableSet.has(table));
    const missingInMysql = pgTables.filter(
      table => table !== "SequelizeMeta" && !mysqlTableSet.has(table)
    );

    if (missingInPg.length || missingInMysql.length) {
      console.log("Table differences:");
      if (missingInPg.length) console.log(`  Missing in PostgreSQL: ${missingInPg.join(", ")}`);
      if (missingInMysql.length) console.log(`  Missing in MariaDB: ${missingInMysql.join(", ")}`);
    }

    await pg.query("begin");
    await pg.query("set session_replication_role = replica");
    await truncatePgTables(pg, tables);

    for (const table of tables) {
      const [pgColumns, mysqlColumns] = await Promise.all([
        getPgColumns(pg, table),
        getMysqlColumns(mysqlConn, table)
      ]);
      const mysqlColumnSet = new Set(mysqlColumns);
      const columns = pgColumns
        .map(column => column.column_name)
        .filter(column => mysqlColumnSet.has(column));
      const booleanColumns = new Set(
        pgColumns
          .filter(column => column.data_type === "boolean")
          .map(column => column.column_name)
      );
      const rows = await fetchRows(mysqlConn, table, columns);
      await insertRows(pg, table, columns, rows, booleanColumns);
      console.log(`${table}: ${rows.length}`);
    }

    await resetSequences(pg);
    await pg.query("set session_replication_role = DEFAULT");
    await pg.query("commit");
  } catch (error) {
    await pg.query("rollback").catch(() => {});
    throw error;
  } finally {
    await mysqlConn.end();
    await pg.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
