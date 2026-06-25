import axios from "axios";
import FormData from "form-data";
import { createReadStream, existsSync, readFileSync } from "fs";
import { basename, extname, join } from "path";
import AppError from "../../errors/AppError";
import uploadConfig from "../../config/upload";
import GlpiCategory from "../../models/GlpiCategory";
import GlpiEntity from "../../models/GlpiEntity";
import GlpiLocation from "../../models/GlpiLocation";
import GlpiTicketLink from "../../models/GlpiTicketLink";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import User from "../../models/User";
import { buildGlpiTicketUrl, closeGlpiSession, getGlpiConfigurationByWhatsapp, getGlpiSettings, getGlpiSettingsByConfigurationId, glpiHeaders, initGlpiSession, normalizeGlpiError } from "./GlpiClientService";
import CreateGlpiLogService from "./GlpiLogService";

type Request = {
  ticketId: number;
  userId?: number | null;
  title: string;
  description: string;
  entityId: number;
  categoryId: number;
  locationId?: number | null;
  descriptionMode?: string;
  selectedMessageIds?: string[];
  forceCreate?: boolean;
  useGlobalToken?: boolean;
  allowPendingTicket?: boolean;
  configurationId?: number | null;
};

const buildMessageExcerpt = async (messageIds: string[]): Promise<string[]> => {
  const messages = await Message.findAll({
    where: { id: messageIds },
    order: [["createdAt", "ASC"]]
  });

  return messages.map(message => message.body || "").filter(Boolean);
};

type GlpiAttachment = {
  messageId: string;
  filename: string;
  mimetype: string;
  path: string;
  dataUri: string;
};

const guessImageMimeType = (mediaType: string, filename: string): string | null => {
  const normalizedMediaType = String(mediaType || "").toLowerCase();
  if (normalizedMediaType.startsWith("image/")) return normalizedMediaType;
  if (normalizedMediaType === "image") {
    const extension = extname(filename).toLowerCase();
    if (extension === ".png") return "image/png";
    if (extension === ".gif") return "image/gif";
    if (extension === ".webp") return "image/webp";
    if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
    return "image/jpeg";
  }
  return null;
};

const buildSelectedImageAttachments = async (messageIds: string[]): Promise<GlpiAttachment[]> => {
  if (!messageIds.length) return [];

  const messages = await Message.findAll({
    where: { id: messageIds },
    order: [["createdAt", "ASC"]]
  });

  return messages
    .map(message => {
      const storedMediaUrl = (message as any).getDataValue("mediaUrl") as string | null;
      const mediaType = String(message.mediaType || "");
      if (!storedMediaUrl) return null;

      const filename = basename(storedMediaUrl);
      const mimetype = guessImageMimeType(mediaType, filename);
      if (!mimetype) return null;

      const filePath = join(uploadConfig.directory, filename);
      if (!existsSync(filePath)) return null;
      const dataUri = `data:${mimetype};base64,${readFileSync(filePath).toString("base64")}`;

      return {
        messageId: message.id,
        filename,
        mimetype,
        path: filePath,
        dataUri
      };
    })
    .filter(Boolean) as GlpiAttachment[];
};

const uploadGlpiAttachment = async ({
  session,
  glpiTicketId,
  attachment
}: {
  session: Awaited<ReturnType<typeof initGlpiSession>>;
  glpiTicketId: number;
  attachment: GlpiAttachment;
}): Promise<number | null> => {
  const form = new FormData();
  form.append("uploadManifest", JSON.stringify({
    input: {
      name: attachment.filename,
      _filename: [attachment.filename]
    }
  }));
  form.append("filename[0]", createReadStream(attachment.path), {
    filename: attachment.filename,
    contentType: attachment.mimetype
  });

  const documentResponse = await axios.post(
    `${session.settings.apiUrl}/Document`,
    form,
    {
      headers: {
        ...glpiHeaders(session),
        ...form.getHeaders()
      },
      maxBodyLength: Infinity,
      timeout: session.settings.timeoutMs
    }
  );

  const documentId = Number(documentResponse.data?.id);
  if (!documentId) return null;

  await axios.post(
    `${session.settings.apiUrl}/Document_Item`,
    {
      input: {
        documents_id: documentId,
        items_id: glpiTicketId,
        itemtype: "Ticket"
      }
    },
    {
      headers: glpiHeaders(session),
      timeout: session.settings.timeoutMs
    }
  );

  return documentId;
};

