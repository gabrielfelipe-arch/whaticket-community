import { Request, Response } from "express";
import { Op } from "sequelize";

import ScheduledMessage from "../models/ScheduledMessage";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import Tag from "../models/Tag";
import ContactTag from "../models/ContactTag";
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

const calculateFirstIntervalRun = ({
  startsAt,
  scheduledAt
}: {
  startsAt?: Date | null;
  scheduledAt?: string | Date;
}): Date => {
  if (startsAt && startsAt.getTime() > Date.now()) return startsAt;
  if (scheduledAt) return parseScheduledAt(scheduledAt);
  const date = new Date();
  date.setMinutes(date.getMinutes() + 1);
  return date;
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

const resolveScheduledRecipients = async ({
  contactIds = [],
  tagIds = [],
  excludeTagIds = [],
  tagAppliedLastDays,
  audience = "all"
}: {
  contactIds?: number[];
  tagIds?: number[];
  excludeTagIds?: number[];
  tagAppliedLastDays?: number | string | null;
  audience?: string;
}): Promise<Contact[]> => {
  if (!["all", "contacts", "groups"].includes(audience)) {
    throw new AppError("Escolha o tipo de destinatario do agendamento.", 400);
  }

  const contactWhere: any =
    audience === "groups"
      ? { isGroup: true }
      : audience === "contacts"
        ? { isGroup: false }
        : {};

  if (contactIds.length) {
    contactWhere.id = { [Op.in]: contactIds };
  }

  const tagThroughWhere: any = {};
  const recentDays = Number(tagAppliedLastDays || 0);
  if (recentDays > 0) {
    tagThroughWhere.appliedAt = {
      [Op.gte]: new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000)
    };
  }

  const contactRows = await Contact.findAll({
    where: contactWhere,
    include: tagIds.length
      ? [
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "color"],
            through: { attributes: ["appliedAt"], where: tagThroughWhere },
            where: { id: { [Op.in]: tagIds } },
            required: true
          }
        ]
      : [],
    order: [["name", "ASC"]]
  });
  const contacts = contactRows.filter(
    (contact, index, self) => self.findIndex(item => item.id === contact.id) === index
  );

  if (!excludeTagIds.length || !contacts.length) return contacts;

  const excludedRows = await ContactTag.findAll({
    attributes: ["contactId"],
    where: {
      contactId: { [Op.in]: contacts.map(contact => contact.id) },
      tagId: { [Op.in]: excludeTagIds }
    }
  });
  const excludedContactIds = new Set(excludedRows.map(row => Number(row.contactId)));

  return contacts.filter(contact => !excludedContactIds.has(Number(contact.id)));
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const messages = await ScheduledMessage.findAll({
    include,
    order: [["scheduledAt", "DESC"]]
  });

  return res.json(messages);
};

