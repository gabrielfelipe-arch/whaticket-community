import AppError from "../errors/AppError";
import User from "../models/User";
import UserProfileModel from "../models/UserProfile";

export const USER_PROFILES = ["admin", "supervisor", "user"] as const;

export type UserProfile = typeof USER_PROFILES[number];

export const normalizeProfile = (profile?: string | null): UserProfile => {
  const normalized = String(profile || "user").trim().toLowerCase();
  if (USER_PROFILES.includes(normalized as UserProfile)) {
    return normalized as UserProfile;
  }

  throw new AppError("Perfil de usuario invalido.", 400);
};

export const isAdminProfile = (profile?: string | null): boolean =>
  normalizeProfile(profile) === "admin";

export const isSupervisorProfile = (profile?: string | null): boolean =>
  normalizeProfile(profile) === "supervisor";

export const isAdminOrSupervisorProfile = (profile?: string | null): boolean =>
  ["admin", "supervisor"].includes(normalizeProfile(profile));

export const supervisorConfigResources = [
  "ticketCategories",
  "closingReasons",
  "satisfactionSurveys"
];

export const canSupervisorManageConfigResource = (resource: string): boolean =>
  supervisorConfigResources.includes(resource);

export const SPECIAL_PERMISSION_KEYS = [
  "accessUra",
  "accessForms",
  "accessAi",
  "importContactsSpreadsheet",
  "manageOtherCampaigns",
  "deleteMessages"
] as const;

export type SpecialPermissionKey = typeof SPECIAL_PERMISSION_KEYS[number];

export const PROFILE_PERMISSION_KEYS = [
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
  "scheduledMessages.view",
  "scheduledMessages.manage",
  "scheduledMessages.view_own",
  "scheduledMessages.view_all",
  "scheduledMessages.edit_own",
  "scheduledMessages.edit_all",
  "scheduledMessages.cancel_own",
  "scheduledMessages.cancel_all",
  "scheduledMessages.clone",
  "users.view",
  "users.manage",
  "users.create",
  "users.edit",
  "users.reset_password",
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
  "whatsapp_provider.view",
  "whatsapp_provider.manage",
  "whatsapp_updates.manage",
  "campaigns.manage_all",
  "messages.delete"
] as const;

export type ProfilePermissionKey = typeof PROFILE_PERMISSION_KEYS[number];

