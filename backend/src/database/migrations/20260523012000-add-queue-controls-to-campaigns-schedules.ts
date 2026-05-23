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
    await addColumnIfMissing(queryInterface, "Campaigns", "intervalPattern", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "ScheduledMessages", "batchId", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "sequence", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "nextRunAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "intervalSeconds", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "intervalPattern", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "pauseAfter", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "pauseSeconds", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 300
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Campaigns", "intervalPattern").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "batchId").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "sequence").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "nextRunAt").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "intervalSeconds").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "intervalPattern").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "pauseAfter").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "pauseSeconds").catch(() => {});
  }
};
