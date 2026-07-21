import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import ResolveMessageSenderType, {
  MessageSenderType
} from "../../helpers/ResolveMessageSenderType";
import SendPushNotificationService from "../PushNotificationServices/SendPushNotificationService";

interface MessageData {
  id: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  ack?: number;
  quotedMsgId?: string;
  senderType?: MessageSenderType;
  aiSessionStartedAt?: Date | null;
}
interface Request {
  messageData: MessageData;
}

const CreateMessageService = async ({
  messageData
}: Request): Promise<Message> => {
  const requestedSenderType: MessageSenderType =
    messageData.senderType ||
    (!messageData.fromMe
      ? "customer"
      : String(messageData.id || "").startsWith("ticket-history-")
        ? "system"
        : "human");

  const existingMessage =
    messageData.fromMe && requestedSenderType === "human"
      ? await Message.findByPk(messageData.id, {
          attributes: ["senderType", "aiSessionStartedAt"]
        })
      : null;

  const inferredSenderType = ResolveMessageSenderType({
    requestedSenderType,
    existingSenderType: existingMessage?.senderType,
    fromMe: messageData.fromMe
  });

  const normalizedMessageData = {
    ...messageData,
    senderType: inferredSenderType,
    aiSessionStartedAt:
      messageData.aiSessionStartedAt || existingMessage?.aiSessionStartedAt || null
  };

  await Message.upsert(normalizedMessageData);

  const message = await Message.findByPk(messageData.id, {
    include: [
      "contact",
      {
        model: Ticket,
        as: "ticket",
        include: [
          "contact",
          "queue",
          {
            model: Whatsapp,
            as: "whatsapp",
            attributes: ["name"]
          }
        ]
      },
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new Error("ERR_CREATING_MESSAGE");
  }

  const io = getIO();
  io.to(message.ticketId.toString())
    .to(message.ticket.status)
    .to("notification")
    .emit("appMessage", {
      action: "create",
      message,
      ticket: message.ticket,
      contact: message.ticket.contact
    });

  await SendPushNotificationService({
    message,
    ticket: message.ticket,
    contact: message.ticket.contact
  });

  return message;
};

export default CreateMessageService;
