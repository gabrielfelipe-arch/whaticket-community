import { QueryInterface, DataTypes } from "sequelize";

const createTableIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  definition: Record<string, any>
): Promise<void> => {
  const tables = await queryInterface.showAllTables();
  if (!tables.map(String).includes(table)) {
    await queryInterface.createTable(table, definition);
  }
};

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  column: string,
  definition: any
): Promise<void> => {
  const description = (await queryInterface.describeTable(table)) as Record<string, unknown>;
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await createTableIfMissing(queryInterface, "GlpiLocations", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      glpiId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      completeName: { type: DataTypes.STRING, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      rawData: { type: DataTypes.TEXT, allowNull: true },
      lastSyncAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });

    await addColumnIfMissing(queryInterface, "GlpiTicketLinks", "locationId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "GlpiTicketLinks", "locationName", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("GlpiTicketLinks", "locationName").catch(() => {});
    await queryInterface.removeColumn("GlpiTicketLinks", "locationId").catch(() => {});
    await queryInterface.dropTable("GlpiLocations").catch(() => {});
  }
};
