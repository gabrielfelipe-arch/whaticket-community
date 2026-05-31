import { join } from "path";
import { promisify } from "util";
import { writeFile } from "fs";
import * as Sentry from "@sentry/node";
import { Op } from "sequelize";

import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";
import { debounce } from "../helpers/Debounce";
import formatBody from "../helpers/Mustache";

import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Message from "../models/Message";
import Queue from "../models/Queue";
import AiSetting from "../models/AiSetting";
import Setting from "../models/Setting";
import ClosingReason from "../models/ClosingReason";
import UraOption from "../models/UraOption";

import CreateMessageService from "../services/MessageServices/CreateMessageService";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import CreateGlpiTicketService from "../services/GlpiServices/CreateGlpiTicketService";
import { tryRegisterSatisfactionResponse } from "../services/SatisfactionSurveyServices/SatisfactionSurveyService";
import DecideAiTicketActionService from "../services/AiServices/DecideAiTicketActionService";
import uploadConfig from "../config/upload";
import RenderMessageVariables from "../helpers/RenderMessageVariables";

import { whatsappProvider } from "../providers/WhatsApp/whatsappProvider";
import { MessageType, MessageAck } from "../providers/WhatsApp/types";

const writeFileAsync = promisify(writeFile);
const uraMenuLocks = new Set<number>();
const AI_CLOSE_TAG = "[FECHAR TICKET]";
const AI_NO_SAFE_ANSWER_HANDOFF_MESSAGE =
  "Nao consegui identificar uma orientacao segura para esse caso com as informacoes disponiveis.\n\nPara evitar te passar uma informacao incorreta, vou encaminhar seu atendimento para um atendente.";

export interface ContactPayload {
  name: string;
  number: string;
  lid?: string;
  profilePicUrl?: string;
  isGroup: boolean;
}

export interface MessagePayload {
  id: string;
  body: string;
  fromMe: boolean;
  hasMedia: boolean;
  type: MessageType;
  timestamp: number;
  from: string;
  to: string;
  hasQuotedMsg?: boolean;
  quotedMsgId?: string;
  mediaUrl?: string;
  mediaType?: string;
  ack?: MessageAck;
}

export interface MediaPayload {
  filename: string;
  mimetype: string;
  data: string;
}

export interface WhatsappContextPayload {
  whatsappId: number;
  unreadMessages: number;
  groupContact?: ContactPayload;
}

const makeRandomId = (length: number): string => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

const processLocationMessage = (
  messagePayload: MessagePayload
): MessagePayload => {
  if (messagePayload.type !== "location") return messagePayload;

  return messagePayload;
};

const saveMediaFile = async (mediaPayload: MediaPayload): Promise<string> => {
  const randomId = makeRandomId(5);
  const { filename: originalFilename } = mediaPayload;

  let filename: string;
  if (!originalFilename) {
    const [extension] = mediaPayload.mimetype.split("/")[1].split(";");
    filename = `${randomId}-${new Date().getTime()}.${extension}`;
  } else {
    const baseName = originalFilename.split(".").slice(0, -1).join(".");
    const extension = originalFilename.split(".").slice(-1)[0];
    filename = `${baseName}.${randomId}.${extension}`;
  }

  try {
    await writeFileAsync(
      join(__dirname, "..", "..", "public", filename),
      mediaPayload.data,
      "base64"
    );
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }

  return filename;
};

const processVcardMessage = async (
  messagePayload: MessagePayload
): Promise<void> => {
  if (messagePayload.type !== "vcard") return;

  try {
    const array = messagePayload.body.split("\n");
    const phoneNumbers: Array<{ number: string }> = [];
    let contactName = "";

    array.forEach(line => {
      const values = line.split(":");
      values.forEach((value, index) => {
        if (value.indexOf("+") !== -1) {
          phoneNumbers.push({ number: value });
        }
        if (value.indexOf("FN") !== -1 && values[index + 1]) {
          contactName = values[index + 1];
        }
      });
    });

    await Promise.all(
      phoneNumbers.map(({ number }) =>
        CreateContactService({
          name: contactName,
          number: number.replace(/\D/g, "")
        })
      )
    );
  } catch (error) {
    logger.error("Error processing vcard message:", error);
  }
};

const contactChatId = (contactPayload: ContactPayload): string =>
  `${contactPayload.number}@${contactPayload.isGroup ? "g" : "c"}.us`;

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeAlertChatId = async (value: string): Promise<string | null> => {
  const trimmed = String(value || "").trim();
  if (trimmed.includes("@")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 8) {
    const contact = await Contact.findOne({ where: { number: digits } });
    return `${digits}@${contact?.isGroup ? "g" : "c"}.us`;
  }

  const contact = await Contact.findOne({ where: { name: trimmed } });
  if (contact?.number) return `${contact.number}@${contact.isGroup ? "g" : "c"}.us`;

  return null;
};

