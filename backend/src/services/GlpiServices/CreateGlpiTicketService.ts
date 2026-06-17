import axios from "axios";
import AppError from "../../errors/AppError";
import GlpiCategory from "../../models/GlpiCategory";
import GlpiEntity from "../../models/GlpiEntity";
import GlpiLocation from "../../models/GlpiLocation";
import GlpiTicketLink from "../../models/GlpiTicketLink";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import { buildGlpiTicketUrl, closeGlpiSession, getGlpiSettings, glpiHeaders, initGlpiSession, normalizeGlpiError } from "./GlpiClientService";
import CreateGlpiLogService from "./GlpiLogService";

type Request = {
  ticketId: number;
  userId: number;
  title: string;
  description: string;
  entityId: number;
  categoryId: number;
  locationId?: number | null;
  descriptionMode?: string;
  selectedMessageIds?: string[];
  forceCreate?: boolean;
};

const buildMessageExcerpt = async (messageIds: string[]): Promise<string[]> => {
  const messages = await Message.findAll({
    where: { id: messageIds },
    order: [["createdAt", "ASC"]]
  });

  return messages.map(message => message.body || "").filter(Boolean);
};

const CreateGlpiTicketService = async ({
  ticketId,
  userId,
  title,
  description,
  entityId,
  categoryId,
  locationId,
  descriptionMode = "manual",
  selectedMessageIds = [],
  forceCreate = false
}: Request): Promise<GlpiTicketLink> => {
  const settings = await getGlpiSettings();
  if (!settings.enabled) throw new AppError("Integracao GLPI desativada.", 400);

  const ticket = await Ticket.findByPk(ticketId, {
    include: [
      { model: Queue, as: "queue" },
      "contact"
    ]
  });

  if (!ticket) throw new AppError("Atendimento nao encontrado.", 404);
  if (ticket.status !== "open") throw new AppError("O chamado GLPI so pode ser aberto em atendimento aberto.", 400);
  const hasAnyGlpiQueue = ticket.isGroup && !ticket.queue
    ? await Queue.count({ where: { glpiEnabled: true } })
    : 0;
  const queueEnabled = Boolean(ticket.queue?.glpiEnabled || (ticket.isGroup && !ticket.queue && hasAnyGlpiQueue > 0));
  if (!queueEnabled) throw new AppError("A fila deste atendimento nao permite abertura de chamado GLPI.", 403);

  const existingLinks = await GlpiTicketLink.findAll({ where: { ticketId } });
  if (existingLinks.length && !settings.allowMultipleTickets && !forceCreate) {
    throw new AppError("Este atendimento ja possui chamado GLPI vinculado.", 400);
  }

  const entity = await GlpiEntity.findOne({ where: { glpiId: entityId, active: true } });
  const category = await GlpiCategory.findOne({ where: { glpiId: categoryId, active: true } });
  const location = locationId
    ? await GlpiLocation.findOne({ where: { glpiId: locationId, active: true } })
    : null;
  if (!entity) throw new AppError("Escolha uma entidade GLPI sincronizada.", 400);
  if (!category) throw new AppError("Escolha uma categoria GLPI sincronizada.", 400);
  if (locationId && !location) throw new AppError("Escolha uma localizacao GLPI sincronizada.", 400);
  if (!title?.trim()) throw new AppError("Informe o titulo do chamado GLPI.", 400);
  if (!description?.trim()) throw new AppError("Informe a descricao do chamado GLPI.", 400);

  let finalDescription = description.trim();
  if (descriptionMode === "selected_messages") {
    const lines = await buildMessageExcerpt(selectedMessageIds);
    finalDescription = lines.join("\n");
  }
  if (!finalDescription) throw new AppError("A descricao final do chamado GLPI ficou vazia.", 400);

  let session;
  try {
    session = await initGlpiSession();

    const input: Record<string, any> = {
      name: title.trim(),
      content: finalDescription,
      entities_id: entityId,
      itilcategories_id: categoryId,
      type: 1,
      urgency: 3,
      impact: 3,
      priority: 3
    };
    if (locationId) input.locations_id = locationId;

    const response = await axios.post(
      `${session.settings.apiUrl}/Ticket`,
      { input },
      {
        headers: glpiHeaders(session),
        timeout: session.settings.timeoutMs
      }
    );

    const glpiTicketId = Number(response.data?.id);
    if (!glpiTicketId) throw new AppError("O GLPI nao retornou o ID do chamado criado.", 400);

    const link = await GlpiTicketLink.create({
      ticketId,
      glpiTicketId,
      glpiTicketNumber: String(glpiTicketId),
      title: title.trim(),
      description: finalDescription,
      entityId,
      entityName: entity.completeName || entity.name,
      categoryId,
      categoryName: category.completeName || category.name,
      locationId: location?.glpiId || null,
      locationName: location ? location.completeName || location.name : null,
      createdByUserId: userId,
      descriptionMode,
      selectedMessageIds: JSON.stringify(selectedMessageIds),
      glpiUrl: buildGlpiTicketUrl(settings, glpiTicketId),
      status: "created",
      rawResponse: JSON.stringify(response.data)
    });

    await ticket.update({ glpiTicketId });

    await CreateGlpiLogService({
      action: "create_ticket",
      status: "success",
      message: `Chamado GLPI ${glpiTicketId} criado.`,
      ticketId,
      userId,
      payload: { input: { ...input, content: "[masked-description]" } },
      response: response.data
    });

    return link;
  } catch (err) {
    await CreateGlpiLogService({
      action: "create_ticket",
      status: "error",
      message: "Falha ao criar chamado GLPI.",
      ticketId,
      userId,
      error: err instanceof AppError ? err.message : normalizeGlpiError(err)
    });
    if (err instanceof AppError) throw err;
    throw new AppError(`Falha ao criar chamado GLPI: ${normalizeGlpiError(err)}`, 400);
  } finally {
    if (session) await closeGlpiSession(session);
  }
};

export default CreateGlpiTicketService;
