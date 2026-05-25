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

const groupRows = async (column: string, alias: string, start: Date, end: Date) => {
  const rows = await Ticket.findAll({
    attributes: [
      [col(column) as any, "name"],
      [fn("COUNT", col("Ticket.id")), "total"]
    ],
    where: { createdAt: { [Op.between]: [+start, +end] } } as any,
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

export const dashboard = async (req: Request, res: Response): Promise<Response> => {
  const { start, end } = parseDateRange(req);
  const where = { createdAt: { [Op.between]: [+start, +end] } } as any;
  const ticketCreatedDate = fn("DATE", col("Ticket.createdAt"));

  const [total, open, pending, closed, byCategory, byReason, byQueue, byUser, byDay] = await Promise.all([
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
    })
  ]);

  return res.json({
    summary: { total, open, pending, closed },
    byCategory,
    byReason,
    byQueue: byQueue.map((row: any) => ({ name: row.name || "Sem fila", total: Number(row.total) })),
    byUser: byUser.map((row: any) => ({ name: row.name || "Sem atendente", total: Number(row.total) })),
    byDay: byDay.map((row: any) => ({ date: row.date, total: Number(row.total) }))
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
    where: { createdAt: { [Op.between]: [+start, +end] } } as any,
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
    where: {
      createdAt: { [Op.between]: [+start, +end] }
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
      {
        model: Message,
        as: "messages",
        attributes: ["id", "body", "fromMe", "createdAt", "mediaType"],
        required: false
      }
    ],
    order: [
      ["createdAt", "DESC"],
      [{ model: Message, as: "messages" }, "createdAt", "ASC"]
    ],
    limit: 100
  });

  return res.json(tickets);
};

export const satisfaction = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);

  const { start, end } = parseDateRange(req);
  const rows = await SatisfactionSurveyResponse.findAll({
    where: { createdAt: { [Op.between]: [+start, +end] } } as any,
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
