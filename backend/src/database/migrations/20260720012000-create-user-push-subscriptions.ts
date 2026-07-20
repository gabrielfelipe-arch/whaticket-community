import { QueryInterface, DataTypes } from "sequelize";

export = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    const hasTable = tables.map(String).includes("UserPushSubscriptions");

    if (hasTable) return;

    await queryInterface.createTable("UserPushSubscriptions", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      endpoint: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      p256dh: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      auth: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      lastSeenAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
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

    await queryInterface.addIndex("UserPushSubscriptions", ["userId"]);
    await queryInterface.addIndex("UserPushSubscriptions", ["endpoint"], {
      unique: true,
      name: "user_push_subscriptions_endpoint_unique"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("UserPushSubscriptions").catch(() => {});
  }
};
