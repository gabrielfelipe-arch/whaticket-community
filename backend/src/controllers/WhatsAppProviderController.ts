import { Request, Response } from "express";
import axios from "axios";
import Whatsapp from "../models/Whatsapp";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import { whatsappProvider } from "../providers/WhatsApp";
import {
  getWhatsAppProviderSettings,
  maskSecret,
  normalizeWhatsAppProvider,
  saveWhatsAppProviderSettings,
  WHATSAPP_PROVIDER_LABELS
} from "../services/WhatsappProviderServices/WhatsappProviderSettingsService";

const publicSettings = async () => {
  const settings = await getWhatsAppProviderSettings();

  return {
    provider: settings.provider,
    providerLabel: WHATSAPP_PROVIDER_LABELS[settings.provider],
    labels: WHATSAPP_PROVIDER_LABELS,
    evolution: {
      apiUrl: settings.evolution.apiUrl,
      apiKeyMasked: maskSecret(settings.evolution.apiKey),
      hasApiKey: Boolean(settings.evolution.apiKey),
      webhookUrl: settings.evolution.webhookUrl
    }
  };
};

export const show = async (_req: Request, res: Response): Promise<Response> => {
  return res.json(await publicSettings());
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const current = await getWhatsAppProviderSettings();
  const provider = normalizeWhatsAppProvider(req.body.provider || current.provider);
  const apiKey = String(req.body.evolution?.apiKey || "").trim();

  await saveWhatsAppProviderSettings({
    provider,
    evolution: {
      apiUrl: String(req.body.evolution?.apiUrl || current.evolution.apiUrl || "").trim(),
      apiKey: apiKey || current.evolution.apiKey,
      webhookUrl: String(req.body.evolution?.webhookUrl || current.evolution.webhookUrl || "").trim()
    }
  });

  return res.json(await publicSettings());
};

export const testEvolution = async (req: Request, res: Response): Promise<Response> => {
  const current = await getWhatsAppProviderSettings();
  const apiUrl = String(req.body.apiUrl || current.evolution.apiUrl || "").trim().replace(/\/+$/, "");
  const apiKey = String(req.body.apiKey || current.evolution.apiKey || "").trim();

  if (!apiUrl || !apiKey) {
    throw new AppError("Informe URL e chave da Evolution API para testar.", 400);
  }

  await axios.get(`${apiUrl}/instance/fetchInstances`, {
    headers: { apikey: apiKey },
    timeout: 12000
  });

  return res.json({ message: "Evolution API respondeu corretamente." });
};

export const switchProvider = async (req: Request, res: Response): Promise<Response> => {
  const current = await getWhatsAppProviderSettings();
  const provider = normalizeWhatsAppProvider(req.body.provider);

  if (provider === "evolution" && (!current.evolution.apiUrl || !current.evolution.apiKey)) {
    throw new AppError("Configure e teste a Evolution API antes de trocar o provedor.", 400);
  }

  const whatsapps = await Whatsapp.findAll();
  whatsapps.forEach(whatsapp => whatsappProvider.removeSession(whatsapp.id));

  await Promise.all(
    whatsapps.map(whatsapp =>
      whatsapp.update({
        status: "DISCONNECTED",
        qrcode: "",
        retries: 0
      })
    )
  );

  await saveWhatsAppProviderSettings({ provider });

  const io = getIO();
  whatsapps.forEach(whatsapp => {
    io.emit("whatsappSession", {
      action: "update",
      session: whatsapp
    });
  });

  return res.json({
    message: `Provedor alterado para ${WHATSAPP_PROVIDER_LABELS[provider]}. Reconecte os numeros para gerar novas sessoes.`,
    ...(await publicSettings())
  });
};
