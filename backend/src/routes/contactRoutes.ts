import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import uploadConfig from "../config/upload";

import * as ContactController from "../controllers/ContactController";
import * as ImportPhoneContactsController from "../controllers/ImportPhoneContactsController";

const contactRoutes = express.Router();
const upload = multer(uploadConfig);

contactRoutes.post(
  "/contacts/import",
  isAuth,
  requirePermission("contacts.import_phone"),
  ImportPhoneContactsController.store
);

contactRoutes.post(
  "/contacts/import-spreadsheet",
  isAuth,
  requirePermission("contacts.import"),
  upload.single("file"),
  ContactController.importSpreadsheet
);

contactRoutes.get("/contacts", isAuth, requirePermission("contacts.view"), ContactController.index);

contactRoutes.get("/contacts/:contactId", isAuth, requirePermission("contacts.view"), ContactController.show);

contactRoutes.post("/contacts", isAuth, requirePermission("contacts.create"), ContactController.store);

contactRoutes.post("/contact", isAuth, requirePermission("contacts.view"), ContactController.getContact);

contactRoutes.put("/contacts/:contactId", isAuth, requirePermission("contacts.edit"), ContactController.update);

contactRoutes.delete("/contacts/:contactId", isAuth, requirePermission("contacts.delete"), ContactController.remove);

export default contactRoutes;