const parseJsonObject = (value?: string | null): Record<string, unknown> => {
  try {
    return value ? JSON.parse(value) : {};
  } catch (err) {
    return {};
  }
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
  forceCreate = false,
  useGlobalToken = false,
  allowPendingTicket = false,
  configurationId = null
}: Request): Promise<GlpiTicketLink> => {
  const glpiUser = userId ? await User.findByPk(userId, {
    attributes: ["id", "name", "glpiEnabled", "glpiUserToken"]
  }) : null;
  if (!useGlobalToken) {
    if (!glpiUser?.glpiEnabled) {
      throw new AppError("Seu usuario nao esta habilitado para usar GLPI.", 403);
    }
    if (!glpiUser.glpiUserToken) {
      throw new AppError("Configure o User Token GLPI no seu cadastro de usuario.", 403);
    }
  }

  const ticket = await Ticket.findByPk(ticketId, {
    include: [
      { model: Queue, as: "queue" },
      "contact"
    ]
  });

  if (!ticket) throw new AppError("Atendimento nao encontrado.", 404);
  const linkedConfiguration = configurationId
    ? null
    : await getGlpiConfigurationByWhatsapp(ticket.whatsappId);
  const effectiveConfigurationId = configurationId || linkedConfiguration?.id || null;
  const settings = effectiveConfigurationId
    ? await getGlpiSettingsByConfigurationId(effectiveConfigurationId)
    : await getGlpiSettings();
  if (!settings.enabled) throw new AppError("Integracao GLPI desativada para esta conexao.", 400);
  if (!settings.apiUrl) throw new AppError("Informe a URL da API GLPI.", 400);
  if (ticket.status !== "open" && !(allowPendingTicket && ticket.status === "pending")) {
    throw new AppError("O chamado GLPI so pode ser aberto em atendimento aberto.", 400);
  }
  const hasAnyGlpiQueue = !ticket.queue
    ? await Queue.count({ where: { glpiEnabled: true } })
    : 0;
  const queueEnabled = Boolean(ticket.queue?.glpiEnabled || (!ticket.queue && hasAnyGlpiQueue > 0));
  if (!queueEnabled) throw new AppError("A fila deste atendimento nao permite abertura de chamado GLPI.", 403);

  const existingLinks = await GlpiTicketLink.findAll({ where: { ticketId } });
  if (existingLinks.length && !settings.allowMultipleTickets && !forceCreate) {
    throw new AppError("Este atendimento ja possui chamado GLPI vinculado.", 400);
  }

  const catalogScope: Record<string, number> = effectiveConfigurationId ? { glpiConfigurationId: effectiveConfigurationId } : {};
  const entity = await GlpiEntity.findOne({ where: { glpiId: entityId, active: true, ...catalogScope } });
  const category = await GlpiCategory.findOne({ where: { glpiId: categoryId, active: true, ...catalogScope } });
  const location = locationId
    ? await GlpiLocation.findOne({ where: { glpiId: locationId, active: true, ...catalogScope } })
    : null;
  if (!entity) throw new AppError("Escolha uma entidade GLPI sincronizada.", 400);
  if (!category) throw new AppError("Escolha uma categoria GLPI sincronizada.", 400);
  if (locationId && !location) throw new AppError("Escolha uma localizacao GLPI sincronizada.", 400);
  if (location && location.entityId !== null && location.entityId !== undefined && location.entityId !== entityId) {
    const rawData = parseJsonObject(entity.rawData);
    const parentId = Number(rawData.entities_id ?? rawData.entity_id ?? rawData.entityId);
    if (!Number.isInteger(parentId) || parentId <= 0 || Number(location.entityId) !== parentId) {
      throw new AppError("A localizacao escolhida nao pertence a entidade GLPI selecionada.", 400);
    }
  }
  if (!title?.trim()) throw new AppError("Informe o titulo do chamado GLPI.", 400);
  if (!description?.trim()) throw new AppError("Informe a descricao do chamado GLPI.", 400);

  let finalDescription = description.trim();
  if (descriptionMode === "selected_messages") {
    const lines = await buildMessageExcerpt(selectedMessageIds);
    finalDescription = lines.join("\n");
  }
  const selectedImageAttachments = await buildSelectedImageAttachments(selectedMessageIds);
  if (selectedImageAttachments.length) {
    finalDescription = [
      finalDescription,
      "",
      "<p><strong>Imagens selecionadas:</strong></p>",
      ...selectedImageAttachments.map(attachment =>
        `<p>${attachment.filename}<br><img src="${attachment.dataUri}" alt="${attachment.filename}" style="max-width: 900px; height: auto;" /></p>`
      )
    ].join("\n");
  }
  if (!finalDescription) throw new AppError("A descricao final do chamado GLPI ficou vazia.", 400);

  let session;
  try {
    session = await initGlpiSession({
      ...(useGlobalToken ? {} : { userToken: glpiUser?.glpiUserToken }),
      configurationId: effectiveConfigurationId
    });

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
      entityName: entity.name || entity.completeName,
      categoryId,
      categoryName: category.completeName || category.name,
      locationId: location?.glpiId || null,
      locationName: location ? location.completeName || location.name : null,
      createdByUserId: userId || null,
      descriptionMode,
      selectedMessageIds: JSON.stringify(selectedMessageIds),
      glpiUrl: buildGlpiTicketUrl(settings, glpiTicketId),
      status: "created",
      rawResponse: JSON.stringify(response.data)
    });

    await ticket.update({ glpiTicketId });

    const attachmentResults: Array<{ filename: string; documentId?: number | null; error?: string }> = [];
    for (const attachment of selectedImageAttachments) {
      try {
        const documentId = await uploadGlpiAttachment({ session, glpiTicketId, attachment });
        attachmentResults.push({ filename: attachment.filename, documentId });
      } catch (attachmentError) {
        attachmentResults.push({
          filename: attachment.filename,
          error: normalizeGlpiError(attachmentError)
        });
      }
    }

    await CreateGlpiLogService({
      action: "create_ticket",
      status: "success",
      message: `Chamado GLPI ${glpiTicketId} criado.`,
      ticketId,
      userId: userId || undefined,
      payload: { input: { ...input, content: "[masked-description]" } },
      response: { ...response.data, attachments: attachmentResults }
    });

    return link;
  } catch (err) {
    await CreateGlpiLogService({
      action: "create_ticket",
      status: "error",
      message: "Falha ao criar chamado GLPI.",
      ticketId,
      userId: userId || undefined,
      error: err instanceof AppError ? err.message : normalizeGlpiError(err)
    });
    if (err instanceof AppError) throw err;
    throw new AppError(`Falha ao criar chamado GLPI: ${normalizeGlpiError(err)}`, 400);
  } finally {
    if (session) await closeGlpiSession(session);
  }
};

export default CreateGlpiTicketService;
