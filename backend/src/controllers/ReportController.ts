import { Request, Response } from "express";
import { Op, fn, col, where as sequelizeWhere } from "sequelize";
import XLSX from "xlsx";
import Ticket from "../models/Ticket";
import Message from "../models/Message";
import Contact from "../models/Contact";
import Queue from "../models/Queue";
import User from "../models/User";
import TicketCategory from "../models/TicketCategory";
import ClosingReason from "../models/ClosingReason";
import SatisfactionSurveyResponse from "../models/SatisfactionSurveyResponse";
import AppError from "../errors/AppError";
import { isAdminOrSupervisorProfile } from "../helpers/ProfilePermissions";

const parseDateRange = (req: Request) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const start = startDate ? new Date(`${startDate}T00:00:00`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(`${endDate}T23:59:59`) : new Date();

  return { start, end };
};

const requireAdmin = (req: Request) => {
  if (!isAdminOrSupervisorProfile(req.user.profile)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
};

const dateFilter = (start: Date, end: Date) => ({
  [Op.between]: [start, end]
});

const toExcelDate = (value?: Date | string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const statusLabels: Record<string, string> = {
  open: "Em atendimento",
  pending: "Aguardando",
  closed: "Encerrado"
};

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
    isAdminOrSupervisorProfile(req.user.profile) ? buildAttendantAudit() : Promise.resolve([])
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

const applyWorksheetFormats = (worksheet: XLSX.WorkSheet, rows: any[][]): void => {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const header = rows[0] || [];
  const dateColumnIndexes = header
    .map((label, index) => ({ label: String(label || "").toLowerCase(), index }))
    .filter(({ label }) =>
      ["data", "hora", "criado em", "atualizado em", "abertura", "conclusao"].some(term =>
        label.includes(term)
      )
    )
    .map(({ index }) => index);

  dateColumnIndexes.forEach(columnIndex => {
    for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = worksheet[address];
      if (!cell || !(rows[rowIndex]?.[columnIndex] instanceof Date)) continue;

      cell.t = "d";
      cell.z = "dd/mm/yyyy hh:mm";
    }
  });

  worksheet["!cols"] = header.map((label, index) => ({
    wch: dateColumnIndexes.includes(index) ? 18 : Math.max(String(label || "").length + 2, 12)
  }));
};

const sendXlsx = (res: Response, filename: string, sheetName: string, rows: any[][]): Response => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  applyWorksheetFormats(worksheet, rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", cellDates: true });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  return res.send(buffer);
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
    "Atualizado em"
  ];
  const rows = tickets.map(ticket => [
    ticket.id,
    statusLabels[ticket.status] || ticket.status,
    ticket.contact?.name,
    ticket.contact?.number,
    ticket.queue?.name,
    ticket.user?.name,
    ticket.category?.name,
    ticket.closingReason?.name,
    toExcelDate(ticket.createdAt),
    toExcelDate(ticket.updatedAt)
  ]);

  return sendXlsx(res, "relatorio-atendimentos.xlsx", "Atendimentos", [header, ...rows]);
};

export const exportSatisfaction = async (req: Request, res: Response): Promise<Response> => {
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

  const header = [
    "ID",
    "Data e hora",
    "Contato",
    "Telefone",
    "Fila",
    "Atendente",
    "Categoria",
    "Motivo",
    "Nota",
    "Resposta",
    "Tipo do comentario",
    "Comentario"
  ];
  const csvRows = rows.map(row => [
    row.id,
    toExcelDate(row.createdAt),
    row.contact?.name,
    row.contact?.number,
    row.queue?.name,
    row.user?.name,
    row.category?.name,
    row.closingReason?.name,
    row.rating,
    row.rawAnswer,
    row.feedbackType,
    row.feedbackText
  ]);

  return sendXlsx(res, "relatorio-pesquisa-satisfacao.xlsx", "Satisfacao", [header, ...csvRows]);
};

export const conversationHistory = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);

  const { start, end } = parseDateRange(req);
  const { searchParam = "" } = req.query as { searchParam?: string };
  const sanitizedSearch = `%${searchParam.toLowerCase().trim()}%`;
  const searchableWhere = searchParam
    ? {
        [Op.or]: [
          sequelizeWhere(fn("LOWER", col("contact.name")), "LIKE", sanitizedSearch),
          sequelizeWhere(fn("LOWER", col("contact.number")), "LIKE", sanitizedSearch),
          sequelizeWhere(fn("LOWER", col("queue.name")), "LIKE", sanitizedSearch),
          sequelizeWhere(fn("LOWER", col("user.name")), "LIKE", sanitizedSearch),
          sequelizeWhere(fn("LOWER", col("category.name")), "LIKE", sanitizedSearch),
          sequelizeWhere(fn("LOWER", col("closingReason.name")), "LIKE", sanitizedSearch),
          sequelizeWhere(fn("LOWER", col("Ticket.status")), "LIKE", sanitizedSearch),
          sequelizeWhere(fn("LOWER", col("Ticket.lastMessage")), "LIKE", sanitizedSearch),
          sequelizeWhere(fn("CONCAT", col("Ticket.id"), ""), "LIKE", `%${searchParam.trim().replace(/^#/, "")}%`)
        ]
      }
    : {};

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
      createdAt: dateFilter(start, end),
      ...searchableWhere
    },
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number"],
        required: false
      },
      { model: Queue, as: "queue", attributes: ["name"], required: false },
      { model: User, as: "user", attributes: ["name"], required: false },
      { model: TicketCategory, as: "category", attributes: ["name"], required: false },
      { model: ClosingReason, as: "closingReason", attributes: ["name"], required: false },
    ],
    subQuery: false,
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
