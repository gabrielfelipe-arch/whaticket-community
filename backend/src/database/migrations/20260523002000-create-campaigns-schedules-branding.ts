import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("Campaigns", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      audience: { type: DataTypes.STRING, allowNull: false, defaultValue: "contacts" },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft" },
      intervalSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
      pauseAfter: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 20 },
      pauseSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 300 },
      whatsappId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Whatsapps", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("CampaignContacts", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      campaignId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Campaigns", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      contactId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Contacts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      nextRunAt: { type: DataTypes.DATE, allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("ScheduledMessages", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      contactId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "Contacts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      whatsappId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Whatsapps", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      message: { type: DataTypes.TEXT, allowNull: false },
      scheduledAt: { type: DataTypes.DATE, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.bulkInsert("Settings", [
      { key: "brandName", value: "Rocket Service", createdAt: new Date(), updatedAt: new Date() },
      { key: "brandLogo", value: "", createdAt: new Date(), updatedAt: new Date() },
      { key: "primaryColor", value: "#2576d2", createdAt: new Date(), updatedAt: new Date() },
      { key: "secondaryColor", value: "#f50057", createdAt: new Date(), updatedAt: new Date() }
    ], {}).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ScheduledMessages").catch(() => {});
    await queryInterface.dropTable("CampaignContacts").catch(() => {});
    await queryInterface.dropTable("Campaigns").catch(() => {});
    await queryInterface.bulkDelete("Settings", {
      key: ["brandName", "brandLogo", "primaryColor", "secondaryColor"]
    }).catch(() => {});
  }
};
