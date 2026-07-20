import express from "express";
import { Request, Response, NextFunction } from "express";
import isAuth from "../middleware/isAuth";
import AppError from "../errors/AppError";
import requirePermission from "../middleware/requirePermission";

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

whatsappRoutes.get("/whatsapp/", isAuth, requirePermission("connections.view"), WhatsAppController.index);

whatsappRoutes.get("/whatsapp-updates/status", isAuth, requirePermission("whatsapp_updates.manage"), WhatsAppUpdateController.status);
whatsappRoutes.get("/whatsapp-updates/progress", isAuth, requirePermission("whatsapp_updates.manage"), WhatsAppUpdateController.progress);
whatsappRoutes.post("/whatsapp-updates/install", isAuth, requirePermission("whatsapp_updates.manage"), WhatsAppUpdateController.install);
whatsappRoutes.post("/whatsapp-updates/rollback", isAuth, requirePermission("whatsapp_updates.manage"), WhatsAppUpdateController.rollback);

whatsappRoutes.get("/whatsapp-provider", isAuth, requirePermission("whatsapp_provider.view"), WhatsAppProviderController.show);
whatsappRoutes.put("/whatsapp-provider", isAuth, requirePermission("whatsapp_provider.manage"), WhatsAppProviderController.update);
whatsappRoutes.post("/whatsapp-provider/test-evolution", isAuth, requirePermission("whatsapp_provider.manage"), WhatsAppProviderController.testEvolution);
whatsappRoutes.post("/whatsapp-provider/switch", isAuth, requirePermission("whatsapp_provider.manage"), WhatsAppProviderController.switchProvider);

whatsappRoutes.post("/webhooks/evolution", EvolutionWebhookController.receive);
whatsappRoutes.post("/webhooks/evolution/:instance", EvolutionWebhookController.receive);

whatsappRoutes.post("/whatsapp/", isAuth, requirePermission("connections.create"), WhatsAppController.store);

whatsappRoutes.get("/whatsapp/:whatsappId", isAuth, requirePermission("connections.view"), WhatsAppController.show);

whatsappRoutes.put("/whatsapp/:whatsappId", isAuth, requirePermission("connections.edit"), WhatsAppController.update);

whatsappRoutes.delete(
  "/whatsapp/:whatsappId",
  isAuth,
  requirePermission("connections.delete"),
  WhatsAppController.remove
);

export default whatsappRoutes;
