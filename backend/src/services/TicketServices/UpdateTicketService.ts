import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import UserQueue from "../../models/UserQueue";
import ShowTicketService from "./ShowTicketService";
import {
  distributeTicketIfNeeded,
  logQueueEntry
} from "../QueueService/QueueDistributionService";

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

const nullableNumber = (value: unknown): number | null => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

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
  const normalizedCategoryId = nullableNumber(categoryId);
  const normalizedClosingReasonId = nullableNumber(closingReasonId);

  if (status === "closed" && !aiAutoClosed && !closingByAiContext && !closingByAutomationContext && (!normalizedCategoryId || !normalizedClosingReasonId)) {
    throw new AppError("ERR_CLOSING_FIELDS_REQUIRED", 400);
  }

  if (status === "closed" && (aiAutoClosed || closingByAiContext || closingByAutomationContext) && !normalizedClosingReasonId) {
    throw new AppError("ERR_CLOSING_REASON_REQUIRED", 400);
  }

  if (whatsappId && ticket.whatsappId !== whatsappId) {
    await CheckContactOpenTickets(ticket.contactId, whatsappId);
  }

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;
  const oldQueueId = ticket.queueId;

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
  }

  let effectiveQueueId = queueId;
  if (status === "open" && userId) {
    const userQueues = await UserQueue.findAll({ where: { userId } });
    const userQueueIds = userQueues.map(userQueue => userQueue.queueId).filter(Boolean);
    const requestedQueue = effectiveQueueId
      ? await Queue.findByPk(effectiveQueueId)
      : null;
    const currentQueue = !effectiveQueueId && ticket.queueId
      ? await Queue.findByPk(ticket.queueId)
      : null;
    const shouldChooseAttendanceQueue =
      !effectiveQueueId ||
      requestedQueue?.useAI ||
      currentQueue?.useAI ||
      ticket.aiActive ||
      ticket.uraActive;

    if (userQueueIds.length && shouldChooseAttendanceQueue) {
      const handoffQueue = ticket.aiHumanHandoffQueueId && userQueueIds.includes(ticket.aiHumanHandoffQueueId)
        ? await Queue.findByPk(ticket.aiHumanHandoffQueueId)
        : null;
      const glpiQueue = await Queue.findOne({
        where: {
          id: userQueueIds,
          glpiEnabled: true
        },
        order: [["id", "ASC"]]
      });
      effectiveQueueId = handoffQueue?.id || glpiQueue?.id || userQueueIds[0];
    }
  }

  const shouldDisableBot = status === "closed" || (status === "open" && !!userId);
  const shouldDisableUra = status === "closed" || (status === "open" && !!userId);
  const disableBotAt = shouldDisableBot && ticket.aiActive ? new Date() : aiFinishedAt;

  await ticket.update({
    status,
    queueId: effectiveQueueId,
    userId,
    categoryId: normalizedCategoryId,
    closingReasonId: normalizedClosingReasonId,
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

  let updatedTicket = await ShowTicketService(ticket.id);

  if (
    effectiveQueueId &&
    effectiveQueueId !== oldQueueId &&
    !updatedTicket.userId &&
    updatedTicket.status !== "closed"
  ) {
    await logQueueEntry(updatedTicket.id);
    updatedTicket = await distributeTicketIfNeeded(updatedTicket.id);
  }

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
