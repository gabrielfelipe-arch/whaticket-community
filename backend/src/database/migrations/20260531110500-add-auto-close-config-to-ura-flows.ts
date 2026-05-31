import { QueryInterface, DataTypes } from "sequelize";

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  column: string,
  definition: any
) => {
  const description = await queryInterface.describeTable(table) as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await addColumnIfMissing(queryInterface, "UraFlows", "aiAutoCloseEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "UraFlows", "aiAutoCloseMinutes", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "UraFlows", "aiAutoCloseMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "UraFlows", "aiAutoCloseReasonId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "UraFlows", "aiAutoCloseOnlyIfNotHandedOff", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("UraFlows", "aiAutoCloseOnlyIfNotHandedOff").catch(() => {});
    await queryInterface.removeColumn("UraFlows", "aiAutoCloseReasonId").catch(() => {});
    await queryInterface.removeColumn("UraFlows", "aiAutoCloseMessage").catch(() => {});
    await queryInterface.removeColumn("UraFlows", "aiAutoCloseMinutes").catch(() => {});
    await queryInterface.removeColumn("UraFlows", "aiAutoCloseEnabled").catch(() => {});
  }
};
