import { Request, Response } from "express";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import AppError from "../errors/AppError";
import { requestUserHasSpecialPermission } from "../helpers/ProfilePermissions";
import { assertUserCanAccessTicket } from "../helpers/TicketAccess";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import ReactWhatsAppMessage from "../services/WbotServices/ReactWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import CreateAuditLogService from "../services/AuditLogServices/CreateAuditLogService";

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;

  await assertUserCanAccessTicket(req.user.id, req.user.profile, ticketId);
  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId
  });

  SetTicketMessagesAsRead(ticket);

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  await assertUserCanAccessTicket(req.user.id, req.user.profile, ticketId);
  const ticket = await ShowTicketService(ticketId);

  SetTicketMessagesAsRead(ticket);

  if (medias) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File) => {
        await SendWhatsAppMedia({ media, ticket, body });
      })
    );
  } else {
    await SendWhatsAppMessage({ body, ticket, quotedMsg });
  }

  return res.send();
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;

  if (!(await requestUserHasSpecialPermission(req.user.id, "deleteMessages"))) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const targetMessage = await Message.findByPk(messageId, { attributes: ["id", "ticketId"] });
  if (!targetMessage) throw new AppError("No message found with this ID.", 404);
  await assertUserCanAccessTicket(req.user.id, req.user.profile, targetMessage.ticketId);

  const { message, beforeData } = await DeleteWhatsAppMessage(messageId);

  await CreateAuditLogService({
    req,
    action: "delete",
    resource: "messages",
    resourceId: message.id,
    beforeData,
    afterData: {
      id: message.id,
      ticketId: message.ticketId,
      isDeleted: true,
      deletedAt: new Date().toISOString()
    }
  });

  const io = getIO();
  io.to(message.ticketId.toString()).emit("appMessage", {
    action: "update",
    message
  });

  return res.send();
};

export const react = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  const targetMessage = await Message.findByPk(messageId, { attributes: ["id", "ticketId"] });
  if (!targetMessage) throw new AppError("No message found with this ID.", 404);
  await assertUserCanAccessTicket(req.user.id, req.user.profile, targetMessage.ticketId);

  const message = await ReactWhatsAppMessage({
    messageId,
    emoji,
    userId: Number(req.user.id)
  });

  return res.status(200).json(message);
};
