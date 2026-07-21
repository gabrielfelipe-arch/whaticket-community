import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import User from "../../models/User";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import ShowTicketService from "./ShowTicketService";
import UpdateTicketService from "./UpdateTicketService";

type TransferTargetType = "user" | "queue";

interface Request {
  ticketId: string | number;
  targetType: TransferTargetType;
  targetId: number;
  actorUserId: number;
  whatsappId?: number;
}

const displaySignature = (user?: User | null): string =>
  String(user?.messageSignature || user?.name || "Atendente").trim();

const TransferTicketService = async ({
  ticketId,
  targetType,
  targetId,
  actorUserId,
  whatsappId
}: Request) => {
  if (!Number.isInteger(targetId) || targetId <= 0) {
    throw new AppError("Destino da transferencia invalido.", 400);
  }

  const currentTicket = await ShowTicketService(ticketId);
  const actor = currentTicket.user || await User.findByPk(actorUserId, {
    attributes: ["id", "name", "messageSignature"]
  });
  const actorName = displaySignature(actor);

  if (targetType === "user") {
    if (Number(currentTicket.user?.id) === targetId) {
      throw new AppError("ERR_TRANSFER_SAME_USER", 400);
    }

    const targetUser = await User.findByPk(targetId, {
      attributes: ["id", "name", "messageSignature"]
    });
    if (!targetUser) {
      throw new AppError("ERR_NO_USER_FOUND", 404);
    }

    const { ticket } = await UpdateTicketService({
      ticketId,
      ticketData: {
        userId: targetUser.id,
        whatsappId
      }
    });
    await SendWhatsAppMessage({
      body: `O atendente *${actorName}* transferiu seu atendimento para *${displaySignature(targetUser)}*.`,
      ticket
    });

    return ticket;
  }

  if (targetType === "queue") {
    const targetQueue = await Queue.findByPk(targetId, {
      attributes: ["id", "name"]
    });
    if (!targetQueue) {
      throw new AppError("ERR_QUEUE_NOT_FOUND", 404);
    }

    const { ticket } = await UpdateTicketService({
      ticketId,
      ticketData: {
        queueId: targetQueue.id,
        userId: null,
        status: "pending",
        whatsappId
      }
    });
    await SendWhatsAppMessage({
      body: `O atendente *${actorName}* transferiu seu atendimento para *${targetQueue.name}*.`,
      ticket
    });

    return ticket;
  }

  throw new AppError("Tipo de transferencia invalido.", 400);
};

export default TransferTicketService;
