import express from "express";
import { Request, Response, NextFunction } from "express";
import isAuth from "../middleware/isAuth";
import AppError from "../errors/AppError";
import { isAdminOrSupervisorProfile } from "../helpers/ProfilePermissions";

import * as WhatsAppController from "../controllers/WhatsAppController";
import * as WhatsAppUpdateController from "../controllers/WhatsAppUpdateController";
import * as WhatsAppProviderController from "../controllers/WhatsAppProviderController";
import * as EvolutionWebhookController from "../controllers/EvolutionWebhookController";

const whatsappRoutes = express.Router();

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  return next();
};

const isAdminOrSupervisor = (req: Request, res: Response, next: NextFunction) => {
  if (!isAdminOrSupervisorProfile(req.user.profile)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  return next();
};

whatsappRoutes.get("/whatsapp/", isAuth, WhatsAppController.index);

whatsappRoutes.get("/whatsapp-updates/status", isAuth, isAdmin, WhatsAppUpdateController.status);
whatsappRoutes.get("/whatsapp-updates/progress", isAuth, isAdmin, WhatsAppUpdateController.progress);
whatsappRoutes.post("/whatsapp-updates/install", isAuth, isAdmin, WhatsAppUpdateController.install);
whatsappRoutes.post("/whatsapp-updates/rollback", isAuth, isAdmin, WhatsAppUpdateController.rollback);

whatsappRoutes.get("/whatsapp-provider", isAuth, isAdmin, WhatsAppProviderController.show);
whatsappRoutes.put("/whatsapp-provider", isAuth, isAdmin, WhatsAppProviderController.update);
whatsappRoutes.post("/whatsapp-provider/test-evolution", isAuth, isAdmin, WhatsAppProviderController.testEvolution);
whatsappRoutes.post("/whatsapp-provider/switch", isAuth, isAdmin, WhatsAppProviderController.switchProvider);

whatsappRoutes.post("/webhooks/evolution", EvolutionWebhookController.receive);
whatsappRoutes.post("/webhooks/evolution/:instance", EvolutionWebhookController.receive);

whatsappRoutes.post("/whatsapp/", isAuth, isAdmin, WhatsAppController.store);

whatsappRoutes.get("/whatsapp/:whatsappId", isAuth, isAdminOrSupervisor, WhatsAppController.show);

whatsappRoutes.put("/whatsapp/:whatsappId", isAuth, isAdmin, WhatsAppController.update);

whatsappRoutes.delete(
  "/whatsapp/:whatsappId",
  isAuth,
  isAdmin,
  WhatsAppController.remove
);

export default whatsappRoutes;
