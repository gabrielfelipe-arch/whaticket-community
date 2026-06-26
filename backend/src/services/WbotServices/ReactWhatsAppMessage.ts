import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { whatsappProvider } from "../../providers/WhatsApp";

interface Request {
  messageId: string;
  emoji: string;
  userId: number;
}

const ReactWhatsAppMessage = async ({
  messageId,
  emoji,
  userId
}: Request): Promise<Message> => {
  const message = await Message.findByPk(messageId, {
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new AppError("No message found with this ID.", 404);
  }

  const { ticket } = message;
  if (!ticket.whatsappId) {
    throw new AppError("ERR_TICKET_NO_WHATSAPP");
  }

  const chatId = `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`;
  const normalizedEmoji = String(emoji || "").trim();

  await whatsappProvider.reactMessage(
    ticket.whatsappId,
    chatId,
    message.id,
    message.fromMe,
    normalizedEmoji
  );

  const reactions = {
    ...((message.reactions as Record<string, string>) || {})
  };

  if (normalizedEmoji) {
    reactions[String(userId)] = normalizedEmoji;
  } else {
    delete reactions[String(userId)];
  }

  await message.update({ reactions });

  const reloadedMessage = await Message.findByPk(message.id, {
    include: [
      "contact",
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ]
  });

  const io = getIO();
  io.to(message.ticketId.toString()).emit("appMessage", {
    action: "update",
    message: reloadedMessage || message
  });

  return reloadedMessage || message;
};

export default ReactWhatsAppMessage;
