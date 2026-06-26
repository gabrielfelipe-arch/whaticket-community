import AppError from "../errors/AppError";
import User from "../models/User";

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
  const resourcePermissionMap: Record<string, SpecialPermissionKey> = {
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

  const permission = resourcePermissionMap[resource];
  if (!permission) return false;
  return requestUserHasSpecialPermission(userId, permission);
};
