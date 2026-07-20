import { Router } from "express";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";

import WhatsAppSessionController from "../controllers/WhatsAppSessionController";

const whatsappSessionRoutes = Router();

whatsappSessionRoutes.post(
  "/whatsappsession/:whatsappId",
  isAuth,
  requirePermission("connections.reconnect"),
  WhatsAppSessionController.store
);

whatsappSessionRoutes.put(
  "/whatsappsession/:whatsappId",
  isAuth,
  requirePermission("connections.reconnect"),
  WhatsAppSessionController.update
);

whatsappSessionRoutes.delete(
  "/whatsappsession/:whatsappId",
  isAuth,
  requirePermission("connections.reconnect"),
  WhatsAppSessionController.remove
);

export default whatsappSessionRoutes;
