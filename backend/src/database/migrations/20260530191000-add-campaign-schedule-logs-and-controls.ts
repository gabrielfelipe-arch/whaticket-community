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
    await addColumnIfMissing(queryInterface, "Campaigns", "startedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Campaigns", "pausedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Campaigns", "canceledAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Campaigns", "completedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "CampaignContacts", "lastAttemptAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "CampaignContacts", "errorAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "CampaignContacts", "providerResponse", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "CampaignContacts", "messageId", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "CampaignContacts", "lockedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.createTable("CampaignRecipientLogs", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      campaignId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Campaigns", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      campaignContactId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "CampaignContacts", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      contactId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Contacts", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      whatsappId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Whatsapps", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      phoneNumber: { type: DataTypes.STRING, allowNull: true },
      message: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
      attemptNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      attemptedAt: { type: DataTypes.DATE, allowNull: true },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      errorAt: { type: DataTypes.DATE, allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      providerResponse: { type: DataTypes.TEXT, allowNull: true },
      messageId: { type: DataTypes.STRING, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await addColumnIfMissing(queryInterface, "ScheduledMessages", "recurrenceType", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "weekdays", {
      type: DataTypes.JSONB,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "times", {
      type: DataTypes.JSONB,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "startsAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "endsAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "lastRunAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "ScheduledMessages", "canceledAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.createTable("ScheduledMessageExecutions", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      scheduleId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "ScheduledMessages", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      contactId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Contacts", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      whatsappId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Whatsapps", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      scheduledFor: { type: DataTypes.DATE, allowNull: true },
      executedAt: { type: DataTypes.DATE, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      messageId: { type: DataTypes.STRING, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ScheduledMessageExecutions").catch(() => {});
    await queryInterface.dropTable("CampaignRecipientLogs").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "canceledAt").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "lastRunAt").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "endsAt").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "startsAt").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "times").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "weekdays").catch(() => {});
    await queryInterface.removeColumn("ScheduledMessages", "recurrenceType").catch(() => {});
    await queryInterface.removeColumn("CampaignContacts", "lockedAt").catch(() => {});
    await queryInterface.removeColumn("CampaignContacts", "messageId").catch(() => {});
    await queryInterface.removeColumn("CampaignContacts", "providerResponse").catch(() => {});
    await queryInterface.removeColumn("CampaignContacts", "errorAt").catch(() => {});
    await queryInterface.removeColumn("CampaignContacts", "lastAttemptAt").catch(() => {});
    await queryInterface.removeColumn("Campaigns", "completedAt").catch(() => {});
    await queryInterface.removeColumn("Campaigns", "canceledAt").catch(() => {});
    await queryInterface.removeColumn("Campaigns", "pausedAt").catch(() => {});
    await queryInterface.removeColumn("Campaigns", "startedAt").catch(() => {});
  }
};
