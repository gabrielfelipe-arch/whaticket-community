import { Request, Response } from "express";
import { Op } from "sequelize";
import Campaign from "../models/Campaign";
import CampaignContact from "../models/CampaignContact";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import Tag from "../models/Tag";
import { getPauseSeconds } from "../helpers/MessageQueueTiming";

const include = [
  { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] },
  { model: CampaignContact, as: "recipients", include: [{ model: Contact, as: "contact", attributes: ["id", "name", "number", "isGroup"] }] }
];

const resolveCampaignContacts = async ({
  audience,
  contactIds = [],
  tagIds = []
}: {
  audience: string;
  contactIds?: number[];
  tagIds?: number[];
}): Promise<Contact[]> => {
  const contactWhere: any =
    audience === "groups"
      ? { isGroup: true }
      : audience === "all"
        ? {}
        : { isGroup: false };

  if (contactIds.length) {
    contactWhere.id = { [Op.in]: contactIds };
  }

  const contacts = await Contact.findAll({
    where: contactWhere,
    include: tagIds.length
      ? [
          {
            model: Tag,
            as: "tags",
            attributes: [],
            through: { attributes: [] },
            where: { id: { [Op.in]: tagIds } },
            required: true
          }
        ]
      : [],
  });

  return contacts.filter(
    (contact, index, self) => self.findIndex(item => item.id === contact.id) === index
  );
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const campaigns = await Campaign.findAll({
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
    intervalPattern = "30",
    pauseAfter = 20,
    pauseSeconds = 300,
    pauseMinutes,
    whatsappId,
    contactIds = [],
    tagIds = []
  } = req.body;

  if (!name || !message) {
    throw new AppError("ERR_CAMPAIGN_REQUIRED_FIELDS", 400);
  }

  const campaign = await Campaign.create({
    name,
    message,
    audience,
    intervalSeconds: Number(parseInt(String(intervalPattern).split(":")[0], 10) || 30),
    intervalPattern: intervalPattern || "30",
    pauseAfter: Number(pauseAfter || 20),
    pauseSeconds: getPauseSeconds({ pauseSeconds, pauseMinutes }) || 300,
    whatsappId: whatsappId || null,
    status: "scheduled"
  });

  const contacts = await resolveCampaignContacts({
    audience,
    contactIds: contactIds.map(Number),
    tagIds: tagIds.map(Number)
  });

  if (!contacts.length) {
    throw new AppError("ERR_CAMPAIGN_NO_RECIPIENTS", 400);
  }

  const now = new Date();

  await CampaignContact.bulkCreate(
    contacts.map((contact, index) => ({
      campaignId: campaign.id,
      contactId: contact.id,
      status: "pending",
      nextRunAt: index === 0 ? now : null
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
  if (!["scheduled", "running", "paused", "canceled"].includes(status)) {
    throw new AppError("ERR_INVALID_CAMPAIGN_STATUS", 400);
  }

  await campaign.update({ status });

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
  const updated = await Campaign.findByPk(campaign.id, { include });
  return res.status(200).json(updated);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { campaignId } = req.params;
  const campaign = await Campaign.findByPk(campaignId);

  if (!campaign) throw new AppError("ERR_CAMPAIGN_NOT_FOUND", 404);
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
