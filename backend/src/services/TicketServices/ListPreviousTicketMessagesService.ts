import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import GlpiTicketLink from "../../models/GlpiTicketLink";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import User from "../../models/User";

interface Request {
  ticketId: string | number;
  pageNumber?: string;
}

const limit = 1;

const ListPreviousTicketMessagesService = async ({
  ticketId,
  pageNumber = "1"
}: Request) => {
  const currentTicket = await Ticket.findByPk(ticketId);

  if (!currentTicket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const offset = limit * (Number(pageNumber || 1) - 1);

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: {
      id: { [Op.ne]: currentTicket.id },
      contactId: currentTicket.contactId,
      whatsappId: currentTicket.whatsappId
    },
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "profilePicUrl"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"]
      }
    ],
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    limit,
    offset
  });

  const groups = await Promise.all(
    tickets.map(async ticket => {
      const [messages, glpiLinks] = await Promise.all([
        Message.findAll({
          where: { ticketId: ticket.id },
          include: [
            "contact",
            {
              model: Message,
              as: "quotedMsg",
              include: ["contact"]
            }
          ],
          order: [["createdAt", "ASC"]]
        }),
        GlpiTicketLink.findAll({
          where: { ticketId: ticket.id },
          order: [["createdAt", "DESC"]]
        })
      ]);

      return {
        ticket,
        messages,
        glpiLinks
      };
    })
  );

  return {
    groups: groups.reverse(),
    count,
    hasMore: count > offset + tickets.length
  };
};

export default ListPreviousTicketMessagesService;
