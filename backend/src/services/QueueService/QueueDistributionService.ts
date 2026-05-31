import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import FormatTicketTemplate from "../../helpers/FormatTicketTemplate";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import QueueDistributionLog from "../../models/QueueDistributionLog";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";

export const DISTRIBUTION_MODES = [
  "manual_free",
  "manual_limit",
  "manual_balanced",
  "auto_least_load",
  "round_robin",
  "least_load_round_robin"
];

const AUTO_MODES = ["auto_least_load", "round_robin", "least_load_round_robin"];
const OPEN_STATUSES = ["open"];

const DEFAULT_QUEUE_POSITION_MESSAGE =
  "Atendimento nº {{ticketId}} criado com sucesso.\n\n" +
  "Você foi encaminhado para a fila {{queueName}}.\n" +
  "Sua posição atual é: {{position}}º.\n\n" +
  "Aguarde, em breve um atendente irá te chamar.";

type LogData = {
  ticketId?: number | null;
  queueId?: number | null;
  userId?: number | null;
  action: string;
  distributionMode?: string | null;
  attendantStatus?: string | null;
  userActiveTickets?: number | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

const createLog = async ({
  metadata,
  ...data
}: LogData): Promise<void> => {
  await QueueDistributionLog.create({
    ...data,
    metadata: metadata ? JSON.stringify(metadata) : null
  } as any);
};

const activeTicketCount = async (userId: number, queueId: number): Promise<number> =>
  Ticket.count({
    where: {
      userId,
      queueId,
      status: { [Op.in]: OPEN_STATUSES }
    }
  });

const pendingPosition = async (ticket: Ticket): Promise<number> => {
  if (!ticket.queueId) return 1;
  const count = await Ticket.count({
    where: {
      queueId: ticket.queueId,
      status: "pending",
      userId: null,
      id: { [Op.lte]: ticket.id }
    }
  });
  return Math.max(count, 1);
};

const ticketWithDistributionIncludes = async (ticketId: number | string): Promise<Ticket> => {
  const ticket = await Ticket.findByPk(ticketId, {
    include: [
      "contact",
      { model: Queue, as: "queue", include: [{ model: User, as: "users" }] },
      { model: User, as: "user" }
    ]
  });

  if (!ticket) throw new AppError("ERR_NO_TICKET_FOUND", 404);
  return ticket;
};

const onlineUsersForQueue = async (queue: Queue): Promise<User[]> => {
  await queue.reload({ include: [{ model: User, as: "users" }] });
  return (queue.users || []).filter(user => user.operationalStatus === "online");
};

const loadCandidates = async (queue: Queue): Promise<Array<{ user: User; load: number }>> => {
  const onlineUsers = await onlineUsersForQueue(queue);
  const candidates = await Promise.all(
    onlineUsers.map(async user => ({
      user,
      load: await activeTicketCount(user.id, queue.id)
    }))
  );

  const limit = queue.maxActiveTicketsPerUser;
  if (!limit || queue.overflowAction === "allow_overflow") return candidates;
  return candidates.filter(candidate => candidate.load < limit);
};

const nextByRoundRobin = (
  candidates: Array<{ user: User; load: number }>,
  lastAssignedUserId?: number | null
) => {
  if (!candidates.length) return null;
  const ordered = [...candidates].sort((a, b) => a.user.id - b.user.id);
  const lastIndex = lastAssignedUserId
    ? ordered.findIndex(candidate => candidate.user.id === Number(lastAssignedUserId))
    : -1;
  return ordered[(lastIndex + 1) % ordered.length];
};

const chooseCandidate = async (queue: Queue) => {
  const candidates = await loadCandidates(queue);
  if (!candidates.length) return null;

  if (queue.distributionMode === "round_robin") {
    return nextByRoundRobin(candidates, queue.lastAssignedUserId);
  }

  if (queue.distributionMode === "auto_least_load") {
    return [...candidates].sort((a, b) => a.load - b.load || a.user.name.localeCompare(b.user.name))[0];
  }

  if (queue.distributionMode === "least_load_round_robin") {
    const minLoad = Math.min(...candidates.map(candidate => candidate.load));
    const leastLoaded = candidates.filter(candidate => candidate.load === minLoad);
    return nextByRoundRobin(leastLoaded, queue.lastAssignedUserId) || leastLoaded[0];
  }

  return null;
};

const hasStalledTicket = async (userId: number, queue: Queue): Promise<boolean> => {
  if (!queue.blockIfUserHasStalledTicket || !queue.stalledTicketMinutes) return false;

  const threshold = new Date(Date.now() - Number(queue.stalledTicketMinutes) * 60 * 1000);
  const tickets = await Ticket.findAll({
    where: {
      userId,
      queueId: queue.id,
      status: "open"
    },
    attributes: ["id"]
  });

  for (const ticket of tickets) {
    const lastMessage = await Message.findOne({
      where: { ticketId: ticket.id },
      order: [["createdAt", "DESC"]]
    });
    if (lastMessage && !lastMessage.fromMe && lastMessage.createdAt < threshold) {
      return true;
    }
  }

  return false;
};

const renderQueuePositionMessage = async (ticket: Ticket, queue: Queue, position: number) => {
  const raw = queue.queuePositionMessage || DEFAULT_QUEUE_POSITION_MESSAGE;
  return FormatTicketTemplate(
    raw
      .replace(/{{\s*ticketId\s*}}/gi, String(ticket.id))
      .replace(/{{\s*queueName\s*}}/gi, queue.name)
      .replace(/{{\s*position\s*}}/gi, String(position))
      .replace(/{{\s*contactName\s*}}/gi, ticket.contact?.name || ""),
    ticket
  );
};

export const sendInitialQueuePositionMessage = async (
  ticketId: number | string
): Promise<void> => {
  const ticket = await ticketWithDistributionIncludes(ticketId);
  const queue = ticket.queue;
  if (!queue || !ticket.contact || ticket.queuePositionMessageSentAt || !queue.sendQueuePositionMessage) {
    return;
  }

  const position = await pendingPosition(ticket);
  const body = await renderQueuePositionMessage(ticket, queue, position);

  await SendWhatsAppMessage({ body, ticket });
  await ticket.update({ queuePositionMessageSentAt: new Date() });
  await createLog({
    ticketId: ticket.id,
    queueId: queue.id,
    action: "queue_position_message_sent",
    distributionMode: queue.distributionMode,
    reason: "Mensagem inicial de posição enviada.",
    metadata: { position }
  });
};

export const distributeTicketIfNeeded = async (
  ticketId: number | string
): Promise<Ticket> => {
  const ticket = await ticketWithDistributionIncludes(ticketId);
  const queue = ticket.queue;

  if (!queue || ticket.userId || ticket.status === "closed" || queue.useAI) {
    return ticket;
  }

  await sendInitialQueuePositionMessage(ticket.id);

  if (!AUTO_MODES.includes(queue.distributionMode)) {
    await createLog({
      ticketId: ticket.id,
      queueId: queue.id,
      action: "queue_entry_waiting",
      distributionMode: queue.distributionMode,
      reason: "Fila configurada para aceite manual."
    });
    return ticket;
  }

  const candidate = await chooseCandidate(queue);

  if (!candidate) {
    await createLog({
      ticketId: ticket.id,
      queueId: queue.id,
      action: "no_online_attendant_available",
      distributionMode: queue.distributionMode,
      reason: "Nenhum atendente online disponível para esta fila."
    });
    return ticket;
  }

  await ticket.update({
    userId: candidate.user.id,
    status: "open"
  });
  await queue.update({ lastAssignedUserId: candidate.user.id });

  await createLog({
    ticketId: ticket.id,
    queueId: queue.id,
    userId: candidate.user.id,
    action: "auto_assigned",
    distributionMode: queue.distributionMode,
    attendantStatus: candidate.user.operationalStatus,
    userActiveTickets: candidate.load,
    reason: "Atendimento distribuído automaticamente."
  });

  return ticketWithDistributionIncludes(ticket.id);
};

export const validateManualTicketAcceptance = async ({
  ticketId,
  userId,
  requesterProfile
}: {
  ticketId: number | string;
  userId: number;
  requesterProfile: string;
}): Promise<void> => {
  const ticket = await ticketWithDistributionIncludes(ticketId);
  const queue = ticket.queue;
  if (!queue) return;

  const user = await User.findByPk(userId, { include: ["queues"] });
  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);

  if (requesterProfile !== "admin" && user.operationalStatus !== "online") {
    await createLog({
      ticketId: ticket.id,
      queueId: queue.id,
      userId,
      action: "manual_accept_blocked_status",
      distributionMode: queue.distributionMode,
      attendantStatus: user.operationalStatus,
      reason: "Atendente não está Online."
    });
    throw new AppError("Você precisa estar Online para aceitar novos atendimentos.", 400);
  }

  const userQueueIds = (user.queues || []).map(userQueue => userQueue.id);
  if (!userQueueIds.includes(queue.id) && requesterProfile !== "admin") {
    throw new AppError("Você não está vinculado a esta fila.", 403);
  }

  const activeCount = await activeTicketCount(userId, queue.id);
  const limit = queue.maxActiveTicketsPerUser;

  if (
    limit &&
    activeCount >= limit &&
    queue.overflowAction !== "allow_overflow" &&
    requesterProfile !== "admin"
  ) {
    await createLog({
      ticketId: ticket.id,
      queueId: queue.id,
      userId,
      action: "manual_accept_blocked_limit",
      distributionMode: queue.distributionMode,
      attendantStatus: user.operationalStatus,
      userActiveTickets: activeCount,
      reason: "Limite máximo de atendimentos ativos atingido."
    });
    throw new AppError(
      "Você atingiu o limite de atendimentos ativos desta fila. Finalize ou transfira um atendimento antes de aceitar outro.",
      400
    );
  }

  if (
    queue.blockIfUserHasStalledTicket &&
    queue.stalledTicketAction === "block" &&
    requesterProfile !== "admin" &&
    await hasStalledTicket(userId, queue)
  ) {
    await createLog({
      ticketId: ticket.id,
      queueId: queue.id,
      userId,
      action: "manual_accept_blocked_stalled_ticket",
      distributionMode: queue.distributionMode,
      attendantStatus: user.operationalStatus,
      userActiveTickets: activeCount,
      reason: "Atendente possui atendimento parado."
    });
    throw new AppError(
      `Você possui atendimento parado sem resposta há mais de ${queue.stalledTicketMinutes} minutos. Responda, finalize ou transfira antes de aceitar novo atendimento.`,
      400
    );
  }

  if (queue.distributionMode === "manual_balanced" && queue.balanceAction === "block" && requesterProfile !== "admin") {
    const candidates = await loadCandidates(queue);
    const hasLowerLoad = candidates.some(candidate => candidate.user.id !== userId && candidate.load < activeCount);
    if (hasLowerLoad) {
      await createLog({
        ticketId: ticket.id,
        queueId: queue.id,
        userId,
        action: "manual_accept_blocked_balance",
        distributionMode: queue.distributionMode,
        attendantStatus: user.operationalStatus,
        userActiveTickets: activeCount,
        reason: "Existe outro atendente Online com menos atendimentos ativos."
      });
      throw new AppError(
        "Este atendimento não pode ser assumido agora. Existe outro atendente Online nesta fila com menos atendimentos ativos.",
        400
      );
    }
  }

  await createLog({
    ticketId: ticket.id,
    queueId: queue.id,
    userId,
    action: "manual_accept_allowed",
    distributionMode: queue.distributionMode,
    attendantStatus: user.operationalStatus,
    userActiveTickets: activeCount,
    reason: "Aceite manual permitido."
  });
};

