import { QueryInterface, DataTypes } from "sequelize";

async function addColumnIfMissing(
  queryInterface: QueryInterface,
  table: string,
  column: string,
  definition: any
) {
  const description = await queryInterface.describeTable(table) as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await addColumnIfMissing(queryInterface, "UraOptions", "aiAutoCloseEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "aiAutoCloseMinutes", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "aiAutoCloseMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "aiAutoCloseReasonId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "aiAutoCloseOnlyIfNotHandedOff", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await addColumnIfMissing(queryInterface, "Tickets", "aiAutoCloseEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "Tickets", "aiAutoCloseMinutes", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "aiAutoCloseMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "aiAutoCloseReasonId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "aiAutoCloseOnlyIfNotHandedOff", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "aiAutoCloseOnlyIfNotHandedOff").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiAutoCloseReasonId").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiAutoCloseMessage").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiAutoCloseMinutes").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiAutoCloseEnabled").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiAutoCloseOnlyIfNotHandedOff").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiAutoCloseReasonId").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiAutoCloseMessage").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiAutoCloseMinutes").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiAutoCloseEnabled").catch(() => {});
  }
};
