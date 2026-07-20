import { Router } from "express";

import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import * as UserController from "../controllers/UserController";

const userRoutes = Router();

userRoutes.get("/users", isAuth, requirePermission("users.view"), UserController.index);

userRoutes.get("/users/inactivity-settings", isAuth, UserController.inactivitySettings);

userRoutes.post("/users/activity", isAuth, UserController.activity);

userRoutes.post("/users/change-password", isAuth, UserController.changePassword);

userRoutes.post("/users", isAuth, requirePermission("users.create"), UserController.store);

userRoutes.put("/users/:userId/status", isAuth, UserController.updateStatus);

userRoutes.post("/users/:userId/reset-password", isAuth, requirePermission("users.reset_password"), UserController.resetPassword);

userRoutes.put("/users/:userId", isAuth, requirePermission("users.edit"), UserController.update);

userRoutes.get("/users/:userId", isAuth, UserController.show);

userRoutes.delete("/users/:userId", isAuth, requirePermission("users.delete"), UserController.remove);

export default userRoutes;
