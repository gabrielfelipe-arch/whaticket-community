import express from "express";
import isAuth from "../middleware/isAuth";
import * as GlpiController from "../controllers/GlpiController";

const glpiRoutes = express.Router();

glpiRoutes.get("/glpi/config", isAuth, GlpiController.config);
glpiRoutes.put("/glpi/config", isAuth, GlpiController.updateConfig);
glpiRoutes.post("/glpi/test-connection", isAuth, GlpiController.testConnection);
glpiRoutes.post("/glpi/sync/entities", isAuth, GlpiController.syncEntities);
glpiRoutes.post("/glpi/sync/categories", isAuth, GlpiController.syncCategories);
glpiRoutes.post("/glpi/sync/locations", isAuth, GlpiController.syncLocations);
glpiRoutes.get("/glpi/entities", isAuth, GlpiController.listEntities);
glpiRoutes.get("/glpi/categories", isAuth, GlpiController.listCategories);
glpiRoutes.get("/glpi/locations", isAuth, GlpiController.listLocations);
glpiRoutes.get("/glpi/logs", isAuth, GlpiController.logs);
glpiRoutes.get("/tickets/:ticketId/glpi", isAuth, GlpiController.ticketStatus);
glpiRoutes.post("/tickets/:ticketId/glpi", isAuth, GlpiController.createTicket);

export default glpiRoutes;
