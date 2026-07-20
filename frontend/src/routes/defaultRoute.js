export const getDefaultRoute = user => {
  const permissions = user?.permissions || {};
  const isAdmin = user?.profile === "admin";
  const isSupervisor = user?.profile === "supervisor";
  const hasPermission = key => permissions[key] === true;

  if (hasPermission("tickets.view") || user?.profile === "user") return "/tickets";
  if (hasPermission("dashboard.view") || isAdmin || isSupervisor) return "/";
  if (hasPermission("contacts.view")) return "/contacts";
  if (hasPermission("quickAnswers.view")) return "/quickAnswers";
  if (hasPermission("scheduledMessages.view") || hasPermission("campaigns.view")) return "/campaigns-schedules";
  if (hasPermission("connections.view")) return "/connections";
  if (hasPermission("integrations.view") || hasPermission("glpi.view") || hasPermission("whatsapp_provider.view")) return "/integrations";
  if (hasPermission("queues.view")) return "/queues";
  if (hasPermission("users.view")) return "/users";
  if (hasPermission("profiles.manage")) return "/profiles";
  if (
    hasPermission("settings.view") ||
    hasPermission("settings.manage") ||
    hasPermission("settings.categories") ||
    hasPermission("settings.categories.view") ||
    hasPermission("settings.closing_reasons") ||
    hasPermission("settings.closing_reasons.view") ||
    hasPermission("settings.satisfaction") ||
    hasPermission("settings.satisfaction.view") ||
    hasPermission("tags.view") ||
    user?.specialPermissions?.accessUra ||
    user?.specialPermissions?.accessForms ||
    user?.specialPermissions?.accessAi
  ) {
    return "/settings";
  }

  return "/tickets";
};
