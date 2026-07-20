import { Request, Response } from "express";
import * as Yup from "yup";

import AppError from "../errors/AppError";
import {
  normalizeProfile,
  parseProfilePermissions,
  PROFILE_PERMISSION_GROUPS,
  serializeProfilePermissions
} from "../helpers/ProfilePermissions";
import User from "../models/User";
import UserProfile from "../models/UserProfile";

const serialize = (profile: UserProfile) => ({
  id: profile.id,
  name: profile.name,
  description: profile.description,
  baseRole: profile.baseRole,
  permissions: parseProfilePermissions(profile.permissions),
  isSystem: profile.isSystem,
  active: profile.active,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt
});

export const permissionGroups = async (_req: Request, res: Response): Promise<Response> =>
  res.json({ groups: PROFILE_PERMISSION_GROUPS });

export const index = async (req: Request, res: Response): Promise<Response> => {
  const onlyActive = req.query.active === "true";
  const profiles = await UserProfile.findAll({
    where: onlyActive ? { active: true } : undefined,
    order: [["isSystem", "DESC"], ["name", "ASC"]]
  });

  return res.json(profiles.map(serialize));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const schema = Yup.object().shape({
    name: Yup.string().trim().min(2).max(80).required(),
    description: Yup.string().nullable(),
    baseRole: Yup.string().oneOf(["supervisor", "user"]).required(),
    permissions: Yup.object().required(),
    active: Yup.boolean()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message, 400);
  }

  const { name, description, baseRole, permissions, active = true } = req.body;
  const normalizedName = String(name).trim();
  const exists = await UserProfile.findOne({ where: { name: normalizedName } });

  if (exists) {
    throw new AppError("Ja existe um perfil com este nome.", 400);
  }

  const profile = await UserProfile.create({
    name: normalizedName,
    description,
    baseRole: normalizeProfile(baseRole),
    permissions: serializeProfilePermissions(permissions),
    active
  });

  return res.status(201).json(serialize(profile));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { profileId } = req.params;
  const profile = await UserProfile.findByPk(profileId);

  if (!profile) {
    throw new AppError("Perfil nao encontrado.", 404);
  }

  const schema = Yup.object().shape({
    name: Yup.string().trim().min(2).max(80),
    description: Yup.string().nullable(),
    baseRole: Yup.string().oneOf(["supervisor", "user"]),
    permissions: Yup.object(),
    active: Yup.boolean()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message, 400);
  }

  const updateData: Record<string, unknown> = {};

  if (req.body.name !== undefined) {
    const normalizedName = String(req.body.name).trim();
    const exists = await UserProfile.findOne({ where: { name: normalizedName } });
    if (exists && Number(exists.id) !== Number(profile.id)) {
      throw new AppError("Ja existe um perfil com este nome.", 400);
    }
    updateData.name = normalizedName;
  }

  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.permissions !== undefined) updateData.permissions = serializeProfilePermissions(req.body.permissions);

  if (profile.name === "Administrador") {
    updateData.baseRole = "admin";
    updateData.active = true;
  } else {
    if (req.body.baseRole !== undefined) updateData.baseRole = normalizeProfile(req.body.baseRole);
    if (req.body.active !== undefined) updateData.active = req.body.active === true;
  }

  await profile.update(updateData);

  return res.json(serialize(profile));
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { profileId } = req.params;
  const profile = await UserProfile.findByPk(profileId);

  if (!profile) {
    throw new AppError("Perfil nao encontrado.", 404);
  }

  if (profile.name === "Administrador") {
    throw new AppError("O perfil Administrador nao pode ser desativado.", 400);
  }

  const usersUsingProfile = await User.count({ where: { profileId: profile.id } });
  if (usersUsingProfile > 0) {
    await profile.update({ active: false });
    return res.json({ message: "Perfil desativado porque existem usuarios vinculados." });
  }

  await profile.destroy();
  return res.json({ message: "Perfil removido." });
};
