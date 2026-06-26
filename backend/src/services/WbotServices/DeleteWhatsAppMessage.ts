import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { whatsappProvider } from "../../providers/WhatsApp";

const DeleteWhatsAppMessage = async (messageId: string): Promise<{ message: Message; beforeData: any }> => {
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
    throw new AppError("No message found with this ID.");
  }

  const { ticket } = message;
  const beforeData = {
    id: message.id,
    ticketId: message.ticketId,
    contactId: ticket.contactId,
    contactName: ticket.contact?.name,
    contactNumber: ticket.contact?.number,
    body: message.body,
    fromMe: message.fromMe,
    mediaType: message.mediaType,
    mediaUrl: message.mediaUrl,
    createdAt: message.createdAt
  };

  const chatId = `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`;

  await whatsappProvider.deleteMessage(
    ticket.whatsappId,
    chatId,
    message.id,
    message.fromMe
  );

  await message.update({ isDeleted: true });

  return { message, beforeData };
};

export default DeleteWhatsAppMessage;
