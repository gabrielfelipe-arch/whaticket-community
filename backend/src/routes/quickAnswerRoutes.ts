import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import uploadConfig from "../config/upload";

import * as QuickAnswerController from "../controllers/QuickAnswerController";

const quickAnswerRoutes = express.Router();
const upload = multer(uploadConfig);

quickAnswerRoutes.get("/quickAnswers", isAuth, requirePermission("quickAnswers.view"), QuickAnswerController.index);

quickAnswerRoutes.get(
  "/quickAnswers/:quickAnswerId",
  isAuth,
  requirePermission("quickAnswers.view"),
  QuickAnswerController.show
);

quickAnswerRoutes.post("/quickAnswers", isAuth, requirePermission("quickAnswers.create"), upload.single("media"), QuickAnswerController.store);

quickAnswerRoutes.put(
  "/quickAnswers/:quickAnswerId",
  isAuth,
  requirePermission("quickAnswers.edit"),
  upload.single("media"),
  QuickAnswerController.update
);

quickAnswerRoutes.delete(
  "/quickAnswers/:quickAnswerId",
  isAuth,
  requirePermission("quickAnswers.delete"),
  QuickAnswerController.remove
);

export default quickAnswerRoutes;
