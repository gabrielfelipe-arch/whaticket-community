import { Request, Response } from "express";
import { Op } from "sequelize";

import AppError from "../errors/AppError";
import { isAdminOrSupervisorProfile } from "../helpers/ProfilePermissions";
import Tag from "../models/Tag";
import CreateAuditLogService from "../services/AuditLogServices/CreateAuditLogService";

const requireAdmin = (req: Request): void => {
  if (!isAdminOrSupervisorProfile(req.user.profile)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const tags = await Tag.findAll({ order: [["name", "ASC"]] });
  return res.json(tags);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const { name, color = "#607d8b", fixed } = req.body;

  if (!name || !String(name).trim()) {
    throw new AppError("ERR_TAG_NAME_REQUIRED", 400);
  }

  const [tag, created] = await Tag.findOrCreate({
    where: { name: String(name).trim() },
    defaults: {
      name: String(name).trim(),
      color,
      fixed: fixed === true || fixed === "true"
    }
  });
  if (created) {
    await CreateAuditLogService({
      req,
      action: "create",
      resource: "tags",
      resourceId: tag.id,
      afterData: tag.toJSON()
    });
  }

  return res.status(200).json(tag);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const { tagId } = req.params;
  const { name, color, fixed } = req.body;
  const tag = await Tag.findByPk(tagId);

  if (!tag) throw new AppError("ERR_TAG_NOT_FOUND", 404);
  const beforeData = tag.toJSON();

  if (name) {
    const existing = await Tag.findOne({
      where: { name, id: { [Op.not]: tagId } }
    });

    if (existing) throw new AppError("ERR_TAG_NAME_ALREADY_EXISTS", 400);
  }

  await tag.update({
    name: name || tag.name,
    color: color || tag.color,
    fixed: fixed === true || fixed === "true"
  });
  await CreateAuditLogService({
    req,
    action: "update",
    resource: "tags",
    resourceId: tag.id,
    beforeData,
    afterData: tag.toJSON()
  });

  return res.status(200).json(tag);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  requireAdmin(req);
  const { tagId } = req.params;
  const tag = await Tag.findByPk(tagId);

  if (!tag) throw new AppError("ERR_TAG_NOT_FOUND", 404);
  const beforeData = tag.toJSON();

  await tag.destroy();
  await CreateAuditLogService({
    req,
    action: "delete",
    resource: "tags",
    resourceId: tagId,
    beforeData
  });
  return res.status(200).json({ message: "deleted" });
};