export const logQueueEntry = async (ticketId: number | string): Promise<void> => {
  const ticket = await ticketWithDistributionIncludes(ticketId);
  await ticket.update({ queueEnteredAt: ticket.queueEnteredAt || new Date() });
  await createLog({
    ticketId: ticket.id,
    queueId: ticket.queueId,
    action: "queue_entry",
    distributionMode: ticket.queue?.distributionMode,
    reason: "Atendimento entrou na fila."
  });
};

export const updateUserOperationalStatus = async ({
  userId,
  status,
  reason = "manual"
}: {
  userId: number | string;
  status: "online" | "away" | "offline";
  reason?: string;
}): Promise<User> => {
  const user = await User.findByPk(userId, { include: ["queues", "whatsapp"] });
  if (!user) throw new AppError("ERR_NO_USER_FOUND", 404);

  const oldStatus = user.operationalStatus;
  await user.update({
    operationalStatus: status,
    lastActivityAt: new Date(),
    lastStatusChangeAt: new Date(),
    statusReason: reason
  });

  await createLog({
    userId: user.id,
    action: "user_status_changed",
    attendantStatus: status,
    reason,
    metadata: { oldStatus, newStatus: status }
  });

  await user.reload({ include: ["queues", "whatsapp"] });
  return user;
};

export const touchUserActivity = async (userId: number | string): Promise<void> => {
  await User.update(
    { lastActivityAt: new Date() },
    { where: { id: userId } }
  );
};
