import { QueryInterface, DataTypes } from "sequelize";

export = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("Users") as Record<string, unknown>;

    if (!tableDescription.messageSignature) {
      await queryInterface.addColumn("Users", "messageSignature", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Users", "messageSignature").catch(() => {});
  }
};
