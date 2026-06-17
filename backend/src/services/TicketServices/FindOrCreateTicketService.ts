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

  if (!ticket && !groupContact && !fromMe) {
    const satisfactionTicket = await Ticket.findOne({
      where: {
        contactId: contact.id,
        whatsappId: whatsappId,
        status: "closed",
        satisfactionSurveyId: { [Op.gt]: 0 }
      },
      order: [["updatedAt", "DESC"]]
    });

    if (
      satisfactionTicket &&
      await shouldUseTicketForSatisfactionResponse(satisfactionTicket, incomingBody)
    ) {
      return ShowTicketService(satisfactionTicket.id);
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
