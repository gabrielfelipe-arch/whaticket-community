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
    await queryInterface.createTable("QualificationForms", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("QualificationFormQuestions", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      formId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "QualificationForms", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      key: { type: DataTypes.STRING, allowNull: false },
      label: { type: DataTypes.TEXT, allowNull: false },
      type: { type: DataTypes.STRING, allowNull: false, defaultValue: "text" },
      options: { type: DataTypes.TEXT, allowNull: true },
      required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      includeInAiContext: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      includeInReports: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      maxInvalidAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
      order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("QualificationFormResponses", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      formId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "QualificationForms", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      queueId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Queues", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      uraOptionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "UraOptions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "in_progress" },
      currentQuestionId: { type: DataTypes.INTEGER, allowNull: true },
      invalidAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      afterAction: { type: DataTypes.STRING, allowNull: true },
      afterQueueId: { type: DataTypes.INTEGER, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await queryInterface.createTable("QualificationFormAnswers", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      responseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "QualificationFormResponses", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "QualificationFormQuestions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      key: { type: DataTypes.STRING, allowNull: false },
      label: { type: DataTypes.TEXT, allowNull: false },
      value: { type: DataTypes.TEXT, allowNull: true },
      rawValue: { type: DataTypes.TEXT, allowNull: true },
      optionLabel: { type: DataTypes.TEXT, allowNull: true },
      includeInAiContext: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      includeInReports: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    }).catch(() => {});

    await addColumnIfMissing(queryInterface, "UraOptions", "qualificationFormId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "QualificationForms", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "runQualificationFormBeforeAction", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addColumnIfMissing(queryInterface, "UraOptions", "allowQualificationFormSkip", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("UraOptions", "allowQualificationFormSkip").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "runQualificationFormBeforeAction").catch(() => {});
    await queryInterface.removeColumn("UraOptions", "qualificationFormId").catch(() => {});
    await queryInterface.dropTable("QualificationFormAnswers").catch(() => {});
    await queryInterface.dropTable("QualificationFormResponses").catch(() => {});
    await queryInterface.dropTable("QualificationFormQuestions").catch(() => {});
    await queryInterface.dropTable("QualificationForms").catch(() => {});
  }
};
