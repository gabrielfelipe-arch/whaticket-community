import { Request, Response } from "express";
import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Setting from "../models/Setting";
import Whatsapp from "../models/Whatsapp";
import GlpiConfiguration from "../models/GlpiConfiguration";
import GlpiConfigurationWhatsapp from "../models/GlpiConfigurationWhatsapp";
import GlpiCategory from "../models/GlpiCategory";
import GlpiEntity from "../models/GlpiEntity";
import GlpiLocation from "../models/GlpiLocation";
import GlpiLog from "../models/GlpiLog";
import GlpiTicketLink from "../models/GlpiTicketLink";
import Ticket from "../models/Ticket";
import Queue from "../models/Queue";
import User from "../models/User";
import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import TestGlpiConnectionService from "../services/GlpiServices/TestGlpiConnectionService";
import SyncGlpiCatalogService from "../services/GlpiServices/SyncGlpiCatalogService";
import CreateGlpiTicketService from "../services/GlpiServices/CreateGlpiTicketService";
import { getGlpiConfigurationByWhatsapp, getGlpiSettings, getGlpiSettingsByConfigurationId, isMaskedSecret, maskSecret } from "../services/GlpiServices/GlpiClientService";
import { assertUserCanAccessTicket } from "../helpers/TicketAccess";

const configKeys = [
  "glpiEnabled",
  "glpiApiUrl",
  "glpiBaseWebUrl",
  "glpiAppToken",
  "glpiUserToken",
  "glpiAllowMultipleTickets",
  "glpiAutoCreateEnabled",
  "glpiAutomationMode",
  "glpiAutoCategoryId",
  "glpiAutoEntityId",
  "glpiAutoLocationId",
  "glpiAllowedFormCategoryIds",
  "glpiAutoTitleTemplate",
  "glpiAutoSuccessMessage",
  "glpiRequireConfirmationBeforeCreate",
  "glpiAutoCloseEnabled",
  "glpiAutoCloseMessage",
  "glpiAutoCloseReasonId",
  "glpiAllowedFormEntityIds",
  "glpiAllowedFormLocationIds",
  "glpiEntityLocationRules",
  "glpiEntityCategoryRules",
  "glpiTimeoutMs",
  "glpiApiMode"
];

const requireAdmin = (req: Request): void => {
  if (req.user.profile !== "admin") throw new AppError("ERR_NO_PERMISSION", 403);
};

const parseConfigurationSettings = (configuration?: GlpiConfiguration | null): Record<string, string> => {
  try {
    return configuration?.settings ? JSON.parse(configuration.settings) : {};
  } catch (error) {
    return {};
  }
};

const maskConfigSecrets = (data: Record<string, string>): Record<string, string> => {
  const masked = { ...data };
  ["glpiAppToken", "glpiUserToken"].forEach(key => {
    if (masked[key]) masked[key] = maskSecret(masked[key]);
  });
  return masked;
};

const getConfigurationIdFromRequest = (req: Request): number | null => {
  const id = Number(req.query.configurationId || req.body.configurationId || 0);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getConfigurationForRequest = async (req: Request): Promise<GlpiConfiguration | null> => {
  const id = getConfigurationIdFromRequest(req);
  if (id) return GlpiConfiguration.findByPk(id);
  return GlpiConfiguration.findOne({ where: { active: true }, order: [["id", "ASC"]] });
};

export const listConfigurations = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const rows = await GlpiConfiguration.findAll({
    where: { active: true },
    include: [{
      model: GlpiConfigurationWhatsapp,
      include: [{ model: Whatsapp, attributes: ["id", "name", "status"] }]
    }],
    order: [["name", "ASC"], ["id", "ASC"]]
  });

  return res.json(rows.map(row => ({
    id: row.id,
    name: row.name,
    active: row.active,
    whatsappIds: (row.whatsappLinks || []).map(link => link.whatsappId),
    whatsapps: (row.whatsappLinks || []).map(link => link.whatsapp).filter(Boolean)
  })));
};

