import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("CommercialServices", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      aiSettingId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "AiSettings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      category: { type: DataTypes.STRING, allowNull: true },
      unitLabel: { type: DataTypes.STRING, allowNull: true },
      capacityMin: { type: DataTypes.INTEGER, allowNull: true },
      capacityMax: { type: DataTypes.INTEGER, allowNull: true },
      metadata: { type: DataTypes.TEXT, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("CommercialIncludedItems", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      commercialServiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "CommercialServices", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      label: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("CommercialPriceRules", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      commercialServiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "CommercialServices", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      name: { type: DataTypes.STRING, allowNull: false },
      code: { type: DataTypes.STRING, allowNull: true },
      ruleType: { type: DataTypes.STRING, allowNull: false },
      mode: { type: DataTypes.STRING, allowNull: true },
      quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      quantityMin: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      quantityMax: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      totalPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "BRL" },
      minCommitmentMonths: { type: DataTypes.INTEGER, allowNull: true },
      metadata: { type: DataTypes.TEXT, allowNull: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("CommercialQuoteSimulations", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      aiSettingId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "AiSettings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      commercialServiceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "CommercialServices", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "success" },
      input: { type: DataTypes.TEXT, allowNull: true },
      result: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("CommercialQuoteSimulations").catch(() => {});
    await queryInterface.dropTable("CommercialPriceRules").catch(() => {});
    await queryInterface.dropTable("CommercialIncludedItems").catch(() => {});
    await queryInterface.dropTable("CommercialServices").catch(() => {});
  }
};
