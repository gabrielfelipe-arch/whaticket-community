import express from "express";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";

import * as TicketController from "../controllers/TicketController";

const ticketRoutes = express.Router();

ticketRoutes.get("/tickets", isAuth, requirePermission("tickets.view"), TicketController.index);

ticketRoutes.get("/tickets/:ticketId/previous-messages", isAuth, requirePermission("tickets.view"), TicketController.previousMessages);

ticketRoutes.get("/tickets/:ticketId", isAuth, requirePermission("tickets.view"), TicketController.show);

ticketRoutes.post("/tickets", isAuth, requirePermission("tickets.manage"), TicketController.store);

ticketRoutes.put("/tickets/:ticketId", isAuth, requirePermission("tickets.manage"), TicketController.update);

ticketRoutes.delete("/tickets/:ticketId", isAuth, requirePermission("tickets.delete"), TicketController.remove);

export default ticketRoutes;
