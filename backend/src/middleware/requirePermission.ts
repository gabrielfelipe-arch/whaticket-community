import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import {
  ProfilePermissionKey,
  requestUserHasPermission
} from "../helpers/ProfilePermissions";

const requirePermission = (permission: ProfilePermissionKey) => async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const allowed = await requestUserHasPermission(req.user.id, permission);

  if (!allowed) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  next();
};

export default requirePermission;
