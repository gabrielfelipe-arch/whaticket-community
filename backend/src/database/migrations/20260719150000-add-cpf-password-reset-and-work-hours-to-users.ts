import { QueryInterface, DataTypes } from "sequelize";

const addColumnIfMissing = async (queryInterface: QueryInterface, table: string, column: string, definition: any) => {
  const tableDescription = await queryInterface.describeTable(table) as Record<string, unknown>;
  if (!tableDescription[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

export = {
  up: async (queryInterface: QueryInterface) => {
    await addColumnIfMissing(queryInterface, "Users", "cpf", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Users", "mustChangePassword", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, "Users", "workHours", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Users", "birthDate", {
      type: DataTypes.DATEONLY,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Users", "jobTitle", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Users", "messageSignature", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn("Users", "email", {
      type: DataTypes.STRING,
      allowNull: true
    }).catch(() => {});

    await queryInterface.addIndex("Users", ["cpf"], {
      unique: true,
      name: "Users_cpf_unique"
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("Users", "Users_cpf_unique").catch(() => {});
    await queryInterface.removeColumn("Users", "workHours").catch(() => {});
    await queryInterface.removeColumn("Users", "birthDate").catch(() => {});
    await queryInterface.removeColumn("Users", "jobTitle").catch(() => {});
    await queryInterface.removeColumn("Users", "messageSignature").catch(() => {});
    await queryInterface.removeColumn("Users", "mustChangePassword").catch(() => {});
    await queryInterface.removeColumn("Users", "cpf").catch(() => {});
  }
};
