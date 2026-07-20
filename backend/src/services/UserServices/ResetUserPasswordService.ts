import { SerializeUser } from "../../helpers/SerializeUser";
import { initialPasswordFromCpf } from "../../helpers/UserAccessRules";
import User from "../../models/User";
import UserProfile from "../../models/UserProfile";
import AppError from "../../errors/AppError";

interface Request {
  userId: string | number;
}

const ResetUserPasswordService = async ({ userId }: Request): Promise<ReturnType<typeof SerializeUser>> => {
  const user = await User.findByPk(userId, {
    include: ["queues", "whatsapp", { model: UserProfile, as: "accessProfile" }]
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  const initialPassword = initialPasswordFromCpf(user.cpf);

  await user.update({
    password: initialPassword,
    mustChangePassword: true,
    tokenVersion: (user.tokenVersion || 0) + 1
  });

  await user.reload({ include: ["queues", "whatsapp", { model: UserProfile, as: "accessProfile" }] });

  return SerializeUser(user);
};

export default ResetUserPasswordService;
