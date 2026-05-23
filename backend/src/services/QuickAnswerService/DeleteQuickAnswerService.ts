import QuickAnswer from "../../models/QuickAnswer";
import AppError from "../../errors/AppError";

const DeleteQuickAnswerService = async (
  id: string,
  userId: number,
  userProfile: string
): Promise<void> => {
  const quickAnswer = await QuickAnswer.findOne({
    where: { id }
  });

  if (!quickAnswer) {
    throw new AppError("ERR_NO_QUICK_ANSWER_FOUND", 404);
  }

  const canDelete =
    userProfile === "admin" ||
    (!quickAnswer.global && Number(quickAnswer.userId) === Number(userId));

  if (!canDelete) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await quickAnswer.destroy();
};

export default DeleteQuickAnswerService;