export const PROFILE_PERMISSION_GROUPS = [
  {
    key: "cadastros",
    label: "Cadastros e atendimento",
    permissions: [
      { key: "contacts.view", label: "Contatos - visualizar" },
      { key: "contacts.create", label: "Contatos - adicionar" },
      { key: "contacts.edit", label: "Contatos - editar" },
      { key: "contacts.delete", label: "Contatos - excluir" },
      { key: "contacts.import", label: "Importar contatos por planilha" },
      { key: "contacts.import_phone", label: "Importar contatos do telefone" },
      { key: "tags.view", label: "Etiquetas - visualizar" },
      { key: "tags.create", label: "Etiquetas - adicionar" },
      { key: "tags.edit", label: "Etiquetas - editar" },
      { key: "tags.delete", label: "Etiquetas - excluir" },
      { key: "quickAnswers.view", label: "Respostas rapidas - visualizar" },
      { key: "quickAnswers.create", label: "Respostas rapidas - adicionar" },
      { key: "quickAnswers.edit", label: "Respostas rapidas - editar" },
      { key: "quickAnswers.delete", label: "Respostas rapidas - excluir" }
    ]
  },
  {
    key: "automacao",
    label: "Automacao e campanhas",
    permissions: [
      { key: "campaigns.view_own", label: "Campanhas - visualizar criadas" },
      { key: "campaigns.view_all", label: "Campanhas - visualizar todas" },
      { key: "campaigns.edit_own", label: "Campanhas - editar criadas" },
      { key: "campaigns.edit_all", label: "Campanhas - editar todas" },
      { key: "campaigns.cancel_own", label: "Campanhas - cancelar criadas" },
      { key: "campaigns.cancel_all", label: "Campanhas - cancelar todas" },
      { key: "campaigns.clone", label: "Campanhas - clonar" },
      { key: "scheduledMessages.view_own", label: "Mensagens programadas - visualizar criadas" },
      { key: "scheduledMessages.view_all", label: "Mensagens programadas - visualizar todas" },
      { key: "scheduledMessages.edit_own", label: "Mensagens programadas - editar criadas" },
      { key: "scheduledMessages.edit_all", label: "Mensagens programadas - editar todas" },
      { key: "scheduledMessages.cancel_own", label: "Mensagens programadas - cancelar criadas" },
      { key: "scheduledMessages.cancel_all", label: "Mensagens programadas - cancelar todas" },
      { key: "scheduledMessages.clone", label: "Mensagens programadas - clonar" }
    ]
  },
  {
    key: "administracao",
    label: "Administracao",
    permissions: [
      { key: "dashboard.view_linked_queues", label: "Painel - filas vinculadas" },
      { key: "dashboard.view_all_queues", label: "Painel - todas as filas" },
      { key: "reports.view", label: "Ver relatorios" },
      { key: "reports.export", label: "Exportar relatorios" },
      { key: "users.view", label: "Usuarios - visualizar" },
      { key: "users.create", label: "Usuarios - criar" },
      { key: "users.edit", label: "Usuarios - editar" },
      { key: "users.reset_password", label: "Usuarios - resetar senha" },
      { key: "users.delete", label: "Usuarios - remover" },
      { key: "profiles.manage", label: "Criar e editar perfis" },
      { key: "connections.view", label: "Conexoes - visualizar" },
      { key: "connections.reconnect", label: "Conexoes - reconectar/QR" },
      { key: "connections.create", label: "Conexoes - adicionar" },
      { key: "connections.edit", label: "Conexoes - editar" },
      { key: "connections.delete", label: "Conexoes - excluir" },
      { key: "queues.view", label: "Ver filas" },
      { key: "queues.create", label: "Filas - adicionar" },
      { key: "queues.edit", label: "Filas - editar" },
      { key: "queues.delete", label: "Filas - excluir" }
    ]
  },
  {
    key: "configuracoes",
    label: "Configuracoes",
    permissions: [
      { key: "settings.view", label: "Ver configuracoes" },
      { key: "settings.manage", label: "Configurar parametros gerais" },
      { key: "settings.logo", label: "Alterar/remover logo" },
      { key: "settings.categories.view", label: "Categorias - visualizar" },
      { key: "settings.categories.create", label: "Categorias - adicionar" },
      { key: "settings.categories.edit", label: "Categorias - editar" },
      { key: "settings.categories.delete", label: "Categorias - excluir" },
      { key: "settings.closing_reasons.view", label: "Motivos - visualizar" },
      { key: "settings.closing_reasons.create", label: "Motivos - adicionar" },
      { key: "settings.closing_reasons.edit", label: "Motivos - editar" },
      { key: "settings.closing_reasons.delete", label: "Motivos - excluir" },
      { key: "settings.satisfaction.view", label: "Pesquisa - visualizar" },
      { key: "settings.satisfaction.create", label: "Pesquisa - adicionar" },
      { key: "settings.satisfaction.edit", label: "Pesquisa - editar" },
      { key: "settings.satisfaction.delete", label: "Pesquisa - excluir" },
      { key: "settings.audit_logs", label: "Ver logs de auditoria" },
      { key: "settings.ura", label: "Acessar grupo URA" },
      { key: "settings.ura_flows", label: "Configurar fluxos da URA" },
      { key: "settings.ura_options", label: "Configurar opcoes da URA" },
      { key: "settings.forms", label: "Acessar grupo Formularios" },
      { key: "settings.form_builder", label: "Configurar formularios e perguntas" },
      { key: "settings.form_responses", label: "Ver respostas dos formularios" },
      { key: "settings.form_reports", label: "Ver relatorio dos formularios" },
      { key: "settings.ai", label: "Acessar grupo IA" },
      { key: "settings.ai_agents", label: "Configurar agentes de IA" },
      { key: "settings.knowledge_base", label: "Configurar base de conhecimento" },
      { key: "settings.ai_contexts", label: "Ver memoria curta da IA" },
      { key: "settings.ai_leads", label: "Ver leads da IA" },
      { key: "settings.ai_tools", label: "Ver execucoes de ferramentas" },
      { key: "settings.ai_calendar", label: "Configurar conexoes de agenda da IA" }
    ]
  },
  {
    key: "integracoes",
    label: "Integracoes e sistema",
    permissions: [
      { key: "glpi.view", label: "Ver GLPI" },
      { key: "glpi.manage", label: "Configurar GLPI" },
      { key: "glpi.sync", label: "Sincronizar dados do GLPI" },
      { key: "whatsapp_provider.view", label: "Ver provedor WhatsApp" },
      { key: "whatsapp_provider.manage", label: "Configurar provedor WhatsApp" },
      { key: "whatsapp_updates.manage", label: "Atualizar/rollback WhatsApp Web" }
    ]
  }
] as const;