export const createConfiguration = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const name = String(req.body.name || "").trim() || "Nova configuracao GLPI";
  const configuration = await GlpiConfiguration.create({
    name,
    active: true,
    settings: "{}"
  });
  return res.status(201).json({ id: configuration.id, name: configuration.name, whatsappIds: [] });
};

export const deleteConfiguration = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const configurationId = Number(req.params.configurationId || 0);
  if (!Number.isInteger(configurationId) || configurationId <= 0) {
    throw new AppError("Configuracao GLPI invalida.", 400);
  }

  const configuration = await GlpiConfiguration.findByPk(configurationId);
  if (!configuration || !configuration.active) {
    throw new AppError("Configuracao GLPI nao encontrada.", 404);
  }

  await GlpiConfigurationWhatsapp.destroy({ where: { glpiConfigurationId: configurationId } });
  await GlpiEntity.destroy({ where: { glpiConfigurationId: configurationId } });
  await GlpiCategory.destroy({ where: { glpiConfigurationId: configurationId } });
  await GlpiLocation.destroy({ where: { glpiConfigurationId: configurationId } });
  await configuration.update({ active: false });

  return res.json({ ok: true });
};

const updateConfigurationWhatsapps = async (configurationId: number, whatsappIds: number[]): Promise<void> => {
  const ids = Array.from(new Set(
    whatsappIds
      .map(item => Number(item))
      .filter(item => Number.isInteger(item) && item > 0)
  ));
  const conflict = await GlpiConfigurationWhatsapp.findOne({
    where: {
      whatsappId: { [Op.in]: ids.length ? ids : [0] },
      glpiConfigurationId: { [Op.ne]: configurationId }
    }
  });
  if (conflict) {
    const whatsapp = await Whatsapp.findByPk(conflict.whatsappId);
    throw new AppError(`A conexao ${whatsapp?.name || conflict.whatsappId} ja esta vinculada a outra configuracao GLPI.`, 400);
  }

  await GlpiConfigurationWhatsapp.destroy({ where: { glpiConfigurationId: configurationId } });
  if (ids.length) {
    await GlpiConfigurationWhatsapp.bulkCreate(ids.map(whatsappId => ({
      glpiConfigurationId: configurationId,
      whatsappId
    } as any)));
  }
};

export const config = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const configuration = await getConfigurationForRequest(req);
  if (configuration) {
    const links = await GlpiConfigurationWhatsapp.findAll({ where: { glpiConfigurationId: configuration.id } });
    return res.json({
      ...maskConfigSecrets(parseConfigurationSettings(configuration)),
      configurationId: configuration.id,
      glpiConfigurationName: configuration.name,
      whatsappIds: links.map(link => link.whatsappId)
    });
  }

  const settings = await Setting.findAll({ where: { key: configKeys } });
  const data: Record<string, string> = {};
  settings.forEach(setting => {
    data[setting.key] = ["glpiAppToken", "glpiUserToken"].includes(setting.key)
      ? maskSecret(setting.value || "")
      : setting.value || "";
  });

  return res.json(data);
};

