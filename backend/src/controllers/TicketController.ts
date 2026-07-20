import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ListPreviousTicketMessagesService from "../services/TicketServices/ListPreviousTicketMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import CreateMessageService from "../services/MessageServices/CreateMessageService";
import {
  buildSatisfactionSurveyMessage,
  getActiveSatisfactionSurvey,
  markSatisfactionSurveySent
} from "../services/SatisfactionSurveyServices/SatisfactionSurveyService";
import FormatTicketTemplate from "../helpers/FormatTicketTemplate";
import {
  validateManualTicketAcceptance
} from "../services/QueueService/QueueDistributionService";
import { assertUserCanAccessTicket } from "../helpers/TicketAccess";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date: string;
  showAll: string;
  withUnreadMessages: string;
  queueIds: string;
  triageOnly: string;
};

interface TicketData {
  contactId: number;
  status: string;
  queueId: number | null;
  userId: number;
  categoryId?: number;
  closingReasonId?: number;
  closingNote?: string;
  sendFarewellMessage?: boolean;
  sendSatisfactionSurvey?: boolean;
  assumeAi?: boolean;
  forceAcceptOverLimit?: boolean;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    withUnreadMessages,
    triageOnly
  } = req.query as IndexQuery;

  const userId = req.user.id;

  let queueIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    pageNumber,
    status,
    date,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    triageOnly,
    requesterProfile: req.user.profile
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId, queueId }: TicketData = req.body;

  const ticket = await CreateTicketService({ contactId, status, userId, queueId: queueId || undefined });

  const io = getIO();
  io.to(ticket.status).emit("ticket", {
    action: "update",
    ticket
  });

  return res.status(200).json(ticket);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;

  await assertUserCanAccessTicket(req.user.id, req.user.profile, ticketId);
  const contact = await ShowTicketService(ticketId);

  return res.status(200).json(contact);
};

export const previousMessages = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as { pageNumber: string };

  await assertUserCanAccessTicket(req.user.id, req.user.profile, ticketId);
  const result = await ListPreviousTicketMessagesService({
    ticketId,
    pageNumber
  });

  return res.status(200).json(result);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const ticketData: TicketData = req.body;

  if (ticketData.status === "open" && ticketData.userId) {
    await validateManualTicketAcceptance({
      ticketId,
      userId: Number(ticketData.userId),
      requesterProfile: req.user.profile,
      forceAcceptOverLimit: ticketData.forceAcceptOverLimit === true
    });
  }

  const { ticket, oldStatus } = await UpdateTicketService({
    ticketData,
    ticketId
  });

  if (ticketData.assumeAi === true) {
    await CreateMessageService({
      messageData: {
        id: `ai-assumed-${ticket.id}-${Date.now()}`,
        ticketId: ticket.id,
        body: `Atendimento assumido por ${ticket.user?.name || "usuario"}. IA desativada para este atendimento.`,
        fromMe: true,
        read: true,
        mediaType: "chat",
        ack: 1
      }
    });
  }

  if (
    ticketData.status === "open" &&
    !!ticketData.userId &&
    ticketData.sendFarewellMessage === undefined &&
    oldStatus === "pending" &&
    ticket.status === "open" &&
    !ticket.isGroup &&
    ticket.user?.attendanceGreeting
  ) {
    await SendWhatsAppMessage({
      body: ticket.user.attendanceGreeting,
      ticket
    });
  }

  if (ticket.status === "closed" && oldStatus !== "closed") {
    const whatsapp = await ShowWhatsAppService(ticket.whatsappId);

    const closingReason = ticket.closingReason;
    const farewellMessage =
      ticketData.sendFarewellMessage === true &&
      closingReason?.sendFarewellMessage &&
      closingReason.farewellMessage
        ? closingReason.farewellMessage
        : ticketData.sendFarewellMessage === true
          ? whatsapp.farewellMessage
          : null;

    const survey = await getActiveSatisfactionSurvey();
    const shouldSendSurvey =
      !!survey &&
      !ticket.isGroup &&
      (survey.sendMode === "always" || ticketData.sendSatisfactionSurvey === true);

    if (farewellMessage) {
      await SendWhatsAppMessage({
        body: await FormatTicketTemplate(farewellMessage, ticket),
        ticket
      });
    }

    if (survey && shouldSendSurvey) {
      await SendWhatsAppMessage({
        body: await buildSatisfactionSurveyMessage(ticket, survey),
        ticket
      });
      await markSatisfactionSurveySent(ticket, survey);
    }
  }

  return res.status(200).json(ticket);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;

  const ticket = await DeleteTicketService(ticketId);

  const io = getIO();
  io.to(ticket.status).to(ticketId).to("notification").emit("ticket", {
    action: "delete",
    ticketId: +ticketId
  });

  return res.status(200).json({ message: "ticket deleted" });
};
