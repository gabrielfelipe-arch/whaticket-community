import crypto from "crypto";
import { sign, verify } from "jsonwebtoken";
import axios from "axios";
import AppError from "../../errors/AppError";
import authConfig from "../../config/auth";
import AiCalendarConnection from "../../models/AiCalendarConnection";
import Setting from "../../models/Setting";
import {
  decryptCalendarToken,
  encryptCalendarToken
} from "../../helpers/CalendarTokenCrypto";

interface GoogleStatePayload {
  userId: number;
  nonce: string;
  connectionId?: number | null;
  name?: string | null;
}

const pendingStates = new Map<string, number>();

const defaultScopes = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email"
];

const settingKeys = {
  clientId: "googleCalendarClientId",
  legacyClientSecret: "googleCalendarClientSecret",
  clientSecretEncrypted: "googleCalendarClientSecretEncrypted",
  redirectUri: "googleCalendarRedirectUri",
  scopes: "googleCalendarScopes"
};

interface GoogleCalendarOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

const parseScopes = (value?: string | null): string[] => {
  const raw = value || defaultScopes.join(" ");
  return raw.split(/[\s,]+/).map(scope => scope.trim()).filter(Boolean);
};

const getSettingValue = async (key: string): Promise<string> => {
  const setting = await Setting.findOne({ where: { key } });
  return String(setting?.value || "").trim();
};

const getGoogleCalendarOAuthConfig = async (): Promise<GoogleCalendarOAuthConfig> => {
  const [
    clientIdSetting,
    clientSecretEncrypted,
    legacyClientSecret,
    redirectUriSetting,
    scopesSetting
  ] = await Promise.all([
    getSettingValue(settingKeys.clientId),
    getSettingValue(settingKeys.clientSecretEncrypted),
    getSettingValue(settingKeys.legacyClientSecret),
    getSettingValue(settingKeys.redirectUri),
    getSettingValue(settingKeys.scopes)
  ]);

  const clientId = clientIdSetting || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = clientSecretEncrypted
    ? decryptCalendarToken(clientSecretEncrypted) || ""
    : legacyClientSecret || process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = redirectUriSetting || process.env.GOOGLE_CALENDAR_REDIRECT_URI || "";
  const scopes = parseScopes(scopesSetting || process.env.GOOGLE_CALENDAR_SCOPES);

  if (!clientId) throw new AppError("Configure o Client ID do Google Agenda em IA > Agenda.", 500);
  if (!clientSecret) throw new AppError("Configure o Client Secret do Google Agenda em IA > Agenda.", 500);
  if (!redirectUri) throw new AppError("Configure a URL de callback do Google Agenda em IA > Agenda.", 500);

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: scopes.length ? scopes : defaultScopes
  };
};

const buildFrontendRedirectUrl = (status: "success" | "error", message?: string): string => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost";
  const url = new URL("/settings", frontendUrl);
  url.searchParams.set("calendarOAuth", status);
  if (message) url.searchParams.set("message", message);
  return url.toString();
};

export const buildGoogleCalendarAuthUrl = ({
  userId,
  connectionId,
  name
}: {
  userId: number;
  connectionId?: number | null;
  name?: string | null;
}): Promise<string> => (async () => {
  const { clientId, redirectUri, scopes } = await getGoogleCalendarOAuthConfig();
  const nonce = crypto.randomBytes(24).toString("hex");
  const state = sign(
    { userId, nonce, connectionId: connectionId || null, name: name || null },
    authConfig.secret,
    { expiresIn: "15m" }
  );

  pendingStates.set(nonce, Date.now() + 15 * 60 * 1000);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return url.toString();
})();

const validateState = (state: string): GoogleStatePayload => {
  let payload: GoogleStatePayload;

  try {
    payload = verify(state, authConfig.secret) as GoogleStatePayload;
  } catch (err) {
    throw new AppError("State OAuth invalido ou expirado.", 400);
  }

  const expiresAt = pendingStates.get(payload.nonce);
  pendingStates.delete(payload.nonce);

  if (!expiresAt || expiresAt < Date.now()) {
    throw new AppError("State OAuth invalido ou expirado.", 400);
  }

  return payload;
};

const fetchGoogleAccountEmail = async (accessToken: string): Promise<string | null> => {
  try {
    const response = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000
    });
    return response.data?.email || null;
  } catch (err) {
    return null;
  }
};

export const handleGoogleCalendarCallback = async ({
  code,
  state
}: {
  code: string;
  state: string;
}): Promise<{ connection: AiCalendarConnection; redirectUrl: string }> => {
  if (!code) throw new AppError("Codigo OAuth ausente.", 400);
  if (!state) throw new AppError("State OAuth ausente.", 400);

  const payload = validateState(state);
  const { clientId, clientSecret, redirectUri, scopes: configuredScopes } = await getGoogleCalendarOAuthConfig();

  const tokenResponse = await axios.post(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }).toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000
    }
  );

  const accessToken = tokenResponse.data?.access_token;
  const refreshToken = tokenResponse.data?.refresh_token;

  if (!accessToken) throw new AppError("Google nao retornou access_token.", 400);
  if (!refreshToken) throw new AppError("Google nao retornou refresh_token. Tente revogar o acesso e conectar novamente.", 400);

  const expiresIn = Number(tokenResponse.data?.expires_in || 3600);
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const scopes = tokenResponse.data?.scope || configuredScopes.join(" ");
  const email = await fetchGoogleAccountEmail(accessToken);

  const data = {
    name: payload.name || (email ? `Google Agenda - ${email}` : "Google Agenda"),
    provider: "google",
    createdByUserId: payload.userId,
    googleAccountEmail: email,
    userPrincipalName: email,
    calendarId: "primary",
    calendarName: "Agenda principal",
    timezone: "America/Sao_Paulo",
    active: true,
    accessTokenEncrypted: encryptCalendarToken(accessToken),
    refreshTokenEncrypted: encryptCalendarToken(refreshToken),
    accessTokenExpiresAt: expiresAt,
    tokenExpiresAt: expiresAt,
    scopes,
    lastError: null,
    lastSyncAt: new Date()
  };

  const connection = payload.connectionId
    ? await AiCalendarConnection.findByPk(payload.connectionId)
    : null;

  const savedConnection = connection
    ? await connection.update(data as any)
    : await AiCalendarConnection.create(data as any);

  return {
    connection: savedConnection,
    redirectUrl: buildFrontendRedirectUrl("success")
  };
};

export const buildGoogleCalendarErrorRedirect = (message: string): string =>
  buildFrontendRedirectUrl("error", message);
