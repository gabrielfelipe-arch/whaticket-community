import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const table = await queryInterface.describeTable("QuickAnswers") as Record<string, unknown>;

    if (!table.userId) {
      await queryInterface.addColumn("QuickAnswers", "userId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("QuickAnswers", "userId").catch(() => {});
  }
};
