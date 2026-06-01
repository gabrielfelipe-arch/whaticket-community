import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CheckSettingsHelper from "../helpers/CheckSettings";
import AppError from "../errors/AppError";

import CreateUserService from "../services/UserServices/CreateUserService";
import ListUsersService from "../services/UserServices/ListUsersService";
import UpdateUserService from "../services/UserServices/UpdateUserService";
import ShowUserService from "../services/UserServices/ShowUserService";
import DeleteUserService from "../services/UserServices/DeleteUserService";
import {
  updateUserOperationalStatus,
  touchUserActivity
} from "../services/QueueService/QueueDistributionService";
import { SerializeUser } from "../helpers/SerializeUser";
import Setting from "../models/Setting";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const { users, count, hasMore } = await ListUsersService({
    searchParam,
    pageNumber
  });

  return res.json({ users, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { email, password, name, profile, queueIds, whatsappId, attendanceGreeting, active } = req.body;

  if (
    req.url === "/signup" &&
    (await CheckSettingsHelper("userCreation")) === "disabled"
  ) {
    throw new AppError("ERR_USER_CREATION_DISABLED", 403);
  } else if (req.url !== "/signup" && req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await CreateUserService({
    email,
    password,
    name,
    profile,
    queueIds,
    whatsappId,
    attendanceGreeting,
    active
  });

  const io = getIO();
  io.emit("user", {
    action: "create",
    user
  });

  return res.status(200).json(user);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.params;

  const user = await ShowUserService(userId);

  return res.status(200).json(user);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { userId } = req.params;
  const userData = req.body;

  const user = await UpdateUserService({ userData, userId });

  const io = getIO();
  io.emit("user", {
    action: "update",
    user
  });

  return res.status(200).json(user);
};

export const updateStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const { status, reason } = req.body;

  if (!["online", "away", "offline"].includes(status)) {
    throw new AppError("Status operacional inválido.", 400);
  }

  if (status === "offline" && !["logout", "auto_logout"].includes(reason)) {
    throw new AppError("Offline é aplicado somente ao sair do sistema.", 400);
  }

  if (req.user.profile !== "admin" && Number(req.user.id) !== Number(userId)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await updateUserOperationalStatus({
    userId,
    status,
    reason: reason || "manual"
  });

  const serializedUser = SerializeUser(user);

  const io = getIO();
  io.emit("user", {
    action: "update",
    user: serializedUser
  });

  return res.status(200).json(serializedUser);
};

export const activity = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await touchUserActivity(req.user.id);
  return res.status(200).json({ ok: true });
};

export const inactivitySettings = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const settings = await Setting.findAll({
    where: {
      key: [
        "autoAwayEnabled",
        "autoAwayMinutes",
        "autoLogoutEnabled",
        "autoLogoutMinutes",
        "warnBeforeLogoutEnabled",
        "warnBeforeLogoutMinutes",
        "inactivityAppliesToAdmins"
      ]
    }
  });

  return res.status(200).json(settings);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;

  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await DeleteUserService(userId);

  const io = getIO();
  io.emit("user", {
    action: "delete",
    userId
  });

  return res.status(200).json({ message: "User deleted" });
};
