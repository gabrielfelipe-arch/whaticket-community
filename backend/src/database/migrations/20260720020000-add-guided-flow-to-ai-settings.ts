import { QueryInterface, DataTypes } from "sequelize";

const table = "AiSettings";

const hasColumn = async (queryInterface: QueryInterface, column: string): Promise<boolean> => {
  const description = await queryInterface.describeTable(table);
  return Boolean((description as any)[column]);
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    if (!(await hasColumn(queryInterface, "useGuidedFlow"))) {
      await queryInterface.addColumn(table, "useGuidedFlow", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!(await hasColumn(queryInterface, "guidedFlowKey"))) {
      await queryInterface.addColumn(table, "guidedFlowKey", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE "${table}"
      SET "useGuidedFlow" = true,
          "guidedFlowKey" = 'room_rental_people_days_hours'
      WHERE COALESCE("allowedTools", '') LIKE '%calcularOrcamento%'
        AND COALESCE("guidedFlowKey", '') = ''
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    if (await hasColumn(queryInterface, "guidedFlowKey")) {
      await queryInterface.removeColumn(table, "guidedFlowKey");
    }

    if (await hasColumn(queryInterface, "useGuidedFlow")) {
      await queryInterface.removeColumn(table, "useGuidedFlow");
    }
  }
};
