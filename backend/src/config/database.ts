require("../bootstrap");

const dialect = process.env.DB_DIALECT || "mysql";

const mysqlDefineOptions =
  dialect === "mysql" || dialect === "mariadb"
    ? {
        charset: "utf8mb4",
        collate: "utf8mb4_bin"
      }
    : {};

module.exports = {
  define: mysqlDefineOptions,
  dialect,
  timezone: "-03:00",
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  logging: false
};
