import { QueryInterface, DataTypes } from "sequelize";

const createTableIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  definition: Record<string, any>
): Promise<void> => {
  const tables = await queryInterface.showAllTables();
  if (!tables.map(String).includes(table)) {
    await queryInterface.createTable(table, definition);
  }
};

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  column: string,
  definition: any
): Promise<void> => {
  const description = (await queryInterface.describeTable(table)) as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

const configKeys = [
  "glpiEnabled",
  "glpiApiMode",
  "glpiApiUrl",
  "glpiBaseWebUrl",
  "glpiAppToken",
  "glpiUserToken",
  "glpiAllowMultipleTickets",
  "glpiAutoCreateEnabled",
  "glpiAutomationMode",
  "glpiAutoCategoryId",
  "glpiAutoEntityId",
  "glpiAutoLocationId",
  "glpiAllowedFormEntityIds",
  "glpiAllowedFormLocationIds",
  "glpiEntityLocationRules",
  "glpiAutoTitleTemplate",
  "glpiAutoSuccessMessage",
  "glpiRequireConfirmationBeforeCreate",
  "glpiAutoCloseEnabled",
  "glpiAutoCloseMessage",
  "glpiAutoCloseReasonId",
  "glpiTimeoutMs"
];

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await createTableIfMissing(queryInterface, "GlpiConfigurations", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      settings: { type: DataTypes.TEXT, allowNull: false, defaultValue: "{}" },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await createTableIfMissing(queryInterface, "GlpiConfigurationWhatsapps", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      glpiConfigurationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "GlpiConfigurations", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await queryInterface.addIndex("GlpiConfigurationWhatsapps", ["whatsappId"], {
      unique: true,
      name: "GlpiConfigurationWhatsapps_whatsappId_unique"
    }).catch(() => {});

    for (const table of ["GlpiEntities", "GlpiCategories", "GlpiLocations"]) {
      await addColumnIfMissing(queryInterface, table, "glpiConfigurationId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "GlpiConfigurations", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      });
      await queryInterface.sequelize.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_glpiId_key"`).catch(() => {});
      await queryInterface.addIndex(table, ["glpiConfigurationId", "glpiId"], {
        unique: true,
        name: `${table}_configuration_glpiId_unique`
      }).catch(() => {});
    }

    const [existing] = await queryInterface.sequelize.query('SELECT id FROM "GlpiConfigurations" ORDER BY id ASC LIMIT 1');
    let configurationId = (existing as any[])[0]?.id;

    if (!configurationId) {
      const [settingsRows] = await queryInterface.sequelize.query(
        'SELECT "key", "value" FROM "Settings" WHERE "key" IN (:keys)',
        { replacements: { keys: configKeys } }
      );
      const settings = (settingsRows as any[]).reduce((acc, row) => {
        acc[row.key] = row.value || "";
        return acc;
      }, {} as Record<string, string>);

      await queryInterface.bulkInsert("GlpiConfigurations", [{
        name: "GLPI Padrao",
        active: true,
        settings: JSON.stringify(settings),
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      const [created] = await queryInterface.sequelize.query('SELECT id FROM "GlpiConfigurations" ORDER BY id ASC LIMIT 1');
      configurationId = (created as any[])[0]?.id;
    }

    if (configurationId) {
      for (const table of ["GlpiEntities", "GlpiCategories", "GlpiLocations"]) {
        await queryInterface.sequelize.query(
          `UPDATE "${table}" SET "glpiConfigurationId" = :configurationId WHERE "glpiConfigurationId" IS NULL`,
          { replacements: { configurationId } }
        );
      }
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    for (const table of ["GlpiEntities", "GlpiCategories", "GlpiLocations"]) {
      await queryInterface.removeColumn(table, "glpiConfigurationId").catch(() => {});
    }
    await queryInterface.dropTable("GlpiConfigurationWhatsapps").catch(() => {});
    await queryInterface.dropTable("GlpiConfigurations").catch(() => {});
  }
};
