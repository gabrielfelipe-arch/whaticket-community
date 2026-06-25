import { Request, Response } from "express";
import axios from "axios";
import Whatsapp from "../models/Whatsapp";
import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";
import {
  handleMessage,
  handleMessageAck,
  ContactPayload,
  MediaPayload,
  MessagePayload,
  WhatsappContextPayload
} from "../handlers/handleWhatsappEvents";
import { MessageAck, MessageType } from "../providers/WhatsApp/types";
import {
  getEvolutionInstanceName,
  getWhatsAppProviderSettings
} from "../services/WhatsappProviderServices/WhatsappProviderSettingsService";

const getEventName = (body: any): string =>
  String(body?.event || body?.type || "").toLowerCase().replace(/_/g, ".");

const getMessage = (body: any): any => {
  const data = body?.data || body?.message || body;
  if (Array.isArray(data?.messages)) return data.messages[0];
  if (Array.isArray(data)) return data[0];
  return data;
};

const getMessages = (body: any): any[] => {
  const data = body?.data || body?.message || body;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data)) return data;
  return data ? [data] : [];
};

const numberFromJid = (jid: string): string =>
  String(jid || "")
    .split("@")[0]
    .replace(/\D/g, "");

const isGroupJid = (jid: string): boolean => /@g\.us$/i.test(jid);

const detectMessageContent = (message: any): { body: string; type: MessageType; hasMedia: boolean; media?: any } => {
  const content = message?.message || message;

  if (content?.conversation) {
    return { body: content.conversation, type: "chat", hasMedia: false };
  }

  if (content?.extendedTextMessage) {
    return {
      body: content.extendedTextMessage.text || "",
      type: "chat",
      hasMedia: false
    };
  }

  const mediaMap: Array<[string, MessageType]> = [
    ["imageMessage", "image"],
    ["videoMessage", "video"],
    ["audioMessage", content?.audioMessage?.ptt ? "ptt" : "audio"],
    ["documentMessage", "document"],
    ["stickerMessage", "sticker"]
  ];

  for (const [key, type] of mediaMap) {
    if (content?.[key]) {
      return {
        body: content[key].caption || content[key].fileName || content[key].title || "",
        type,
        hasMedia: true,
        media: content[key]
      };
    }
  }

  if (content?.locationMessage) {
    const latitude = content.locationMessage.degreesLatitude || "";
    const longitude = content.locationMessage.degreesLongitude || "";
    return {
      body: `Localization: ${latitude},${longitude}`,
      type: "location",
      hasMedia: false
    };
  }

  return { body: "", type: "chat", hasMedia: false };
};

const downloadMedia = async (media: any, type: MessageType): Promise<MediaPayload | undefined> => {
  const mimetype = media?.mimetype || (type === "image" ? "image/jpeg" : "application/octet-stream");
  const extension = mimetype.split("/")[1]?.split(";")[0] || "bin";
  const filename = media?.fileName || media?.title || `${type}-${Date.now()}.${extension}`;

  const base64 =
    media?.base64 ||
    media?.media ||
    media?.jpegThumbnail ||
    media?.data;

  if (base64) {
    return {
      filename,
      mimetype,
      data: String(base64).replace(/^data:[^;]+;base64,/, "")
    };
  }

  const url = media?.url || media?.mediaUrl;
  if (!url) return undefined;

  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: 45000
  });

  return {
    filename,
    mimetype,
    data: Buffer.from(response.data).toString("base64")
  };
};

const findWhatsappByInstance = async (instance: string): Promise<Whatsapp | null> => {
  const match = String(instance || "").match(/whaticket-(\d+)/);
  if (match) return Whatsapp.findByPk(Number(match[1]));

  const all = await Whatsapp.findAll();
  return all.find(whatsapp => getEvolutionInstanceName(whatsapp.id) === instance) || null;
};

const ackFromStatus = (status: string | number): MessageAck => {
  if (typeof status === "number") {
    if (status >= 4) return 4;
    if (status >= 3) return 3;
    if (status >= 2) return 2;
    if (status >= 1) return 1;
    return 0;
  }

  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("read") || normalized.includes("played")) return 4;
  if (normalized.includes("delivery") || normalized.includes("delivered")) return 2;
  if (normalized.includes("server") || normalized.includes("sent")) return 1;
  return 0;
};

const getMessageId = (data: any): string =>
  data?.key?.id ||
  data?.keyId ||
  data?.id ||
  data?.message?.key?.id ||
  data?.messageId ||
  "";

const getAckStatus = (data: any): string | number =>
  data?.status ??
  data?.update?.status ??
  data?.message?.status ??
  0;

