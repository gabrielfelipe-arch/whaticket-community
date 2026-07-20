import { Router } from "express";

import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import * as TagController from "../controllers/TagController";

const tagRoutes = Router();

tagRoutes.get("/tags", isAuth, TagController.index);
tagRoutes.post("/tags", isAuth, requirePermission("tags.create"), TagController.store);
tagRoutes.put("/tags/:tagId", isAuth, requirePermission("tags.edit"), TagController.update);
tagRoutes.delete("/tags/:tagId", isAuth, requirePermission("tags.delete"), TagController.remove);

export default tagRoutes;
