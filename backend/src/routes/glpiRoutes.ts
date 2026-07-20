import express from "express";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import * as GlpiController from "../controllers/GlpiController";

const glpiRoutes = express.Router();

glpiRoutes.get("/glpi/config", isAuth, requirePermission("glpi.view"), GlpiController.config);
glpiRoutes.put("/glpi/config", isAuth, requirePermission("glpi.manage"), GlpiController.updateConfig);
glpiRoutes.get("/glpi/configurations", isAuth, requirePermission("glpi.view"), GlpiController.listConfigurations);
glpiRoutes.post("/glpi/configurations", isAuth, requirePermission("glpi.manage"), GlpiController.createConfiguration);
glpiRoutes.delete("/glpi/configurations/:configurationId", isAuth, requirePermission("glpi.manage"), GlpiController.deleteConfiguration);
glpiRoutes.post("/glpi/test-connection", isAuth, requirePermission("glpi.manage"), GlpiController.testConnection);
glpiRoutes.post("/glpi/sync/entities", isAuth, requirePermission("glpi.sync"), GlpiController.syncEntities);
glpiRoutes.post("/glpi/sync/categories", isAuth, requirePermission("glpi.sync"), GlpiController.syncCategories);
glpiRoutes.post("/glpi/sync/locations", isAuth, requirePermission("glpi.sync"), GlpiController.syncLocations);
glpiRoutes.get("/glpi/entities", isAuth, GlpiController.listEntities);
glpiRoutes.get("/glpi/categories", isAuth, GlpiController.listCategories);
glpiRoutes.get("/glpi/locations", isAuth, GlpiController.listLocations);
glpiRoutes.get("/glpi/logs", isAuth, requirePermission("glpi.view"), GlpiController.logs);
glpiRoutes.get("/tickets/:ticketId/glpi", isAuth, GlpiController.ticketStatus);
glpiRoutes.post("/tickets/:ticketId/glpi", isAuth, GlpiController.createTicket);

export default glpiRoutes;