const isHumanRequest = (body: string): boolean => {
  const normalized = String(body || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return [
    "quero atendente",
    "falar com atendente",
    "falar com humano",
    "falar com uma pessoa",
    "suporte humano",
    "nao quero ia",
    "não quero ia",
    "me transfere",
    "transferir para atendente",
    "atendimento humano"
  ].some(term => normalized.includes(normalizeText(term)));
};

const renderHandoffTemplate = async ({
  template,
  contactPayload,
  queue,
  lastMessage,
  aiSetting
}: {
  template: string;
  contactPayload: ContactPayload;
  queue: Queue | null;
  lastMessage: string;
  aiSetting: AiSetting;
}): Promise<string> => {
  const brandName = await Setting.findOne({ where: { key: "brandName" } });

  return String(template || "")
    .replace(/{{\s*nome_contato\s*}}/gi, contactPayload.name || "")
    .replace(/{{\s*telefone_contato\s*}}/gi, contactPayload.number || "")
    .replace(/{{\s*fila\s*}}/gi, queue?.name || "")
    .replace(/{{\s*ultima_mensagem\s*}}/gi, lastMessage || "")
    .replace(/{{\s*data_hora\s*}}/gi, new Date().toLocaleString("pt-BR"))
    .replace(/{{\s*nome_empresa\s*}}/gi, aiSetting.companyName || brandName?.value || "")
    .replace(/{{\s*nome_ia\s*}}/gi, aiSetting.name || "IA");
};

const handoffToHuman = async (
  whatsappId: number,
  messageBody: string,
  ticket: Ticket,
  contactPayload: ContactPayload,
  aiSettingId?: number | null,
  customerMessageOverride?: string | null
): Promise<boolean> => {
  const aiSetting = aiSettingId ? await AiSetting.findByPk(aiSettingId) : null;
  if (!aiSetting) return false;

  if (!ticket.aiHumanHandoffQueueId) {
    logger.warn({ ticketId: ticket.id }, "AI handoff requested without URA human queue");
    return false;
  }

  const queue = await Queue.findByPk(ticket.aiHumanHandoffQueueId);
  const customerMessage =
    customerMessageOverride ||
    ticket.aiHumanHandoffMessage ||
    "O servico de IA se encontra indisponivel no momento. Vou transferir seu atendimento para um atendente.";

  await sendTextMessage(whatsappId, contactPayload, customerMessage, ticket);
  await UpdateTicketService({
      ticketData: {
      queueId: ticket.aiHumanHandoffQueueId,
      aiActive: false,
      aiHandled: true,
      aiHumanHandoffAt: new Date(),
      aiFinishedAt: new Date(),
      aiSettingId: null
    },
    ticketId: ticket.id
  });

  const alertEnabled = ticket.aiHandoffAlertEnabled === true;
  const alertTo = ticket.aiHandoffAlertTo;
  const alertMessage = ticket.aiHandoffAlertMessage;

  if (alertEnabled && alertTo && alertMessage && !ticket.aiHumanHandoffAlertSent) {
    const alertBody = await renderHandoffTemplate({
      template: alertMessage,
      contactPayload,
      queue,
      lastMessage: messageBody,
      aiSetting
    });

    const alertChatId = await normalizeAlertChatId(alertTo);

    if (!alertChatId) {
      logger.warn(
        { aiSettingId: aiSetting.id, alertTo },
        "AI human handoff alert target not found"
      );
    } else {
      try {
        const sentMessage = await whatsappProvider.sendMessage(
          whatsappId,
          alertChatId,
          alertBody,
          { linkPreview: false }
        );

        if (sentMessage) {
          await ticket.update({ aiHumanHandoffAlertSent: true });
        }
      } catch (error) {
        logger.error(
          { error, ticketId: ticket.id, aiSettingId: aiSetting.id, alertTo, alertChatId },
          "Error sending AI human handoff alert"
        );
      }
    }
  }

  return true;
};

const sendTextMessage = async (
  whatsappId: number,
  contactPayload: ContactPayload,
  body: string,
  ticket?: Ticket,
  senderType: "ai" | "system" | "ura" = "ai"
): Promise<void> => {
  const renderedBody = await RenderMessageVariables(`\u200e${body}`, contactPayload as any);
  const sentMessage = await whatsappProvider.sendMessage(
    whatsappId,
    contactChatId(contactPayload),
    renderedBody
  );

  if (ticket) {
    await CreateMessageService({
      messageData: {
        id: sentMessage.id,
        ticketId: ticket.id,
        body: sentMessage.body || renderedBody || body,
        fromMe: true,
        senderType,
        aiSessionStartedAt: senderType === "ai" ? ticket.aiStartedAt : null,
        read: true,
        mediaType: sentMessage.type,
        ack: sentMessage.ack !== undefined ? sentMessage.ack : 1
      }
    });
    await ticket.update({ lastMessage: sentMessage.body || renderedBody || body });
  }
};

const sendConfiguredMessage = async ({
  whatsappId,
  contactPayload,
  body,
  ticket,
  mediaUrl,
  mediaType,
  mediaName
}: {
  whatsappId: number;
  contactPayload: ContactPayload;
  body?: string | null;
  ticket?: Ticket;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
}): Promise<void> => {
  if (!mediaUrl) {
    if (body) await sendTextMessage(whatsappId, contactPayload, body, ticket, "ura");
    return;
  }

  const renderedBody = body ? await RenderMessageVariables(`\u200e${body}`, contactPayload as any) : undefined;
  const caption = renderedBody || undefined;
  const sentMessage = await whatsappProvider.sendMedia(
    whatsappId,
    contactChatId(contactPayload),
    {
      filename: mediaName || mediaUrl,
      mimetype: mediaType || "application/octet-stream",
      path: join(uploadConfig.directory, mediaUrl)
    },
    {
      caption,
      sendMediaAsDocument: mediaType ? !mediaType.startsWith("image/") && !mediaType.startsWith("video/") : true
    }
  );

  if (ticket) {
    await CreateMessageService({
      messageData: {
        id: sentMessage.id,
        ticketId: ticket.id,
        body: sentMessage.body || renderedBody || body || mediaName || mediaUrl,
        fromMe: true,
        senderType: "ura",
        aiSessionStartedAt: null,
        read: true,
        mediaType: sentMessage.type || mediaType || "document",
        mediaUrl,
        ack: sentMessage.ack !== undefined ? sentMessage.ack : 1
      }
    });
    await ticket.update({ lastMessage: sentMessage.body || renderedBody || body || mediaName || mediaUrl });
  }
};

const createTicketHistoryMessage = async (
  ticket: Ticket,
  body: string
): Promise<void> => {
  await CreateMessageService({
    messageData: {
      id: `ticket-history-${ticket.id}-${Date.now()}`,
      ticketId: ticket.id,
      body,
      fromMe: true,
      senderType: "system",
      aiSessionStartedAt: ticket.aiStartedAt,
      read: true,
      mediaType: "chat",
      ack: 1
    }
  });
};

const normalizeSimpleText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const timeToMinutes = (value = ""): number | null => {
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const rulesAreAvailableNow = (businessHours: string | null | undefined): boolean => {
  if (!businessHours) return false;
  try {
    const rules = JSON.parse(businessHours);
    const list = Array.isArray(rules) ? rules : [];
    const now = new Date();
    const day = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return list.some(rule => {
      const days = Array.isArray(rule.days) ? rule.days.map(Number) : [];
      const start = timeToMinutes(rule.start);
      const end = timeToMinutes(rule.end);
      return days.includes(day) && start !== null && end !== null && currentMinutes >= start && currentMinutes <= end;
    });
  } catch (error) {
    return false;
  }
};

const getSettingValue = async (key: string): Promise<string> => {
  const setting = await Setting.findOne({ where: { key } });
  return setting?.value || "";
};

const queueIsAvailableNow = async (queue: Queue): Promise<boolean> => {
  const mode = queue.businessHoursMode || (queue.businessHoursEnabled ? "custom" : "always");
  if (mode === "always" || !queue.businessHoursEnabled) return true;

  if (mode === "company") {
    const companyMode = await getSettingValue("companyBusinessHoursMode");
    if (!companyMode || companyMode === "always") return true;
    return rulesAreAvailableNow(await getSettingValue("companyBusinessHours"));
  }

  return rulesAreAvailableNow(queue.businessHours);
};

const sendQueueUnavailableIfNeeded = async (
  whatsappId: number,
  contactPayload: ContactPayload,
  ticket: Ticket,
  queue: Queue
): Promise<boolean> => {
  if (await queueIsAvailableNow(queue)) return false;
  const companyUnavailableMessage = queue.businessHoursMode === "company"
    ? await getSettingValue("companyUnavailableMessage")
    : "";

  await sendConfiguredMessage({
    whatsappId,
    contactPayload,
    ticket,
    body: queue.unavailableMessage || companyUnavailableMessage || "No momento esta fila esta fora do horario de atendimento.",
    mediaUrl: queue.unavailableMediaUrl,
    mediaType: queue.unavailableMediaType,
    mediaName: queue.unavailableMediaName
  });

  return true;
};

const isSimpleGreeting = (message: string): boolean =>
  /^(oi|ola|olá|bom dia|boa tarde|boa noite|e ai|e aí|opa|hello|hi)$/.test(
    normalizeSimpleText(message)
  );

const stripAiCloseTag = (message: string): { body: string; shouldClose: boolean } => {
  const shouldClose = message.includes(AI_CLOSE_TAG);
  return {
    body: message.replace(AI_CLOSE_TAG, "").trim(),
    shouldClose
  };
};

const isMoreHelpQuestion = (body: string): boolean =>
  /ajudo em algo mais|ajuda em algo mais|posso ajudar em algo mais|posso ajudar em mais alguma coisa|mais alguma coisa|algo mais|consegui te ajudar|consegui ajudar|te ajudei|essa informacao te ajudou|essa informação te ajudou/i.test(
    normalizeSimpleText(body)
  );

const getAiQuestionType = (body: string): string | null => {
  const normalized = normalizeSimpleText(body);

  if (
    /consegui te ajudar|consegui ajudar|te ajudei|essa orientacao te ajudou|essa informacao te ajudou|isso te ajuda|isso resolve|resolve a situacao|conseguiu verificar|consegue verificar dessa forma|funcionou/i.test(
      normalized
    )
  ) {
    return "satisfaction_check";
  }

  if (
    /ajudo em algo mais|ajuda em algo mais|posso ajudar em algo mais|posso ajudar em mais alguma coisa|mais alguma coisa|algo mais|precisa de mais alguma coisa/i.test(
      normalized
    )
  ) {
    return "more_help";
  }

  return null;
};

const getAiClosingReasonId = async (ticket: Ticket): Promise<number | null> => {
  if (ticket.aiAutoCloseReasonId) return ticket.aiAutoCloseReasonId;

  const reason = await ClosingReason.findOne({
    where: { active: true },
    order: [["id", "ASC"]]
  });

  return reason?.id || null;
};

const buildAiConversationSummary = (
  previousSummary: string | null | undefined,
  userMessage: string,
  aiMessage: string,
  action: string
): string => {
  const compact = [
    previousSummary,
    `Cliente: ${userMessage}`,
    `IA (${action}): ${aiMessage}`
  ].filter(Boolean).join(" | ");

  return compact.length > 1200 ? compact.slice(compact.length - 1200) : compact;
};

const buildAiStateUpdate = (
  ticket: Ticket,
  userMessage: string,
  aiMessage: string,
  action: string,
  intent?: string,
  reason?: string,
  knowledgeIds?: number[],
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => {
  const questionType = getAiQuestionType(aiMessage);

  return {
    aiHandled: true,
    lastAiMessage: aiMessage,
    lastAiIntent: intent || null,
    lastAiAction: action,
    lastAiDecisionReason: reason || null,
    lastAiKnowledgeIds: knowledgeIds?.length ? JSON.stringify(knowledgeIds) : null,
    lastAiAskedMoreHelp: questionType === "more_help",
    lastAiQuestionType: questionType,
    lastAiExpectedReply: questionType ? "yes_no" : null,
    lastAiQuestionOptions: null,
    lastAiQuestionAt: questionType ? new Date() : null,
    lastAiQuestionAttempts: 0,
    lastAiInteractionAt: new Date(),
    aiInteractionCount: Number(ticket.aiInteractionCount || 0) + 1,
    aiConversationSummary: buildAiConversationSummary(
      ticket.aiConversationSummary,
      userMessage,
      aiMessage,
      action
    ),
    ...overrides
  };
};

const handleAiReply = async (
  whatsappId: number,
  messageBody: string,
  ticket: Ticket,
  contactPayload: ContactPayload,
  aiSettingId?: number | null
): Promise<boolean> => {
  if (isSimpleGreeting(messageBody)) {
    await sendTextMessage(
      whatsappId,
      contactPayload,
      `Ola${contactPayload.name ? `, ${contactPayload.name}` : ""}! Como posso ajudar?`,
      ticket
    );
    await ticket.update(buildAiStateUpdate(
      ticket,
      messageBody,
      `Ola${contactPayload.name ? `, ${contactPayload.name}` : ""}! Como posso ajudar?`,
      "saudacao",
      "saudacao"
    ));
    return true;
  }

  const aiDecision = await DecideAiTicketActionService({
    ticket,
    aiSettingId,
    message: messageBody,
    contactName: contactPayload.name
  });

  if (aiDecision.acao === "nao_responder") {
    return false;
  }

  try {
    if (
      ticket.lastAiQuestionType === "confirmacao_opcao" &&
      ["pedir_confirmacao", "pedir_mais_informacoes", "sem_resposta_segura"].includes(aiDecision.acao)
    ) {
      const aiSetting = aiSettingId ? await AiSetting.findByPk(aiSettingId) : null;
      const attempts = Number(ticket.lastAiQuestionAttempts || 0) + 1;
      const maxAttempts = Number(aiSetting?.confirmationMaxAttempts || 2);

      if (attempts >= maxAttempts) {
        const fallbackMessage =
          aiSetting?.confirmationFailureMessage ||
          "Nao consegui identificar com seguranca a opcao desejada. Vou encaminhar seu atendimento para um atendente.";

        if (fallbackMessage) {
          await sendTextMessage(whatsappId, contactPayload, fallbackMessage, ticket);
        }

        const handedOff = await handoffToHuman(
          whatsappId,
          messageBody,
          ticket,
          contactPayload,
          aiSettingId
        );

        if (!handedOff) {
          await ticket.update({
            aiActive: false,
            aiFinishedAt: new Date(),
            lastAiQuestionType: null,
            lastAiQuestionOptions: null,
            lastAiQuestionAt: null,
            lastAiQuestionAttempts: 0
          });
        }

        return true;
      }

      await ticket.update({ lastAiQuestionAttempts: attempts });
    }

    if (aiDecision.acao === "encaminhar_atendente" || aiDecision.acao === "sem_resposta_segura") {
      logger.info(
        {
          ticketId: ticket.id,
          action: aiDecision.acao,
          intent: aiDecision.intencao,
          reason: aiDecision.motivo,
          baseFound: aiDecision.baseEncontrada,
          safeAnswer: aiDecision.respostaSegura
        },
        "[AI ACTION] Handoff requested"
      );

      const handedOff = await handoffToHuman(
        whatsappId,
        messageBody,
        ticket,
        contactPayload,
        aiSettingId,
        aiDecision.intencao === "erro_api_ia"
          ? aiDecision.resposta
          : aiDecision.acao === "sem_resposta_segura"
            ? AI_NO_SAFE_ANSWER_HANDOFF_MESSAGE
            : null
      );

      if (!handedOff) {
        await sendTextMessage(
          whatsappId,
          contactPayload,
          aiDecision.intencao === "erro_api_ia"
            ? aiDecision.resposta || "O servico de IA esta indisponivel no momento. Vou transferir seu atendimento para um atendente."
            : AI_NO_SAFE_ANSWER_HANDOFF_MESSAGE,
          ticket
        );
        await ticket.update({
          queueId: null,
          aiActive: false,
          aiFinishedAt: new Date(),
          aiSettingId: null
        });
      }

      return true;
    }

    if (aiDecision.acao === "encerrar_atendimento") {
      const closingReasonId = await getAiClosingReasonId(ticket);

      if (!closingReasonId) {
        const handedOff = await handoffToHuman(
          whatsappId,
          messageBody,
          ticket,
          contactPayload,
          aiSettingId
        );
        return handedOff;
      }

      const rawClosingMessage =
        aiDecision.resposta ||
        "Que bom que pude ajudar. Vou finalizar seu atendimento. Se precisar novamente, e so chamar. [FECHAR TICKET]";
      const { body: closingMessage } = stripAiCloseTag(rawClosingMessage);

      await sendTextMessage(whatsappId, contactPayload, closingMessage, ticket);

      await UpdateTicketService({
        ticketId: ticket.id,
        ticketData: {
          status: "closed",
          categoryId: ticket.categoryId,
          closingReasonId,
          closingNote: "Atendimento encerrado pela IA conforme contexto da conversa.",
          aiActive: false,
          aiHandled: true,
          aiAutoClosed: true,
          aiAutoClosedAt: new Date(),
          aiFinishedAt: new Date(),
          aiSettingId: ticket.aiSettingId,
          lastAiMessage: closingMessage,
          lastAiIntent: aiDecision.intencao,
          lastAiAction: aiDecision.acao,
          lastAiDecisionReason: aiDecision.motivo,
          lastAiKnowledgeIds: aiDecision.knowledgeIds?.length ? JSON.stringify(aiDecision.knowledgeIds) : null,
          lastAiAskedMoreHelp: false,
          aiInteractionCount: Number(ticket.aiInteractionCount || 0) + 1,
          aiConversationSummary: buildAiConversationSummary(
            ticket.aiConversationSummary,
            messageBody,
            closingMessage,
            aiDecision.acao
          )
        }
      });

      await createTicketHistoryMessage(
        ticket,
        "Atendimento encerrado pela IA conforme contexto da conversa."
      );
      return true;
    }

    if (aiDecision.acao === "pedir_confirmacao") {
      const options = aiDecision.opcoes || [];
      const optionLines = options
        .map(option => `${option.numero} - ${option.valor}`)
        .join("\n");
      const body = [aiDecision.perguntaConfirmacao, optionLines].filter(Boolean).join("\n\n");

      await sendTextMessage(whatsappId, contactPayload, body, ticket);
      await ticket.update({
        aiHandled: true,
        lastAiMessage: body,
        lastAiIntent: aiDecision.intencao,
        lastAiAction: aiDecision.acao,
        lastAiDecisionReason: aiDecision.motivo,
        lastAiKnowledgeIds: aiDecision.knowledgeIds?.length ? JSON.stringify(aiDecision.knowledgeIds) : null,
        lastAiAskedMoreHelp: false,
        lastAiExpectedReply: "option",
        lastAiQuestionType: "confirmacao_opcao",
        lastAiQuestionOptions: JSON.stringify(options),
        lastAiQuestionAt: new Date(),
        lastAiQuestionAttempts: 0,
        lastAiInteractionAt: new Date(),
        aiInteractionCount: Number(ticket.aiInteractionCount || 0) + 1,
        aiConversationSummary: buildAiConversationSummary(
          ticket.aiConversationSummary,
          messageBody,
          body,
          aiDecision.acao
        )
      });
      return true;
    }

    if (aiDecision.acao === "pedir_mais_informacoes") {
      const body =
        aiDecision.resposta ||
        "Para eu te passar a informacao correta, pode me dar mais detalhes sobre o que voce precisa?";

      await sendTextMessage(whatsappId, contactPayload, body, ticket);
      await ticket.update(buildAiStateUpdate(
        ticket,
        messageBody,
        body,
        aiDecision.acao,
        aiDecision.intencao,
        aiDecision.motivo,
        aiDecision.knowledgeIds,
        {
          lastAiQuestionType: "missing_info",
          lastAiExpectedReply: "free_text",
          lastAiQuestionAt: new Date()
        }
      ));
      return true;
    }

    if (aiDecision.acao === "responder_com_base" && aiDecision.resposta) {
      const { body, shouldClose } = stripAiCloseTag(aiDecision.resposta);
      await sendTextMessage(whatsappId, contactPayload, body, ticket);

      if (shouldClose) {
        const closingReasonId = await getAiClosingReasonId(ticket);

        if (!closingReasonId) {
          await handoffToHuman(whatsappId, messageBody, ticket, contactPayload, aiSettingId);
          return true;
        }

        await UpdateTicketService({
          ticketId: ticket.id,
          ticketData: {
            status: "closed",
            categoryId: ticket.categoryId,
            closingReasonId,
            closingNote: "Atendimento encerrado pela IA conforme tag de contexto.",
            aiActive: false,
            aiHandled: true,
            aiAutoClosed: true,
            aiAutoClosedAt: new Date(),
            aiFinishedAt: new Date(),
            aiSettingId: ticket.aiSettingId,
            lastAiMessage: body,
            lastAiIntent: aiDecision.intencao,
            lastAiAction: aiDecision.acao,
            lastAiDecisionReason: aiDecision.motivo,
            lastAiKnowledgeIds: aiDecision.knowledgeIds?.length ? JSON.stringify(aiDecision.knowledgeIds) : null,
            lastAiAskedMoreHelp: false,
            aiInteractionCount: Number(ticket.aiInteractionCount || 0) + 1,
            aiConversationSummary: buildAiConversationSummary(
              ticket.aiConversationSummary,
              messageBody,
              body,
              aiDecision.acao
            )
          }
        });
        return true;
      }

      await ticket.update(buildAiStateUpdate(
        ticket,
        messageBody,
        body,
        aiDecision.acao,
        aiDecision.intencao,
        aiDecision.motivo,
        aiDecision.knowledgeIds
      ));
      return true;
    }

    await handoffToHuman(whatsappId, messageBody, ticket, contactPayload, aiSettingId);
    return true;
  } catch (error) {
    logger.error("Error sending AI response:", error);
    return false;
  }
};

const sortUraOptions = (options: any[]): any[] =>
  [...options].sort(
    (a, b) => Number(a.order || 0) - Number(b.order || 0)
  );

const getUraOptionsByParent = (flow: any, parentOptionId: number | null): any[] =>
  sortUraOptions(flow.options || []).filter(option => {
    const optionParentId = option.parentOptionId ? Number(option.parentOptionId) : null;
    return option.active !== false && optionParentId === parentOptionId;
  });

const getCurrentUraParentOption = async (ticket: Ticket): Promise<UraOption | null> => {
  if (!ticket.currentUraOptionId) return null;
  return UraOption.findByPk(ticket.currentUraOptionId);
};

const hasParentUraOption = (parentOption?: any | null): boolean =>
  !!parentOption?.parentOptionId;

const getSubmenuNavigationFooter = (parentOption?: any | null): string => {
  const lines = [
    hasParentUraOption(parentOption)
      ? "Para voltar ao menu ou encerrar o atendimento, digite:"
      : "Para voltar ao menu principal ou encerrar o atendimento, digite:"
  ];
  if (hasParentUraOption(parentOption)) {
    lines.push("*V* - Voltar");
  }
  lines.push("*M* - Menu principal");
  lines.push("*S* - Encerrar atendimento");
  return lines.join("\n");
};

const buildUraMenu = (flow: any, parentOption?: any | null): string => {
  const options = getUraOptionsByParent(flow, parentOption?.id ? Number(parentOption.id) : null);

  const optionLines = options
    .map(option => `*${option.optionKey}* - ${option.title}`)
    .join("\n");

  const menuMessage = parentOption?.responseMessage || flow.welcomeMessage;
  const navigationFooter = parentOption ? getSubmenuNavigationFooter(parentOption) : null;

  return [menuMessage, optionLines, navigationFooter].filter(Boolean).join("\n\n");
};

const appendSubmenuNavigationFooter = (
  body?: string | null,
  parentOption?: any | null
): string | null => {
  if (!body) return body || null;
  return `${body.trim()}\n\n${getSubmenuNavigationFooter(parentOption)}`;
};

const getUraNavigationCommand = (messageBody: string): "back" | "root" | "close" | null => {
  const normalized = normalizeText(messageBody || "").trim();
  if (["v", "voltar", "volta", "anterior", "menu anterior"].includes(normalized)) return "back";
  if (["m", "menu", "inicio", "principal", "menu principal", "inicial"].includes(normalized)) return "root";
  if (["s", "sair", "encerrar", "finalizar", "fechar", "encerra", "finaliza", "fecha"].includes(normalized)) return "close";
  return null;
};

const getUraClosingReasonId = async (flow: any): Promise<number | null> => {
  if (flow?.aiAutoCloseReasonId) return flow.aiAutoCloseReasonId;

  const reason = await ClosingReason.findOne({
    where: { active: true },
    order: [["id", "ASC"]]
  });

  return reason?.id || null;
};

const getUraAiAutoCloseConfig = (flow: any, selectedOption: any) => {
  const optionAutoCloseEnabled = selectedOption?.aiAutoCloseEnabled === true;
  const flowAutoCloseEnabled = flow?.aiAutoCloseEnabled === true;
  const source = optionAutoCloseEnabled ? selectedOption : flowAutoCloseEnabled ? flow : null;

  return {
    aiAutoCloseEnabled: !!source,
    aiAutoCloseMinutes: source?.aiAutoCloseMinutes || null,
    aiAutoCloseMessage: source?.aiAutoCloseMessage || null,
    aiAutoCloseReasonId: source?.aiAutoCloseReasonId || null,
    aiAutoCloseOnlyIfNotHandedOff: source?.aiAutoCloseOnlyIfNotHandedOff !== false
  };
};

const findUraOption = (options: any[], messageBody: string): any | undefined => {
  const normalizedMessage = (messageBody || "").trim().toLowerCase();
  return options.find(
    option =>
      String(option.optionKey).trim().toLowerCase() === normalizedMessage ||
      normalizeText(option.title) === normalizeText(normalizedMessage)
  );
};

const handleUraLogic = async (
  whatsappId: number,
  messageBody: string,
  ticket: Ticket,
  contactPayload: ContactPayload,
  whatsapp: any
): Promise<boolean> => {
  const flow = whatsapp.uraFlow;

  if (!flow || !flow.active) return false;

  const currentParentOption = await getCurrentUraParentOption(ticket);
  const currentOptions = getUraOptionsByParent(
    flow,
    currentParentOption?.id ? Number(currentParentOption.id) : null
  );

  const navigationCommand = currentParentOption
    ? getUraNavigationCommand(messageBody)
    : null;

  if (navigationCommand === "root") {
    const menu = buildUraMenu(flow, null);
    if (menu) {
      await sendConfiguredMessage({
        whatsappId,
        contactPayload,
        body: menu,
        ticket,
        mediaUrl: flow.welcomeMediaUrl,
        mediaType: flow.welcomeMediaType,
        mediaName: flow.welcomeMediaName
      });
    }
    await ticket.update({
      currentUraOptionId: null,
      uraMenuSentAt: new Date(),
      uraInvalidAttempts: 0,
      lastUraInteractionAt: new Date(),
      aiAutoCloseEnabled: false,
      aiAutoCloseMinutes: null,
      aiAutoCloseMessage: null,
      aiAutoCloseReasonId: null
    });
    return true;
  }

  if (navigationCommand === "back") {
    const parent = currentParentOption?.parentOptionId
      ? await UraOption.findByPk(currentParentOption.parentOptionId)
      : null;
    const menu = buildUraMenu(flow, parent);
    if (menu) {
      await sendConfiguredMessage({
        whatsappId,
        contactPayload,
        body: menu,
        ticket,
        mediaUrl: parent?.responseMediaUrl || flow.welcomeMediaUrl,
        mediaType: parent?.responseMediaType || flow.welcomeMediaType,
        mediaName: parent?.responseMediaName || flow.welcomeMediaName
      });
    }
    await ticket.update({
      currentUraOptionId: parent?.id || null,
      uraMenuSentAt: new Date(),
      uraInvalidAttempts: 0,
      lastUraInteractionAt: new Date(),
      aiAutoCloseEnabled: false,
      aiAutoCloseMinutes: null,
      aiAutoCloseMessage: null,
      aiAutoCloseReasonId: null
    });
    return true;
  }

  if (navigationCommand === "close") {
    const closingReasonId = await getUraClosingReasonId(flow);
    if (!closingReasonId) {
      await sendTextMessage(
        whatsappId,
        contactPayload,
        "Nao encontrei um motivo de encerramento configurado para finalizar este atendimento automaticamente.",
        ticket,
        "ura"
      );
      return true;
    }

    await sendTextMessage(
      whatsappId,
      contactPayload,
      "Atendimento encerrado. Se precisar, envie uma nova mensagem para comecar novamente.",
      ticket,
      "ura"
    );
    await UpdateTicketService({
      ticketData: {
        status: "closed",
        queueId: ticket.queueId,
        aiActive: false,
        aiSettingId: null,
        closingReasonId,
        closingNote: "Encerrado por comando de navegacao da URA",
        automationClosed: true,
        uraActive: false,
        currentUraOptionId: null
      },
      ticketId: ticket.id
    });
    return true;
  }

  const selectedOption = findUraOption(currentOptions, messageBody) ||
    (
      isHumanRequest(messageBody)
        ? currentOptions.find(option =>
            ["HUMAN", "TRANSFER_QUEUE"].includes(option.action) &&
            /atendente|humano|pessoa/.test(normalizeText(`${option.title} ${option.responseMessage || ""}`))
          )
        : undefined
  );

  if (!selectedOption) {
    const menuAlreadySentForFlow =
      ticket.uraFlowId === flow.id && !!ticket.uraMenuSentAt;
    const lastMenuSentAt = ticket.uraMenuSentAt
      ? new Date(ticket.uraMenuSentAt).getTime()
      : 0;
    const sentRecently = lastMenuSentAt && Date.now() - lastMenuSentAt < 15000;

    if (menuAlreadySentForFlow && sentRecently) {
      return true;
    }

    if (uraMenuLocks.has(ticket.id)) {
      return true;
    }

    const invalidAttempts = Number(ticket.uraInvalidAttempts || 0) + (ticket.uraActive ? 1 : 0);
    if (ticket.uraActive && flow.maxInvalidAttempts && invalidAttempts >= Number(flow.maxInvalidAttempts)) {
      if (flow.fallbackQueueId) {
        await UpdateTicketService({
          ticketData: {
            queueId: flow.fallbackQueueId,
            aiActive: false,
            aiSettingId: null,
            uraInvalidAttempts: invalidAttempts,
            uraActive: false,
            currentUraOptionId: null,
            lastUraInteractionAt: new Date()
          },
          ticketId: ticket.id
        });
      } else {
        await sendTextMessage(
          whatsappId,
          contactPayload,
          flow.invalidOptionMessage ||
            "Nao consegui identificar uma opcao valida. Vou encerrar este menu por agora. Se precisar, envie uma nova mensagem para recomecar.",
          ticket,
          "ura"
        );
        await ticket.update({
          uraInvalidAttempts: invalidAttempts,
          uraActive: false,
          currentUraOptionId: null,
          lastUraInteractionAt: new Date()
        });
      }
      return true;
    }

    if (menuAlreadySentForFlow && flow.invalidOptionMessage) {
      await sendTextMessage(whatsappId, contactPayload, flow.invalidOptionMessage, ticket, "ura");
      await ticket.update({
        uraInvalidAttempts: invalidAttempts,
        lastUraInteractionAt: new Date()
      });
      return true;
    }

    const menu = buildUraMenu(flow, currentParentOption);
    if (menu) {
      uraMenuLocks.add(ticket.id);
      try {
        await sendConfiguredMessage({
          whatsappId,
          contactPayload,
          body: menu,
          ticket,
          mediaUrl: flow.welcomeMediaUrl,
          mediaType: flow.welcomeMediaType,
          mediaName: flow.welcomeMediaName
        });
        await ticket.update({
          queueId: null,
          uraFlowId: flow.id,
          uraMenuSentAt: new Date(),
          uraActive: true,
          uraInvalidAttempts: 0,
          lastUraInteractionAt: new Date(),
          aiActive: false,
          aiSettingId: null
        });
      } finally {
        setTimeout(() => uraMenuLocks.delete(ticket.id), 15000);
      }
    }
    return true;
  }

  await ticket.update({
    uraFlowId: flow.id,
    uraActive: true,
    uraInvalidAttempts: 0,
    lastUraInteractionAt: new Date()
  });

  if (selectedOption.action === "OPEN_SUBMENU") {
    const submenuOptions = getUraOptionsByParent(flow, Number(selectedOption.id));
    const submenu = buildUraMenu(flow, selectedOption);

    if (submenuOptions.length && submenu) {
      await sendConfiguredMessage({
        whatsappId,
        contactPayload,
        body: submenu,
        ticket,
        mediaUrl: selectedOption.responseMediaUrl,
        mediaType: selectedOption.responseMediaType,
        mediaName: selectedOption.responseMediaName
      });
      await ticket.update({
        currentUraOptionId: selectedOption.id,
        uraMenuSentAt: new Date(),
        uraInvalidAttempts: 0,
        lastUraInteractionAt: new Date()
      });
      return true;
    }
  }

  if (selectedOption.action === "BACK_ROOT") {
    const menu = buildUraMenu(flow, null);
    if (menu) {
      await sendConfiguredMessage({
        whatsappId,
        contactPayload,
        body: menu,
        ticket,
        mediaUrl: flow.welcomeMediaUrl,
        mediaType: flow.welcomeMediaType,
        mediaName: flow.welcomeMediaName
      });
    }
    await ticket.update({
      currentUraOptionId: null,
      uraMenuSentAt: new Date(),
      uraInvalidAttempts: 0,
      lastUraInteractionAt: new Date()
    });
    return true;
  }

  if (selectedOption.action === "BACK_PREVIOUS") {
    const parent = currentParentOption?.parentOptionId
      ? await UraOption.findByPk(currentParentOption.parentOptionId)
      : null;
    const menu = buildUraMenu(flow, parent);
    if (menu) {
      await sendConfiguredMessage({
        whatsappId,
        contactPayload,
        body: menu,
        ticket,
        mediaUrl: parent?.responseMediaUrl || flow.welcomeMediaUrl,
        mediaType: parent?.responseMediaType || flow.welcomeMediaType,
        mediaName: parent?.responseMediaName || flow.welcomeMediaName
      });
    }
    await ticket.update({
      currentUraOptionId: parent?.id || null,
      uraMenuSentAt: new Date(),
      uraInvalidAttempts: 0,
      lastUraInteractionAt: new Date()
    });
    return true;
  }

  if (selectedOption.responseMessage || selectedOption.responseMediaUrl) {
    const shouldShowNavigationFooter =
      !!currentParentOption && selectedOption.action === "SEND_MESSAGE";

    await sendConfiguredMessage({
      whatsappId,
      contactPayload,
      body: shouldShowNavigationFooter
        ? appendSubmenuNavigationFooter(selectedOption.responseMessage, currentParentOption)
        : selectedOption.responseMessage,
      ticket,
      mediaUrl: selectedOption.responseMediaUrl,
      mediaType: selectedOption.responseMediaType,
      mediaName: selectedOption.responseMediaName
    });

    if (selectedOption.action === "SEND_MESSAGE") {
      await ticket.update({
        lastUraInteractionAt: new Date(),
        aiAutoCloseEnabled: selectedOption.aiAutoCloseEnabled === true,
        aiAutoCloseMinutes: selectedOption.aiAutoCloseEnabled
          ? selectedOption.aiAutoCloseMinutes || null
          : null,
        aiAutoCloseMessage: selectedOption.aiAutoCloseEnabled
          ? selectedOption.aiAutoCloseMessage || null
          : null,
        aiAutoCloseReasonId: selectedOption.aiAutoCloseEnabled
          ? selectedOption.aiAutoCloseReasonId || null
          : null,
        aiAutoCloseOnlyIfNotHandedOff: selectedOption.aiAutoCloseOnlyIfNotHandedOff !== false
      });
    }
  }

  if (selectedOption.action === "TRANSFER_QUEUE" && selectedOption.targetQueueId) {
    const queue = await Queue.findByPk(selectedOption.targetQueueId);
    if (queue && await sendQueueUnavailableIfNeeded(whatsappId, contactPayload, ticket, queue)) {
      return true;
    }

    await UpdateTicketService({
      ticketData: {
        queueId: selectedOption.targetQueueId,
        aiActive: false,
        aiSettingId: null,
        uraActive: false,
        currentUraOptionId: null
      },
      ticketId: ticket.id
    });

    return true;
  }

  if (selectedOption.action === "CLOSE_TICKET") {
    await UpdateTicketService({
      ticketData: {
        status: "closed",
        queueId: ticket.queueId,
        aiActive: false,
        aiHandled: true,
        aiSettingId: null,
        closingReasonId: selectedOption.closingReasonId,
        closingNote: "Encerrado pela URA",
        uraActive: false,
        currentUraOptionId: null
      },
      ticketId: ticket.id
    });

    return true;
  }

  if (selectedOption.action === "START_AI") {
    const autoCloseConfig = getUraAiAutoCloseConfig(flow, selectedOption);

    if (selectedOption.targetQueueId) {
      const queue = await Queue.findByPk(selectedOption.targetQueueId);
      if (queue && await sendQueueUnavailableIfNeeded(whatsappId, contactPayload, ticket, queue)) {
        return true;
      }
      const aiSettingId = queue?.aiSettingId || null;

      await UpdateTicketService({
        ticketData: {
          queueId: selectedOption.targetQueueId,
          aiActive: true,
          aiHandled: true,
          aiQueueId: selectedOption.targetQueueId,
          aiStartedAt: new Date(),
          aiFinishedAt: null,
          aiAutoClosed: false,
          aiAutoClosedAt: null,
          aiHumanHandoffAt: null,
          aiHumanHandoffAlertSent: false,
          lastAiQuestionType: null,
          lastAiQuestionOptions: null,
          lastAiQuestionAt: null,
          lastAiQuestionAttempts: 0,
          lastAiInteractionAt: null,
          lastAiMessage: null,
          lastAiExpectedReply: null,
          lastAiIntent: null,
          lastAiAction: null,
          lastAiKnowledgeIds: null,
          lastAiDecisionReason: null,
          lastAiAskedMoreHelp: false,
          aiInteractionCount: 0,
          aiConversationSummary: null,
          ...autoCloseConfig,
          aiHumanHandoffQueueId: selectedOption.aiHumanHandoffQueueId || null,
          aiHumanHandoffMessage: selectedOption.aiHumanHandoffMessage || null,
          aiHandoffAlertEnabled: selectedOption.aiHandoffAlertEnabled ? true : false,
          aiHandoffAlertTo: selectedOption.aiHandoffAlertTo || null,
          aiHandoffAlertMessage: selectedOption.aiHandoffAlertMessage || null,
          aiSettingId,
          uraActive: false,
          currentUraOptionId: null
        },
        ticketId: ticket.id
      });

      return true;
    }

    await ticket.update({
      aiActive: true,
      aiHandled: true,
      aiStartedAt: new Date(),
      aiFinishedAt: null,
      aiAutoClosed: false,
      aiAutoClosedAt: null,
      aiHumanHandoffAt: null,
      aiHumanHandoffAlertSent: false,
      lastAiQuestionType: null,
      lastAiQuestionOptions: null,
      lastAiQuestionAt: null,
      lastAiQuestionAttempts: 0,
      lastAiInteractionAt: null,
      lastAiMessage: null,
      lastAiExpectedReply: null,
      lastAiIntent: null,
      lastAiAction: null,
      lastAiKnowledgeIds: null,
      lastAiDecisionReason: null,
      lastAiAskedMoreHelp: false,
      aiInteractionCount: 0,
      aiConversationSummary: null,
      ...autoCloseConfig,
      aiHumanHandoffQueueId: null,
      aiHumanHandoffMessage: null,
      aiHandoffAlertEnabled: false,
      aiHandoffAlertTo: null,
      aiHandoffAlertMessage: null,
      aiSettingId: null,
      uraActive: false,
      currentUraOptionId: null
    });
    return true;
  }

  if (selectedOption.action === "HUMAN" && flow.fallbackQueueId) {
    await UpdateTicketService({
      ticketData: {
        queueId: flow.fallbackQueueId,
        aiActive: false,
        aiSettingId: null,
        uraActive: false,
        currentUraOptionId: null
      },
      ticketId: ticket.id
    });

    return true;
  }

  return true;
};

const handleQueueLogic = async (
  whatsappId: number,
  messageBody: string,
  ticket: Ticket,
  contactPayload: ContactPayload
): Promise<void> => {
  const { queues, greetingMessage } = await ShowWhatsAppService(whatsappId);

  if (queues.length === 1) {
    const queue = queues[0];
    if (await sendQueueUnavailableIfNeeded(whatsappId, contactPayload, ticket, queue)) {
      return;
    }
    await UpdateTicketService({
      ticketData: {
        queueId: queue.id,
        aiActive: !!queue.useAI,
        aiHandled: !!queue.useAI,
        aiQueueId: queue.useAI ? queue.id : null,
        aiStartedAt: queue.useAI ? new Date() : null,
        aiFinishedAt: queue.useAI ? null : undefined,
        aiAutoClosed: queue.useAI ? false : undefined,
        aiAutoClosedAt: queue.useAI ? null : undefined,
        aiHumanHandoffAt: queue.useAI ? null : undefined,
        aiHumanHandoffAlertSent: queue.useAI ? false : undefined,
        lastAiQuestionType: queue.useAI ? null : undefined,
        lastAiQuestionOptions: queue.useAI ? null : undefined,
        lastAiQuestionAt: queue.useAI ? null : undefined,
        lastAiQuestionAttempts: queue.useAI ? 0 : undefined,
        lastAiInteractionAt: queue.useAI ? null : undefined,
        lastAiMessage: queue.useAI ? null : undefined,
        lastAiExpectedReply: queue.useAI ? null : undefined,
        lastAiIntent: queue.useAI ? null : undefined,
        lastAiAction: queue.useAI ? null : undefined,
        lastAiKnowledgeIds: queue.useAI ? null : undefined,
        lastAiDecisionReason: queue.useAI ? null : undefined,
        lastAiAskedMoreHelp: queue.useAI ? false : undefined,
        aiInteractionCount: queue.useAI ? 0 : undefined,
        aiConversationSummary: queue.useAI ? null : undefined,
        aiSettingId: queue.useAI ? queue.aiSettingId : null
      },
      ticketId: ticket.id
    });
    return;
  }

  const selectedOption = messageBody;
  const choosenQueue = queues[+selectedOption - 1];

  if (choosenQueue) {
    if (await sendQueueUnavailableIfNeeded(whatsappId, contactPayload, ticket, choosenQueue)) {
      return;
    }
    await UpdateTicketService({
      ticketData: {
        queueId: choosenQueue.id,
        aiActive: !!choosenQueue.useAI,
        aiHandled: !!choosenQueue.useAI,
        aiQueueId: choosenQueue.useAI ? choosenQueue.id : null,
        aiStartedAt: choosenQueue.useAI ? new Date() : null,
        aiFinishedAt: choosenQueue.useAI ? null : undefined,
        aiAutoClosed: choosenQueue.useAI ? false : undefined,
        aiAutoClosedAt: choosenQueue.useAI ? null : undefined,
        aiHumanHandoffAt: choosenQueue.useAI ? null : undefined,
        aiHumanHandoffAlertSent: choosenQueue.useAI ? false : undefined,
        lastAiQuestionType: choosenQueue.useAI ? null : undefined,
        lastAiQuestionOptions: choosenQueue.useAI ? null : undefined,
        lastAiQuestionAt: choosenQueue.useAI ? null : undefined,
        lastAiQuestionAttempts: choosenQueue.useAI ? 0 : undefined,
        lastAiInteractionAt: choosenQueue.useAI ? null : undefined,
        lastAiMessage: choosenQueue.useAI ? null : undefined,
        lastAiExpectedReply: choosenQueue.useAI ? null : undefined,
        lastAiIntent: choosenQueue.useAI ? null : undefined,
        lastAiAction: choosenQueue.useAI ? null : undefined,
        lastAiKnowledgeIds: choosenQueue.useAI ? null : undefined,
        lastAiDecisionReason: choosenQueue.useAI ? null : undefined,
        lastAiAskedMoreHelp: choosenQueue.useAI ? false : undefined,
        aiInteractionCount: choosenQueue.useAI ? 0 : undefined,
        aiConversationSummary: choosenQueue.useAI ? null : undefined,
        aiSettingId: choosenQueue.useAI ? choosenQueue.aiSettingId : null
      },
      ticketId: ticket.id
    });

  } else {
    let options = "";
    queues.forEach((queue, index) => {
      options += `*${index + 1}* - ${queue.name}\n`;
    });

    const body = formatBody(
      `\u200e${greetingMessage}\n${options}`,
      contactPayload as any
    );

    const debouncedSentMessage = debounce(
      async () => {
        try {
          await whatsappProvider.sendMessage(
            whatsappId,
            `${contactPayload.number}@c.us`,
            body
          );
        } catch (error) {
          logger.error("Error sending queue options message:", error);
        }
      },
      3000,
      ticket.id
    );

    debouncedSentMessage();
  }
};

export const handleMessage = async (
  messagePayload: MessagePayload,
  contactPayload: ContactPayload,
  contextPayload: WhatsappContextPayload,
  mediaPayload?: MediaPayload
): Promise<void> => {
  try {
    const processedMessage = processLocationMessage(messagePayload);

    const contact = await CreateOrUpdateContactService({
      name: contactPayload.name,
      number: contactPayload.number,
      lid: contactPayload.lid,
      profilePicUrl: contactPayload.profilePicUrl,
      isGroup: contactPayload.isGroup
    });

    let groupContact: Contact | undefined;
    if (contextPayload.groupContact) {
      groupContact = await CreateOrUpdateContactService({
        name: contextPayload.groupContact.name,
        number: contextPayload.groupContact.number,
        lid: contextPayload.groupContact.lid,
        profilePicUrl: contextPayload.groupContact.profilePicUrl,
        isGroup: contextPayload.groupContact.isGroup
      });
    }

    const whatsapp = await ShowWhatsAppService(contextPayload.whatsappId);
    if (
      contextPayload.unreadMessages === 0 &&
      whatsapp.farewellMessage &&
      formatBody(whatsapp.farewellMessage, contact) === processedMessage.body
    ) {
      return;
    }

    if (processedMessage.fromMe) {
      const openTicket = await Ticket.findOne({
        where: {
          status: { [Op.or]: ["open", "pending"] },
          contactId: groupContact ? groupContact.id : contact.id,
          whatsappId: contextPayload.whatsappId
        }
      });

      if (!openTicket) return;
    }

    const ticket = await FindOrCreateTicketService(
      contact,
      contextPayload.whatsappId,
      contextPayload.unreadMessages,
      groupContact,
      processedMessage.fromMe,
      processedMessage.body
    );

    const messageData: any = {
      id: processedMessage.id,
      ticketId: ticket.id,
      contactId: processedMessage.fromMe ? undefined : contact.id,
      body: processedMessage.body,
      fromMe: processedMessage.fromMe,
      senderType: processedMessage.fromMe ? "human" : "customer",
      aiSessionStartedAt: ticket.aiActive ? ticket.aiStartedAt : null,
      read: processedMessage.fromMe,
      mediaType: processedMessage.type,
      quotedMsgId: processedMessage.quotedMsgId,
      ack: processedMessage.ack !== undefined ? processedMessage.ack : 0
    };

    if (mediaPayload && processedMessage.hasMedia) {
      const filename = await saveMediaFile(mediaPayload);
      messageData.mediaUrl = filename;
      messageData.body = processedMessage.body || filename;
      const [mediaType] = mediaPayload.mimetype.split("/");
      messageData.mediaType = mediaType;
    }

    let lastMessageText = "";
    if (processedMessage.type === "location") {
      lastMessageText = processedMessage.body.includes("Localization")
        ? processedMessage.body
        : "Localization";
    } else {
      lastMessageText = processedMessage.body || mediaPayload?.filename || "";
    }

    await ticket.update({ lastMessage: lastMessageText });

    await CreateMessageService({ messageData });
    CreateGlpiTicketService(ticket);

    if (!processedMessage.fromMe && !contextPayload.groupContact) {
      const satisfactionHandled = await tryRegisterSatisfactionResponse(
        ticket,
        processedMessage.body
      );

      if (satisfactionHandled) return;
    }

    await processVcardMessage(processedMessage);

    if (
      whatsapp.uraFlow &&
      !ticket.aiActive &&
      !ticket.queueId &&
      !contextPayload.groupContact &&
      !processedMessage.fromMe &&
      !ticket.userId
    ) {
      const handledByUra = await handleUraLogic(
        contextPayload.whatsappId,
        processedMessage.body,
        ticket,
        contactPayload,
        whatsapp
      );

      if (handledByUra) return;
    }

    if (
      ticket.aiActive &&
      !contextPayload.groupContact &&
      !processedMessage.fromMe &&
      !ticket.userId
    ) {
      await handleAiReply(
        contextPayload.whatsappId,
        processedMessage.body,
        ticket,
        contactPayload,
        ticket.aiSettingId || ticket.queue?.aiSettingId
      );
      return;
    }

    if (
      !ticket.queue &&
      !contextPayload.groupContact &&
      !processedMessage.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1
    ) {
      await handleQueueLogic(
        contextPayload.whatsappId,
        processedMessage.body,
        ticket,
        contactPayload
      );
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error({
      info: "Error handling message",
      err,
      messagePayload,
      contactPayload,
      contextPayload,
      mediaPayload
    });
  }
};

export const handleMessageAck = async (
  messageId: string,
  ack: MessageAck
): Promise<void> => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  try {
    const messageToUpdate = await Message.findByPk(messageId, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });

    if (!messageToUpdate) {
      return;
    }

    await messageToUpdate.update({ ack });

    io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
      action: "update",
      message: messageToUpdate
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack: ${err}`);
  }
};
