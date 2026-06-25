import { NextFunction, Request, Response, Router } from "express";
import isAuth from "../middleware/isAuth";
import AppError from "../errors/AppError";
import { isAdminOrSupervisorProfile } from "../helpers/ProfilePermissions";

import WhatsAppSessionController from "../controllers/WhatsAppSessionController";

const whatsappSessionRoutes = Router();

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

whatsappSessionRoutes.post(
  "/whatsappsession/:whatsappId",
  isAuth,
  isAdminOrSupervisor,
  WhatsAppSessionController.store
);

whatsappSessionRoutes.put(
  "/whatsappsession/:whatsappId",
  isAuth,
  isAdminOrSupervisor,
  WhatsAppSessionController.update
);

whatsappSessionRoutes.delete(
  "/whatsappsession/:whatsappId",
  isAuth,
  isAdmin,
  WhatsAppSessionController.remove
);

export default whatsappSessionRoutes;
