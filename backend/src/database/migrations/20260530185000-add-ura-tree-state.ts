import { QueryInterface, DataTypes } from "sequelize";

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  column: string,
  definition: any
) => {
  const description = (await queryInterface.describeTable(table)) as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await addColumnIfMissing(queryInterface, "UraOptions", "parentOptionId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "UraOptions", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await addColumnIfMissing(queryInterface, "Tickets", "currentUraOptionId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "UraOptions", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await addColumnIfMissing(queryInterface, "Tickets", "uraInvalidAttempts", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await addColumnIfMissing(queryInterface, "Tickets", "uraActive", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, "Tickets", "lastUraInteractionAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "lastUraInteractionAt").catch(() => {});
    await queryInterface.removeColumn("Tickets", "uraActive").catch(() => {});
    await queryInterface.removeColumn("Tickets", "uraInvalidAttempts").catch(() => {});
    await queryInterface.removeColumn("Tickets", "currentUraOptionId").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "parentOptionId").catch(() => {});
  }
};
