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

import CreateMessageService from "../services/MessageServices/CreateMessageService";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import CreateGlpiTicketService from "../services/GlpiServices/CreateGlpiTicketService";
import { tryRegisterSatisfactionResponse } from "../services/SatisfactionSurveyServices/SatisfactionSurveyService";
import DecideAiTicketActionService from "../services/AiServices/DecideAiTicketActionService";

import { whatsappProvider } from "../providers/WhatsApp/whatsappProvider";
import { MessageType, MessageAck } from "../providers/WhatsApp/types";

const writeFileAsync = promisify(writeFile);
const uraMenuLocks = new Set<number>();
const AI_CLOSE_TAG = "[FECHAR TICKET]";

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
  aiSettingId?: number | null
): Promise<boolean> => {
  const aiSetting = aiSettingId ? await AiSetting.findByPk(aiSettingId) : null;
  if (!aiSetting) return false;

  if (!ticket.aiHumanHandoffQueueId) {
    logger.warn({ ticketId: ticket.id }, "AI handoff requested without URA human queue");
    return false;
  }

  const queue = await Queue.findByPk(ticket.aiHumanHandoffQueueId);
  const customerMessage =
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
  ticket?: Ticket
): Promise<void> => {
  const sentMessage = await whatsappProvider.sendMessage(
    whatsappId,
    contactChatId(contactPayload),
    formatBody(`\u200e${body}`, contactPayload as any)
  );

  if (ticket) {
    await CreateMessageService({
      messageData: {
        id: sentMessage.id,
        ticketId: ticket.id,
        body: sentMessage.body || body,
        fromMe: true,
        read: true,
        mediaType: sentMessage.type,
        ack: sentMessage.ack !== undefined ? sentMessage.ack : 1
      }
    });
    await ticket.update({ lastMessage: sentMessage.body || body });
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
    await ticket.update({
      aiHandled: true,
      lastAiInteractionAt: new Date()
    });
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
      const handedOff = await handoffToHuman(
        whatsappId,
        messageBody,
        ticket,
        contactPayload,
        aiSettingId
      );

      if (!handedOff) {
        await sendTextMessage(
          whatsappId,
          contactPayload,
          "Nao encontrei uma resposta segura na base de conhecimento. Vou manter seu atendimento para continuidade por um atendente.",
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
      if (!ticket.aiAutoCloseReasonId) {
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
          closingReasonId: ticket.aiAutoCloseReasonId,
          closingNote: "Atendimento encerrado pela IA conforme contexto da conversa.",
          aiActive: false,
          aiHandled: true,
          aiAutoClosed: true,
          aiAutoClosedAt: new Date(),
          aiFinishedAt: new Date(),
          aiSettingId: ticket.aiSettingId
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
        lastAiQuestionType: "confirmacao_opcao",
        lastAiQuestionOptions: JSON.stringify(options),
        lastAiQuestionAt: new Date(),
        lastAiQuestionAttempts: 0,
        lastAiInteractionAt: new Date()
      });
      return true;
    }

    if (aiDecision.acao === "pedir_mais_informacoes") {
      const body =
        aiDecision.resposta ||
        "Para eu te passar a informacao correta, pode me dar mais detalhes sobre o que voce precisa?";

      await sendTextMessage(whatsappId, contactPayload, body, ticket);
      await ticket.update({
        aiHandled: true,
        lastAiInteractionAt: new Date()
      });
      return true;
    }

    if (aiDecision.acao === "responder_com_base" && aiDecision.resposta) {
      const { body, shouldClose } = stripAiCloseTag(aiDecision.resposta);
      await sendTextMessage(whatsappId, contactPayload, body, ticket);

      if (shouldClose) {
        if (!ticket.aiAutoCloseReasonId) {
          await handoffToHuman(whatsappId, messageBody, ticket, contactPayload, aiSettingId);
          return true;
        }

        await UpdateTicketService({
          ticketId: ticket.id,
          ticketData: {
            status: "closed",
            categoryId: ticket.categoryId,
            closingReasonId: ticket.aiAutoCloseReasonId,
            closingNote: "Atendimento encerrado pela IA conforme tag de contexto.",
            aiActive: false,
            aiHandled: true,
            aiAutoClosed: true,
            aiAutoClosedAt: new Date(),
            aiFinishedAt: new Date(),
            aiSettingId: ticket.aiSettingId
          }
        });
        return true;
      }

      await ticket.update({
        aiHandled: true,
        lastAiQuestionType: null,
        lastAiQuestionOptions: null,
        lastAiQuestionAt: null,
        lastAiQuestionAttempts: 0,
        lastAiInteractionAt: new Date()
      });
      return true;
    }

    await handoffToHuman(whatsappId, messageBody, ticket, contactPayload, aiSettingId);
    return true;
  } catch (error) {
    logger.error("Error sending AI response:", error);
    return false;
  }
};

