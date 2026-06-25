import Setting from "../../models/Setting";
import UpdateSettingService from "../SettingServices/UpdateSettingService";

export type WhatsAppProviderKey = "wwebjs" | "whaileys" | "evolution";

export interface EvolutionProviderSettings {
  apiUrl: string;
  apiKey: string;
  webhookUrl: string;
}

export interface WhatsAppProviderSettings {
  provider: WhatsAppProviderKey;
  evolution: EvolutionProviderSettings;
}

export const WHATSAPP_PROVIDER_LABELS: Record<WhatsAppProviderKey, string> = {
  wwebjs: "WhatsApp Web.js",
  whaileys: "Whaileys",
  evolution: "Evolution API"
};

const validProviders: WhatsAppProviderKey[] = ["wwebjs", "whaileys", "evolution"];

const getDefaultProvider = (): WhatsAppProviderKey => {
  const envProvider = String(process.env.WHATSAPP_PROVIDER || "wwebjs");
  return validProviders.includes(envProvider as WhatsAppProviderKey)
    ? (envProvider as WhatsAppProviderKey)
    : "wwebjs";
};

const getSettingsMap = async (): Promise<Record<string, string>> => {
  const settings = await Setting.findAll({
    where: {
      key: [
        "whatsappProvider",
        "evolutionApiUrl",
        "evolutionApiKey",
        "evolutionWebhookUrl"
      ]
    }
  });

  return settings.reduce<Record<string, string>>((acc, setting) => {
    acc[setting.key] = setting.value || "";
    return acc;
  }, {});
};

export const normalizeWhatsAppProvider = (value?: string): WhatsAppProviderKey => {
  const provider = String(value || "").trim();
  if (validProviders.includes(provider as WhatsAppProviderKey)) {
    return provider as WhatsAppProviderKey;
  }

  return getDefaultProvider();
};

export const getWhatsAppProviderSettings = async (): Promise<WhatsAppProviderSettings> => {
  const settings = await getSettingsMap();
  const backendUrl = String(process.env.BACKEND_URL || "").trim().replace(/\/+$/, "");

  return {
    provider: normalizeWhatsAppProvider(settings.whatsappProvider),
    evolution: {
      apiUrl: (settings.evolutionApiUrl || process.env.EVOLUTION_API_URL || "http://evolution-api:8080").trim().replace(/\/+$/, ""),
      apiKey: (settings.evolutionApiKey || process.env.EVOLUTION_API_KEY || "change-me-local-evolution-key").trim(),
      webhookUrl: (settings.evolutionWebhookUrl || process.env.EVOLUTION_WEBHOOK_URL || (backendUrl ? `${backendUrl}/webhooks/evolution` : "")).trim()
    }
  };
};

export const saveWhatsAppProviderSettings = async (
  settings: Partial<WhatsAppProviderSettings> & { provider?: string }
): Promise<WhatsAppProviderSettings> => {
  if (settings.provider) {
    await UpdateSettingService({
      key: "whatsappProvider",
      value: normalizeWhatsAppProvider(settings.provider)
    });
  }

  if (settings.evolution) {
    await UpdateSettingService({
      key: "evolutionApiUrl",
      value: settings.evolution.apiUrl || ""
    });
    await UpdateSettingService({
      key: "evolutionApiKey",
      value: settings.evolution.apiKey || ""
    });
    await UpdateSettingService({
      key: "evolutionWebhookUrl",
      value: settings.evolution.webhookUrl || ""
    });
  }

  return getWhatsAppProviderSettings();
};

export const getEvolutionInstanceName = (whatsappId: number): string =>
  `whaticket-${whatsappId}`;

export const maskSecret = (value: string): string => {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}********${value.slice(-4)}`;
};