const emptyProfilePermissions = (): Record<ProfilePermissionKey, boolean> =>
  PROFILE_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as Record<ProfilePermissionKey, boolean>);

export const parseProfilePermissions = (
  value?: string | Record<string, unknown> | null
): Record<ProfilePermissionKey, boolean> => {
  const permissions = emptyProfilePermissions();

  if (!value) return permissions;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object") return permissions;

    PROFILE_PERMISSION_KEYS.forEach(key => {
      permissions[key] = parsed[key] === true;
    });
  } catch (err) {
    return permissions;
  }

  return permissions;
};

export const serializeProfilePermissions = (
  value?: Record<string, unknown> | string | null
): string => JSON.stringify(parseProfilePermissions(value));

export const parseSpecialPermissions = (value?: string | null): Record<SpecialPermissionKey, boolean> => {
  const permissions = SPECIAL_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as Record<SpecialPermissionKey, boolean>);

  if (!value) return permissions;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object") return permissions;

    SPECIAL_PERMISSION_KEYS.forEach(key => {
      permissions[key] = parsed[key] === true;
    });
  } catch (err) {
    return permissions;
  }

  return permissions;
};

export const serializeSpecialPermissions = (value?: Record<string, unknown> | string | null): string => {
  const source = typeof value === "string" ? parseSpecialPermissions(value) : value || {};
  const normalized = SPECIAL_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = source[key] === true;
    return acc;
  }, {} as Record<SpecialPermissionKey, boolean>);

  return JSON.stringify(normalized);
};

export const userHasSpecialPermission = (
  user: Pick<User, "profile" | "specialPermissions">,
  permission: SpecialPermissionKey
): boolean => {
  if (isAdminProfile(user.profile)) return true;
  return parseSpecialPermissions(user.specialPermissions)[permission] === true;
};

