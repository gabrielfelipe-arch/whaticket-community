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

const upsertSetting = async (queryInterface: QueryInterface, key: string, value = "") => {
  await queryInterface.sequelize.query(
    `insert into "Settings" ("key", "value", "createdAt", "updatedAt")
     values (:key, :value, now(), now())
     on conflict ("key") do nothing`,
    { replacements: { key, value } }
  );
};

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await addColumnIfMissing(queryInterface, "QualificationFormQuestions", "glpiField", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "description"
    });

    await upsertSetting(queryInterface, "glpiAutomationMode", "manual");
    await upsertSetting(queryInterface, "glpiAutoCategoryId", "");
    await upsertSetting(queryInterface, "glpiAutoEntityId", "");
    await upsertSetting(queryInterface, "glpiAutoLocationId", "");
    await upsertSetting(queryInterface, "glpiAutoTitleTemplate", "Solicitacao WhatsApp - {{contactName}}");
    await upsertSetting(queryInterface, "glpiAutoSuccessMessage", "Sua solicitacao foi registrada com sucesso. Chamado GLPI: #{{glpiTicketNumber}}.");
    await upsertSetting(queryInterface, "glpiAutoCloseEnabled", "false");
    await upsertSetting(queryInterface, "glpiAutoCloseMessage", "Atendimento finalizado automaticamente apos abertura do chamado #{{glpiTicketNumber}}.");
    await upsertSetting(queryInterface, "glpiAutoCloseReasonId", "");
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.removeColumn("QualificationFormQuestions", "glpiField").catch(() => {});
  }
};
