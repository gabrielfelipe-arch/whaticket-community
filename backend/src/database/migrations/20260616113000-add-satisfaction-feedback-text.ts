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
    await addColumnIfMissing(queryInterface, "SatisfactionSurveys", "collectFeedbackText", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "SatisfactionSurveys", "feedbackQuestion", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "SatisfactionSurveys", "feedbackTimeoutMinutes", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60
    });
    await addColumnIfMissing(queryInterface, "SatisfactionSurveyResponses", "feedbackText", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "SatisfactionSurveyResponses", "feedbackType", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "satisfactionFeedbackPendingAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "satisfactionFeedbackExpiresAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, "Tickets", "satisfactionFeedbackClosedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("Tickets", "satisfactionFeedbackClosedAt").catch(() => {});
    await queryInterface.removeColumn("Tickets", "satisfactionFeedbackExpiresAt").catch(() => {});
    await queryInterface.removeColumn("Tickets", "satisfactionFeedbackPendingAt").catch(() => {});
    await queryInterface.removeColumn("SatisfactionSurveyResponses", "feedbackType").catch(() => {});
    await queryInterface.removeColumn("SatisfactionSurveyResponses", "feedbackText").catch(() => {});
    await queryInterface.removeColumn("SatisfactionSurveys", "feedbackTimeoutMinutes").catch(() => {});
    await queryInterface.removeColumn("SatisfactionSurveys", "feedbackQuestion").catch(() => {});
    await queryInterface.removeColumn("SatisfactionSurveys", "collectFeedbackText").catch(() => {});
  }
};
