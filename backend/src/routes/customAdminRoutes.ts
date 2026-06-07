import { Request, Response, Router } from "express";
import multer from "multer";

import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";
import * as CustomAdminController from "../controllers/CustomAdminController";
import * as AuditLogController from "../controllers/AuditLogController";

const customAdminRoutes = Router();
const upload = multer(uploadConfig);

const bindResource = (resource: string, action: keyof typeof CustomAdminController) => {
  return async (req: Request, res: Response) => {
    req.params.resource = resource;
    return CustomAdminController[action](req, res);
  };
};

const resources = [
  { path: "/ticket-categories", resource: "ticketCategories" },
  { path: "/closing-reasons", resource: "closingReasons" },
  { path: "/ura-flows", resource: "uraFlows" },
  { path: "/ura-options", resource: "uraOptions" },
  { path: "/ai-settings", resource: "aiSettings" },
  { path: "/knowledge-base", resource: "knowledgeBaseArticles" },
  { path: "/satisfaction-surveys", resource: "satisfactionSurveys" },
  { path: "/qualification-forms", resource: "qualificationForms" },
  { path: "/qualification-form-questions", resource: "qualificationFormQuestions" },
  { path: "/qualification-form-responses", resource: "qualificationFormResponses" },
  { path: "/qualification-form-answers", resource: "qualificationFormAnswers" },
  { path: "/ai-ticket-contexts", resource: "aiTicketContexts" },
  { path: "/ai-leads", resource: "aiLeads" },
  { path: "/ai-calendar-connections", resource: "aiCalendarConnections" },
  { path: "/ai-tool-executions", resource: "aiToolExecutions" }
];

resources.forEach(({ path, resource }) => {
  customAdminRoutes.get(path, isAuth, bindResource(resource, "index"));
  customAdminRoutes.post(path, isAuth, upload.single("media"), bindResource(resource, "store"));
  customAdminRoutes.put(`${path}/:id`, isAuth, upload.single("media"), bindResource(resource, "update"));
  customAdminRoutes.delete(`${path}/:id`, isAuth, bindResource(resource, "remove"));
});

customAdminRoutes.get("/audit-logs", isAuth, AuditLogController.index);
customAdminRoutes.post("/ai-settings/:id/test", isAuth, CustomAdminController.testAiSetting);
customAdminRoutes.post(
  "/qualification-form-message-media",
  isAuth,
  upload.single("media"),
  CustomAdminController.uploadQualificationMessageMedia
);

customAdminRoutes.get("/custom/:resource", isAuth, CustomAdminController.index);
customAdminRoutes.post("/custom/:resource", isAuth, CustomAdminController.store);
customAdminRoutes.put("/custom/:resource/:id", isAuth, CustomAdminController.update);
customAdminRoutes.delete("/custom/:resource/:id", isAuth, CustomAdminController.remove);

export default customAdminRoutes;
