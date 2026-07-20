import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CheckSettingsHelper from "../helpers/CheckSettings";
import AppError from "../errors/AppError";
import {
  isAdminOrSupervisorProfile,
  isAdminProfile,
  isSupervisorProfile,
  normalizeProfile,
  requestUserHasPermission
} from "../helpers/ProfilePermissions";

import CreateUserService from "../services/UserServices/CreateUserService";
import ListUsersService from "../services/UserServices/ListUsersService";
import UpdateUserService from "../services/UserServices/UpdateUserService";
import ShowUserService from "../services/UserServices/ShowUserService";
import DeleteUserService from "../services/UserServices/DeleteUserService";
import ResetUserPasswordService from "../services/UserServices/ResetUserPasswordService";
import ChangeUserPasswordService from "../services/UserServices/ChangeUserPasswordService";
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
  const { email, cpf, birthDate, jobTitle, messageSignature, name, profile, profileId, queueIds, whatsappId, attendanceGreeting, active, glpiEnabled, glpiUserToken, specialPermissions, workHours } = req.body;
  const requesterProfile = normalizeProfile(req.user?.profile);
  const targetProfile = req.url === "/signup" ? "user" : normalizeProfile(profile || "user");

  if (
    req.url === "/signup" &&
    (await CheckSettingsHelper("userCreation")) === "disabled"
  ) {
    throw new AppError("ERR_USER_CREATION_DISABLED", 403);
  } else if (
    req.url !== "/signup" &&
    !isAdminOrSupervisorProfile(requesterProfile) &&
    !(await requestUserHasPermission(req.user.id, "users.create"))
  ) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (!isAdminProfile(requesterProfile) && targetProfile === "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await CreateUserService({
    email,
    cpf,
    birthDate,
    jobTitle,
    messageSignature,
    name,
    profile: targetProfile,
    profileId: isAdminProfile(requesterProfile) ? profileId : undefined,
    queueIds,
    whatsappId,
    attendanceGreeting,
    active,
    glpiEnabled: glpiEnabled === true || glpiEnabled === "true",
    glpiUserToken,
    specialPermissions: isAdminProfile(requesterProfile) ? specialPermissions : undefined,
    workHours
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

  if (!isAdminOrSupervisorProfile(req.user.profile) && Number(req.user.id) !== Number(userId)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await ShowUserService(userId);

  return res.status(200).json(SerializeUser(user));
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const requesterProfile = normalizeProfile(req.user?.profile);
  if (
    !isAdminOrSupervisorProfile(requesterProfile) &&
    !(await requestUserHasPermission(req.user.id, "users.edit"))
  ) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { userId } = req.params;
  const userData = { ...req.body };
  const targetUser = await ShowUserService(userId);

  if (isSupervisorProfile(requesterProfile)) {
    delete userData.specialPermissions;
    delete userData.profileId;

    if (isAdminProfile(targetUser.profile) || normalizeProfile(userData.profile || targetUser.profile) === "admin") {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }

    if (
      Number(req.user.id) === Number(userId) &&
      (userData.profile !== undefined || userData.active !== undefined)
    ) {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }
  } else if (!isAdminProfile(requesterProfile)) {
    delete userData.specialPermissions;
    delete userData.profileId;

    if (isAdminProfile(targetUser.profile) || normalizeProfile(userData.profile || targetUser.profile) === "admin") {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }
  }

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

  if (!isAdminOrSupervisorProfile(req.user.profile) && Number(req.user.id) !== Number(userId)) {
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

export const changePassword = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { currentPassword, newPassword } = req.body;

  const user = await ChangeUserPasswordService({
    userId: req.user.id,
    currentPassword,
    newPassword
  });

  const io = getIO();
  io.emit("user", {
    action: "update",
    user
  });

  return res.status(200).json({ user });
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const requesterProfile = normalizeProfile(req.user?.profile);

  if (
    !isAdminProfile(requesterProfile) &&
    !(await requestUserHasPermission(req.user.id, "users.reset_password"))
  ) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const targetUser = await ShowUserService(userId);

  if (!isAdminProfile(requesterProfile) && isAdminProfile(targetUser.profile)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await ResetUserPasswordService({ userId });

  const io = getIO();
  io.emit("user", {
    action: "update",
    user
  });

  return res.status(200).json({
    user,
    message: "Senha resetada para os 6 primeiros digitos do CPF."
  });
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

  const requesterProfile = normalizeProfile(req.user?.profile);
  if (
    !isAdminOrSupervisorProfile(requesterProfile) &&
    !(await requestUserHasPermission(req.user.id, "users.delete"))
  ) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const targetUser = await ShowUserService(userId);

  if (!isAdminProfile(requesterProfile) && (isAdminProfile(targetUser.profile) || Number(req.user.id) === Number(userId))) {
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
