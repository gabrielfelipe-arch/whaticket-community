import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as ReportController from "../controllers/ReportController";

const reportRoutes = Router();

reportRoutes.get("/reports/dashboard", isAuth, ReportController.dashboard);
reportRoutes.get("/reports/tickets/export", isAuth, ReportController.exportTickets);
reportRoutes.get("/reports/conversations", isAuth, ReportController.conversationHistory);

export default reportRoutes;
