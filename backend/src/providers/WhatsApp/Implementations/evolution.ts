import axios, { AxiosInstance } from "axios";
import { readFileSync } from "fs";
import AppError from "../../../errors/AppError";
import Contact from "../../../models/Contact";
import Message from "../../../models/Message";
import Ticket from "../../../models/Ticket";
import Whatsapp from "../../../models/Whatsapp";
import { getIO } from "../../../libs/socket";
import { logger } from "../../../utils/logger";
import {
  getEvolutionInstanceName,
  getWhatsAppProviderSettings
} from "../../../services/WhatsappProviderServices/WhatsappProviderSettingsService";
import {
  MessageAck,
  MessageType,
  ProviderContact,
  ProviderMediaInput,
  ProviderMessage,
  SendMediaOptions,
  SendMessageOptions
} from "../types";
import { WhatsappProvider } from "../whatsappProvider";

interface EvolutionClientContext {
  client: AxiosInstance;
  instance: string;
}

const normalizeNumber = (number: string): string =>
  String(number || "")
    .replace(/@c\.us$/i, "")
    .replace(/@s\.whatsapp\.net$/i, "")
    .replace(/@g\.us$/i, "")
    .replace(/\D/g, "");

const mediaTypeFromMime = (mimetype: string): MessageType => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  return "document";
};

const extractMessageId = (data: any): string =>
  data?.key?.id ||
  data?.message?.key?.id ||
  data?.messageId ||
  data?.id ||
  `${Date.now()}`;

const getClientContext = async (sessionId: number): Promise<EvolutionClientContext> => {
  const settings = await getWhatsAppProviderSettings();
  const { apiUrl, apiKey } = settings.evolution;

  if (!apiUrl || !apiKey) {
    throw new AppError("Configure URL e chave da Evolution API antes de usar este provedor.", 400);
  }

  return {
    instance: getEvolutionInstanceName(sessionId),
    client: axios.create({
      baseURL: apiUrl,
      timeout: 45000,
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json"
      }
    })
  };
};

const tryRequest = async <T = any>(
  request: () => Promise<T>,
  fallback?: T
): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
};

const ensureInstance = async (
  whatsapp: Whatsapp,
  context: EvolutionClientContext
): Promise<void> => {
  const { client, instance } = context;

  await tryRequest(() =>
    client.post("/instance/create", {
      instanceName: instance,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      rejectCall: false,
      groupsIgnore: false,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false
    })
  ).catch(error => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || error?.message || "");
    const responseMessage = JSON.stringify(error?.response?.data || "").toLowerCase();
    if (
      ![400, 403, 409].includes(status) &&
      !message.toLowerCase().includes("exist") &&
      !responseMessage.includes("already in use")
    ) {
      throw error;
    }
  });

  const settings = await getWhatsAppProviderSettings();
  if (settings.evolution.webhookUrl) {
    await tryRequest(
      () =>
        client.post(`/webhook/set/${encodeURIComponent(instance)}`, {
          webhook: {
            enabled: true,
            url: settings.evolution.webhookUrl,
            byEvents: false,
            base64: true,
            events: [
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "MESSAGES_DELETE",
              "SEND_MESSAGE",
              "QRCODE_UPDATED",
              "CONNECTION_UPDATE"
            ]
          }
        }),
      undefined
    ).catch(error =>
      logger.warn({
        info: "Could not configure Evolution webhook",
        whatsappId: whatsapp.id,
        err: error?.response?.data || error?.message
      })
    );
  }
};

