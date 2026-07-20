import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import uploadConfig from "../config/upload";

import * as MessageController from "../controllers/MessageController";

const messageRoutes = Router();

const upload = multer(uploadConfig);

messageRoutes.get("/messages/:ticketId", isAuth, MessageController.index);

messageRoutes.post(
  "/messages/:ticketId",
  isAuth,
  requirePermission("messages.send"),
  upload.array("medias"),
  MessageController.store
);

messageRoutes.delete("/messages/:messageId", isAuth, requirePermission("messages.delete"), MessageController.remove);

messageRoutes.post(
  "/messages/:messageId/reaction",
  isAuth,
  requirePermission("messages.send"),
  MessageController.react
);

export default messageRoutes;
