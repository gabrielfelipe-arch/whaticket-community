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

const upsertSetting = async (queryInterface: QueryInterface, key: string, value: string) => {
  await queryInterface.sequelize.query(
    `insert into "Settings" ("key", "value", "createdAt", "updatedAt")
     values (:key, :value, now(), now())
     on conflict ("key") do nothing`,
    { replacements: { key, value } }
  );
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await addColumnIfMissing(queryInterface, "Users", "operationalStatus", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "offline"
    });
    await addColumnIfMissing(queryInterface, "Users", "lastActivityAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Users", "lastStatusChangeAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Users", "statusReason", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Queues", "distributionMode", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "manual_free"
    });
    await addColumnIfMissing(queryInterface, "Queues", "maxActiveTicketsPerUser", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Queues", "balanceAction", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "ignore"
    });
    await addColumnIfMissing(queryInterface, "Queues", "overflowAction", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "keep_waiting"
    });
    await addColumnIfMissing(queryInterface, "Queues", "lastAssignedUserId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await addColumnIfMissing(queryInterface, "Queues", "sendQueuePositionMessage", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "Queues", "queuePositionMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Queues", "blockIfUserHasStalledTicket", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "Queues", "stalledTicketMinutes", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Queues", "stalledTicketAction", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "ignore"
    });

    await addColumnIfMissing(queryInterface, "Tickets", "queuePositionMessageSentAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "queueEnteredAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    const tableExists = await queryInterface
      .describeTable("QueueDistributionLogs")
      .then(() => true)
      .catch(() => false);

    if (!tableExists) {
      await queryInterface.createTable("QueueDistributionLogs", {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        ticketId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "Tickets", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        queueId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "Queues", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "Users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        action: {
          type: DataTypes.STRING,
          allowNull: false
        },
        distributionMode: {
          type: DataTypes.STRING,
          allowNull: true
        },
        attendantStatus: {
          type: DataTypes.STRING,
          allowNull: true
        },
        userActiveTickets: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      });
    }

    await upsertSetting(queryInterface, "autoAwayEnabled", "false");
    await upsertSetting(queryInterface, "autoAwayMinutes", "10");
    await upsertSetting(queryInterface, "autoLogoutEnabled", "false");
    await upsertSetting(queryInterface, "autoLogoutMinutes", "60");
    await upsertSetting(queryInterface, "warnBeforeLogoutEnabled", "true");
    await upsertSetting(queryInterface, "warnBeforeLogoutMinutes", "5");
    await upsertSetting(queryInterface, "inactivityAppliesToAdmins", "false");
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("QueueDistributionLogs").catch(() => {});
    for (const column of ["queueEnteredAt", "queuePositionMessageSentAt"]) {
      await queryInterface.removeColumn("Tickets", column).catch(() => {});
    }
    for (const column of [
      "stalledTicketAction",
      "stalledTicketMinutes",
      "blockIfUserHasStalledTicket",
      "queuePositionMessage",
      "sendQueuePositionMessage",
      "lastAssignedUserId",
      "overflowAction",
      "balanceAction",
      "maxActiveTicketsPerUser",
      "distributionMode"
    ]) {
      await queryInterface.removeColumn("Queues", column).catch(() => {});
    }
    for (const column of [
      "statusReason",
      "lastStatusChangeAt",
      "lastActivityAt",
      "operationalStatus"
    ]) {
      await queryInterface.removeColumn("Users", column).catch(() => {});
    }
  }
};