const applyLegacyPermissions = (
  permissions: Record<ProfilePermissionKey, boolean>,
  user: Pick<User, "profile" | "specialPermissions">
) => {
  const specialPermissions = parseSpecialPermissions(user.specialPermissions);

  if (specialPermissions.accessUra) permissions["settings.ura"] = true;
  if (specialPermissions.accessUra) permissions["settings.ura_flows"] = true;
  if (specialPermissions.accessUra) permissions["settings.ura_options"] = true;
  if (specialPermissions.accessForms) permissions["settings.forms"] = true;
  if (specialPermissions.accessForms) permissions["settings.form_builder"] = true;
  if (specialPermissions.accessForms) permissions["settings.form_responses"] = true;
  if (specialPermissions.accessForms) permissions["settings.form_reports"] = true;
  if (specialPermissions.accessAi) permissions["settings.ai"] = true;
  if (specialPermissions.accessAi) permissions["settings.ai_agents"] = true;
  if (specialPermissions.accessAi) permissions["settings.knowledge_base"] = true;
  if (specialPermissions.accessAi) permissions["settings.ai_contexts"] = true;
  if (specialPermissions.accessAi) permissions["settings.ai_leads"] = true;
  if (specialPermissions.accessAi) permissions["settings.ai_tools"] = true;
  if (specialPermissions.accessAi) permissions["settings.ai_calendar"] = true;
  if (
    specialPermissions.accessUra ||
    specialPermissions.accessForms ||
    specialPermissions.accessAi
  ) {
    permissions["settings.view"] = true;
  }
  if (specialPermissions.importContactsSpreadsheet) permissions["contacts.import"] = true;
  if (specialPermissions.manageOtherCampaigns) permissions["campaigns.manage_all"] = true;
  if (specialPermissions.deleteMessages) permissions["messages.delete"] = true;
};

const applyPermissionAliases = (permissions: Record<ProfilePermissionKey, boolean>) => {
  if (permissions["contacts.create"] || permissions["contacts.edit"] || permissions["contacts.delete"]) {
    permissions["contacts.manage"] = true;
  }

  if (permissions["quickAnswers.create"] || permissions["quickAnswers.edit"] || permissions["quickAnswers.delete"]) {
    permissions["quickAnswers.manage"] = true;
  }

  if (permissions["users.create"] || permissions["users.edit"] || permissions["users.reset_password"] || permissions["users.delete"]) {
    permissions["users.manage"] = true;
  }

  if (permissions["dashboard.view_linked_queues"] || permissions["dashboard.view_all_queues"]) {
    permissions["dashboard.view"] = true;
  }

  if (permissions["queues.create"] || permissions["queues.edit"] || permissions["queues.delete"]) {
    permissions["queues.manage"] = true;
    permissions["queues.view"] = true;
  }

  if (permissions["tags.create"] || permissions["tags.edit"] || permissions["tags.delete"]) {
    permissions["tags.manage"] = true;
    permissions["tags.view"] = true;
  }

  if (
    permissions["settings.categories.view"] ||
    permissions["settings.categories.create"] ||
    permissions["settings.categories.edit"] ||
    permissions["settings.categories.delete"]
  ) {
    permissions["settings.categories"] = true;
    permissions["settings.view"] = true;
  }

  if (
    permissions["settings.closing_reasons.view"] ||
    permissions["settings.closing_reasons.create"] ||
    permissions["settings.closing_reasons.edit"] ||
    permissions["settings.closing_reasons.delete"]
  ) {
    permissions["settings.closing_reasons"] = true;
    permissions["settings.view"] = true;
  }

  if (
    permissions["settings.satisfaction.view"] ||
    permissions["settings.satisfaction.create"] ||
    permissions["settings.satisfaction.edit"] ||
    permissions["settings.satisfaction.delete"]
  ) {
    permissions["settings.satisfaction"] = true;
    permissions["settings.view"] = true;
  }

  if (
    permissions["connections.reconnect"] ||
    permissions["connections.create"] ||
    permissions["connections.edit"] ||
    permissions["connections.delete"]
  ) {
    permissions["connections.manage"] = true;
    permissions["connections.view"] = true;
  }

  if (permissions["campaigns.view_own"] || permissions["campaigns.view_all"]) {
    permissions["campaigns.view"] = true;
  }
  if (
    permissions["campaigns.edit_own"] ||
    permissions["campaigns.edit_all"] ||
    permissions["campaigns.cancel_own"] ||
    permissions["campaigns.cancel_all"] ||
    permissions["campaigns.clone"]
  ) {
    permissions["campaigns.manage"] = true;
    permissions["campaigns.view"] = true;
  }
  if (permissions["campaigns.view_all"] || permissions["campaigns.edit_all"] || permissions["campaigns.cancel_all"]) {
    permissions["campaigns.manage_all"] = true;
  }

  if (permissions["scheduledMessages.view_own"] || permissions["scheduledMessages.view_all"]) {
    permissions["scheduledMessages.view"] = true;
  }
  if (
    permissions["scheduledMessages.edit_own"] ||
    permissions["scheduledMessages.edit_all"] ||
    permissions["scheduledMessages.cancel_own"] ||
    permissions["scheduledMessages.cancel_all"] ||
    permissions["scheduledMessages.clone"]
  ) {
    permissions["scheduledMessages.manage"] = true;
    permissions["scheduledMessages.view"] = true;
  }
  if (
    permissions["scheduledMessages.view_all"] ||
    permissions["scheduledMessages.edit_all"] ||
    permissions["scheduledMessages.cancel_all"]
  ) {
    permissions["campaigns.manage_all"] = true;
  }

  if (permissions["glpi.manage"] || permissions["glpi.sync"]) {
    permissions["glpi.view"] = true;
  }

  if (permissions["whatsapp_provider.manage"] || permissions["whatsapp_updates.manage"]) {
    permissions["whatsapp_provider.view"] = true;
  }

  if (permissions["glpi.view"] || permissions["whatsapp_provider.view"]) {
    permissions["integrations.view"] = true;
  }
};

