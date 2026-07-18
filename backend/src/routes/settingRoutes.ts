import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as SettingController from "../controllers/SettingController";

const settingRoutes = Router();
const upload = multer(uploadConfig);

settingRoutes.get("/public-settings", SettingController.publicIndex);

settingRoutes.get("/settings", isAuth, SettingController.index);

// routes.get("/settings/:settingKey", isAuth, SettingsController.show);

// change setting key to key in future
settingRoutes.put("/settings/:settingKey", isAuth, SettingController.update);
settingRoutes.post(
  "/settings/logo",
  isAuth,
  upload.single("logo"),
  SettingController.uploadLogo
);
settingRoutes.delete("/settings/logo", isAuth, SettingController.removeLogo);

export default settingRoutes;
