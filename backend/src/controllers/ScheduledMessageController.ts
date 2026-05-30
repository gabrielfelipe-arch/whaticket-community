import { Request, Response } from "express";
import { Op } from "sequelize";

import ScheduledMessage from "../models/ScheduledMessage";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import Tag from "../models/Tag";
import { getPauseSeconds } from "../helpers/MessageQueueTiming";
import ScheduledMessageExecution from "../models/ScheduledMessageExecution";

const include = [
  { model: Contact, as: "contact", attributes: ["id", "name", "number", "isGroup"] },
  { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] }
];

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

const parseStringArray = (value: any): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === null || value === undefined || value === "") return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch (error) {
    // falls back to comma separated values
  }

  return String(value)
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
};

const parseDateOptional = (value: any): Date | null => {
  if (!value) return null;
  const rawValue = String(value);
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(rawValue);
  const date = new Date(hasTimezone ? rawValue : `${rawValue}-03:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
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

const dateAtTime = (base: Date, time: string): Date => {
  const [hours, minutes] = String(time).split(":").map(Number);
  const date = new Date(base);
  date.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date;
};

const calculateFirstRecurringRun = ({
  weekdays,
  times,
  startsAt
}: {
  weekdays: number[];
  times: string[];
  startsAt?: Date | null;
}): Date | null => {
  if (!weekdays.length || !times.length) return null;
  const start = startsAt || new Date();
  const candidates: Date[] = [];

  for (let offset = 0; offset <= 14; offset += 1) {
    const day = new Date(start);
    day.setDate(day.getDate() + offset);
    if (!weekdays.includes(day.getDay())) continue;
    times.forEach(time => {
      const candidate = dateAtTime(day, time);
      if (candidate.getTime() > Date.now() && candidate.getTime() >= start.getTime()) {
        candidates.push(candidate);
      }
    });
  }

  return candidates.sort((a, b) => a.getTime() - b.getTime())[0] || null;
};

const validateIntervalPattern = (value: any): void => {
  const pattern = String(value || "").trim();
  if (!pattern) {
    throw new AppError("Informe a sequencia de intervalos do agendamento.", 400);
  }

  const intervals = pattern.split(":").map(item => Number(item));
  if (!intervals.length || intervals.some(item => !Number.isFinite(item) || item <= 0)) {
    throw new AppError("A sequencia de intervalos deve conter apenas segundos maiores que zero. Ex: 10:20:30", 400);
  }
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
    recurrenceType,
    weekdays = [],
    times = [],
    startsAt,
    endsAt,
    intervalPattern = "30",
    pauseAfter = 20,
    pauseSeconds = 300,
    pauseMinutes
  } = req.body;

  if (!message || (!scheduledAt && recurrenceType !== "weekly")) {
    throw new AppError("ERR_SCHEDULE_REQUIRED_FIELDS", 400);
  }

  validateIntervalPattern(intervalPattern);

  const parsedWeekdays = parseNumberArray(weekdays);
  const parsedTimes = parseStringArray(times);
  const parsedStartsAt = parseDateOptional(startsAt);
  const parsedEndsAt = parseDateOptional(endsAt);
  const firstRecurringRun = recurrenceType === "weekly"
    ? calculateFirstRecurringRun({ weekdays: parsedWeekdays, times: parsedTimes, startsAt: parsedStartsAt })
    : null;
  const parsedScheduledAt = firstRecurringRun || parseScheduledAt(scheduledAt);

  if (recurrenceType === "weekly" && !firstRecurringRun) {
    throw new AppError("Informe dias e horarios futuros para o agendamento recorrente.", 400);
  }

  const selectedContactIds = [
    ...(contactId ? [Number(contactId)] : []),
    ...parseNumberArray(contactIds)
  ];
  const selectedTagIds = parseNumberArray(tagIds);

  if (!selectedContactIds.length && !selectedTagIds.length) {
    throw new AppError("ERR_SCHEDULE_RECIPIENTS_REQUIRED", 400);
  }

  if (!["all", "contacts", "groups"].includes(audience)) {
    throw new AppError("Escolha o tipo de destinatario do agendamento.", 400);
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
    include: selectedTagIds.length
      ? [
          {
            model: Tag,
            as: "tags",
            attributes: [],
            through: { attributes: [] },
            where: { id: { [Op.in]: selectedTagIds } },
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
      ...mediaDataFromRequest(req),
      scheduledAt: parsedScheduledAt,
      nextRunAt: index === 0 ? parsedScheduledAt : null,
      recurrenceType: recurrenceType || "once",
      weekdays: parsedWeekdays,
      times: parsedTimes,
      startsAt: parsedStartsAt,
      endsAt: parsedEndsAt,
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
    , recurrenceType, weekdays, times, startsAt, endsAt
  } = req.body;

  if (message !== undefined) allowedData.message = message;
  Object.assign(allowedData, mediaDataFromRequest(req));
  if (whatsappId !== undefined) allowedData.whatsappId = whatsappId || null;
  if (intervalPattern !== undefined) {
    validateIntervalPattern(intervalPattern);
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
  if (recurrenceType !== undefined) allowedData.recurrenceType = recurrenceType || "once";
  if (weekdays !== undefined) allowedData.weekdays = parseNumberArray(weekdays);
  if (times !== undefined) allowedData.times = parseStringArray(times);
  if (startsAt !== undefined) allowedData.startsAt = parseDateOptional(startsAt);
  if (endsAt !== undefined) allowedData.endsAt = parseDateOptional(endsAt);

  if (schedule.status === "error" || schedule.status === "failed") allowedData.status = "scheduled";
  if (status !== undefined) {
    if (!["scheduled", "paused", "canceled"].includes(status)) {
      throw new AppError("ERR_INVALID_SCHEDULE_STATUS", 400);
    }
    allowedData.status = status;
    if (status === "canceled") allowedData.canceledAt = new Date();
    if (status === "scheduled" && !schedule.nextRunAt) {
      allowedData.nextRunAt =
        schedule.recurrenceType === "weekly"
          ? calculateFirstRecurringRun({
              weekdays: schedule.weekdays || [],
              times: schedule.times || [],
              startsAt: schedule.startsAt || new Date()
            }) || new Date()
          : new Date();
    }
  }

  await schedule.update(allowedData);

  if (schedule.batchId && status !== undefined) {
    await ScheduledMessage.update(
      { status },
      {
        where: {
          batchId: schedule.batchId,
          status: { [Op.in]: ["scheduled", "paused", "running", "error", "failed"] }
        }
      }
    );
  }

  const updated = await ScheduledMessage.findByPk(schedule.id, { include });
  return res.status(200).json(updated);
};

export const executions = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const logs = await ScheduledMessageExecution.findAll({
    where: { scheduleId },
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name", "number", "isGroup"] },
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] }
    ],
    order: [["id", "DESC"]]
  });

  return res.json(logs);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const schedule = await ScheduledMessage.findByPk(scheduleId);

  if (!schedule) throw new AppError("ERR_SCHEDULE_NOT_FOUND", 404);
  await schedule.destroy();

  return res.status(200).json({ message: "deleted" });
};
