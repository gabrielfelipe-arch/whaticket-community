import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListQuickAnswerService from "../services/QuickAnswerService/ListQuickAnswerService";
import CreateQuickAnswerService from "../services/QuickAnswerService/CreateQuickAnswerService";
import ShowQuickAnswerService from "../services/QuickAnswerService/ShowQuickAnswerService";
import UpdateQuickAnswerService from "../services/QuickAnswerService/UpdateQuickAnswerService";
import DeleteQuickAnswerService from "../services/QuickAnswerService/DeleteQuickAnswerService";

import AppError from "../errors/AppError";
import { requestUserHasPermission } from "../helpers/ProfilePermissions";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

interface QuickAnswerData {
  shortcut: string;
  message: string;
  global?: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
}

const toBoolean = (value: unknown): boolean =>
  value === true || value === "true" || value === "1" || value === 1;

const normalizeQuickAnswerBody = (body: Record<string, any>): Partial<QuickAnswerData> => {
  const data = { ...body };
  if (Object.prototype.hasOwnProperty.call(data, "global")) {
    data.global = toBoolean(data.global);
  }
  return data;
};

const mediaDataFromRequest = (req: Request) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return {};

  return {
    mediaUrl: file.filename,
    mediaType: file.mimetype,
    mediaName: file.originalname
  };
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const { quickAnswers, count, hasMore } = await ListQuickAnswerService({
    searchParam,
    pageNumber,
    userId: Number(req.user.id),
    userProfile: req.user.profile
  });

  return res.json({ quickAnswers, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newQuickAnswer: QuickAnswerData = {
    ...normalizeQuickAnswerBody(req.body),
    ...mediaDataFromRequest(req)
  } as QuickAnswerData;

  const QuickAnswerSchema = Yup.object().shape({
    shortcut: Yup.string().required(),
    message: Yup.string().required(),
    global: Yup.boolean()
  });

  try {
    await QuickAnswerSchema.validate(newQuickAnswer);
  } catch (err) {
    throw new AppError(err.message);
  }

  const canPublishGlobal = await requestUserHasPermission(
    req.user.id,
    "quickAnswers.publish_global"
  );

  const quickAnswer = await CreateQuickAnswerService({
    ...newQuickAnswer,
    userId: Number(req.user.id),
    userProfile: req.user.profile,
    canPublishGlobal
  });

  const io = getIO();
  io.emit("quickAnswer", {
    action: "create",
    quickAnswer
  });

  return res.status(200).json(quickAnswer);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { quickAnswerId } = req.params;

  const quickAnswer = await ShowQuickAnswerService(
    quickAnswerId,
    Number(req.user.id),
    req.user.profile
  );

  return res.status(200).json(quickAnswer);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const quickAnswerData: QuickAnswerData = {
    ...normalizeQuickAnswerBody(req.body),
    ...mediaDataFromRequest(req)
  } as QuickAnswerData;

  const schema = Yup.object().shape({
    shortcut: Yup.string(),
    message: Yup.string(),
    global: Yup.boolean()
  });

  try {
    await schema.validate(quickAnswerData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { quickAnswerId } = req.params;
  const canPublishGlobal = await requestUserHasPermission(
    req.user.id,
    "quickAnswers.publish_global"
  );

  const quickAnswer = await UpdateQuickAnswerService({
    quickAnswerData,
    quickAnswerId,
    userId: Number(req.user.id),
    userProfile: req.user.profile,
    canPublishGlobal
  });

  const io = getIO();
  io.emit("quickAnswer", {
    action: "update",
    quickAnswer
  });

  return res.status(200).json(quickAnswer);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { quickAnswerId } = req.params;

  await DeleteQuickAnswerService(
    quickAnswerId,
    Number(req.user.id),
    req.user.profile
  );

  const io = getIO();
  io.emit("quickAnswer", {
    action: "delete",
    quickAnswerId
  });

  return res.status(200).json({ message: "Quick Answer deleted" });
};
