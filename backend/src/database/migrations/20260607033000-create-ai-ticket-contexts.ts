import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("AiTicketContexts", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      summary: { type: DataTypes.TEXT, allowNull: true },
      collectedData: { type: DataTypes.TEXT, allowNull: true },
      missingData: { type: DataTypes.TEXT, allowNull: true },
      contradictions: { type: DataTypes.TEXT, allowNull: true },
      currentObjective: { type: DataTypes.TEXT, allowNull: true },
      nextQuestion: { type: DataTypes.TEXT, allowNull: true },
      lastSource: { type: DataTypes.STRING, allowNull: true },
      lastAiIntent: { type: DataTypes.STRING, allowNull: true },
      lastAiAction: { type: DataTypes.STRING, allowNull: true },
      lastAiDecisionReason: { type: DataTypes.TEXT, allowNull: true },
      lastKnowledgeIds: { type: DataTypes.TEXT, allowNull: true },
      lastUpdatedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("AiTicketContexts").catch(() => {});
  }
};
