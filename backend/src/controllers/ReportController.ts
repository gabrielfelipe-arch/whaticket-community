import { Request, Response } from "express";
import { Op, fn, col, where as sequelizeWhere } from "sequelize";
import Ticket from "../models/Ticket";
import Message from "../models/Message";
import Contact from "../models/Contact";
import Queue from "../models/Queue";
import User from "../models/User";
import TicketCategory from "../models/TicketCategory";
import ClosingReason from "../models/ClosingReason";
import SatisfactionSurveyResponse from "../models/SatisfactionSurveyResponse";
import AppError from "../errors/AppError";

const parseDateRange = (req: Request) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const start = startDate ? new Date(`${startDate}T00:00:00`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(`${endDate}T23:59:59`) : new Date();

  return { start, end };
};

const requireAdmin = (req: Request) => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
};

const dateFilter = (start: Date, end: Date) => ({
  [Op.between]: [start, end]
});

const groupRows = async (column: string, alias: string, start: Date, end: Date) => {
  const rows = await Ticket.findAll({
    attributes: [
      [col(column) as any, "name"],
      [fn("COUNT", col("Ticket.id")), "total"]
    ],
    where: { createdAt: dateFilter(start, end) } as any,
    include: [
      {
        model: alias === "category" ? TicketCategory : ClosingReason,
        as: alias,
        attributes: [],
        required: false
      }
    ],
    group: [col(column) as any],
    raw: true
  });

  return rows.map((row: any) => ({
    name: row.name || "Nao informado",
    total: Number(row.total)
  }));
};

const buildAttendantAudit = async () => {
  const users = await User.findAll({
    attributes: [
      "id",
      "name",
      "email",
      "profile",
      "operationalStatus",
      "lastActivityAt",
      "lastStatusChangeAt",
      "statusReason"
    ],
    include: [{ model: Queue, as: "queues", attributes: ["id", "name", "color"] }],
    order: [["name", "ASC"]]
  });

  return Promise.all(users.map(async user => {
    const activeTickets = await Ticket.findAll({
      attributes: ["id", "status", "updatedAt", "lastMessage", "queueId", "contactId"],
      where: {
        userId: user.id,
        status: "open"
      },
      include: [
        { model: Contact, as: "contact", attributes: ["id", "name", "number"] },
        { model: Queue, as: "queue", attributes: ["id", "name", "color"] }
      ],
      order: [["updatedAt", "DESC"]],
      limit: 8
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile,
      operationalStatus: user.operationalStatus,
      lastActivityAt: user.lastActivityAt,
      lastStatusChangeAt: user.lastStatusChangeAt,
      statusReason: user.statusReason,
      queues: user.queues || [],
      activeTicketsCount: activeTickets.length,
      activeTickets: activeTickets.map(ticket => ({
        id: ticket.id,
        status: ticket.status,
        updatedAt: ticket.updatedAt,
        lastMessage: ticket.lastMessage,
        contact: ticket.contact,
        queue: ticket.queue
      }))
    };
  }));
};

export const dashboard = async (req: Request, res: Response): Promise<Response> => {
  const { start, end } = parseDateRange(req);
  const where = { createdAt: dateFilter(start, end) } as any;
  const ticketCreatedDate = fn("DATE", col("Ticket.createdAt"));

  const [total, open, pending, closed, byCategory, byReason, byQueue, byUser, byDay, attendants] = await Promise.all([
    Ticket.count({ where }),
    Ticket.count({ where: { ...where, status: "open" } }),
    Ticket.count({ where: { ...where, status: "pending" } }),
    Ticket.count({ where: { ...where, status: "closed" } }),
    groupRows("category.name", "category", start, end),
    groupRows("closingReason.name", "closingReason", start, end),
    Ticket.findAll({
      attributes: [[col("queue.name") as any, "name"], [fn("COUNT", col("Ticket.id")), "total"]],
      where,
      include: [{ model: Queue, as: "queue", attributes: [], required: false }],
      group: [col("queue.name") as any],
      raw: true
    }),
    Ticket.findAll({
      attributes: [[col("user.name") as any, "name"], [fn("COUNT", col("Ticket.id")), "total"]],
      where,
      include: [{ model: User, as: "user", attributes: [], required: false }],
      group: [col("user.name") as any],
      raw: true
    }),
    Ticket.findAll({
      attributes: [
        [ticketCreatedDate, "date"],
        [fn("COUNT", col("Ticket.id")), "total"]
      ],
      where,
      group: [ticketCreatedDate as any],
      order: [[ticketCreatedDate as any, "ASC"]],
      raw: true
    }),
    req.user.profile === "admin" ? buildAttendantAudit() : Promise.resolve([])
  ]);

  return res.json({
    summary: { total, open, pending, closed },
    byCategory,
    byReason,
    byQueue: byQueue.map((row: any) => ({ name: row.name || "Sem fila", total: Number(row.total) })),
    byUser: byUser.map((row: any) => ({ name: row.name || "Sem atendente", total: Number(row.total) })),
    byDay: byDay.map((row: any) => ({ date: row.date, total: Number(row.total) })),
    attendants
  });
};

const csvEscape = (value: any): string => {
  const text = String(value ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""');
  return `"${text}"`;
};

export const exportTickets = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);

  const { start, end } = parseDateRange(req);
  const tickets = await Ticket.findAll({
    where: { createdAt: dateFilter(start, end) } as any,
    include: [
      { model: Contact, as: "contact", attributes: ["name", "number"] },
      { model: Queue, as: "queue", attributes: ["name"] },
      { model: User, as: "user", attributes: ["name"] },
      { model: TicketCategory, as: "category", attributes: ["name"] },
      { model: ClosingReason, as: "closingReason", attributes: ["name"] }
    ],
    order: [["createdAt", "DESC"]]
  });

  const header = [
    "ID",
    "Status",
    "Contato",
    "Numero",
    "Fila",
    "Atendente",
    "Categoria",
    "Motivo",
    "Criado em",
    "Atualizado em",
    "Ultima mensagem"
  ];
  const rows = tickets.map(ticket => [
    ticket.id,
    ticket.status,
    ticket.contact?.name,
    ticket.contact?.number,
    ticket.queue?.name,
    ticket.user?.name,
    ticket.category?.name,
    ticket.closingReason?.name,
    ticket.createdAt,
    ticket.updatedAt,
    ticket.lastMessage
  ]);

  const csv = [header, ...rows].map(row => row.map(csvEscape).join(";")).join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=relatorio-atendimentos.csv");
  return res.send(`\uFEFF${csv}`);
};

