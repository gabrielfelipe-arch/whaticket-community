import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";

interface TicketData {
  status?: string;
  userId?: number;
  queueId?: number | null;
  whatsappId?: number;
  categoryId?: number;
  closingReasonId?: number;
  closingNote?: string;
  aiActive?: boolean;
  aiHandled?: boolean;
  aiQueueId?: number | null;
  aiStartedAt?: Date | null;
  aiFinishedAt?: Date | null;
  aiHumanHandoffAt?: Date | null;
  aiHumanHandoffQueueId?: number | null;
  aiHumanHandoffMessage?: string | null;
  aiTaggerClassifiedAt?: Date | null;
  aiAutoClosed?: boolean;
  aiAutoClosedAt?: Date | null;
  aiAutoCloseEnabled?: boolean;
  aiAutoCloseMinutes?: number | null;
  aiAutoCloseMessage?: string | null;
  aiAutoCloseReasonId?: number | null;
  aiAutoCloseOnlyIfNotHandedOff?: boolean;
  aiSettingId?: number | null;
  aiHumanHandoffAlertSent?: boolean;
  aiHandoffAlertEnabled?: boolean | null;
  aiHandoffAlertTo?: string | null;
  aiHandoffAlertMessage?: string | null;
  lastAiQuestionType?: string | null;
  lastAiQuestionOptions?: string | null;
  lastAiQuestionAt?: Date | null;
  lastAiQuestionAttempts?: number;
  lastAiInteractionAt?: Date | null;
  lastAiMessage?: string | null;
  lastAiExpectedReply?: string | null;
  lastAiIntent?: string | null;
  lastAiAction?: string | null;
  lastAiKnowledgeIds?: string | null;
  lastAiDecisionReason?: string | null;
  lastAiAskedMoreHelp?: boolean;
  aiInteractionCount?: number;
  aiConversationSummary?: string | null;
  uraFlowId?: number | null;
  uraMenuSentAt?: Date | null;
  currentUraOptionId?: number | null;
  uraInvalidAttempts?: number;
  uraActive?: boolean;
  lastUraInteractionAt?: Date | null;
  automationClosed?: boolean;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId
}: Request): Promise<Response> => {
  const {
    status,
    userId,
    queueId,
    whatsappId,
    categoryId,
    closingReasonId,
    closingNote,
    aiActive,
    aiHandled,
    aiQueueId,
    aiStartedAt,
    aiFinishedAt,
    aiHumanHandoffAt,
    aiHumanHandoffQueueId,
    aiHumanHandoffMessage,
    aiTaggerClassifiedAt,
    aiAutoClosed,
    aiAutoClosedAt,
    aiAutoCloseEnabled,
    aiAutoCloseMinutes,
    aiAutoCloseMessage,
    aiAutoCloseReasonId,
    aiAutoCloseOnlyIfNotHandedOff,
    aiSettingId,
    aiHumanHandoffAlertSent,
    aiHandoffAlertEnabled,
    aiHandoffAlertTo,
    aiHandoffAlertMessage,
    lastAiQuestionType,
    lastAiQuestionOptions,
    lastAiQuestionAt,
    lastAiQuestionAttempts,
    lastAiInteractionAt,
    lastAiMessage,
    lastAiExpectedReply,
    lastAiIntent,
    lastAiAction,
    lastAiKnowledgeIds,
    lastAiDecisionReason,
    lastAiAskedMoreHelp,
    aiInteractionCount,
    aiConversationSummary,
    uraFlowId,
    uraMenuSentAt,
    currentUraOptionId,
    uraInvalidAttempts,
    uraActive,
    lastUraInteractionAt,
    automationClosed
  } = ticketData;

  const ticket = await ShowTicketService(ticketId);
  await SetTicketMessagesAsRead(ticket);

  const closingByAiContext = status === "closed" && aiHandled === true && !aiAutoClosed;
  const closingByAutomationContext = status === "closed" && automationClosed === true;

  if (status === "closed" && !ticket.isGroup && !aiAutoClosed && !closingByAiContext && !closingByAutomationContext && (!categoryId || !closingReasonId)) {
    throw new AppError("ERR_CLOSING_FIELDS_REQUIRED", 400);
  }

  if (status === "closed" && !ticket.isGroup && (aiAutoClosed || closingByAiContext || closingByAutomationContext) && !closingReasonId) {
    throw new AppError("ERR_CLOSING_REASON_REQUIRED", 400);
  }

  if (whatsappId && ticket.whatsappId !== whatsappId) {
    await CheckContactOpenTickets(ticket.contactId, whatsappId);
  }

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
  }

  const shouldDisableBot = status === "closed" || (status === "open" && !!userId);
  const shouldDisableUra = status === "closed" || (status === "open" && !!userId);
  const disableBotAt = shouldDisableBot && ticket.aiActive ? new Date() : aiFinishedAt;

  await ticket.update({
    status,
    queueId,
    userId,
    categoryId,
    closingReasonId,
    closingNote,
    aiActive: shouldDisableBot ? false : aiActive,
    aiHandled,
    aiQueueId,
    aiStartedAt,
    aiFinishedAt: disableBotAt,
    aiHumanHandoffAt,
    aiHumanHandoffQueueId,
    aiHumanHandoffMessage,
    aiTaggerClassifiedAt,
    aiAutoClosed,
    aiAutoClosedAt,
    aiAutoCloseEnabled,
    aiAutoCloseMinutes,
    aiAutoCloseMessage,
    aiAutoCloseReasonId,
    aiAutoCloseOnlyIfNotHandedOff,
    aiSettingId: shouldDisableBot ? null : aiSettingId,
    aiHumanHandoffAlertSent,
    aiHandoffAlertEnabled,
    aiHandoffAlertTo,
    aiHandoffAlertMessage,
    lastAiQuestionType: shouldDisableBot ? null : lastAiQuestionType,
    lastAiQuestionOptions: shouldDisableBot ? null : lastAiQuestionOptions,
    lastAiQuestionAt: shouldDisableBot ? null : lastAiQuestionAt,
    lastAiQuestionAttempts: shouldDisableBot ? 0 : lastAiQuestionAttempts,
    lastAiInteractionAt,
    lastAiMessage,
    lastAiExpectedReply: shouldDisableBot ? null : lastAiExpectedReply,
    lastAiIntent,
    lastAiAction,
    lastAiKnowledgeIds,
    lastAiDecisionReason,
    lastAiAskedMoreHelp: shouldDisableBot ? false : lastAiAskedMoreHelp,
    aiInteractionCount,
    aiConversationSummary,
    uraFlowId,
    uraMenuSentAt,
    currentUraOptionId: shouldDisableUra ? null : currentUraOptionId,
    uraInvalidAttempts,
    uraActive: shouldDisableUra ? false : uraActive,
    lastUraInteractionAt
  });

  if (whatsappId) {
    await ticket.update({
      whatsappId
    });
  }

  const updatedTicket = await ShowTicketService(ticket.id);

  const io = getIO();

  if (updatedTicket.status !== oldStatus || updatedTicket.user?.id !== oldUserId) {
    io.to(oldStatus).emit("ticket", {
      action: "delete",
      ticketId: updatedTicket.id
    });
  }

  io.to(updatedTicket.status)
    .to("notification")
    .to(ticketId.toString())
    .emit("ticket", {
      action: "update",
      ticket: updatedTicket
    });

  return { ticket: updatedTicket, oldStatus, oldUserId };
};

export default UpdateTicketService;