export const updateConfig = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);

  const requestedAutomationMode = String(req.body.glpiAutomationMode || "");
  if (["automatic", "hybrid"].includes(requestedAutomationMode)) {
    req.body.glpiAutoCreateEnabled = "true";
  }
  req.body.glpiAllowedFormEntityIds = "";

  const autoEntityId = Number(req.body.glpiAutoEntityId || 0);
  const autoLocationId = Number(req.body.glpiAutoLocationId || 0);
  if (autoEntityId && autoLocationId) {
    const configurationId = getConfigurationIdFromRequest(req);
    const location = await GlpiLocation.findOne({
      where: { glpiId: autoLocationId, active: true, ...(configurationId ? { glpiConfigurationId: configurationId } : {}) }
    });

    if (location && Number(location.entityId) !== autoEntityId) {
      throw new AppError("A localizacao padrao selecionada nao pertence a entidade padrao.", 400);
    }
  }

  const configuration = await getConfigurationForRequest(req);
  if (configuration) {
    const current = parseConfigurationSettings(configuration);
    const next = { ...current };
    for (const key of configKeys) {
      if (req.body[key] === undefined) continue;
      const value = String(req.body[key] || "");
      if (
        ["glpiAppToken", "glpiUserToken"].includes(key) &&
        (value.includes("...") || value === "********")
      ) {
        continue;
      }
      next[key] = value;
    }
    const name = String(req.body.glpiConfigurationName || req.body.name || configuration.name || "").trim();
    await configuration.update({
      name: name || configuration.name,
      settings: JSON.stringify(next)
    });
    if (Array.isArray(req.body.whatsappIds)) {
      await updateConfigurationWhatsapps(configuration.id, req.body.whatsappIds);
    }
    return res.json({ ok: true });
  }

  for (const key of configKeys) {
    if (req.body[key] === undefined) continue;
    const value = String(req.body[key] || "");
    if (
      ["glpiAppToken", "glpiUserToken"].includes(key) &&
      (value.includes("...") || value === "********")
    ) {
      continue;
    }
    await UpdateSettingService({ key, value });
  }

  return res.json({ ok: true });
};

export const testConnection = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const configurationId = getConfigurationIdFromRequest(req);
  const userId = Number(req.user.id);
  const result = await TestGlpiConnectionService(userId, configurationId);
  const [entitiesSync, categoriesSync, locationsSync] = await Promise.all([
    SyncGlpiCatalogService("entities", userId, configurationId),
    SyncGlpiCatalogService("categories", userId, configurationId),
    SyncGlpiCatalogService("locations", userId, configurationId)
  ]);

  return res.json({
    ...result,
    synced: {
      entities: entitiesSync.count,
      categories: categoriesSync.count,
      locations: locationsSync.count
    }
  });
};

export const syncEntities = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const result = await SyncGlpiCatalogService("entities", Number(req.user.id), getConfigurationIdFromRequest(req));
  return res.json(result);
};

export const syncCategories = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const result = await SyncGlpiCatalogService("categories", Number(req.user.id), getConfigurationIdFromRequest(req));
  return res.json(result);
};

export const syncLocations = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const result = await SyncGlpiCatalogService("locations", Number(req.user.id), getConfigurationIdFromRequest(req));
  return res.json(result);
};

export const listEntities = async (req: Request, res: Response): Promise<Response> => {
  const search = String(req.query.search || "").trim();
  const configurationId = getConfigurationIdFromRequest(req);
  const rows = await GlpiEntity.findAll({
    where: {
      active: true,
      ...(configurationId ? { glpiConfigurationId: configurationId } : {}),
      ...(search ? { [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { completeName: { [Op.iLike]: `%${search}%` } }] } : {})
    },
    order: [["completeName", "ASC"], ["name", "ASC"]],
    limit: 1000
  });
  return res.json(rows);
};

export const listCategories = async (req: Request, res: Response): Promise<Response> => {
  const search = String(req.query.search || "").trim();
  const configurationId = getConfigurationIdFromRequest(req);
  const rows = await GlpiCategory.findAll({
    where: {
      active: true,
      ...(configurationId ? { glpiConfigurationId: configurationId } : {}),
      ...(search ? { [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { completeName: { [Op.iLike]: `%${search}%` } }] } : {})
    },
    order: [["completeName", "ASC"], ["name", "ASC"]],
    limit: 1000
  });
  return res.json(rows);
};

export const listLocations = async (req: Request, res: Response): Promise<Response> => {
  const search = String(req.query.search || "").trim();
  const hasEntityFilter = req.query.entityId !== undefined && String(req.query.entityId) !== "";
  const entityId = hasEntityFilter ? Number(req.query.entityId) : null;
  const configurationId = getConfigurationIdFromRequest(req);
  const rows = await GlpiLocation.findAll({
    where: {
      active: true,
      ...(configurationId ? { glpiConfigurationId: configurationId } : {}),
      ...(hasEntityFilter ? { entityId } : {}),
      ...(search ? { [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { completeName: { [Op.iLike]: `%${search}%` } }] } : {})
    },
    order: [["completeName", "ASC"], ["name", "ASC"]],
    limit: 1000
  });
  return res.json(rows);
};

