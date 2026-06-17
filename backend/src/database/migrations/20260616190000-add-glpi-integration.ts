import { QueryInterface, DataTypes } from "sequelize";

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

const upsertSetting = async (queryInterface: QueryInterface, key: string, value = "") => {
  await queryInterface.sequelize.query(
    `insert into "Settings" ("key", "value", "createdAt", "updatedAt")
     values (:key, :value, now(), now())
     on conflict ("key") do nothing`,
    { replacements: { key, value } }
  );
};

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await addColumnIfMissing(queryInterface, "Queues", "glpiEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await upsertSetting(queryInterface, "glpiApiMode", "legacy");
    await upsertSetting(queryInterface, "glpiAllowMultipleTickets", "false");
    await upsertSetting(queryInterface, "glpiAutoCreateEnabled", "false");
    await upsertSetting(queryInterface, "glpiTimeoutMs", "15000");
    await upsertSetting(queryInterface, "glpiBaseWebUrl", "");

    await createTableIfMissing(queryInterface, "GlpiEntities", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      glpiId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      completeName: { type: DataTypes.STRING, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      rawData: { type: DataTypes.TEXT, allowNull: true },
      lastSyncAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await createTableIfMissing(queryInterface, "GlpiCategories", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      glpiId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      completeName: { type: DataTypes.STRING, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      rawData: { type: DataTypes.TEXT, allowNull: true },
      lastSyncAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await createTableIfMissing(queryInterface, "GlpiTicketLinks", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      glpiTicketId: { type: DataTypes.INTEGER, allowNull: false },
      glpiTicketNumber: { type: DataTypes.STRING, allowNull: true },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      entityId: { type: DataTypes.INTEGER, allowNull: false },
      entityName: { type: DataTypes.STRING, allowNull: true },
      categoryId: { type: DataTypes.INTEGER, allowNull: false },
      categoryName: { type: DataTypes.STRING, allowNull: true },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      descriptionMode: { type: DataTypes.STRING, allowNull: false, defaultValue: "manual" },
      selectedMessageIds: { type: DataTypes.TEXT, allowNull: true },
      glpiUrl: { type: DataTypes.STRING, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "created" },
      rawResponse: { type: DataTypes.TEXT, allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await createTableIfMissing(queryInterface, "GlpiLogs", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      action: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: true },
      ticketId: { type: DataTypes.INTEGER, allowNull: true },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      payload: { type: DataTypes.TEXT, allowNull: true },
      response: { type: DataTypes.TEXT, allowNull: true },
      error: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("GlpiLogs").catch(() => {});
    await queryInterface.dropTable("GlpiTicketLinks").catch(() => {});
    await queryInterface.dropTable("GlpiCategories").catch(() => {});
    await queryInterface.dropTable("GlpiEntities").catch(() => {});
    await queryInterface.removeColumn("Queues", "glpiEnabled").catch(() => {});
  }
};
