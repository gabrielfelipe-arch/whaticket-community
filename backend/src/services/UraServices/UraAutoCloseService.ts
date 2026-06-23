import { Op } from "sequelize";

import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import UraFlow from "../../models/UraFlow";
import UraOption from "../../models/UraOption";
import { whatsappProvider } from "../../providers/WhatsApp/whatsappProvider";
import CreateMessageService from "../MessageServices/CreateMessageService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import { logger } from "../../utils/logger";

let running = false;

const chatIdForContact = (contact: Contact): string =>
  `${contact.number}@${contact.isGroup ? "g" : "c"}.us`;

const sendUraAutoCloseMessage = async (
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
      aiSessionStartedAt: null,
      read: true,
      mediaType: sentMessage.type,
      ack: sentMessage.ack !== undefined ? sentMessage.ack : 1
    }
  });
};

const processTicket = async (ticket: Ticket): Promise<void> => {
  if (!ticket.uraActive) return;
  if (ticket.aiActive) return;
  if (ticket.userId) return;
  if (!ticket.uraFlowId) return;
  if (!ticket.lastUraInteractionAt) return;

  const flow = await UraFlow.findByPk(ticket.uraFlowId);
  if (!flow || !flow.active) return;

  const option = ticket.currentUraOptionId
    ? await UraOption.findByPk(ticket.currentUraOptionId)
    : null;
  const source = ticket.aiAutoCloseEnabled
    ? ticket
    : option?.aiAutoCloseEnabled
      ? option
      : flow.aiAutoCloseEnabled
        ? flow
        : null;
  if (!source) return;
  if (source.aiAutoCloseOnlyIfNotHandedOff !== false && ticket.aiHumanHandoffAt) return;

  if (!source.aiAutoCloseMinutes || Number(source.aiAutoCloseMinutes) <= 0) return;
  if (!source.aiAutoCloseMessage || !source.aiAutoCloseReasonId) {
    logger.warn(
      {
        ticketId: ticket.id,
        uraFlowId: flow.id,
        uraOptionId: option?.id || null,
        autoCloseMessage: !!source.aiAutoCloseMessage,
        autoCloseReasonId: source.aiAutoCloseReasonId
      },
      "Automatic attendance close skipped because URA configuration is incomplete"
    );
    return;
  }

  const lastCustomerMessage = await Message.findOne({
    where: { ticketId: ticket.id, fromMe: false },
    order: [["createdAt", "DESC"]]
  });

  const lastUraAt = new Date(ticket.lastUraInteractionAt).getTime();
  const lastCustomerAt = lastCustomerMessage
    ? new Date(lastCustomerMessage.createdAt).getTime()
    : 0;
  const lastActivityAt = Math.max(lastUraAt, lastCustomerAt);
  const elapsedMs = Date.now() - lastActivityAt;
  const requiredMs = Number(source.aiAutoCloseMinutes) * 60 * 1000;
  if (elapsedMs < requiredMs) return;

  const contact = await Contact.findByPk(ticket.contactId);
  if (!contact) return;

  await sendUraAutoCloseMessage(ticket, contact, source.aiAutoCloseMessage);

  await UpdateTicketService({
    ticketId: ticket.id,
    ticketData: {
      status: "closed",
      closingReasonId: source.aiAutoCloseReasonId,
      closingNote: "Encerrado automaticamente por inatividade na URA",
      aiActive: false,
      aiSettingId: null,
      uraActive: false,
      currentUraOptionId: null,
      automationClosed: true
    }
  });
};

const RunUraAutoCloseService = async (): Promise<void> => {
  if (running) return;
  running = true;

  try {
    const tickets = await Ticket.findAll({
      where: {
        status: { [Op.in]: ["open", "pending"] },
        uraActive: true,
        aiActive: false,
        userId: null
      },
      order: [["updatedAt", "ASC"]],
      limit: 50
    });

    for (const ticket of tickets) {
      try {
        await processTicket(ticket);
      } catch (err) {
        logger.error({ err, ticketId: ticket.id }, "Error auto closing URA ticket");
      }
    }
  } finally {
    running = false;
  }
};

export const StartUraAutoClose = (): void => {
  setInterval(() => {
    RunUraAutoCloseService().catch(err =>
      logger.error({ err }, "Error running URA auto close")
    );
  }, 60000);
};

export default RunUraAutoCloseService;