const buildUraMenu = (flow: any): string => {
  const options = [...(flow.options || [])].sort(
    (a, b) => Number(a.order || 0) - Number(b.order || 0)
  );

  const optionLines = options
    .map(option => `*${option.optionKey}* - ${option.title}`)
    .join("\n");

  return [flow.welcomeMessage, optionLines].filter(Boolean).join("\n");
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

  const options = [...(flow.options || [])].sort(
    (a, b) => Number(a.order || 0) - Number(b.order || 0)
  );
  const normalizedMessage = (messageBody || "").trim().toLowerCase();
  const selectedOption = options.find(
    option =>
      String(option.optionKey).trim().toLowerCase() === normalizedMessage ||
      normalizeText(option.title) === normalizeText(normalizedMessage)
  ) ||
    (
      isHumanRequest(messageBody)
        ? options.find(option =>
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

    if (menuAlreadySentForFlow && flow.invalidOptionMessage) {
      await sendTextMessage(whatsappId, contactPayload, flow.invalidOptionMessage, ticket);
      return true;
    }

    const menu = buildUraMenu(flow);
    if (menu) {
      uraMenuLocks.add(ticket.id);
      try {
        await sendTextMessage(whatsappId, contactPayload, menu, ticket);
        await ticket.update({
          queueId: null,
          uraFlowId: flow.id,
          uraMenuSentAt: new Date(),
          aiActive: false,
          aiSettingId: null
        });
      } finally {
        setTimeout(() => uraMenuLocks.delete(ticket.id), 15000);
      }
    }
    return true;
  }

  if (selectedOption.responseMessage) {
    await sendTextMessage(whatsappId, contactPayload, selectedOption.responseMessage, ticket);
  }

  if (selectedOption.action === "TRANSFER_QUEUE" && selectedOption.targetQueueId) {
    await UpdateTicketService({
      ticketData: {
        queueId: selectedOption.targetQueueId,
        aiActive: false,
        aiSettingId: null
      },
      ticketId: ticket.id
    });

    return true;
  }

  if (selectedOption.action === "START_AI") {
    if (selectedOption.targetQueueId) {
      const queue = await Queue.findByPk(selectedOption.targetQueueId);
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
          aiAutoCloseOnlyIfNotHandedOff: selectedOption.aiAutoCloseOnlyIfNotHandedOff !== false,
          aiHumanHandoffQueueId: selectedOption.aiHumanHandoffEnabled
            ? selectedOption.aiHumanHandoffQueueId || null
            : null,
          aiHumanHandoffMessage: selectedOption.aiHumanHandoffEnabled
            ? selectedOption.aiHumanHandoffMessage || null
            : null,
          aiHandoffAlertEnabled: selectedOption.aiHandoffAlertEnabled ? true : false,
          aiHandoffAlertTo: selectedOption.aiHandoffAlertTo || null,
          aiHandoffAlertMessage: selectedOption.aiHandoffAlertMessage || null,
          aiSettingId
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
      aiAutoCloseEnabled: false,
      aiAutoCloseMinutes: null,
      aiAutoCloseMessage: null,
      aiAutoCloseReasonId: null,
      aiAutoCloseOnlyIfNotHandedOff: true,
      aiHumanHandoffQueueId: null,
      aiHumanHandoffMessage: null,
      aiHandoffAlertEnabled: false,
      aiHandoffAlertTo: null,
      aiHandoffAlertMessage: null,
      aiSettingId: null
    });
    return true;
  }

  if (selectedOption.action === "HUMAN" && flow.fallbackQueueId) {
    await UpdateTicketService({
      ticketData: {
        queueId: flow.fallbackQueueId,
        aiActive: false,
        aiSettingId: null
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
        aiSettingId: queue.useAI ? queue.aiSettingId : null
      },
      ticketId: ticket.id
    });
    return;
  }

  const selectedOption = messageBody;
  const choosenQueue = queues[+selectedOption - 1];

  if (choosenQueue) {
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
