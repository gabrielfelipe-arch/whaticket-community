import { Router } from "express";

import isAuth from "../middleware/isAuth";
import * as UserController from "../controllers/UserController";

const userRoutes = Router();

userRoutes.get("/users", isAuth, UserController.index);

userRoutes.get("/users/inactivity-settings", isAuth, UserController.inactivitySettings);

userRoutes.post("/users/activity", isAuth, UserController.activity);

userRoutes.post("/users", isAuth, UserController.store);

userRoutes.put("/users/:userId/status", isAuth, UserController.updateStatus);

userRoutes.put("/users/:userId", isAuth, UserController.update);

userRoutes.get("/users/:userId", isAuth, UserController.show);

userRoutes.delete("/users/:userId", isAuth, UserController.remove);

export default userRoutes;
