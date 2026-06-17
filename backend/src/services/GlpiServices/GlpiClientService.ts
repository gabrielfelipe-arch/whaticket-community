import axios, { AxiosError } from "axios";
import Setting from "../../models/Setting";
import AppError from "../../errors/AppError";

export type GlpiSettings = {
  enabled: boolean;
  apiUrl: string;
  baseWebUrl: string;
  appToken: string;
  userToken: string;
  allowMultipleTickets: boolean;
  autoCreateEnabled: boolean;
  timeoutMs: number;
};

type Session = {
  sessionToken: string;
  settings: GlpiSettings;
};

const getSettingValue = async (key: string): Promise<string> => {
  const setting = await Setting.findByPk(key);
  return String(setting?.value || "").trim();
};

export const getGlpiSettings = async (): Promise<GlpiSettings> => {
  const [
    enabled,
    apiUrl,
    baseWebUrl,
    appToken,
    userToken,
    allowMultipleTickets,
    autoCreateEnabled,
    timeoutMs
  ] = await Promise.all([
    getSettingValue("glpiEnabled"),
    getSettingValue("glpiApiUrl"),
    getSettingValue("glpiBaseWebUrl"),
    getSettingValue("glpiAppToken"),
    getSettingValue("glpiUserToken"),
    getSettingValue("glpiAllowMultipleTickets"),
    getSettingValue("glpiAutoCreateEnabled"),
    getSettingValue("glpiTimeoutMs")
  ]);

  return {
    enabled: enabled === "enabled",
    apiUrl: apiUrl.replace(/\/$/, ""),
    baseWebUrl: (baseWebUrl || apiUrl).replace(/\/api\.php\/v1\/?$/i, "").replace(/\/apirest\.php\/?$/i, "").replace(/\/$/, ""),
    appToken,
    userToken,
    allowMultipleTickets: allowMultipleTickets === "true",
    autoCreateEnabled: autoCreateEnabled === "true",
    timeoutMs: Math.max(Number(timeoutMs || 15000), 1000)
  };
};

export const maskSecret = (value: string): string => {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

export const isMaskedSecret = (value: string): boolean => {
  const normalized = String(value || "").trim();
  return normalized === "********" || normalized.includes("...");
};

export const normalizeGlpiError = (err: unknown): string => {
  const axiosError = err as AxiosError<any>;
  const data = axiosError.response?.data;

  if (data?.detail) return String(data.detail);
  if (data?.title) return String(data.title);
  if (Array.isArray(data)) return data.map(item => String(item)).join(" - ");
  if (typeof data === "string") return data;
  if (axiosError.code === "ECONNABORTED") return "Tempo limite excedido ao conectar no GLPI.";
  return axiosError.message || "Erro ao comunicar com o GLPI.";
};

export const validateGlpiReady = (settings: GlpiSettings): void => {
  if (!settings.enabled) throw new AppError("Integracao GLPI desativada.", 400);
  if (!settings.apiUrl) throw new AppError("Informe a URL da API GLPI.", 400);
  if (!settings.userToken) throw new AppError("Informe o User Token do GLPI.", 400);
  if (isMaskedSecret(settings.userToken)) {
    throw new AppError("Informe novamente o User Token real do GLPI. O valor mascarado nao autentica na API.", 400);
  }
  if (settings.appToken && isMaskedSecret(settings.appToken)) {
    throw new AppError("Informe novamente o App-Token real do GLPI ou deixe o campo vazio se sua API nao usa App-Token.", 400);
  }
};

export const initGlpiSession = async (): Promise<Session> => {
  const settings = await getGlpiSettings();
  validateGlpiReady(settings);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `user_token ${settings.userToken}`
  };

  if (settings.appToken) headers["App-Token"] = settings.appToken;

  try {
    const response = await axios.get(`${settings.apiUrl}/initSession`, {
      headers,
      timeout: settings.timeoutMs
    });

    const sessionToken = response.data?.session_token;
    if (!sessionToken) {
      throw new AppError("O GLPI nao retornou Session-Token.", 400);
    }

    return { sessionToken, settings };
  } catch (err) {
    throw new AppError(`Falha ao autenticar no GLPI: ${normalizeGlpiError(err)}`, 400);
  }
};

export const glpiHeaders = (session: Session): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Session-Token": session.sessionToken
  };

  if (session.settings.appToken) headers["App-Token"] = session.settings.appToken;
  return headers;
};

export const closeGlpiSession = async (session: Session): Promise<void> => {
  await axios.get(`${session.settings.apiUrl}/killSession`, {
    headers: glpiHeaders(session),
    timeout: session.settings.timeoutMs
  }).catch(() => undefined);
};

export const buildGlpiTicketUrl = (settings: GlpiSettings, glpiTicketId: number): string => {
  if (!settings.baseWebUrl) return "";
  return `${settings.baseWebUrl}/front/ticket.form.php?id=${glpiTicketId}`;
};
