import { Request, Response } from "express";
import { Op } from "sequelize";
import Campaign from "../models/Campaign";
import CampaignContact from "../models/CampaignContact";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import {
  isAdminProfile,
  requestUserHasPermission,
  requestUserHasSpecialPermission
} from "../helpers/ProfilePermissions";
import Tag from "../models/Tag";
import ContactTag from "../models/ContactTag";
import { getPauseSeconds } from "../helpers/MessageQueueTiming";
import CampaignRecipientLog from "../models/CampaignRecipientLog";

const include = [
  { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] },
  { model: CampaignContact, as: "recipients", include: [{ model: Contact, as: "contact", attributes: ["id", "name", "number", "isGroup"] }] }
];

const canManageCampaign = async (req: Request, campaign: Campaign): Promise<boolean> => {
  if (isAdminProfile(req.user.profile)) return true;
  const canManageAll =
    await requestUserHasPermission(req.user.id, "campaigns.edit_all") ||
    await requestUserHasPermission(req.user.id, "campaigns.cancel_all");
  if (canManageAll) return true;

  if (
    campaign.userId &&
    Number(campaign.userId) === Number(req.user.id) &&
    (
      await requestUserHasPermission(req.user.id, "campaigns.edit_own") ||
      await requestUserHasPermission(req.user.id, "campaigns.cancel_own") ||
      await requestUserHasPermission(req.user.id, "campaigns.clone")
    )
  ) return true;

  return requestUserHasSpecialPermission(req.user.id, "manageOtherCampaigns");
};

const parseNumberArray = (value: any): number[] => {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  if (value === null || value === undefined || value === "") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(Number).filter(Number.isFinite);
  } catch (error) {
    // falls back to comma separated values
  }

  return String(value)
    .split(",")
    .map(item => Number(item.trim()))
    .filter(Number.isFinite);
};

const mediaDataFromRequest = (req: Request) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return {};

  return {
    mediaUrl: file.filename,
    mediaType: file.mimetype,
    mediaName: file.originalname
  };
};

const resolveCampaignContacts = async ({
  recipientType,
  contactIds = [],
  tagIds = [],
  excludeTagIds = [],
  tagAppliedLastDays
}: {
  recipientType: string;
  contactIds?: number[];
  tagIds?: number[];
  excludeTagIds?: number[];
  tagAppliedLastDays?: number | string | null;
}): Promise<Contact[]> => {
  const contactWhere: any = recipientType === "groups" ? { isGroup: true } : { isGroup: false };

  if ((recipientType === "contacts" || recipientType === "groups") && contactIds.length) {
    contactWhere.id = { [Op.in]: contactIds };
  }

  const tagThroughWhere: any = {};
  const recentDays = Number(tagAppliedLastDays || 0);
  if (recentDays > 0) {
    tagThroughWhere.appliedAt = {
      [Op.gte]: new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000)
    };
  }

  const contacts = await Contact.findAll({
    where: contactWhere,
    include: recipientType === "tags" && tagIds.length
      ? [
          {
            model: Tag,
            as: "tags",
            attributes: [],
            through: { attributes: [], where: tagThroughWhere },
            where: { id: { [Op.in]: tagIds } },
            required: true
          }
        ]
      : [],
  });

  const uniqueContacts = contacts.filter(
    (contact, index, self) => self.findIndex(item => item.id === contact.id) === index
  );

  if (!excludeTagIds.length) return uniqueContacts;

  const excludedRows = await ContactTag.findAll({
    attributes: ["contactId"],
    where: {
      contactId: { [Op.in]: uniqueContacts.map(contact => contact.id) },
      tagId: { [Op.in]: excludeTagIds }
    }
  });
  const excludedContactIds = new Set(excludedRows.map(row => Number(row.contactId)));

  return uniqueContacts.filter(contact => !excludedContactIds.has(Number(contact.id)));
};

const validateIntervalPattern = (value: any): void => {
  const pattern = String(value || "").trim();
  if (!pattern) {
    throw new AppError("Informe a sequencia de intervalos da campanha.", 400);
  }

  const intervals = pattern.split(":").map(item => Number(item));
  if (!intervals.length || intervals.some(item => !Number.isFinite(item) || item <= 0)) {
    throw new AppError("A sequencia de intervalos deve conter apenas segundos maiores que zero. Ex: 10:20:30", 400);
  }
};

