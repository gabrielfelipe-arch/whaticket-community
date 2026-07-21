import QuickAnswer from "../../models/QuickAnswer";
import AppError from "../../errors/AppError";
import User from "../../models/User";
import ResolveQuickAnswerVisibility from "./ResolveQuickAnswerVisibility";

interface QuickAnswerData {
  shortcut?: string;
  message?: string;
  global?: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
}

interface Request {
  quickAnswerData: QuickAnswerData;
  quickAnswerId: string;
  userId: number;
  userProfile: string;
  canPublishGlobal?: boolean;
}

const UpdateQuickAnswerService = async ({
  quickAnswerData,
  quickAnswerId,
  userId,
  userProfile,
  canPublishGlobal = false
}: Request): Promise<QuickAnswer> => {
  const { shortcut, message, global, mediaUrl, mediaType, mediaName } = quickAnswerData;

  const quickAnswer = await QuickAnswer.findOne({
    where: { id: quickAnswerId },
    attributes: ["id", "shortcut", "message", "global", "userId", "mediaUrl", "mediaType", "mediaName"]
  });

  if (!quickAnswer) {
    throw new AppError("ERR_NO_QUICK_ANSWERS_FOUND", 404);
  }

  const canUpdate =
    userProfile === "admin" ||
    Number(quickAnswer.userId) === Number(userId);

  if (!canUpdate) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const requestedGlobal = ResolveQuickAnswerVisibility({
    requestedGlobal: global,
    currentGlobal: quickAnswer.global,
    canPublishGlobal
  });

  await quickAnswer.update({
    shortcut,
    message,
    mediaUrl,
    mediaType,
    mediaName,
    global: requestedGlobal
  });

  await quickAnswer.reload({
    attributes: ["id", "shortcut", "message", "global", "userId", "mediaUrl", "mediaType", "mediaName"],
    include: [{ model: User, as: "user", attributes: ["id", "name"] }]
  });

  return quickAnswer;
};

export default UpdateQuickAnswerService;
