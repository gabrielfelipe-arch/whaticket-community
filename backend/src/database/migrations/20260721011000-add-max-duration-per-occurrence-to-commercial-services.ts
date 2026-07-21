import { QueryInterface, DataTypes } from "sequelize";

const table = "CommercialServices";
const column = "maxDurationPerOccurrence";

const hasColumn = async (queryInterface: QueryInterface): Promise<boolean> => {
  const description = await queryInterface.describeTable(table);
  return Boolean((description as any)[column]);
};

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    if (!(await hasColumn(queryInterface))) {
      await queryInterface.addColumn(table, column, {
        type: DataTypes.INTEGER,
        allowNull: true
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE "${table}"
      SET "${column}" = 10
      WHERE "slug" = 'salinha-meier-aluguel-sala'
        AND "${column}" IS NULL
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    if (await hasColumn(queryInterface)) {
      await queryInterface.removeColumn(table, column);
    }
  }
};
