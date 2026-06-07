import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const description = (await queryInterface.describeTable("UraOptions")) as Record<string, unknown>;
    if (!description.showMainMenuAfterMessage) {
      await queryInterface.addColumn("UraOptions", "showMainMenuAfterMessage", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("UraOptions", "showMainMenuAfterMessage").catch(() => {});
  }
};
