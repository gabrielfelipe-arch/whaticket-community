import { Request, Response } from "express";
import { Op } from "sequelize";

import ScheduledMessage from "../models/ScheduledMessage";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import Tag from "../models/Tag";
import { getPauseSeconds } from "../helpers/MessageQueueTiming";

const include = [
  { model: Contact, as: "contact", attributes: ["id", "name", "number", "isGroup"] },
  { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] }
];

const parseScheduledAt = (value: string | Date): Date => {
  if (!value) {
    throw new AppError("ERR_SCHEDULE_REQUIRED_FIELDS", 400);
  }

  const rawValue = String(value);
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(rawValue);
  const date = new Date(hasTimezone ? rawValue : `${rawValue}-03:00`);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("ERR_SCHEDULE_INVALID_DATE", 400);
  }

  if (date.getTime() <= Date.now()) {
    throw new AppError("ERR_SCHEDULE_DATE_MUST_BE_FUTURE", 400);
  }

  return date;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const messages = await ScheduledMessage.findAll({
    include,
    order: [["scheduledAt", "DESC"]]
  });

  return res.json(messages);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    contactId,
    contactIds = [],
    tagIds = [],
    audience = "all",
    whatsappId,
    message,
    scheduledAt,
    intervalPattern = "30",
    pauseAfter = 20,
    pauseSeconds = 300,
    pauseMinutes
  } = req.body;

  if (!message || !scheduledAt) {
    throw new AppError("ERR_SCHEDULE_REQUIRED_FIELDS", 400);
  }

  const parsedScheduledAt = parseScheduledAt(scheduledAt);

  const selectedContactIds = [
    ...(contactId ? [contactId] : []),
    ...contactIds
  ].map(Number);

  if (!selectedContactIds.length && !tagIds.length) {
    throw new AppError("ERR_SCHEDULE_RECIPIENTS_REQUIRED", 400);
  }

  const contactWhere: any =
    audience === "groups"
      ? { isGroup: true }
      : audience === "contacts"
        ? { isGroup: false }
        : {};

  if (selectedContactIds.length) {
    contactWhere.id = { [Op.in]: selectedContactIds };
  }

  const contactRows = await Contact.findAll({
    where: contactWhere,
    include: tagIds.length
      ? [
          {
            model: Tag,
            as: "tags",
            attributes: [],
            through: { attributes: [] },
            where: { id: { [Op.in]: tagIds.map(Number) } },
            required: true
          }
        ]
      : []
  });
  const contacts = contactRows.filter(
    (contact, index, self) => self.findIndex(item => item.id === contact.id) === index
  );

  if (!contacts.length) {
    throw new AppError("ERR_SCHEDULE_NO_RECIPIENTS", 400);
  }

  const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const schedules = await ScheduledMessage.bulkCreate(
    contacts.map((contact, index) => ({
      contactId: contact.id,
      whatsappId: whatsappId || null,
      batchId,
      sequence: index,
      message,
      scheduledAt: parsedScheduledAt,
      nextRunAt: index === 0 ? parsedScheduledAt : null,
      intervalSeconds: Number(parseInt(String(intervalPattern).split(":")[0], 10) || 30),
      intervalPattern: intervalPattern || "30",
      pauseAfter: Number(pauseAfter || 20),
      pauseSeconds: getPauseSeconds({ pauseSeconds, pauseMinutes }) || 300,
      status: "scheduled"
    }))
  );

  const created = await ScheduledMessage.findAll({
    where: { id: schedules.map(schedule => schedule.id) },
    include
  });

  return res.status(200).json(created);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const schedule = await ScheduledMessage.findByPk(scheduleId);

  if (!schedule) throw new AppError("ERR_SCHEDULE_NOT_FOUND", 404);
  if (["sent", "completed"].includes(schedule.status)) {
    throw new AppError("ERR_SCHEDULE_ALREADY_SENT", 400);
  }

  const allowedData: any = {};
  const {
    message,
    scheduledAt,
    whatsappId,
    intervalPattern,
    pauseAfter,
    pauseSeconds,
    pauseMinutes,
    status
  } = req.body;

  if (message !== undefined) allowedData.message = message;
  if (whatsappId !== undefined) allowedData.whatsappId = whatsappId || null;
  if (intervalPattern !== undefined) {
    allowedData.intervalPattern = intervalPattern || "30";
    allowedData.intervalSeconds = Number(parseInt(String(intervalPattern).split(":")[0], 10) || 30);
  }
  if (pauseAfter !== undefined) allowedData.pauseAfter = Number(pauseAfter || 20);
  if (pauseSeconds !== undefined || pauseMinutes !== undefined) {
    allowedData.pauseSeconds = getPauseSeconds({ pauseSeconds, pauseMinutes }) || 300;
  }
  if (scheduledAt !== undefined) {
    const parsedScheduledAt = parseScheduledAt(scheduledAt);
    allowedData.scheduledAt = parsedScheduledAt;
    if (schedule.sequence === 0 || schedule.nextRunAt) {
      allowedData.nextRunAt = parsedScheduledAt;
    }
  }
  if (schedule.status === "error") allowedData.status = "scheduled";
  if (status !== undefined) {
    if (!["scheduled", "paused", "canceled"].includes(status)) {
      throw new AppError("ERR_INVALID_SCHEDULE_STATUS", 400);
    }
    allowedData.status = status;
    if (status === "scheduled" && !schedule.nextRunAt) {
      allowedData.nextRunAt = new Date();
    }
  }

  await schedule.update(allowedData);

  if (schedule.batchId && status !== undefined) {
    await ScheduledMessage.update(
      { status },
      {
        where: {
          batchId: schedule.batchId,
          status: { [Op.in]: ["scheduled", "paused", "running", "error"] }
        }
      }
    );
  }

  const updated = await ScheduledMessage.findByPk(schedule.id, { include });
  return res.status(200).json(updated);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const schedule = await ScheduledMessage.findByPk(scheduleId);

  if (!schedule) throw new AppError("ERR_SCHEDULE_NOT_FOUND", 404);
  await schedule.destroy();

  return res.status(200).json({ message: "deleted" });
};
