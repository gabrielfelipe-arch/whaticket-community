import { Router } from "express";

import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";
import * as UserProfileController from "../controllers/UserProfileController";

const userProfileRoutes = Router();

userProfileRoutes.get(
  "/user-profiles/permissions",
  isAuth,
  requirePermission("profiles.manage"),
  UserProfileController.permissionGroups
);

userProfileRoutes.get(
  "/user-profiles",
  isAuth,
  requirePermission("profiles.manage"),
  UserProfileController.index
);

userProfileRoutes.post(
  "/user-profiles",
  isAuth,
  requirePermission("profiles.manage"),
  UserProfileController.store
);

userProfileRoutes.put(
  "/user-profiles/:profileId",
  isAuth,
  requirePermission("profiles.manage"),
  UserProfileController.update
);

userProfileRoutes.delete(
  "/user-profiles/:profileId",
  isAuth,
  requirePermission("profiles.manage"),
  UserProfileController.remove
);

export default userProfileRoutes;
