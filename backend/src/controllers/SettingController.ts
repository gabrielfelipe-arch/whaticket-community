import { Request, Response } from "express";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import Setting from "../models/Setting";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import CreateAuditLogService from "../services/AuditLogServices/CreateAuditLogService";

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

  return res.status(200).json(settings);
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
  const beforeSetting = await Setting.findOne({ where: { key } });

  if (key === "glpiEnabled" && value === "enabled") {
    const settings = await Setting.findAll();
    const nextSettings = settings.map(setting =>
      setting.key === key ? ({ ...setting.toJSON(), value } as Setting) : setting
    );

    requireSettingValue(nextSettings, "glpiApiUrl", "Informe a URL da API GLPI antes de ativar a integracao.");
    requireSettingValue(nextSettings, "glpiAppToken", "Informe o App Token do GLPI antes de ativar a integracao.");
    requireSettingValue(nextSettings, "glpiUserToken", "Informe o User Token do GLPI antes de ativar a integracao.");
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
        "secondaryColor"
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
