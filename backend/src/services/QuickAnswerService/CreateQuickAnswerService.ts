import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import QuickAnswer from "../../models/QuickAnswer";
import User from "../../models/User";

interface Request {
  shortcut: string;
  message: string;
  userId: number;
  userProfile: string;
  global?: boolean;
}

const CreateQuickAnswerService = async ({
  shortcut,
  message,
  userId,
  userProfile,
  global
}: Request): Promise<QuickAnswer> => {
  const isGlobal = userProfile === "admin" ? global !== false : false;
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
    userId,
    global: isGlobal
  });

  await quickAnswer.reload({
    include: [{ model: User, as: "user", attributes: ["id", "name"] }]
  });

  return quickAnswer;
};

export default CreateQuickAnswerService;
