import Whatsapp from "../../models/Whatsapp";
import {
  ProviderMessage,
  ProviderMediaInput,
  ProviderContact,
  SendMessageOptions,
  SendMediaOptions
} from "./types";
import { WhatsappWebJsProvider } from "./Implementations/wwebjs";
import { WhaileysProvider } from "./Implementations/whaileys";
import { EvolutionProvider } from "./Implementations/evolution";
import {
  getWhatsAppProviderSettings,
  normalizeWhatsAppProvider,
  WhatsAppProviderKey
} from "../../services/WhatsappProviderServices/WhatsappProviderSettingsService";

export interface WhatsappProvider {
  init(whatsapp: Whatsapp): Promise<void>;
  removeSession(whatsappId: number): void;
  logout(sessionId: number): Promise<void>;
  sendMessage(
    sessionId: number,
    to: string,
    body: string,
    options?: SendMessageOptions
  ): Promise<ProviderMessage>;
  sendMedia(
    sessionId: number,
    to: string,
    media: ProviderMediaInput,
    options?: SendMediaOptions
  ): Promise<ProviderMessage>;
  deleteMessage(
    sessionId: number,
    chatId: string,
    messageId: string,
    fromMe: boolean
  ): Promise<void>;
  checkNumber(sessionId: number, number: string): Promise<string>;
  getProfilePicUrl(sessionId: number, number: string): Promise<string>;
  getContacts(sessionId: number): Promise<ProviderContact[]>;
  sendSeen(sessionId: number, chatId: string): Promise<void>;
  fetchChatMessages(
    sessionId: number,
    chatId: string,
    limit: number
  ): Promise<ProviderMessage[]>;
}

const providersMap: Record<WhatsAppProviderKey, WhatsappProvider> = {
  wwebjs: WhatsappWebJsProvider,
  whaileys: WhaileysProvider,
  evolution: EvolutionProvider
};

const resolveProvider = async (): Promise<WhatsappProvider> => {
  const settings = await getWhatsAppProviderSettings();
  return providersMap[settings.provider] || providersMap.wwebjs;
};

export const getActiveWhatsAppProviderKey = async (): Promise<WhatsAppProviderKey> => {
  const settings = await getWhatsAppProviderSettings();
  return normalizeWhatsAppProvider(settings.provider);
};

const whatsappProvider: WhatsappProvider = {
  init: async whatsapp => {
    const provider = await resolveProvider();
    return provider.init(whatsapp);
  },
  removeSession: whatsappId => {
    Object.values(providersMap).forEach(provider => {
      try {
        provider.removeSession(whatsappId);
      } catch {
        /* ignore provider cleanup errors */
      }
    });
  },
  logout: async sessionId => {
    const provider = await resolveProvider();
    return provider.logout(sessionId);
  },
  sendMessage: async (sessionId, to, body, options) => {
    const provider = await resolveProvider();
    return provider.sendMessage(sessionId, to, body, options);
  },
  sendMedia: async (sessionId, to, media, options) => {
    const provider = await resolveProvider();
    return provider.sendMedia(sessionId, to, media, options);
  },
  deleteMessage: async (sessionId, chatId, messageId, fromMe) => {
    const provider = await resolveProvider();
    return provider.deleteMessage(sessionId, chatId, messageId, fromMe);
  },
  checkNumber: async (sessionId, number) => {
    const provider = await resolveProvider();
    return provider.checkNumber(sessionId, number);
  },
  getProfilePicUrl: async (sessionId, number) => {
    const provider = await resolveProvider();
    return provider.getProfilePicUrl(sessionId, number);
  },
  getContacts: async sessionId => {
    const provider = await resolveProvider();
    return provider.getContacts(sessionId);
  },
  sendSeen: async (sessionId, chatId) => {
    const provider = await resolveProvider();
    return provider.sendSeen(sessionId, chatId);
  },
  fetchChatMessages: async (sessionId, chatId, limit) => {
    const provider = await resolveProvider();
    return provider.fetchChatMessages(sessionId, chatId, limit);
  }
};

export { whatsappProvider };
