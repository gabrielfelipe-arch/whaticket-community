import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as CampaignController from "../controllers/CampaignController";
import * as ScheduledMessageController from "../controllers/ScheduledMessageController";

const routes = Router();
const upload = multer(uploadConfig);

routes.get("/campaigns", isAuth, CampaignController.index);
routes.post("/campaigns", isAuth, upload.single("media"), CampaignController.store);
routes.put("/campaigns/:campaignId", isAuth, CampaignController.update);
routes.delete("/campaigns/:campaignId", isAuth, CampaignController.remove);
routes.get("/campaigns/:campaignId/summary", isAuth, CampaignController.summary);
routes.get("/campaigns/:campaignId/logs", isAuth, CampaignController.logs);
routes.post("/campaigns/:campaignId/retry-failed", isAuth, CampaignController.retryFailed);
routes.post("/campaigns/:campaignId/duplicate", isAuth, CampaignController.duplicate);

routes.get("/scheduled-messages", isAuth, ScheduledMessageController.index);
routes.post("/scheduled-messages/recipient-preview", isAuth, ScheduledMessageController.recipientPreview);
routes.post("/scheduled-messages", isAuth, upload.single("media"), ScheduledMessageController.store);
routes.put("/scheduled-messages/:scheduleId", isAuth, upload.single("media"), ScheduledMessageController.update);
routes.delete("/scheduled-messages/:scheduleId", isAuth, ScheduledMessageController.remove);
routes.get("/scheduled-messages/:scheduleId/executions", isAuth, ScheduledMessageController.executions);
routes.post("/scheduled-messages/:scheduleId/duplicate", isAuth, ScheduledMessageController.duplicate);

export default routes;
