import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import { shouldUseTicketForSatisfactionResponse } from "../SatisfactionSurveyServices/SatisfactionSurveyService";

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  groupContact?: Contact,
  fromMe = false,
  incomingBody?: string
): Promise<Ticket> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      contactId: groupContact ? groupContact.id : contact.id,
      whatsappId: whatsappId
    }
  });

  if (ticket) {
    await ticket.update({ unreadMessages });
  }

  if (!ticket && groupContact && !fromMe) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id,
        whatsappId: whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      if (await shouldUseTicketForSatisfactionResponse(ticket, incomingBody)) {
        return ShowTicketService(ticket.id);
      }

      if (
        ticket.satisfactionSurveySentAt &&
        !ticket.satisfactionSurveyAnsweredAt &&
        ticket.status === "closed"
      ) {
        ticket = null;
      }
    }

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        aiActive: false,
        aiSettingId: null,
        aiQueueId: null,
        aiFinishedAt: new Date(),
        lastAiQuestionType: null,
        lastAiQuestionOptions: null,
        lastAiQuestionAt: null,
        lastAiQuestionAttempts: 0,
        lastAiMessage: null,
        lastAiExpectedReply: null,
        lastAiIntent: null,
        lastAiAction: null,
        lastAiKnowledgeIds: null,
        lastAiDecisionReason: null,
        lastAiAskedMoreHelp: false,
        aiInteractionCount: 0,
        aiConversationSummary: null,
        uraFlowId: null,
        uraMenuSentAt: null,
        currentUraOptionId: null,
        uraInvalidAttempts: 0,
        uraActive: false,
        lastUraInteractionAt: null,
        queueId: null,
        unreadMessages
      });
    }
  }

  if (!ticket && !groupContact && !fromMe) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        contactId: contact.id,
        whatsappId: whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      if (await shouldUseTicketForSatisfactionResponse(ticket, incomingBody)) {
        return ShowTicketService(ticket.id);
      }

      if (
        ticket.satisfactionSurveySentAt &&
        !ticket.satisfactionSurveyAnsweredAt &&
        ticket.status === "closed"
      ) {
        ticket = null;
      }
    }

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        queueId: null,
        categoryId: null,
        closingReasonId: null,
        closingNote: null,
        aiActive: false,
        aiSettingId: null,
        aiQueueId: null,
        aiFinishedAt: new Date(),
        lastAiQuestionType: null,
        lastAiQuestionOptions: null,
        lastAiQuestionAt: null,
        lastAiQuestionAttempts: 0,
        lastAiMessage: null,
        lastAiExpectedReply: null,
        lastAiIntent: null,
        lastAiAction: null,
        lastAiKnowledgeIds: null,
        lastAiDecisionReason: null,
        lastAiAskedMoreHelp: false,
        aiInteractionCount: 0,
        aiConversationSummary: null,
        uraFlowId: null,
        uraMenuSentAt: null,
        currentUraOptionId: null,
        uraInvalidAttempts: 0,
        uraActive: false,
        lastUraInteractionAt: null,
        unreadMessages
      });
    }
  }

  if (!ticket && !fromMe) {
    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId
    });
  }

  if (!ticket) {
    throw new Error("ERR_NO_OPEN_TICKET_FOR_OUTGOING_MESSAGE");
  }

  ticket = await ShowTicketService(ticket.id);

  return ticket;
};

export default FindOrCreateTicketService;
