import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as PushSubscriptionController from "../controllers/PushSubscriptionController";

const pushSubscriptionRoutes = Router();

pushSubscriptionRoutes.get(
  "/push-subscriptions/public-key",
  isAuth,
  PushSubscriptionController.publicKey
);

pushSubscriptionRoutes.post(
  "/push-subscriptions",
  isAuth,
  PushSubscriptionController.store
);

pushSubscriptionRoutes.delete(
  "/push-subscriptions",
  isAuth,
  PushSubscriptionController.remove
);

export default pushSubscriptionRoutes;
