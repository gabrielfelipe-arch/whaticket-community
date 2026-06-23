import axios, { AxiosError } from "axios";
import Setting from "../../models/Setting";
import AppError from "../../errors/AppError";
import { isMaskedSecret, maskSecret } from "../../helpers/MaskSecret";

export type GlpiSettings = {
  enabled: boolean;
  apiUrl: string;
  baseWebUrl: string;
  appToken: string;
  userToken: string;
  allowMultipleTickets: boolean;
  autoCreateEnabled: boolean;
  automationMode: string;
  autoCategoryId: number | null;
  autoEntityId: number | null;
  autoLocationId: number | null;
  autoTitleTemplate: string;
  autoSuccessMessage: string;
  requireConfirmationBeforeCreate: boolean;
  autoCloseEnabled: boolean;
  autoCloseMessage: string;
  autoCloseReasonId: number | null;
  allowedFormEntityIds: number[];
  allowedFormLocationIds: number[];
  entityLocationRules: GlpiEntityLocationRule[];
  timeoutMs: number;
};

export type GlpiEntityLocationRule = {
  entityId: number;
  allowedLocationIds: number[];
  defaultLocationId: number | null;
};

type Session = {
  sessionToken: string;
  settings: GlpiSettings;
};

type InitSessionOptions = {
  userToken?: string;
};

const getSettingValue = async (key: string): Promise<string> => {
  const setting = await Setting.findByPk(key);
  return String(setting?.value || "").trim();
};

const parseNumberList = (value: string): number[] =>
  String(value || "")
    .split(/[,\s;|]+/)
    .map(item => Number(item))
    .filter(item => Number.isInteger(item) && item >= 0);

const parseEntityLocationRules = (value: string): GlpiEntityLocationRule[] => {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(item => {
        const entityId = Number(item?.entityId);
        const defaultLocationId = Number(item?.defaultLocationId);
        const allowedLocationIds = Array.isArray(item?.allowedLocationIds)
          ? item.allowedLocationIds
              .map((locationId: unknown) => Number(locationId))
              .filter((locationId: number) => Number.isInteger(locationId) && locationId > 0)
          : [];

        return {
          entityId,
          allowedLocationIds,
          defaultLocationId: Number.isInteger(defaultLocationId) && defaultLocationId > 0 ? defaultLocationId : null
        };
      })
      .filter(item => Number.isInteger(item.entityId) && item.entityId > 0);
  } catch (error) {
    return [];
  }
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
    automationMode,
    autoCategoryId,
    autoEntityId,
    autoLocationId,
    autoTitleTemplate,
    autoSuccessMessage,
    requireConfirmationBeforeCreate,
    autoCloseEnabled,
    autoCloseMessage,
    autoCloseReasonId,
    allowedFormEntityIds,
    allowedFormLocationIds,
    entityLocationRules,
    timeoutMs
  ] = await Promise.all([
    getSettingValue("glpiEnabled"),
    getSettingValue("glpiApiUrl"),
    getSettingValue("glpiBaseWebUrl"),
    getSettingValue("glpiAppToken"),
    getSettingValue("glpiUserToken"),
    getSettingValue("glpiAllowMultipleTickets"),
    getSettingValue("glpiAutoCreateEnabled"),
    getSettingValue("glpiAutomationMode"),
    getSettingValue("glpiAutoCategoryId"),
    getSettingValue("glpiAutoEntityId"),
    getSettingValue("glpiAutoLocationId"),
    getSettingValue("glpiAutoTitleTemplate"),
    getSettingValue("glpiAutoSuccessMessage"),
    getSettingValue("glpiRequireConfirmationBeforeCreate"),
    getSettingValue("glpiAutoCloseEnabled"),
    getSettingValue("glpiAutoCloseMessage"),
    getSettingValue("glpiAutoCloseReasonId"),
    getSettingValue("glpiAllowedFormEntityIds"),
    getSettingValue("glpiAllowedFormLocationIds"),
    getSettingValue("glpiEntityLocationRules"),
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
    automationMode: automationMode || "manual",
    autoCategoryId: autoCategoryId ? Number(autoCategoryId) : null,
    autoEntityId: autoEntityId ? Number(autoEntityId) : null,
    autoLocationId: autoLocationId ? Number(autoLocationId) : null,
    autoTitleTemplate: autoTitleTemplate || "Solicitacao WhatsApp - {{contactName}}",
    autoSuccessMessage: autoSuccessMessage || "Sua solicitacao foi registrada com sucesso. Chamado GLPI: #{{glpiTicketNumber}}.",
    requireConfirmationBeforeCreate: requireConfirmationBeforeCreate !== "false",
    autoCloseEnabled: autoCloseEnabled === "true",
    autoCloseMessage: autoCloseMessage || "",
    autoCloseReasonId: autoCloseReasonId ? Number(autoCloseReasonId) : null,
    allowedFormEntityIds: parseNumberList(allowedFormEntityIds),
    allowedFormLocationIds: parseNumberList(allowedFormLocationIds),
    entityLocationRules: parseEntityLocationRules(entityLocationRules),
    timeoutMs: Math.max(Number(timeoutMs || 15000), 1000)
  };
};

export { isMaskedSecret, maskSecret };

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

export const validateGlpiReady = (settings: GlpiSettings, userToken?: string): void => {
  const effectiveUserToken = String(userToken || settings.userToken || "").trim();

  if (!settings.enabled) throw new AppError("Integracao GLPI desativada.", 400);
  if (!settings.apiUrl) throw new AppError("Informe a URL da API GLPI.", 400);
  if (!effectiveUserToken) throw new AppError("Informe o User Token do GLPI.", 400);
  if (isMaskedSecret(effectiveUserToken)) {
    throw new AppError("Informe novamente o User Token real do GLPI. O valor mascarado nao autentica na API.", 400);
  }
  if (settings.appToken && isMaskedSecret(settings.appToken)) {
    throw new AppError("Informe novamente o App-Token real do GLPI ou deixe o campo vazio se sua API nao usa App-Token.", 400);
  }
};

export const initGlpiSession = async (options: InitSessionOptions = {}): Promise<Session> => {
  const settings = await getGlpiSettings();
  const effectiveUserToken = String(options.userToken || settings.userToken || "").trim();
  validateGlpiReady(settings, effectiveUserToken);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `user_token ${effectiveUserToken}`
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

    return { sessionToken, settings: { ...settings, userToken: effectiveUserToken } };
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
