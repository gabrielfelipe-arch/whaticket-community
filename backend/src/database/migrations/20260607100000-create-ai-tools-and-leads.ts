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

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("AiLeads", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      ticketId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Tickets", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      contactId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Contacts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      whatsappId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Whatsapps", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      queueId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Queues", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      aiSettingId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "AiSettings", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "novo" },
      source: { type: DataTypes.STRING, allowNull: false, defaultValue: "ai" },
      summary: { type: DataTypes.TEXT, allowNull: true },
      collectedData: { type: DataTypes.TEXT, allowNull: true },
      tagIds: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("AiCalendarConnections", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      provider: { type: DataTypes.STRING, allowNull: false },
      calendarId: { type: DataTypes.STRING, allowNull: true },
      userPrincipalName: { type: DataTypes.STRING, allowNull: true },
      accessToken: { type: DataTypes.TEXT, allowNull: true },
      refreshToken: { type: DataTypes.TEXT, allowNull: true },
      tokenExpiresAt: { type: DataTypes.DATE, allowNull: true },
      timezone: { type: DataTypes.STRING, allowNull: false, defaultValue: "America/Sao_Paulo" },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("AiToolExecutions", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      ticketId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Tickets", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      aiSettingId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "AiSettings", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      toolName: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false },
      input: { type: DataTypes.TEXT, allowNull: true },
      output: { type: DataTypes.TEXT, allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      executedAt: { type: DataTypes.DATE, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await addColumnIfMissing(queryInterface, "AiSettings", "allowedTools", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "AiSettings", "allowedTransferQueueIds", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "AiSettings", "calendarConnectionId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "AiCalendarConnections", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("AiSettings", "calendarConnectionId").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "allowedTransferQueueIds").catch(() => {});
    await queryInterface.removeColumn("AiSettings", "allowedTools").catch(() => {});
    await queryInterface.dropTable("AiToolExecutions").catch(() => {});
    await queryInterface.dropTable("AiCalendarConnections").catch(() => {});
    await queryInterface.dropTable("AiLeads").catch(() => {});
  }
};