const handleConnectionUpdate = async (body: any, whatsapp: Whatsapp): Promise<void> => {
  const data = body?.data || body;
  const state = String(data?.state || data?.status || data?.connection || "").toLowerCase();
  const qrcode = data?.qrcode || data?.base64 || data?.qr || "";
  const status =
    state === "open" || state === "connected"
      ? "CONNECTED"
      : qrcode
        ? "qrcode"
        : state === "connecting"
          ? "OPENING"
          : state.includes("close") || state.includes("disconnect")
          ? "DISCONNECTED"
          : whatsapp.status;

  await whatsapp.update({ status, qrcode });
  getIO().emit("whatsappSession", {
    action: "update",
    session: whatsapp
  });
};

const handleQrCodeUpdate = async (body: any, whatsapp: Whatsapp): Promise<void> => {
  const qrcode =
    body?.data?.qrcode?.base64 ||
    body?.data?.qrcode?.code ||
    body?.qrcode?.base64 ||
    body?.qrcode?.code ||
    body?.data?.base64 ||
    body?.data?.code ||
    "";

  if (!qrcode) return;

  await whatsapp.update({ status: "qrcode", qrcode });
  getIO().emit("whatsappSession", {
    action: "update",
    session: whatsapp
  });
};

export const receive = async (req: Request, res: Response): Promise<Response> => {
  const settings = await getWhatsAppProviderSettings();
  const receivedKey = String(req.headers.apikey || req.headers["x-api-key"] || req.query.apikey || "");
  if (settings.evolution.apiKey && receivedKey && receivedKey !== settings.evolution.apiKey) {
    return res.status(401).json({ message: "Invalid Evolution webhook key." });
  }

  const instance = String(req.params.instance || req.body?.instance || req.body?.instanceName || "");
  const whatsapp = await findWhatsappByInstance(instance);
  if (!whatsapp) {
    logger.warn({ info: "Evolution webhook ignored: instance not found", instance });
    return res.status(202).json({ ok: true });
  }

  const event = getEventName(req.body);

  if (event.includes("qrcode")) {
    await handleQrCodeUpdate(req.body, whatsapp);
    return res.status(200).json({ ok: true });
  }

  if (event.includes("connection")) {
    await handleConnectionUpdate(req.body, whatsapp);
    return res.status(200).json({ ok: true });
  }

  if (event.includes("message.update") || event.includes("messages.update")) {
    await Promise.all(
      getMessages(req.body).map(async data => {
        const id = getMessageId(data);
        const ack = ackFromStatus(getAckStatus(data));
        if (id && ack) await handleMessageAck(id, ack);
      })
    );
    return res.status(200).json({ ok: true });
  }

  if (!event.includes("message") && !event.includes("send")) {
    return res.status(200).json({ ok: true });
  }

  const rawMessage = getMessage(req.body);
  const key = rawMessage?.key || {};
  const remoteJid = key.remoteJid || rawMessage?.remoteJid || rawMessage?.jid || "";
  if (!remoteJid || remoteJid.includes("status@broadcast")) {
    return res.status(200).json({ ok: true });
  }

  const groupJid = isGroupJid(remoteJid) ? remoteJid : "";
  const contactJid = groupJid && key.participant ? key.participant : remoteJid;
  const detected = detectMessageContent(rawMessage);
  const mediaPayload = detected.hasMedia ? await downloadMedia(detected.media, detected.type) : undefined;
  const timestamp = Number(rawMessage?.messageTimestamp || rawMessage?.timestamp || Date.now() / 1000);

  const contactPayload: ContactPayload = {
    name: rawMessage?.pushName || numberFromJid(contactJid),
    number: numberFromJid(contactJid),
    isGroup: false
  };

  const messagePayload: MessagePayload = {
    id: getMessageId(rawMessage) || `${Date.now()}`,
    body: detected.body,
    fromMe: Boolean(key.fromMe || rawMessage?.fromMe),
    hasMedia: detected.hasMedia,
    type: detected.type,
    timestamp,
    from: contactJid,
    to: remoteJid,
    ack: key.fromMe ? 1 : 0
  };

  const contextPayload: WhatsappContextPayload = {
    whatsappId: whatsapp.id,
    unreadMessages: messagePayload.fromMe ? 0 : 1,
    groupContact: groupJid
      ? {
          name: rawMessage?.groupName || numberFromJid(groupJid),
          number: numberFromJid(groupJid),
          isGroup: true
        }
      : undefined
  };

  await handleMessage(messagePayload, contactPayload, contextPayload, mediaPayload);

  return res.status(200).json({ ok: true });
};
