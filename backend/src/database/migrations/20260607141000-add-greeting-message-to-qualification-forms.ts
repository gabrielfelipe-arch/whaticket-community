import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const description = (await queryInterface.describeTable("QualificationForms")) as Record<string, unknown>;
    if (!description.greetingMessage) {
      await queryInterface.addColumn("QualificationForms", "greetingMessage", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("QualificationForms", "greetingMessage").catch(() => {});
  }
};
