import QuickAnswer from "../../models/QuickAnswer";
import AppError from "../../errors/AppError";

const ShowQuickAnswerService = async (
  id: string,
  userId: number,
  userProfile: string
): Promise<QuickAnswer> => {
  const quickAnswer = await QuickAnswer.findByPk(id);

  if (!quickAnswer) {
    throw new AppError("ERR_NO_QUICK_ANSWERS_FOUND", 404);
  }

  const canShow =
    userProfile === "admin" ||
    quickAnswer.global ||
    Number(quickAnswer.userId) === Number(userId);

  if (!canShow) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  return quickAnswer;
};

export default ShowQuickAnswerService;
