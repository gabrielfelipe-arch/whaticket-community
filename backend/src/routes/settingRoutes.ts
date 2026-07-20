import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import uploadConfig from "../config/upload";

import * as SettingController from "../controllers/SettingController";

const settingRoutes = Router();
const upload = multer(uploadConfig);

settingRoutes.get("/public-settings", SettingController.publicIndex);

settingRoutes.get("/settings", isAuth, requirePermission("settings.view"), SettingController.index);

// routes.get("/settings/:settingKey", isAuth, SettingsController.show);

// change setting key to key in future
settingRoutes.put("/settings/:settingKey", isAuth, requirePermission("settings.manage"), SettingController.update);
settingRoutes.post(
  "/settings/logo",
  isAuth,
  requirePermission("settings.logo"),
  upload.single("logo"),
  SettingController.uploadLogo
);
settingRoutes.delete("/settings/logo", isAuth, requirePermission("settings.logo"), SettingController.removeLogo);

export default settingRoutes;
