import { QueryInterface, DataTypes } from "sequelize";

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  column: string,
  definition: any
) => {
  const description = (await queryInterface.describeTable(table)) as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await addColumnIfMissing(queryInterface, "Queues", "scheduledReturnWindowHours", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 24
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Queues", "scheduledReturnWindowHours").catch(() => {});
  }
};