const parseOptionalScheduledAt = (value: any): Date | null => {
  if (!value) return null;

  const raw = String(value).trim();
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const date = new Date(hasTimezone ? raw : `${raw}-03:00`);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Data de inicio da campanha invalida.", 400);
  }

  return date;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const canViewAll =
    isAdminProfile(req.user.profile) ||
    await requestUserHasPermission(req.user.id, "campaigns.view_all") ||
    await requestUserHasPermission(req.user.id, "campaigns.edit_all") ||
    await requestUserHasPermission(req.user.id, "campaigns.cancel_all") ||
    await requestUserHasSpecialPermission(req.user.id, "manageOtherCampaigns");

  const campaigns = await Campaign.findAll({
    where: canViewAll ? undefined : { userId: Number(req.user.id) },
    include,
    order: [["id", "DESC"]]
  });

  return res.json(campaigns);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    message,
    audience = "contacts",
    recipientType,
    intervalPattern = "60:50:55:52:51:53:61",
    pauseAfter = 20,
    pauseSeconds = 300,
    pauseMinutes,
    whatsappId,
    contactIds = [],
    tagIds = [],
    excludeTagIds = [],
    tagAppliedLastDays,
    scheduledAt
  } = req.body;
  const type = recipientType || audience || "contacts";

  if (!name || !message) {
    throw new AppError("ERR_CAMPAIGN_REQUIRED_FIELDS", 400);
  }

  validateIntervalPattern(intervalPattern);

  if (!["contacts", "tags", "groups"].includes(type)) {
    throw new AppError("Escolha o tipo de destinatario da campanha.", 400);
  }

  const selectedContactIds = parseNumberArray(contactIds);
  const selectedTagIds = parseNumberArray(tagIds);
  const selectedExcludeTagIds = parseNumberArray(excludeTagIds);

  if ((type === "contacts" || type === "groups") && !selectedContactIds.length) {
    throw new AppError("Selecione pelo menos um destinatario para a campanha.", 400);
  }

  if (type === "tags" && !selectedTagIds.length) {
    throw new AppError("Selecione pelo menos uma etiqueta para a campanha.", 400);
  }

  const campaign = await Campaign.create({
    name,
    message,
    ...mediaDataFromRequest(req),
    audience: type,
    intervalSeconds: Number(parseInt(String(intervalPattern).split(":")[0], 10) || 60),
    intervalPattern: intervalPattern || "60:50:55:52:51:53:61",
    pauseAfter: Number(pauseAfter || 20),
    pauseSeconds: getPauseSeconds({ pauseSeconds, pauseMinutes }) || 300,
    whatsappId: whatsappId || null,
    userId: Number(req.user.id),
    status: "scheduled"
  });

  const contacts = await resolveCampaignContacts({
    recipientType: type,
    contactIds: selectedContactIds,
    tagIds: selectedTagIds,
    excludeTagIds: selectedExcludeTagIds,
    tagAppliedLastDays
  });

  if (!contacts.length) {
    throw new AppError("ERR_CAMPAIGN_NO_RECIPIENTS", 400);
  }

  const firstRunAt = parseOptionalScheduledAt(scheduledAt) || new Date();

  await CampaignContact.bulkCreate(
    contacts.map((contact, index) => ({
      campaignId: campaign.id,
      contactId: contact.id,
      status: "pending",
      nextRunAt: index === 0 ? firstRunAt : null
    }))
  );

  const created = await Campaign.findByPk(campaign.id, { include });
  return res.status(200).json(created);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;
  const { status } = req.body;
  const campaign = await Campaign.findByPk(campaignId);

  if (!campaign) throw new AppError("ERR_CAMPAIGN_NOT_FOUND", 404);
  if (!(await canManageCampaign(req, campaign))) throw new AppError("ERR_NO_PERMISSION", 403);

  if (!["scheduled", "running", "canceled"].includes(status)) {
    throw new AppError("ERR_INVALID_CAMPAIGN_STATUS", 400);
  }

  const statusData: any = { status };
  if (status === "running") statusData.startedAt = campaign.startedAt || new Date();
  if (status === "canceled") statusData.canceledAt = new Date();

  await campaign.update(statusData);

  if (status === "running") {
    const pendingWithDate = await CampaignContact.count({
      where: {
        campaignId: campaign.id,
        status: "pending",
        nextRunAt: { [Op.gt]: new Date(0) }
      }
    });

    if (!pendingWithDate) {
      const pending = await CampaignContact.findOne({
        where: { campaignId: campaign.id, status: "pending" },
        order: [["id", "ASC"]]
      });
      await pending?.update({ nextRunAt: new Date() });
    }
  }

  if (status === "canceled") {
    await CampaignContact.update(
      { status: "canceled", nextRunAt: null },
      { where: { campaignId: campaign.id, status: { [Op.in]: ["pending", "sending"] } } }
    );
  }
  const updated = await Campaign.findByPk(campaign.id, { include });
  return res.status(200).json(updated);
};

