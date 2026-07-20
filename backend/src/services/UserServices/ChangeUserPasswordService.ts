import AppError from "../../errors/AppError";
import { initialPasswordFromCpf } from "../../helpers/UserAccessRules";
import User from "../../models/User";
import UserProfile from "../../models/UserProfile";
import { SerializeUser } from "../../helpers/SerializeUser";

interface Request {
  userId: string | number;
  currentPassword: string;
  newPassword: string;
}

const ChangeUserPasswordService = async ({
  userId,
  currentPassword,
  newPassword
}: Request): Promise<ReturnType<typeof SerializeUser>> => {
  const user = await User.findByPk(userId, {
    include: ["queues", "whatsapp", { model: UserProfile, as: "accessProfile" }]
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  if (!(await user.checkPassword(currentPassword))) {
    throw new AppError("Senha atual invalida.", 400);
  }

  if (!newPassword || newPassword.length < 8) {
    throw new AppError("A nova senha deve ter pelo menos 8 caracteres.", 400);
  }

  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
    throw new AppError("A nova senha deve conter letras, numeros e caracteres especiais.", 400);
  }

  if (newPassword === initialPasswordFromCpf(user.cpf)) {
    throw new AppError("A nova senha nao pode ser igual aos 6 primeiros digitos do CPF.", 400);
  }

  await user.update({
    password: newPassword,
    mustChangePassword: false
  });

  await user.reload({ include: ["queues", "whatsapp", { model: UserProfile, as: "accessProfile" }] });

  return SerializeUser(user);
};

export default ChangeUserPasswordService;
