import { Op } from "sequelize";

import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { whatsappProvider } from "../../providers/WhatsApp/whatsappProvider";
import CreateMessageService from "../MessageServices/CreateMessageService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import { logger } from "../../utils/logger";

let running = false;

const chatIdForContact = (contact: Contact): string =>
  `${contact.number}@${contact.isGroup ? "g" : "c"}.us`;

const sendAutoCloseMessage = async (
  ticket: Ticket,
  contact: Contact,
  body: string
): Promise<void> => {
  const sentMessage = await whatsappProvider.sendMessage(
    ticket.whatsappId,
    chatIdForContact(contact),
    body,
    { linkPreview: false }
  );

  await CreateMessageService({
    messageData: {
      id: sentMessage.id,
      ticketId: ticket.id,
      body: sentMessage.body || body,
      fromMe: true,
      senderType: "system",
      aiSessionStartedAt: ticket.aiStartedAt,
      read: true,
      mediaType: sentMessage.type,
      ack: sentMessage.ack !== undefined ? sentMessage.ack : 1
    }
  });
};

const processTicket = async (ticket: Ticket): Promise<void> => {
  if (!ticket.aiAutoCloseEnabled) return;
  if (!ticket.aiAutoCloseMinutes || Number(ticket.aiAutoCloseMinutes) <= 0) return;
  if (!ticket.aiAutoCloseMessage || !ticket.aiAutoCloseReasonId) {
    logger.warn(
      {
        ticketId: ticket.id,
        aiAutoCloseMessage: !!ticket.aiAutoCloseMessage,
        aiAutoCloseReasonId: ticket.aiAutoCloseReasonId
      },
      "AI auto close skipped because configuration is incomplete"
    );
    return;
  }
  if (!ticket.aiActive) return;
  if (ticket.aiAutoCloseOnlyIfNotHandedOff && ticket.aiHumanHandoffAt) return;
  if (ticket.userId) return;

  const aiQueueId = ticket.aiQueueId;
  if (aiQueueId && Number(ticket.queueId) !== Number(aiQueueId)) return;

  const lastMessage = await Message.findOne({
    where: { ticketId: ticket.id },
    order: [["createdAt", "DESC"]]
  });

  if (!lastMessage || !lastMessage.fromMe) return;

  const lastCustomerMessage = await Message.findOne({
    where: { ticketId: ticket.id, fromMe: false },
    order: [["createdAt", "DESC"]]
  });

  if (
    lastCustomerMessage &&
    new Date(lastCustomerMessage.createdAt).getTime() > new Date(lastMessage.createdAt).getTime()
  ) {
    return;
  }

  const elapsedMs = Date.now() - new Date(lastMessage.createdAt).getTime();
  const requiredMs = Number(ticket.aiAutoCloseMinutes) * 60 * 1000;
  if (elapsedMs < requiredMs) return;

  const contact = await Contact.findByPk(ticket.contactId);
  if (!contact) return;

  await sendAutoCloseMessage(ticket, contact, ticket.aiAutoCloseMessage);

  await UpdateTicketService({
    ticketId: ticket.id,
    ticketData: {
      status: "closed",
      categoryId: ticket.categoryId,
      closingReasonId: ticket.aiAutoCloseReasonId,
      aiActive: false,
      aiHandled: true,
      aiAutoClosed: true,
      aiAutoClosedAt: new Date(),
      aiFinishedAt: new Date(),
      aiSettingId: ticket.aiSettingId
    }
  });
};

const RunAiAutoCloseService = async (): Promise<void> => {
  if (running) return;
  running = true;

  try {
    const tickets = await Ticket.findAll({
      where: {
        status: { [Op.in]: ["open", "pending"] },
        aiHandled: true,
        aiActive: true,
        aiAutoClosed: false
      },
      order: [["updatedAt", "ASC"]],
      limit: 30
    });

    for (const ticket of tickets) {
      try {
        await processTicket(ticket);
      } catch (err) {
        logger.error({ err, ticketId: ticket.id }, "Error auto closing AI ticket");
      }
    }
  } finally {
    running = false;
  }
};

export const StartAiAutoClose = (): void => {
  setInterval(() => {
    RunAiAutoCloseService().catch(err =>
      logger.error({ err }, "Error running AI auto close")
    );
  }, 60000);
};

export default RunAiAutoCloseService;
