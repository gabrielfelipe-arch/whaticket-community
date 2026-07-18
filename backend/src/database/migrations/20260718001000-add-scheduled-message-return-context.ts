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
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "sourceTicketId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Tickets", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await addColumnIfMissing(queryInterface, "ScheduledMessages", "returnQueueId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Queues", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await addColumnIfMissing(queryInterface, "ScheduledMessages", "returnContext", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "ScheduledMessages", "returnWindowMinutes", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1440
    });

    await addColumnIfMissing(queryInterface, "ScheduledMessages", "returnWindowExpiresAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "ScheduledMessages", "returnHandledAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("ScheduledMessages", "returnHandledAt").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "returnWindowExpiresAt").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "returnWindowMinutes").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "returnContext").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "returnQueueId").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "sourceTicketId").catch(() => {});
  }
};
