import { Request, Response } from "express";
import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Setting from "../models/Setting";
import GlpiCategory from "../models/GlpiCategory";
import GlpiEntity from "../models/GlpiEntity";
import GlpiLocation from "../models/GlpiLocation";
import GlpiLog from "../models/GlpiLog";
import GlpiTicketLink from "../models/GlpiTicketLink";
import Ticket from "../models/Ticket";
import Queue from "../models/Queue";
import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import TestGlpiConnectionService from "../services/GlpiServices/TestGlpiConnectionService";
import SyncGlpiCatalogService from "../services/GlpiServices/SyncGlpiCatalogService";
import CreateGlpiTicketService from "../services/GlpiServices/CreateGlpiTicketService";
import { getGlpiSettings, isMaskedSecret, maskSecret } from "../services/GlpiServices/GlpiClientService";

const configKeys = [
  "glpiEnabled",
  "glpiApiUrl",
  "glpiBaseWebUrl",
  "glpiAppToken",
  "glpiUserToken",
  "glpiAllowMultipleTickets",
  "glpiAutoCreateEnabled",
  "glpiTimeoutMs",
  "glpiApiMode"
];

const requireAdmin = (req: Request): void => {
  if (req.user.profile !== "admin") throw new AppError("ERR_NO_PERMISSION", 403);
};

export const config = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
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
  const result = await TestGlpiConnectionService(Number(req.user.id));
  return res.json(result);
};

export const syncEntities = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const result = await SyncGlpiCatalogService("entities", Number(req.user.id));
  return res.json(result);
};

export const syncCategories = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const result = await SyncGlpiCatalogService("categories", Number(req.user.id));
  return res.json(result);
};

export const syncLocations = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const result = await SyncGlpiCatalogService("locations", Number(req.user.id));
  return res.json(result);
};

export const listEntities = async (req: Request, res: Response): Promise<Response> => {
  const search = String(req.query.search || "").trim();
  const rows = await GlpiEntity.findAll({
    where: {
      active: true,
      ...(search ? { [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { completeName: { [Op.iLike]: `%${search}%` } }] } : {})
    },
    order: [["completeName", "ASC"], ["name", "ASC"]],
    limit: 100
  });
  return res.json(rows);
};

export const listCategories = async (req: Request, res: Response): Promise<Response> => {
  const search = String(req.query.search || "").trim();
  const rows = await GlpiCategory.findAll({
    where: {
      active: true,
      ...(search ? { [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { completeName: { [Op.iLike]: `%${search}%` } }] } : {})
    },
    order: [["completeName", "ASC"], ["name", "ASC"]],
    limit: 100
  });
  return res.json(rows);
};

export const listLocations = async (req: Request, res: Response): Promise<Response> => {
  const search = String(req.query.search || "").trim();
  const hasEntityFilter = req.query.entityId !== undefined && String(req.query.entityId) !== "";
  const entityId = hasEntityFilter ? Number(req.query.entityId) : null;
  const rows = await GlpiLocation.findAll({
    where: {
      active: true,
      ...(hasEntityFilter ? { entityId } : {}),
      ...(search ? { [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { completeName: { [Op.iLike]: `%${search}%` } }] } : {})
    },
    order: [["completeName", "ASC"], ["name", "ASC"]],
    limit: hasEntityFilter ? 1000 : 100
  });
  return res.json(rows);
};

export const ticketStatus = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const settings = await getGlpiSettings();
  const ticket = await Ticket.findByPk(ticketId, { include: [{ model: Queue, as: "queue" }] });
  if (!ticket) throw new AppError("Atendimento nao encontrado.", 404);

  const links = await GlpiTicketLink.findAll({
    where: { ticketId },
    order: [["createdAt", "DESC"]]
  });
  const entitiesCount = await GlpiEntity.count({ where: { active: true } });
  const categoriesCount = await GlpiCategory.count({ where: { active: true } });
  const locationsCount = await GlpiLocation.count({ where: { active: true } });
  const hasUsableToken = !!settings.userToken && !isMaskedSecret(settings.userToken);
  const configValid = settings.enabled && !!settings.apiUrl && hasUsableToken && entitiesCount > 0 && categoriesCount > 0;
  const hasAnyGlpiQueue = ticket.isGroup && !ticket.queue
    ? await Queue.count({ where: { glpiEnabled: true } })
    : 0;
  const queueEnabled = Boolean(ticket.queue?.glpiEnabled || (ticket.isGroup && !ticket.queue && hasAnyGlpiQueue > 0));
  const canCreate = Boolean(
    configValid &&
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
    hasLinkedTicket: links.length > 0,
    links,
    locationsCount,
    reasons: {
      notOpen: ticket.status !== "open",
      queueDisabled: !queueEnabled,
      missingToken: !hasUsableToken,
      missingCatalog: entitiesCount === 0 || categoriesCount === 0,
      multipleBlocked: links.length > 0 && !settings.allowMultipleTickets
    }
  });
};

export const createTicket = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
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
