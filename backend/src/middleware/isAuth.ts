import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import authConfig from "../config/auth";
import User from "../models/User";
import { normalizeProfile } from "../helpers/ProfilePermissions";
import { assertUserCanAccessNow } from "../helpers/UserAccessRules";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  iat: number;
  exp: number;
}

const isAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = verify(token, authConfig.secret);
    const { id, profile } = decoded as TokenPayload;

    const user = await User.findByPk(id, {
      attributes: ["id", "profile", "active", "workHours"]
    });

    if (!user || user.active === false) {
      throw new AppError("Usuario inativo. Procure o administrador do sistema.", 403);
    }

    assertUserCanAccessNow(user);

    req.user = {
      id,
      profile: normalizeProfile(user.profile || profile)
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError(
      "Invalid token. We'll try to assign a new one on next request",
      403
    );
  }

  return next();
};

export default isAuth;
