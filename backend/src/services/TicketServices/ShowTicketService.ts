import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import TicketCategory from "../../models/TicketCategory";
import ClosingReason from "../../models/ClosingReason";
import Tag from "../../models/Tag";

const ShowTicketService = async (id: string | number): Promise<Ticket> => {
  const ticket = await Ticket.findByPk(id, {
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "profilePicUrl"],
        include: [
          "extraInfo",
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "color"],
            through: { attributes: [] }
          }
        ]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "attendanceGreeting"]
      },
      {
        model: Queue,
        as: "queue",
        attributes: [
          "id",
          "name",
          "color",
          "greetingMessage",
          "useAI",
          "aiSettingId",
          "distributionMode",
          "maxActiveTicketsPerUser",
          "glpiEnabled"
        ]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["name"]
      },
      {
        model: TicketCategory,
        as: "category",
        attributes: ["id", "name"]
      },
      {
        model: ClosingReason,
        as: "closingReason",
        attributes: ["id", "name", "farewellMessage", "sendFarewellMessage"]
      }
    ]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  return ticket;
};

export default ShowTicketService;
