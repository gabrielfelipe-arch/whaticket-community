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
    await addColumnIfMissing(queryInterface, "UraOptions", "aiHumanHandoffEnabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "aiHumanHandoffQueueId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Queues", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "aiHumanHandoffMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "aiHumanHandoffQueueId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "aiHumanHandoffMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "aiHumanHandoffMessage").catch(() => {});
    await queryInterface.removeColumn("Tickets", "aiHumanHandoffQueueId").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiHumanHandoffMessage").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiHumanHandoffQueueId").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "aiHumanHandoffEnabled").catch(() => {});
  }
};