export const logs = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;
  const logs = await CampaignRecipientLog.findAll({
    where: { campaignId },
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name", "number", "isGroup"] },
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] }
    ],
    order: [["id", "DESC"]]
  });

  return res.json(logs);
};

export const retryFailed = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;
  const campaign = await Campaign.findByPk(campaignId);

  if (!campaign) throw new AppError("ERR_CAMPAIGN_NOT_FOUND", 404);
  if (!(await canManageCampaign(req, campaign))) throw new AppError("ERR_NO_PERMISSION", 403);

  const failedRecipients = await CampaignContact.findAll({
    where: { campaignId: campaign.id, status: { [Op.in]: ["failed", "error"] } },
    order: [["id", "ASC"]]
  });

  if (!failedRecipients.length) {
    throw new AppError("Nenhum erro encontrado para reenviar.", 400);
  }

  await Promise.all(
    failedRecipients.map((recipient, index) =>
      recipient.update({
        status: "pending",
        nextRunAt: index === 0 ? new Date() : null,
        errorMessage: null,
        errorAt: null,
        lockedAt: null
      })
    )
  );

  await campaign.update({
    status: "running",
    startedAt: campaign.startedAt || new Date(),
    completedAt: null
  });

  const updated = await Campaign.findByPk(campaign.id, { include });
  return res.status(200).json(updated);
};

export const duplicate = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;
  const campaign = await Campaign.findByPk(campaignId, {
    include: [{ model: CampaignContact, as: "recipients" }]
  });

  if (!campaign) throw new AppError("ERR_CAMPAIGN_NOT_FOUND", 404);
  if (!(await canManageCampaign(req, campaign))) throw new AppError("ERR_NO_PERMISSION", 403);

  const newCampaign = await Campaign.create({
    name: `${campaign.name} - reenvio`,
    message: campaign.message,
    mediaUrl: campaign.mediaUrl,
    mediaType: campaign.mediaType,
    mediaName: campaign.mediaName,
    audience: campaign.audience,
    intervalSeconds: campaign.intervalSeconds,
    intervalPattern: campaign.intervalPattern,
    pauseAfter: campaign.pauseAfter,
    pauseSeconds: campaign.pauseSeconds,
    whatsappId: campaign.whatsappId,
    userId: Number(req.user.id),
    status: "scheduled"
  });

  const now = new Date();
  await CampaignContact.bulkCreate(
    (campaign.recipients || []).map((recipient, index) => ({
      campaignId: newCampaign.id,
      contactId: recipient.contactId,
      status: "pending",
      nextRunAt: index === 0 ? now : null
    }))
  );

  const created = await Campaign.findByPk(newCampaign.id, { include });
  return res.status(200).json(created);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;
  const campaign = await Campaign.findByPk(campaignId);

  if (!campaign) throw new AppError("ERR_CAMPAIGN_NOT_FOUND", 404);
  if (!(await canManageCampaign(req, campaign))) throw new AppError("ERR_NO_PERMISSION", 403);
  await campaign.destroy();

  return res.status(200).json({ message: "deleted" });
};

export const summary = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;
  const counts = await CampaignContact.findAll({
    where: { campaignId },
    attributes: ["status"],
    group: ["status"]
  });

  return res.json(counts);
};
