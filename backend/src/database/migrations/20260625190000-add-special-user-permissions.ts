import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Users", "specialPermissions", {
      type: DataTypes.TEXT,
      allowNull: true
    }).catch(() => {});

    await queryInterface.addColumn("Campaigns", "userId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});

    await queryInterface.addColumn("ScheduledMessages", "userId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("ScheduledMessages", "userId").catch(() => {});
    await queryInterface.removeColumn("Campaigns", "userId").catch(() => {});
    await queryInterface.removeColumn("Users", "specialPermissions").catch(() => {});
  }
};
