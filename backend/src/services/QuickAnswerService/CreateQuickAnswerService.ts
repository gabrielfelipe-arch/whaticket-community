import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import QuickAnswer from "../../models/QuickAnswer";
import User from "../../models/User";
import ResolveQuickAnswerVisibility from "./ResolveQuickAnswerVisibility";

interface Request {
  shortcut: string;
  message: string;
  userId: number;
  userProfile: string;
  canPublishGlobal?: boolean;
  global?: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
}

const CreateQuickAnswerService = async ({
  shortcut,
  message,
  userId,
  userProfile,
  canPublishGlobal = false,
  global,
  mediaUrl,
  mediaType,
  mediaName
}: Request): Promise<QuickAnswer> => {
  const isGlobal = ResolveQuickAnswerVisibility({
    requestedGlobal: global,
    canPublishGlobal
  });
  const nameExists = await QuickAnswer.findOne({
    where: {
      shortcut,
      [Op.or]: isGlobal ? [{ global: true }] : [{ global: false, userId }]
    }
  });

  if (nameExists) {
    throw new AppError("ERR__SHORTCUT_DUPLICATED");
  }

  const quickAnswer = await QuickAnswer.create({
    shortcut,
    message,
    mediaUrl,
    mediaType,
    mediaName,
    userId,
    global: isGlobal
  });

  await quickAnswer.reload({
    include: [{ model: User, as: "user", attributes: ["id", "name"] }]
  });

  return quickAnswer;
};

export default CreateQuickAnswerService;
