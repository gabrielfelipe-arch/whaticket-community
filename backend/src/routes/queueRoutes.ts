import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import uploadConfig from "../config/upload";

import * as QueueController from "../controllers/QueueController";

const queueRoutes = Router();
const upload = multer(uploadConfig);

queueRoutes.get("/queue", isAuth, QueueController.index);

queueRoutes.post("/queue", isAuth, requirePermission("queues.create"), upload.single("media"), QueueController.store);

queueRoutes.get("/queue/:queueId", isAuth, QueueController.show);

queueRoutes.put("/queue/:queueId", isAuth, requirePermission("queues.edit"), upload.single("media"), QueueController.update);

queueRoutes.delete("/queue/:queueId", isAuth, requirePermission("queues.delete"), QueueController.remove);

export default queueRoutes;
