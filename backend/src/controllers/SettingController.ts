import { Request, Response } from "express";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import Setting from "../models/Setting";

import {
  encryptCalendarToken
} from "../helpers/CalendarTokenCrypto";
import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import CreateAuditLogService from "../services/AuditLogServices/CreateAuditLogService";

const GOOGLE_CALENDAR_SECRET_KEY = "googleCalendarClientSecret";
const GOOGLE_CALENDAR_SECRET_ENCRYPTED_KEY = "googleCalendarClientSecretEncrypted";
const MASKED_SECRET = "********";

const isMaskedSecret = (value: string): boolean =>
  /^(\*+|•+)$/.test(String(value || "").trim());

const serializeGoogleCalendarSecretSetting = (setting?: Setting | null): any => ({
  key: GOOGLE_CALENDAR_SECRET_KEY,
  value: setting?.value ? MASKED_SECRET : "",
  createdAt: setting?.createdAt,
  updatedAt: setting?.updatedAt
});

const serializeSetting = (setting: Setting): any => {
  if (setting.key === GOOGLE_CALENDAR_SECRET_ENCRYPTED_KEY) {
    return serializeGoogleCalendarSecretSetting(setting);
  }

  if (setting.key === GOOGLE_CALENDAR_SECRET_KEY) {
    return {
      ...setting.toJSON(),
      value: setting.value ? MASKED_SECRET : ""
    };
  }

  return setting;
};

const serializeSettings = (settings: Setting[] = []): any[] => {
  const encryptedSecret = settings.find(setting => setting.key === GOOGLE_CALENDAR_SECRET_ENCRYPTED_KEY);
  const legacySecret = settings.find(setting => setting.key === GOOGLE_CALENDAR_SECRET_KEY);
  const serialized = settings
    .filter(setting => ![
      GOOGLE_CALENDAR_SECRET_KEY,
      GOOGLE_CALENDAR_SECRET_ENCRYPTED_KEY
    ].includes(setting.key))
    .map(serializeSetting);

  if (encryptedSecret || legacySecret) {
    serialized.push(serializeGoogleCalendarSecretSetting(encryptedSecret || legacySecret));
  }

  return serialized;
};

const requireSettingValue = (settings: Setting[], key: string, message: string): void => {
  const setting = settings.find(item => item.key === key);
  if (!setting?.value || !String(setting.value).trim()) {
    throw new AppError(message, 400);
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const settings = await ListSettingsService();

  return res.status(200).json(serializeSettings(settings || []));
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const { settingKey: key } = req.params;
  const { value } = req.body;
  const settingKey = key === GOOGLE_CALENDAR_SECRET_KEY
    ? GOOGLE_CALENDAR_SECRET_ENCRYPTED_KEY
    : key;
  const beforeSetting = await Setting.findOne({ where: { key: settingKey } });

  if (key === "glpiEnabled" && value === "enabled") {
    const settings = await Setting.findAll();
    const nextSettings = settings.map(setting =>
      setting.key === key ? ({ ...setting.toJSON(), value } as Setting) : setting
    );

    requireSettingValue(nextSettings, "glpiApiUrl", "Informe a URL da API GLPI antes de ativar a integracao.");
    requireSettingValue(nextSettings, "glpiAppToken", "Informe o App Token do GLPI antes de ativar a integracao.");
    requireSettingValue(nextSettings, "glpiUserToken", "Informe o User Token do GLPI antes de ativar a integracao.");
  }

  if (key === GOOGLE_CALENDAR_SECRET_ENCRYPTED_KEY) {
    throw new AppError("Campo interno nao pode ser atualizado diretamente.", 400);
  }

  if (key === GOOGLE_CALENDAR_SECRET_KEY) {
    const nextValue = String(value || "").trim();

    if (!nextValue || isMaskedSecret(nextValue)) {
      const safeSetting = serializeGoogleCalendarSecretSetting(beforeSetting);
      return res.status(200).json(safeSetting);
    }

    const setting = await UpdateSettingService({
      key: GOOGLE_CALENDAR_SECRET_ENCRYPTED_KEY,
      value: encryptCalendarToken(nextValue) || ""
    });
    const safeSetting = serializeGoogleCalendarSecretSetting(setting);

    await CreateAuditLogService({
      req,
      action: "update",
      resource: "settings",
      resourceId: GOOGLE_CALENDAR_SECRET_KEY,
      beforeData: beforeSetting ? serializeGoogleCalendarSecretSetting(beforeSetting) : undefined,
      afterData: safeSetting
    });

    const io = getIO();
    io.emit("settings", {
      action: "update",
      setting: safeSetting
    });

    return res.status(200).json(safeSetting);
  }

  const setting = await UpdateSettingService({
    key,
    value
  });
  await CreateAuditLogService({
    req,
    action: "update",
    resource: "settings",
    resourceId: key,
    beforeData: beforeSetting ? serializeSetting(beforeSetting) : undefined,
    afterData: setting ? serializeSetting(setting) : undefined
  });

  const io = getIO();
  io.emit("settings", {
    action: "update",
    setting: setting ? serializeSetting(setting) : setting
  });

  return res.status(200).json(setting ? serializeSetting(setting) : setting);
};

export const publicIndex = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const settings = await Setting.findAll({
    where: {
      key: [
        "brandName",
        "brandLogo",
        "brandLogoFit",
        "brandLogoPositionX",
        "brandLogoPositionY",
        "brandLogoScale",
        "primaryColor",
        "secondaryColor",
        "companyFantasyName",
        "companyLegalName",
        "companyCnpj",
        "companyAddress",
        "companyPhone",
        "companyEmail",
        "companyWebsite"
      ]
    }
  });

  return res.status(200).json(settings);
};

export const uploadLogo = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const filename = req.file?.filename;
  if (!filename) throw new AppError("ERR_NO_FILE_UPLOADED", 400);
  const beforeSetting = await Setting.findOne({ where: { key: "brandLogo" } });

  const setting = await UpdateSettingService({
    key: "brandLogo",
    value: `/public/${filename}`
  });
  await CreateAuditLogService({
    req,
    action: "update",
    resource: "settings",
    resourceId: "brandLogo",
    beforeData: beforeSetting?.toJSON(),
    afterData: setting?.toJSON()
  });

  const io = getIO();
  io.emit("settings", {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};