export const getEffectivePermissions = (
  user: User & { accessProfile?: UserProfileModel }
): Record<ProfilePermissionKey, boolean> => {
  const permissions = parseProfilePermissions(user.accessProfile?.permissions);

  if (isAdminProfile(user.profile)) {
    PROFILE_PERMISSION_KEYS.forEach(key => {
      permissions[key] = true;
    });
    return permissions;
  }

  if (isSupervisorProfile(user.profile)) {
    permissions["dashboard.view"] = true;
    permissions["dashboard.view_linked_queues"] = true;
    permissions["tickets.view"] = true;
    permissions["tickets.view_all"] = true;
    permissions["contacts.view"] = true;
    permissions["contacts.manage"] = true;
    permissions["contacts.create"] = true;
    permissions["contacts.edit"] = true;
    permissions["contacts.delete"] = true;
    permissions["tags.view"] = true;
    permissions["tags.manage"] = true;
    permissions["tags.create"] = true;
    permissions["tags.edit"] = true;
    permissions["tags.delete"] = true;
    permissions["quickAnswers.view"] = true;
    permissions["quickAnswers.manage"] = true;
    permissions["quickAnswers.create"] = true;
    permissions["quickAnswers.edit"] = true;
    permissions["quickAnswers.delete"] = true;
    permissions["campaigns.view"] = true;
    permissions["campaigns.view_own"] = true;
    permissions["campaigns.edit_own"] = true;
    permissions["campaigns.cancel_own"] = true;
    permissions["campaigns.clone"] = true;
    permissions["campaigns.manage"] = true;
    permissions["scheduledMessages.view"] = true;
    permissions["scheduledMessages.view_own"] = true;
    permissions["scheduledMessages.edit_own"] = true;
    permissions["scheduledMessages.cancel_own"] = true;
    permissions["scheduledMessages.clone"] = true;
    permissions["scheduledMessages.manage"] = true;
    permissions["users.view"] = true;
    permissions["users.create"] = true;
    permissions["users.edit"] = true;
    permissions["users.reset_password"] = true;
    permissions["users.delete"] = true;
    permissions["connections.view"] = true;
    permissions["settings.view"] = true;
    permissions["settings.categories"] = true;
    permissions["settings.categories.view"] = true;
    permissions["settings.categories.create"] = true;
    permissions["settings.categories.edit"] = true;
    permissions["settings.categories.delete"] = true;
    permissions["settings.closing_reasons"] = true;
    permissions["settings.closing_reasons.view"] = true;
    permissions["settings.closing_reasons.create"] = true;
    permissions["settings.closing_reasons.edit"] = true;
    permissions["settings.closing_reasons.delete"] = true;
    permissions["settings.satisfaction"] = true;
    permissions["settings.satisfaction.view"] = true;
    permissions["settings.satisfaction.create"] = true;
    permissions["settings.satisfaction.edit"] = true;
    permissions["settings.satisfaction.delete"] = true;
    permissions["settings.audit_logs"] = true;
    permissions["reports.view"] = true;
  }

  permissions["tickets.view"] = permissions["tickets.view"] || isAdminOrSupervisorProfile(user.profile) || user.profile === "user";
  permissions["contacts.view"] = permissions["contacts.view"] || user.profile === "user";
  permissions["messages.send"] = permissions["messages.send"] || user.profile === "user";
  applyLegacyPermissions(permissions, user);
  applyPermissionAliases(permissions);

  return permissions;
};

