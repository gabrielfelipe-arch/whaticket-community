import User from "../../models/User";
import AppError from "../../errors/AppError";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import { SerializeUser } from "../../helpers/SerializeUser";
import Queue from "../../models/Queue";
import UserProfile from "../../models/UserProfile";
import { updateUserOperationalStatus } from "../QueueService/QueueDistributionService";
import { assertUserCanAccessNow, normalizeCpf } from "../../helpers/UserAccessRules";

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  cpf: string;
  birthDate: string;
  jobTitle: string;
  messageSignature: string;
  mustChangePassword: boolean;
  workHours: string;
  profile: string;
  profileId?: number;
  profileName?: string;
  permissions?: Record<string, boolean>;
  queues: Queue[];
}

interface Request {
  name?: string;
  email?: string;
  cpf?: string;
  login?: string;
  password: string;
}

interface Response {
  serializedUser: SerializedUser;
  token: string;
  refreshToken: string;
}

const AuthUserService = async ({
  cpf,
  email,
  login,
  password
}: Request): Promise<Response> => {
  const identifier = String(cpf || login || email || "").trim();
  const normalizedCpf = normalizeCpf(identifier);

  if (normalizedCpf.length !== 11) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  const user = await User.findOne({
    where: { cpf: normalizedCpf },
    include: ["queues", { model: UserProfile, as: "accessProfile" }]
  });

  if (!user) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  if (user.active === false) {
    throw new AppError("Usuario inativo. Procure o administrador do sistema.", 403);
  }

  assertUserCanAccessNow(user);

  if (!(await user.checkPassword(password))) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  await updateUserOperationalStatus({
    userId: user.id,
    status: "online",
    reason: "login"
  });
  await user.reload({ include: ["queues", { model: UserProfile, as: "accessProfile" }] });

  const token = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  const serializedUser = SerializeUser(user);

  return {
    serializedUser,
    token,
    refreshToken
  };
};

export default AuthUserService;
