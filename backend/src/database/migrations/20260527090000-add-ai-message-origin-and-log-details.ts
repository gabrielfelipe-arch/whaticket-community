import { QueryInterface, DataTypes } from "sequelize";

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
    await addColumnIfMissing(queryInterface, "Messages", "senderType", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "Messages", "aiSessionStartedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiInteractionLogs", "intent", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiInteractionLogs", "action", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiInteractionLogs", "decisionReason", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiInteractionLogs", "userMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiInteractionLogs", "aiResponse", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiInteractionLogs", "knowledgeIds", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiInteractionLogs", "knowledgeTitles", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiInteractionLogs", "knowledgeScores", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, "AiInteractionLogs", "contextMessageCount", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("AiInteractionLogs", "contextMessageCount").catch(() => {});
    await queryInterface.removeColumn("AiInteractionLogs", "knowledgeScores").catch(() => {});
    await queryInterface.removeColumn("AiInteractionLogs", "knowledgeTitles").catch(() => {});
    await queryInterface.removeColumn("AiInteractionLogs", "knowledgeIds").catch(() => {});
    await queryInterface.removeColumn("AiInteractionLogs", "aiResponse").catch(() => {});
    await queryInterface.removeColumn("AiInteractionLogs", "userMessage").catch(() => {});
    await queryInterface.removeColumn("AiInteractionLogs", "decisionReason").catch(() => {});
    await queryInterface.removeColumn("AiInteractionLogs", "action").catch(() => {});
    await queryInterface.removeColumn("AiInteractionLogs", "intent").catch(() => {});
    await queryInterface.removeColumn("Messages", "aiSessionStartedAt").catch(() => {});
    await queryInterface.removeColumn("Messages", "senderType").catch(() => {});
  }
};
