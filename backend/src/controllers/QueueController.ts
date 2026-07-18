import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import CreateQueueService from "../services/QueueService/CreateQueueService";
import DeleteQueueService from "../services/QueueService/DeleteQueueService";
import ListQueuesService from "../services/QueueService/ListQueuesService";
import ShowQueueService from "../services/QueueService/ShowQueueService";
import UpdateQueueService from "../services/QueueService/UpdateQueueService";
import CreateAuditLogService from "../services/AuditLogServices/CreateAuditLogService";

const requireAdmin = (req: Request): void => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
};

const mediaDataFromRequest = (req: Request) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return {};

  return {
    unavailableMediaUrl: file.filename,
    unavailableMediaType: file.mimetype,
    unavailableMediaName: file.originalname
  };
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const queues = await ListQueuesService();

  return res.status(200).json(queues);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const {
    name,
    color,
    useAI,
    aiSettingId,
    businessHoursEnabled,
    businessHoursMode,
    businessHours,
    unavailableMessage,
    distributionMode,
    maxActiveTicketsPerUser,
    balanceAction,
    overflowAction,
    sendQueuePositionMessage,
    scheduledReturnWindowHours,
    queuePositionMessage,
    blockIfUserHasStalledTicket,
    stalledTicketMinutes,
    stalledTicketAction,
    glpiEnabled
  } = req.body;

  const queue = await CreateQueueService({
    name,
    color,
    useAI: useAI === true || useAI === "true",
    aiSettingId,
    businessHoursEnabled: businessHoursEnabled === true || businessHoursEnabled === "true",
    businessHoursMode: businessHoursMode || (businessHoursEnabled === true || businessHoursEnabled === "true" ? "custom" : "always"),
    businessHours,
    unavailableMessage,
    distributionMode,
    maxActiveTicketsPerUser: maxActiveTicketsPerUser ? Number(maxActiveTicketsPerUser) : null,
    balanceAction,
    overflowAction,
    sendQueuePositionMessage: sendQueuePositionMessage === true || sendQueuePositionMessage === "true",
    scheduledReturnWindowHours:
      scheduledReturnWindowHours !== undefined && scheduledReturnWindowHours !== ""
        ? Number(scheduledReturnWindowHours)
        : 24,
    queuePositionMessage,
    blockIfUserHasStalledTicket: blockIfUserHasStalledTicket === true || blockIfUserHasStalledTicket === "true",
    stalledTicketMinutes: stalledTicketMinutes ? Number(stalledTicketMinutes) : null,
    stalledTicketAction,
    glpiEnabled: glpiEnabled === true || glpiEnabled === "true",
    ...mediaDataFromRequest(req)
  });
  await CreateAuditLogService({
    req,
    action: "create",
    resource: "queues",
    resourceId: queue.id,
    afterData: queue.toJSON()
  });

  const io = getIO();
  io.emit("queue", {
    action: "update",
    queue
  });

  return res.status(200).json(queue);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { queueId } = req.params;

  const queue = await ShowQueueService(queueId);

  return res.status(200).json(queue);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  requireAdmin(req);
  const { queueId } = req.params;
  const currentQueue = await ShowQueueService(queueId);
  const beforeData = currentQueue.toJSON();

  const queue = await UpdateQueueService(queueId, {
    ...req.body,
    useAI: req.body.useAI === true || req.body.useAI === "true",
    businessHoursEnabled: req.body.businessHoursEnabled === true || req.body.businessHoursEnabled === "true",
    businessHoursMode: req.body.businessHoursMode || (req.body.businessHoursEnabled === true || req.body.businessHoursEnabled === "true" ? "custom" : "always"),
    maxActiveTicketsPerUser: req.body.maxActiveTicketsPerUser ? Number(req.body.maxActiveTicketsPerUser) : null,
    sendQueuePositionMessage: req.body.sendQueuePositionMessage === true || req.body.sendQueuePositionMessage === "true",
    scheduledReturnWindowHours:
      req.body.scheduledReturnWindowHours !== undefined && req.body.scheduledReturnWindowHours !== ""
        ? Number(req.body.scheduledReturnWindowHours)
        : undefined,
    blockIfUserHasStalledTicket: req.body.blockIfUserHasStalledTicket === true || req.body.blockIfUserHasStalledTicket === "true",
    stalledTicketMinutes: req.body.stalledTicketMinutes ? Number(req.body.stalledTicketMinutes) : null,
    glpiEnabled: req.body.glpiEnabled === true || req.body.glpiEnabled === "true",
    ...mediaDataFromRequest(req)
  });
  await CreateAuditLogService({
    req,
    action: "update",
    resource: "queues",
    resourceId: queue.id,
    beforeData,
    afterData: queue.toJSON()
  });

  const io = getIO();
  io.emit("queue", {
    action: "update",
    queue
  });

  return res.status(201).json(queue);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  requireAdmin(req);
  const { queueId } = req.params;
  const queue = await ShowQueueService(queueId);
  const beforeData = queue.toJSON();

  await DeleteQueueService(queueId);
  await CreateAuditLogService({
    req,
    action: "delete",
    resource: "queues",
    resourceId: queueId,
    beforeData
  });

  const io = getIO();
  io.emit("queue", {
    action: "delete",
    queueId: +queueId
  });

  return res.status(200).send();
};
