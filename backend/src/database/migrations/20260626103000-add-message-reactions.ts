import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const table = await queryInterface.describeTable("Messages") as Record<string, unknown>;

    if (!table.reactions) {
      await queryInterface.addColumn("Messages", "reactions", {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      });
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("Messages", "reactions").catch(() => {});
  }
};
