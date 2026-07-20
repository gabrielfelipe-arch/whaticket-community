import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import uploadConfig from "../config/upload";

import * as CampaignController from "../controllers/CampaignController";
import * as ScheduledMessageController from "../controllers/ScheduledMessageController";

const routes = Router();
const upload = multer(uploadConfig);

routes.get("/campaigns", isAuth, requirePermission("campaigns.view"), CampaignController.index);
routes.post("/campaigns", isAuth, requirePermission("campaigns.manage"), upload.single("media"), CampaignController.store);
routes.put("/campaigns/:campaignId", isAuth, requirePermission("campaigns.manage"), CampaignController.update);
routes.delete("/campaigns/:campaignId", isAuth, requirePermission("campaigns.manage"), CampaignController.remove);
routes.get("/campaigns/:campaignId/summary", isAuth, requirePermission("campaigns.view"), CampaignController.summary);
routes.get("/campaigns/:campaignId/logs", isAuth, requirePermission("campaigns.view"), CampaignController.logs);
routes.post("/campaigns/:campaignId/retry-failed", isAuth, requirePermission("campaigns.manage"), CampaignController.retryFailed);
routes.post("/campaigns/:campaignId/duplicate", isAuth, requirePermission("campaigns.manage"), CampaignController.duplicate);

routes.get("/scheduled-messages", isAuth, requirePermission("scheduledMessages.view"), ScheduledMessageController.index);
routes.post("/scheduled-messages/recipient-preview", isAuth, requirePermission("scheduledMessages.manage"), ScheduledMessageController.recipientPreview);
routes.post("/scheduled-messages", isAuth, requirePermission("scheduledMessages.manage"), upload.single("media"), ScheduledMessageController.store);
routes.put("/scheduled-messages/:scheduleId", isAuth, requirePermission("scheduledMessages.manage"), upload.single("media"), ScheduledMessageController.update);
routes.delete("/scheduled-messages/:scheduleId", isAuth, requirePermission("scheduledMessages.manage"), ScheduledMessageController.remove);
routes.get("/scheduled-messages/:scheduleId/executions", isAuth, requirePermission("scheduledMessages.view"), ScheduledMessageController.executions);
routes.post("/scheduled-messages/:scheduleId/duplicate", isAuth, requirePermission("scheduledMessages.manage"), ScheduledMessageController.duplicate);

export default routes;
