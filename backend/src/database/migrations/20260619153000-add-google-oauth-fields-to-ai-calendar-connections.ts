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
    await addColumnIfMissing(queryInterface, "AiCalendarConnections", "companyId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiCalendarConnections", "createdByUserId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await addColumnIfMissing(queryInterface, "AiCalendarConnections", "googleAccountEmail", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiCalendarConnections", "calendarName", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiCalendarConnections", "accessTokenEncrypted", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiCalendarConnections", "refreshTokenEncrypted", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiCalendarConnections", "accessTokenExpiresAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiCalendarConnections", "scopes", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiCalendarConnections", "lastSyncAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiCalendarConnections", "lastError", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("AiCalendarConnections", "lastError").catch(() => {});
    await queryInterface.removeColumn("AiCalendarConnections", "lastSyncAt").catch(() => {});
    await queryInterface.removeColumn("AiCalendarConnections", "scopes").catch(() => {});
    await queryInterface.removeColumn("AiCalendarConnections", "accessTokenExpiresAt").catch(() => {});
    await queryInterface.removeColumn("AiCalendarConnections", "refreshTokenEncrypted").catch(() => {});
    await queryInterface.removeColumn("AiCalendarConnections", "accessTokenEncrypted").catch(() => {});
    await queryInterface.removeColumn("AiCalendarConnections", "calendarName").catch(() => {});
    await queryInterface.removeColumn("AiCalendarConnections", "googleAccountEmail").catch(() => {});
    await queryInterface.removeColumn("AiCalendarConnections", "createdByUserId").catch(() => {});
    await queryInterface.removeColumn("AiCalendarConnections", "companyId").catch(() => {});
  }
};
