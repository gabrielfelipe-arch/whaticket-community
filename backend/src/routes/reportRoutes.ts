import { Router } from "express";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import * as ReportController from "../controllers/ReportController";

const reportRoutes = Router();

reportRoutes.get("/reports/dashboard", isAuth, requirePermission("dashboard.view"), ReportController.dashboard);
reportRoutes.get("/reports/tickets/export", isAuth, requirePermission("reports.export"), ReportController.exportTickets);
reportRoutes.get("/reports/satisfaction/export", isAuth, requirePermission("reports.export"), ReportController.exportSatisfaction);
reportRoutes.get("/reports/conversations", isAuth, requirePermission("reports.view"), ReportController.conversationHistory);
reportRoutes.get("/reports/conversations/:ticketId", isAuth, requirePermission("reports.view"), ReportController.conversationDetail);
reportRoutes.get("/reports/satisfaction", isAuth, requirePermission("reports.view"), ReportController.satisfaction);

export default reportRoutes;
