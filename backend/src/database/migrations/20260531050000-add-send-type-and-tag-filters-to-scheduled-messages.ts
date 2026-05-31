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
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "sendType", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "scheduled"
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "tagIds", {
      type: DataTypes.JSONB,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "excludeTagIds", {
      type: DataTypes.JSONB,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "tagAppliedLastDays", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("ScheduledMessages", "tagAppliedLastDays").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "excludeTagIds").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "tagIds").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "sendType").catch(() => {});
  }
};
