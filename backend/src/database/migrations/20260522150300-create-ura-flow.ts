import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("UraFlows", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      welcomeMessage: { type: DataTypes.TEXT, allowNull: false },
      invalidOptionMessage: { type: DataTypes.TEXT, allowNull: true },
      maxInvalidAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
      fallbackQueueId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Queues", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("UraOptions", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      flowId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "UraFlows", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      optionKey: { type: DataTypes.STRING, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      responseMessage: { type: DataTypes.TEXT, allowNull: true },
      action: { type: DataTypes.STRING, allowNull: false, defaultValue: "SEND_MESSAGE" },
      showMainMenuAfterMessage: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      targetQueueId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "Queues", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.addColumn("Whatsapps", "uraFlowId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "UraFlows", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Whatsapps", "uraFlowId").catch(() => {});
    await queryInterface.dropTable("UraOptions").catch(() => {});
    await queryInterface.dropTable("UraFlows").catch(() => {});
  }
};
