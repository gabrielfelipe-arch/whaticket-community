import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import uploadConfig from "../config/upload";

import * as TicketController from "../controllers/TicketController";

const ticketRoutes = express.Router();
const upload = multer(uploadConfig);

ticketRoutes.get("/tickets", isAuth, requirePermission("tickets.view"), TicketController.index);

ticketRoutes.get(
  "/tickets/:ticketId/transfer-users",
  isAuth,
  requirePermission("tickets.manage"),
  TicketController.transferUsers
);

ticketRoutes.get("/tickets/:ticketId/previous-messages", isAuth, requirePermission("tickets.view"), TicketController.previousMessages);

ticketRoutes.get("/tickets/:ticketId", isAuth, requirePermission("tickets.view"), TicketController.show);

ticketRoutes.post("/tickets", isAuth, requirePermission("tickets.manage"), TicketController.store);

ticketRoutes.post(
  "/tickets/validate-number",
  isAuth,
  requirePermission("tickets.manage"),
  requirePermission("messages.send"),
  TicketController.validateNumber
);

ticketRoutes.post(
  "/tickets/by-number",
  isAuth,
  requirePermission("tickets.manage"),
  requirePermission("messages.send"),
  upload.array("medias"),
  TicketController.storeByNumber
);

ticketRoutes.post(
  "/tickets/:ticketId/transfer",
  isAuth,
  requirePermission("tickets.manage"),
  requirePermission("messages.send"),
  TicketController.transfer
);

ticketRoutes.put("/tickets/:ticketId", isAuth, requirePermission("tickets.manage"), TicketController.update);

ticketRoutes.delete("/tickets/:ticketId", isAuth, requirePermission("tickets.delete"), TicketController.remove);

export default ticketRoutes;