const emitStatus = async (whatsapp: Whatsapp, status: string, qrcode = ""): Promise<void> => {
  await whatsapp.update({ status, qrcode });
  getIO().emit("whatsappSession", {
    action: "update",
    session: whatsapp
  });
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const extractQrCode = (data: any): string =>
  data?.base64 ||
  data?.code ||
  data?.qrcode?.base64 ||
  data?.qrcode?.code ||
  data?.qrcode?.qrcode?.base64 ||
  data?.qrcode?.qrcode?.code ||
  "";

const fetchConnectionQr = async (
  context: EvolutionClientContext
): Promise<string> => {
  const response = await context.client.get(
    `/instance/connect/${encodeURIComponent(context.instance)}`
  );

  return extractQrCode(response.data);
};

const getInstanceConnectionStatus = async (
  context: EvolutionClientContext
): Promise<string> => {
  const response = await context.client.get("/instance/fetchInstances");
  const instances = Array.isArray(response.data) ? response.data : [];
  const current = instances.find((item: any) => item?.name === context.instance);

  return String(
    current?.connectionStatus ||
      current?.status ||
      current?.state ||
      ""
  ).toLowerCase();
};

const isConnectedStatus = (status: string): boolean =>
  ["open", "connected", "connect"].includes(String(status || "").toLowerCase());

const init = async (whatsapp: Whatsapp): Promise<void> => {
  const context = await getClientContext(whatsapp.id);
  await emitStatus(whatsapp, "OPENING");
  await ensureInstance(whatsapp, context);

  const instanceStatus = await getInstanceConnectionStatus(context);
  if (isConnectedStatus(instanceStatus)) {
    await emitStatus(whatsapp, "CONNECTED");
    return;
  }

  let qrcode = await fetchConnectionQr(context);

  for (let attempt = 0; !qrcode && attempt < 5; attempt += 1) {
    await sleep(1200);
    const latestStatus = await getInstanceConnectionStatus(context);
    if (isConnectedStatus(latestStatus)) {
      await emitStatus(whatsapp, "CONNECTED");
      return;
    }
    qrcode = await fetchConnectionQr(context);
  }

  await emitStatus(whatsapp, qrcode ? "qrcode" : "OPENING", qrcode);
};

const removeSession = (): void => {
  return undefined;
};

const logout = async (sessionId: number): Promise<void> => {
  const { client, instance } = await getClientContext(sessionId);

  await tryRequest(() => client.delete(`/instance/logout/${encodeURIComponent(instance)}`), undefined)
    .catch(() => tryRequest(() => client.delete(`/instance/delete/${encodeURIComponent(instance)}`), undefined))
    .catch(() => undefined);
};

const sendMessage = async (
  sessionId: number,
  to: string,
  body: string,
  options?: SendMessageOptions
): Promise<ProviderMessage> => {
  const { client, instance } = await getClientContext(sessionId);
  const number = normalizeNumber(to);

  const payload = {
    number,
    text: body,
    options: {
      delay: 0,
      presence: "composing",
      quoted: options?.quotedMessageId
        ? {
            key: {
              id: options.quotedMessageId,
              fromMe: Boolean(options.quotedMessageFromMe),
              remoteJid: to
            }
          }
        : undefined
    }
  };

  const response = await tryRequest(
    () => client.post(`/message/sendText/${encodeURIComponent(instance)}`, payload),
    undefined
  ).catch(() =>
    client.post(`/message/sendText/${encodeURIComponent(instance)}`, {
      number,
      textMessage: { text: body }
    })
  );

  return {
    id: extractMessageId(response.data),
    body,
    fromMe: true,
    hasMedia: false,
    type: "chat",
    timestamp: Math.floor(Date.now() / 1000),
    from: "",
    to,
    ack: 1
  };
};

const sendMedia = async (
  sessionId: number,
  to: string,
  media: ProviderMediaInput,
  options?: SendMediaOptions
): Promise<ProviderMessage> => {
  const { client, instance } = await getClientContext(sessionId);
  const number = normalizeNumber(to);
  const buffer = media.path ? readFileSync(media.path) : media.data;
  if (!buffer) throw new AppError("ERR_NO_MEDIA_DATA");

  const type = mediaTypeFromMime(media.mimetype);
  const response = await client.post(`/message/sendMedia/${encodeURIComponent(instance)}`, {
    number,
    mediatype: options?.sendMediaAsDocument ? "document" : type,
    mimetype: media.mimetype,
    caption: options?.caption || "",
    media: buffer.toString("base64"),
    fileName: media.filename
  });

  return {
    id: extractMessageId(response.data),
    body: options?.caption || "",
    fromMe: true,
    hasMedia: true,
    type,
    timestamp: Math.floor(Date.now() / 1000),
    from: "",
    to,
    ack: 1
  };
};

const deleteMessage = async (
  sessionId: number,
  chatId: string,
  messageId: string,
  fromMe: boolean
): Promise<void> => {
  const { client, instance } = await getClientContext(sessionId);

  await client.delete(`/message/delete/${encodeURIComponent(instance)}`, {
    data: {
      id: messageId,
      remoteJid: chatId,
      fromMe
    }
  });
};

const reactMessage = async (
  sessionId: number,
  chatId: string,
  messageId: string,
  fromMe: boolean,
  emoji: string,
  options?: { participant?: string }
): Promise<void> => {
  const { client, instance } = await getClientContext(sessionId);

  await client.post(`/message/sendReaction/${encodeURIComponent(instance)}`, {
    reactionKey: {
      remoteJid: chatId,
      fromMe,
      id: messageId,
      participant: options?.participant
    },
    reactionMessage: emoji || ""
  });
};

const checkNumber = async (_sessionId: number, number: string): Promise<string> => {
  const cleanNumber = normalizeNumber(number);
  if (!cleanNumber) throw new AppError("ERR_INVALID_NUMBER", 400);
  return `${cleanNumber}@s.whatsapp.net`;
};

const getProfilePicUrl = async (
  sessionId: number,
  number: string
): Promise<string> => {
  const { client, instance } = await getClientContext(sessionId);

  const response = await tryRequest(
    () =>
      client.post(`/chat/fetchProfilePictureUrl/${encodeURIComponent(instance)}`, {
        number: normalizeNumber(number)
      }),
    { data: {} } as any
  );

  return response.data?.profilePictureUrl || response.data?.url || "";
};

const getContacts = async (): Promise<ProviderContact[]> => [];

const sendSeen = async (sessionId: number, chatId: string): Promise<void> => {
  const { client, instance } = await getClientContext(sessionId);
  const cleanNumber = normalizeNumber(chatId);
  const contact = await Contact.findOne({ where: { number: cleanNumber } });
  const ticket = contact
    ? await Ticket.findOne({
        where: {
          contactId: contact.id,
          whatsappId: sessionId
        },
        order: [["updatedAt", "DESC"]]
      })
    : null;
  const lastCustomerMessage = ticket
    ? await Message.findOne({
        where: {
          ticketId: ticket.id,
          fromMe: false
        },
        order: [["createdAt", "DESC"]]
      })
    : null;

  if (!lastCustomerMessage?.id) return;

  await tryRequest(
    () =>
      client.post(`/chat/markMessageAsRead/${encodeURIComponent(instance)}`, {
        readMessages: [
          {
            remoteJid: chatId,
            id: lastCustomerMessage.id,
            fromMe: false
          }
        ]
      }),
    undefined
  ).catch(() => undefined);
};

const fetchChatMessages = async (): Promise<ProviderMessage[]> => [];

export const EvolutionProvider: WhatsappProvider = {
  init,
  removeSession,
  logout,
  sendMessage,
  sendMedia,
  deleteMessage,
  reactMessage,
  checkNumber,
  getProfilePicUrl,
  getContacts,
  sendSeen,
  fetchChatMessages
};
