import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as CalendarController from "../controllers/CalendarController";

const calendarRoutes = Router();

calendarRoutes.get("/calendar/google/auth", isAuth, CalendarController.googleAuth);
calendarRoutes.get("/calendar/google/callback", CalendarController.googleCallback);

export default calendarRoutes;
