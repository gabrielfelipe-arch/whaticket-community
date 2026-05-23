import QuickAnswer from "../../models/QuickAnswer";
import AppError from "../../errors/AppError";
import User from "../../models/User";

interface QuickAnswerData {
  shortcut?: string;
  message?: string;
  global?: boolean;
}

interface Request {
  quickAnswerData: QuickAnswerData;
  quickAnswerId: string;
  userId: number;
  userProfile: string;
}

const UpdateQuickAnswerService = async ({
  quickAnswerData,
  quickAnswerId,
  userId,
  userProfile
}: Request): Promise<QuickAnswer> => {
  const { shortcut, message, global } = quickAnswerData;

  const quickAnswer = await QuickAnswer.findOne({
    where: { id: quickAnswerId },
    attributes: ["id", "shortcut", "message", "global", "userId"]
  });

  if (!quickAnswer) {
    throw new AppError("ERR_NO_QUICK_ANSWERS_FOUND", 404);
  }

  const canUpdate =
    userProfile === "admin" ||
    (!quickAnswer.global && Number(quickAnswer.userId) === Number(userId));

  if (!canUpdate) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await quickAnswer.update({
    shortcut,
    message,
    global: userProfile === "admin" && global !== undefined ? global : quickAnswer.global
  });

  await quickAnswer.reload({
    attributes: ["id", "shortcut", "message", "global", "userId"],
    include: [{ model: User, as: "user", attributes: ["id", "name"] }]
  });

  return quickAnswer;
};

export default UpdateQuickAnswerService;
