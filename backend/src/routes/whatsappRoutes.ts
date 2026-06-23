import express from "express";
import { Request, Response, NextFunction } from "express";
import isAuth from "../middleware/isAuth";
import AppError from "../errors/AppError";

import * as WhatsAppController from "../controllers/WhatsAppController";
import * as WhatsAppUpdateController from "../controllers/WhatsAppUpdateController";

const whatsappRoutes = express.Router();

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  return next();
};

whatsappRoutes.get("/whatsapp/", isAuth, WhatsAppController.index);

whatsappRoutes.get("/whatsapp-updates/status", isAuth, isAdmin, WhatsAppUpdateController.status);
whatsappRoutes.get("/whatsapp-updates/progress", isAuth, isAdmin, WhatsAppUpdateController.progress);
whatsappRoutes.post("/whatsapp-updates/install", isAuth, isAdmin, WhatsAppUpdateController.install);
whatsappRoutes.post("/whatsapp-updates/rollback", isAuth, isAdmin, WhatsAppUpdateController.rollback);

whatsappRoutes.post("/whatsapp/", isAuth, isAdmin, WhatsAppController.store);

whatsappRoutes.get("/whatsapp/:whatsappId", isAuth, isAdmin, WhatsAppController.show);

whatsappRoutes.put("/whatsapp/:whatsappId", isAuth, isAdmin, WhatsAppController.update);

whatsappRoutes.delete(
  "/whatsapp/:whatsappId",
  isAuth,
  isAdmin,
  WhatsAppController.remove
);

export default whatsappRoutes;