export const ticketStatus = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  await assertUserCanAccessTicket(req.user.id, req.user.profile, ticketId);
  const ticket = await Ticket.findByPk(ticketId, { include: [{ model: Queue, as: "queue" }] });
  if (!ticket) throw new AppError("Atendimento nao encontrado.", 404);
  const configuration = await getGlpiConfigurationByWhatsapp(ticket.whatsappId);
  const configurationId = configuration?.id || null;
  const settings = configurationId ? await getGlpiSettingsByConfigurationId(configurationId) : await getGlpiSettings();
  const glpiUser = await User.findByPk(req.user.id, {
    attributes: ["id", "glpiEnabled", "glpiUserToken"]
  });

  const links = await GlpiTicketLink.findAll({
    where: { ticketId },
    order: [["createdAt", "DESC"]]
  });
  const catalogScope: Record<string, number> = configurationId ? { glpiConfigurationId: configurationId } : {};
  const entitiesCount = await GlpiEntity.count({ where: { active: true, ...catalogScope } });
  const categoriesCount = await GlpiCategory.count({ where: { active: true, ...catalogScope } });
  const locationsCount = await GlpiLocation.count({ where: { active: true, ...catalogScope } });
  const hasUserToken = !!glpiUser?.glpiEnabled && !!glpiUser?.glpiUserToken && !isMaskedSecret(glpiUser.glpiUserToken);
  const configValid = settings.enabled && !!settings.apiUrl && hasUserToken && entitiesCount > 0 && categoriesCount > 0;
  const hasAnyGlpiQueue = !ticket.queue
    ? await Queue.count({ where: { glpiEnabled: true } })
    : 0;
  const queueEnabled = Boolean(ticket.queue?.glpiEnabled || (!ticket.queue && hasAnyGlpiQueue > 0));
  const canCreate = Boolean(
    configValid &&
    settings.automationMode !== "automatic" &&
    ticket.status === "open" &&
    queueEnabled &&
    (settings.allowMultipleTickets || links.length === 0)
  );

  return res.json({
    enabled: settings.enabled,
    configValid,
    queueEnabled,
    canCreate,
    allowMultipleTickets: settings.allowMultipleTickets,
    automationMode: settings.automationMode,
    configurationId,
    hasLinkedTicket: links.length > 0,
    links,
    locationsCount,
    reasons: {
      notOpen: ticket.status !== "open",
      queueDisabled: !queueEnabled,
      missingToken: !hasUserToken,
      userGlpiDisabled: !glpiUser?.glpiEnabled,
      missingCatalog: entitiesCount === 0 || categoriesCount === 0,
      multipleBlocked: links.length > 0 && !settings.allowMultipleTickets
    }
  });
};

export const createTicket = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  await assertUserCanAccessTicket(req.user.id, req.user.profile, ticketId);
  const link = await CreateGlpiTicketService({
    ticketId: Number(ticketId),
    userId: Number(req.user.id),
    title: req.body.title,
    description: req.body.description,
    entityId: Number(req.body.entityId),
    categoryId: Number(req.body.categoryId),
    locationId: req.body.locationId ? Number(req.body.locationId) : null,
    descriptionMode: req.body.descriptionMode,
    selectedMessageIds: Array.isArray(req.body.selectedMessageIds) ? req.body.selectedMessageIds : [],
    forceCreate: req.body.forceCreate === true
  });

  return res.status(201).json(link);
};

export const logs = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const rows = await GlpiLog.findAll({ order: [["createdAt", "DESC"]], limit: 100 });
  return res.json(rows);
};