export const userHasPermission = (
  user: User & { accessProfile?: UserProfileModel },
  permission: ProfilePermissionKey
): boolean => getEffectivePermissions(user)[permission] === true;

export const requestUserHasPermission = async (
  userId: string | number,
  permission: ProfilePermissionKey
): Promise<boolean> => {
  const user = await User.findByPk(userId, {
    attributes: ["id", "profile", "specialPermissions", "profileId"],
    include: [{ model: UserProfileModel, as: "accessProfile" }]
  });

  if (!user) return false;
  return userHasPermission(user, permission);
};

export const requestUserHasSpecialPermission = async (
  userId: string | number,
  permission: SpecialPermissionKey
): Promise<boolean> => {
  const user = await User.findByPk(userId, {
    attributes: ["id", "profile", "specialPermissions"]
  });

  if (!user) return false;
  return userHasSpecialPermission(user, permission);
};

export const canManageResourceBySpecialPermission = async (
  userId: string | number,
  resource: string
): Promise<boolean> => {
  const resourceProfilePermissionMap: Record<string, ProfilePermissionKey> = {
    ticketCategories: "settings.categories",
    closingReasons: "settings.closing_reasons",
    satisfactionSurveys: "settings.satisfaction",
    tags: "tags.manage",
    uraFlows: "settings.ura_flows",
    uraOptions: "settings.ura_options",
    aiSettings: "settings.ai_agents",
    knowledgeBaseArticles: "settings.knowledge_base",
    aiTicketContexts: "settings.ai_contexts",
    aiLeads: "settings.ai_leads",
    aiCalendarConnections: "settings.ai_calendar",
    aiToolExecutions: "settings.ai_tools",
    qualificationForms: "settings.form_builder",
    qualificationFormQuestions: "settings.form_builder",
    qualificationFormResponses: "settings.form_responses",
    qualificationFormAnswers: "settings.form_reports"
  };

  const profilePermission = resourceProfilePermissionMap[resource];
  if (profilePermission && await requestUserHasPermission(userId, profilePermission)) return true;

  const legacyPermissionMap: Record<string, SpecialPermissionKey> = {
    uraFlows: "accessUra",
    uraOptions: "accessUra",
    aiSettings: "accessAi",
    knowledgeBaseArticles: "accessAi",
    aiTicketContexts: "accessAi",
    aiLeads: "accessAi",
    aiCalendarConnections: "accessAi",
    aiToolExecutions: "accessAi",
    qualificationForms: "accessForms",
    qualificationFormQuestions: "accessForms",
    qualificationFormResponses: "accessForms",
    qualificationFormAnswers: "accessForms"
  };

  const legacyPermission = legacyPermissionMap[resource];
  if (!legacyPermission) return false;
  return requestUserHasSpecialPermission(userId, legacyPermission);
};
