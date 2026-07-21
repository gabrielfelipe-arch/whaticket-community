import { Op, fn, where, col, Filterable, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import TicketCategory from "../../models/TicketCategory";
import ClosingReason from "../../models/ClosingReason";
import User from "../../models/User";
import { getUserQueueIds } from "../../helpers/TicketAccess";
import { isAdminProfile, isSupervisorProfile } from "../../helpers/ProfilePermissions";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  showAll?: string;
  userId: string;
  withUnreadMessages?: string;
  queueIds: number[];
  triageOnly?: string;
  requesterProfile?: string;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const ListTicketsService = async ({
  searchParam = "",
  pageNumber = "1",
  queueIds,
  status,
  date,
  showAll,
  userId,
  withUnreadMessages,
  triageOnly,
  requesterProfile = "user"
}: Request): Promise<Response> => {
  const admin = isAdminProfile(requesterProfile);
  const supervisor = isSupervisorProfile(requesterProfile);
  const canShowAll = showAll === "true" && (admin || supervisor);
  const userQueueIds = admin && queueIds.length ? [] : await getUserQueueIds(userId);
  const effectiveQueueIds = queueIds.length ? queueIds : userQueueIds;
  const queueCondition: Record<string, any> = {};
  if (!admin || effectiveQueueIds.length) {
    queueCondition.queueId = { [Op.or]: [effectiveQueueIds, null] };
  }
  const userVisibilityCondition: Record<string, any> = {
    [Op.or]: [{ userId }, { userId: null }],
    ...queueCondition
  };
  let whereCondition: Filterable["where"] = canShowAll || (supervisor && showAll === "true")
    ? queueCondition
    : userVisibilityCondition;
  let includeCondition: Includeable[];

  includeCondition = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "profilePicUrl"]
    },
    {
      model: User,
      as: "user",
      attributes: ["id", "name"],
      required: false
    },
    {
      model: Queue,
      as: "queue",
      attributes: [
        "id",
        "name",
        "color",
        "useAI",
        "aiSettingId",
        "distributionMode",
        "maxActiveTicketsPerUser"
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
      attributes: ["id", "name"]
    }
  ];

  if (status) {
    whereCondition = {
      ...whereCondition,
      status
    };
  }

  if (triageOnly === "true") {
    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        { uraActive: true },
        { aiActive: true }
      ]
    };
  } else if (status === "pending") {
    const previousAnd = ((whereCondition as any)[Op.and] as unknown[]) || [];
    whereCondition = {
      ...whereCondition,
      [Op.and]: [
        ...previousAnd,
        {
          [Op.or]: [
            { aiActive: false },
            { aiActive: null }
          ]
        } as any,
        {
          [Op.or]: [
            { uraActive: false },
            { uraActive: null }
          ]
        } as any
      ]
    };
  }

  if (searchParam) {
    const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();

    includeCondition = [
      ...includeCondition,
      {
        model: Message,
        as: "messages",
        attributes: ["id", "body"],
        where: {
          body: where(
            fn("LOWER", col("body")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        required: false,
        duplicating: false
      }
    ];

    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        {
          "$contact.name$": where(
            fn("LOWER", col("contact.name")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
        {
          "$message.body$": where(
            fn("LOWER", col("body")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        }
      ]
    };
  }

  if (date) {
    whereCondition = {
      ...whereCondition,
      createdAt: {
        [Op.between]: [+startOfDay(parseISO(date)), +endOfDay(parseISO(date))]
      }
    };
  }

  if (withUnreadMessages === "true") {
    whereCondition = {
      ...(canShowAll ? queueCondition : userVisibilityCondition),
      unreadMessages: { [Op.gt]: 0 }
    };
  }

  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    distinct: true,
    limit,
    offset,
    order: [["updatedAt", "DESC"]]
  });

  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;