export const conversationHistory = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);

  const { start, end } = parseDateRange(req);
  const { searchParam = "" } = req.query as { searchParam?: string };
  const sanitizedSearch = `%${searchParam.toLowerCase().trim()}%`;

  const tickets = await Ticket.findAll({
    attributes: [
      "id",
      "status",
      "createdAt",
      "updatedAt",
      "lastMessage",
      "contactId",
      "queueId",
      "userId",
      "categoryId",
      "closingReasonId"
    ],
    where: {
      status: "closed",
      createdAt: dateFilter(start, end)
    },
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number"],
        where: searchParam
          ? sequelizeWhere(fn("LOWER", col("contact.name")), "LIKE", sanitizedSearch)
          : undefined,
        required: !!searchParam
      },
      { model: Queue, as: "queue", attributes: ["name"] },
      { model: User, as: "user", attributes: ["name"] },
      { model: TicketCategory, as: "category", attributes: ["name"] },
      { model: ClosingReason, as: "closingReason", attributes: ["name"] },
    ],
    order: [["updatedAt", "DESC"]],
    limit: 100
  });

  return res.json(tickets);
};

export const conversationDetail = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);

  const { ticketId } = req.params;
  const ticket = await Ticket.findOne({
    attributes: [
      "id",
      "status",
      "createdAt",
      "updatedAt",
      "lastMessage",
      "contactId",
      "queueId",
      "userId",
      "categoryId",
      "closingReasonId",
      "closingNote"
    ],
    where: { id: ticketId, status: "closed" },
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name", "number"] },
      { model: Queue, as: "queue", attributes: ["name"] },
      { model: User, as: "user", attributes: ["name"] },
      { model: TicketCategory, as: "category", attributes: ["name"] },
      { model: ClosingReason, as: "closingReason", attributes: ["name"] },
      {
        model: Message,
        as: "messages",
        attributes: ["id", "body", "fromMe", "createdAt", "mediaType"],
        required: false
      }
    ],
    order: [[{ model: Message, as: "messages" }, "createdAt", "ASC"]]
  });

  if (!ticket) {
    throw new AppError("ERR_TICKET_NOT_FOUND", 404);
  }

  return res.json(ticket);
};

export const satisfaction = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);

  const { start, end } = parseDateRange(req);
  const rows = await SatisfactionSurveyResponse.findAll({
    where: { createdAt: dateFilter(start, end) } as any,
    include: [
      { model: Contact, as: "contact", attributes: ["name", "number"] },
      { model: Queue, as: "queue", attributes: ["name"] },
      { model: User, as: "user", attributes: ["name"] },
      { model: TicketCategory, as: "category", attributes: ["name"] },
      { model: ClosingReason, as: "closingReason", attributes: ["name"] }
    ],
    order: [["createdAt", "DESC"]]
  });

  const total = rows.length;
  const average = total
    ? rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / total
    : 0;

  return res.json({
    summary: { total, average: Number(average.toFixed(2)) },
    responses: rows
  });
};
