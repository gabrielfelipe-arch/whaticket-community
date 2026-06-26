import AppError from "../errors/AppError";
import { isAdminProfile, isSupervisorProfile } from "./ProfilePermissions";
import Queue from "../models/Queue";
import Ticket from "../models/Ticket";
import User from "../models/User";

export const getUserQueueIds = async (userId: string | number): Promise<number[]> => {
  const user = await User.findByPk(userId, {
    include: [{ model: Queue, as: "queues", attributes: ["id"] }]
  });

  return (user?.queues || []).map(queue => Number(queue.id)).filter(Boolean);
};

export const userCanAccessTicket = async (
  userId: string | number,
  profile: string,
  ticket: Pick<Ticket, "userId" | "queueId" | "status">
): Promise<boolean> => {
  if (isAdminProfile(profile)) return true;

  const queueIds = await getUserQueueIds(userId);
  const queueAllowed = !ticket.queueId || queueIds.includes(Number(ticket.queueId));

  if (isSupervisorProfile(profile)) return queueAllowed;

  return queueAllowed && (
    Number(ticket.userId) === Number(userId) ||
    !ticket.userId
  );
};

export const assertUserCanAccessTicket = async (
  userId: string | number,
  profile: string,
  ticketId: string | number
): Promise<Ticket> => {
  const ticket = await Ticket.findByPk(ticketId, {
    attributes: ["id", "userId", "queueId", "status"]
  });

  if (!ticket) throw new AppError("ERR_NO_TICKET_FOUND", 404);
  if (!(await userCanAccessTicket(userId, profile, ticket))) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  return ticket;
};
