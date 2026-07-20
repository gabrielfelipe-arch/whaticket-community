import { QueryInterface } from "sequelize";

const keys = [
  "dashboard.view",
  "dashboard.view_linked_queues",
  "dashboard.view_all_queues",
  "reports.view",
  "reports.export",
  "tickets.view",
  "tickets.view_all",
  "tickets.manage",
  "tickets.delete",
  "contacts.view",
  "contacts.manage",
  "contacts.create",
  "contacts.edit",
  "contacts.delete",
  "contacts.import",
  "contacts.import_phone",
  "tags.view",
  "tags.manage",
  "tags.create",
  "tags.edit",
  "tags.delete",
  "messages.send",
  "quickAnswers.view",
  "quickAnswers.manage",
  "quickAnswers.create",
  "quickAnswers.edit",
  "quickAnswers.delete",
  "campaigns.view",
  "campaigns.manage",
  "campaigns.view_own",
  "campaigns.view_all",
  "campaigns.edit_own",
  "campaigns.edit_all",
  "campaigns.cancel_own",
  "campaigns.cancel_all",
  "campaigns.clone",
  "campaigns.pause",
  "scheduledMessages.view",
  "scheduledMessages.manage",
  "scheduledMessages.view_own",
  "scheduledMessages.view_all",
  "scheduledMessages.edit_own",
  "scheduledMessages.edit_all",
  "scheduledMessages.cancel_own",
  "scheduledMessages.cancel_all",
  "scheduledMessages.clone",
  "scheduledMessages.pause",
  "users.view",
  "users.manage",
  "users.create",
  "users.edit",
  "users.delete",
  "profiles.manage",
  "connections.view",
  "connections.manage",
  "connections.reconnect",
  "connections.create",
  "connections.edit",
  "connections.delete",
  "queues.view",
  "queues.manage",
  "queues.create",
  "queues.edit",
  "queues.delete",
  "settings.view",
  "settings.manage",
  "settings.logo",
  "settings.categories",
  "settings.categories.view",
  "settings.categories.create",
  "settings.categories.edit",
  "settings.categories.delete",
  "settings.closing_reasons",
  "settings.closing_reasons.view",
  "settings.closing_reasons.create",
  "settings.closing_reasons.edit",
  "settings.closing_reasons.delete",
  "settings.satisfaction",
  "settings.satisfaction.view",
  "settings.satisfaction.create",
  "settings.satisfaction.edit",
  "settings.satisfaction.delete",
  "settings.audit_logs",
  "settings.ura",
  "settings.ura_flows",
  "settings.ura_options",
  "settings.forms",
  "settings.form_builder",
  "settings.form_responses",
  "settings.form_reports",
  "settings.ai",
  "settings.ai_agents",
  "settings.knowledge_base",
  "settings.ai_contexts",
  "settings.ai_leads",
  "settings.ai_tools",
  "settings.ai_calendar",
  "integrations.view",
  "integrations.manage",
  "glpi.view",
  "glpi.manage",
  "glpi.sync",
  "glpi.create_ticket",
  "whatsapp_provider.view",
  "whatsapp_provider.manage",
  "whatsapp_updates.manage",
  "campaigns.manage_all",
  "messages.delete"
];

const buildPermissions = (allowed: string[]) =>
  JSON.stringify(keys.reduce((acc, key) => {
    acc[key] = allowed.includes(key);
    return acc;
  }, {} as Record<string, boolean>));

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `
      UPDATE "UserProfiles"
      SET "permissions" = :adminPermissions, "updatedAt" = NOW()
      WHERE "name" = 'Administrador'
      `,
      { replacements: { adminPermissions: buildPermissions(keys) } }
    );

    await queryInterface.sequelize.query(
      `
      UPDATE "UserProfiles"
      SET "permissions" = :supervisorPermissions, "updatedAt" = NOW()
      WHERE "name" = 'Supervisor'
      `,
      {
        replacements: {
          supervisorPermissions: buildPermissions([
            "dashboard.view",
            "dashboard.view_linked_queues",
            "reports.view",
            "tickets.view",
            "tickets.view_all",
            "tickets.manage",
            "contacts.view",
            "contacts.manage",
            "contacts.create",
            "contacts.edit",
            "contacts.delete",
            "tags.view",
            "tags.manage",
            "tags.create",
            "tags.edit",
            "tags.delete",
            "messages.send",
            "quickAnswers.view",
            "quickAnswers.manage",
            "quickAnswers.create",
            "quickAnswers.edit",
            "quickAnswers.delete",
            "campaigns.view",
            "campaigns.manage",
            "campaigns.view_own",
            "campaigns.edit_own",
            "campaigns.cancel_own",
            "campaigns.clone",
            "campaigns.pause",
            "scheduledMessages.view",
            "scheduledMessages.manage",
            "scheduledMessages.view_own",
            "scheduledMessages.edit_own",
            "scheduledMessages.cancel_own",
            "scheduledMessages.clone",
            "scheduledMessages.pause",
            "users.view",
            "users.create",
            "users.edit",
            "users.delete",
            "connections.view",
            "settings.view",
            "settings.categories",
            "settings.categories.view",
            "settings.categories.create",
            "settings.categories.edit",
            "settings.categories.delete",
            "settings.closing_reasons",
            "settings.closing_reasons.view",
            "settings.closing_reasons.create",
            "settings.closing_reasons.edit",
            "settings.closing_reasons.delete",
            "settings.satisfaction",
            "settings.satisfaction.view",
            "settings.satisfaction.create",
            "settings.satisfaction.edit",
            "settings.satisfaction.delete",
            "settings.audit_logs"
          ])
        }
      }
    );

    await queryInterface.sequelize.query(
      `
      UPDATE "UserProfiles"
      SET "permissions" = :userPermissions, "updatedAt" = NOW()
      WHERE "name" = 'Atendente'
      `,
      {
        replacements: {
          userPermissions: buildPermissions([
            "tickets.view",
            "tickets.manage",
            "contacts.view",
            "contacts.manage",
            "contacts.create",
            "contacts.edit",
            "tags.view",
            "messages.send",
            "quickAnswers.view",
            "quickAnswers.create",
            "quickAnswers.edit",
            "scheduledMessages.view",
            "scheduledMessages.manage",
            "scheduledMessages.view_own",
            "scheduledMessages.edit_own",
            "scheduledMessages.cancel_own",
            "scheduledMessages.clone",
            "scheduledMessages.pause"
          ])
        }
      }
    );
  },

  down: async () => {}
};