export const recipientPreview = async (req: Request, res: Response): Promise<Response> => {
  const {
    contactIds = [],
    tagIds = [],
    excludeTagIds = [],
    tagAppliedLastDays,
    audience = "all"
  } = req.body;

  const contacts = await resolveScheduledRecipients({
    contactIds: parseNumberArray(contactIds),
    tagIds: parseNumberArray(tagIds),
    excludeTagIds: parseNumberArray(excludeTagIds),
    tagAppliedLastDays,
    audience
  });

  return res.json({
    total: contacts.length,
    contacts: contacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      number: contact.number,
      isGroup: contact.isGroup
    }))
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    contactId,
    contactIds = [],
    tagIds = [],
    excludeTagIds = [],
    tagAppliedLastDays,
    sendType = "scheduled",
    audience = "all",
    whatsappId,
    message,
    scheduledAt,
    recurrenceType,
    weekdays = [],
    times = [],
    startsAt,
    endsAt,
    repeatEvery,
    repeatUnit,
    maxRuns,
    respectBusinessHours,
    missedRunPolicy,
    intervalPattern = "60:50:55:52:51:53:61",
    pauseAfter = 20,
    pauseSeconds = 300,
    pauseMinutes
  } = req.body;

  if (!message || (!scheduledAt && !["weekly", "interval"].includes(recurrenceType))) {
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
  const firstIntervalRun = recurrenceType === "interval"
    ? calculateFirstIntervalRun({ startsAt: parsedStartsAt, scheduledAt })
    : null;
  const parsedScheduledAt = firstRecurringRun || firstIntervalRun || parseScheduledAt(scheduledAt);

  if (recurrenceType === "weekly" && !firstRecurringRun) {
    throw new AppError("Informe dias e horarios futuros para o agendamento recorrente.", 400);
  }
  if (recurrenceType === "interval") {
    const every = Number(repeatEvery || 0);
    if (!every || every <= 0 || !["minutes", "hours", "days"].includes(repeatUnit || "hours")) {
      throw new AppError("Informe um intervalo valido em minutos, horas ou dias.", 400);
    }
  }

  const selectedContactIds = [
    ...(contactId ? [Number(contactId)] : []),
    ...parseNumberArray(contactIds)
  ];
  const selectedTagIds = parseNumberArray(tagIds);
  const selectedExcludeTagIds = parseNumberArray(excludeTagIds);
  const recentDays = Number(tagAppliedLastDays || 0);

  if (!selectedContactIds.length && !selectedTagIds.length) {
    throw new AppError("ERR_SCHEDULE_RECIPIENTS_REQUIRED", 400);
  }

  const filteredContacts = await resolveScheduledRecipients({
    contactIds: selectedContactIds,
    tagIds: selectedTagIds,
    excludeTagIds: selectedExcludeTagIds,
    tagAppliedLastDays,
    audience
  });

  if (!filteredContacts.length) {
    throw new AppError("ERR_SCHEDULE_NO_RECIPIENTS", 400);
  }

  const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const schedules = await ScheduledMessage.bulkCreate(
    filteredContacts.map((contact, index) => ({
      contactId: contact.id,
      whatsappId: whatsappId || null,
      batchId,
      sendType: ["scheduled", "campaign"].includes(sendType) ? sendType : "scheduled",
      tagIds: selectedTagIds,
      excludeTagIds: selectedExcludeTagIds,
      tagAppliedLastDays: recentDays > 0 ? recentDays : null,
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
      repeatEvery: repeatEvery ? Number(repeatEvery) : null,
      repeatUnit: repeatUnit || null,
      maxRuns: maxRuns ? Number(maxRuns) : null,
      runCount: 0,
      respectBusinessHours: respectBusinessHours === true || respectBusinessHours === "true",
      missedRunPolicy: missedRunPolicy || "skip",
      intervalSeconds: Number(parseInt(String(intervalPattern).split(":")[0], 10) || 60),
      intervalPattern: intervalPattern || "60:50:55:52:51:53:61",
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
    status,
    recurrenceType,
    weekdays,
    times,
    startsAt,
    endsAt,
    repeatEvery,
    repeatUnit,
    maxRuns,
    respectBusinessHours,
    missedRunPolicy,
    sendType,
    tagIds,
    excludeTagIds,
    tagAppliedLastDays
  } = req.body;

  if (message !== undefined) allowedData.message = message;
  if (sendType !== undefined) {
    allowedData.sendType = ["scheduled", "campaign"].includes(sendType) ? sendType : "scheduled";
  }
  if (tagIds !== undefined) allowedData.tagIds = parseNumberArray(tagIds);
  if (excludeTagIds !== undefined) allowedData.excludeTagIds = parseNumberArray(excludeTagIds);
  if (tagAppliedLastDays !== undefined) {
    const recentDays = Number(tagAppliedLastDays || 0);
    allowedData.tagAppliedLastDays = recentDays > 0 ? recentDays : null;
  }
  Object.assign(allowedData, mediaDataFromRequest(req));
  if (whatsappId !== undefined) allowedData.whatsappId = whatsappId || null;
  if (intervalPattern !== undefined) {
    validateIntervalPattern(intervalPattern);
    allowedData.intervalPattern = intervalPattern || "60:50:55:52:51:53:61";
    allowedData.intervalSeconds = Number(parseInt(String(intervalPattern).split(":")[0], 10) || 60);
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
  if (repeatEvery !== undefined) allowedData.repeatEvery = repeatEvery ? Number(repeatEvery) : null;
  if (repeatUnit !== undefined) allowedData.repeatUnit = repeatUnit || null;
  if (maxRuns !== undefined) allowedData.maxRuns = maxRuns ? Number(maxRuns) : null;
  if (respectBusinessHours !== undefined) {
    allowedData.respectBusinessHours = respectBusinessHours === true || respectBusinessHours === "true";
  }
  if (missedRunPolicy !== undefined) allowedData.missedRunPolicy = missedRunPolicy || "skip";

  const recurrenceFieldsChanged = [
    "scheduledAt",
    "recurrenceType",
    "weekdays",
    "times",
    "startsAt",
    "endsAt",
    "repeatEvery",
    "repeatUnit",
    "maxRuns"
  ].some(field => allowedData[field] !== undefined);

  if (recurrenceFieldsChanged && status !== "canceled") {
    const nextRecurrenceType = allowedData.recurrenceType ?? schedule.recurrenceType ?? "once";
    const nextStartsAt = allowedData.startsAt !== undefined ? allowedData.startsAt : schedule.startsAt;
    const nextScheduledAt = allowedData.scheduledAt !== undefined ? allowedData.scheduledAt : schedule.scheduledAt;

    if (nextRecurrenceType === "weekly") {
      const nextRunAt = calculateFirstRecurringRun({
        weekdays: allowedData.weekdays !== undefined ? allowedData.weekdays : schedule.weekdays || [],
        times: allowedData.times !== undefined ? allowedData.times : schedule.times || [],
        startsAt: nextStartsAt || new Date()
      });

      if (!nextRunAt) throw new AppError("ERR_INVALID_RECURRING_SCHEDULE", 400);
      allowedData.nextRunAt = nextRunAt;
      allowedData.scheduledAt = nextRunAt;
    } else if (nextRecurrenceType === "interval") {
      const every = Number(allowedData.repeatEvery !== undefined ? allowedData.repeatEvery : schedule.repeatEvery || 0);
      const unit = allowedData.repeatUnit !== undefined ? allowedData.repeatUnit : schedule.repeatUnit || "hours";

      if (!every || every <= 0 || !["minutes", "hours", "days"].includes(unit)) {
        throw new AppError("ERR_INVALID_INTERVAL_SCHEDULE", 400);
      }

      const nextRunAt = calculateFirstIntervalRun({
        startsAt: nextStartsAt,
        scheduledAt: nextScheduledAt
      });
      allowedData.nextRunAt = nextRunAt;
      allowedData.scheduledAt = nextRunAt;
    } else if (allowedData.scheduledAt) {
      allowedData.nextRunAt = allowedData.scheduledAt;
    }
  }

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

export const duplicate = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const schedule = await ScheduledMessage.findByPk(scheduleId);

  if (!schedule) throw new AppError("ERR_SCHEDULE_NOT_FOUND", 404);

  const clone = await ScheduledMessage.create({
    contactId: schedule.contactId,
    whatsappId: schedule.whatsappId,
    batchId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    sendType: schedule.sendType || "scheduled",
    tagIds: schedule.tagIds || [],
    excludeTagIds: schedule.excludeTagIds || [],
    tagAppliedLastDays: schedule.tagAppliedLastDays,
    sequence: 0,
    message: schedule.message,
    mediaUrl: schedule.mediaUrl,
    mediaType: schedule.mediaType,
    mediaName: schedule.mediaName,
    scheduledAt: schedule.scheduledAt,
    nextRunAt: schedule.nextRunAt || schedule.scheduledAt,
    intervalSeconds: schedule.intervalSeconds,
    intervalPattern: schedule.intervalPattern,
    pauseAfter: schedule.pauseAfter,
    pauseSeconds: schedule.pauseSeconds,
    recurrenceType: schedule.recurrenceType,
    weekdays: schedule.weekdays || [],
    times: schedule.times || [],
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    repeatEvery: schedule.repeatEvery,
    repeatUnit: schedule.repeatUnit,
    maxRuns: schedule.maxRuns,
    runCount: 0,
    respectBusinessHours: schedule.respectBusinessHours,
    missedRunPolicy: schedule.missedRunPolicy,
    status: "paused"
  });

  const created = await ScheduledMessage.findByPk(clone.id, { include });
  return res.status(201).json(created);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const schedule = await ScheduledMessage.findByPk(scheduleId);

  if (!schedule) throw new AppError("ERR_SCHEDULE_NOT_FOUND", 404);
  await schedule.destroy();

  return res.status(200).json({ message: "deleted" });
};
