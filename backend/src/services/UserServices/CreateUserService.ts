import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { normalizeProfile, serializeSpecialPermissions } from "../../helpers/ProfilePermissions";
import { SerializeUser } from "../../helpers/SerializeUser";
import User from "../../models/User";

interface Request {
  email: string;
  password: string;
  name: string;
  queueIds?: number[];
  profile?: string;
  whatsappId?: number;
  attendanceGreeting?: string;
  operationalStatus?: string;
  active?: boolean;
  glpiEnabled?: boolean;
  glpiUserToken?: string;
  specialPermissions?: Record<string, boolean>;
}

interface Response {
  email: string;
  name: string;
  id: number;
  profile: string;
}

const CreateUserService = async ({
  email,
  password,
  name,
  queueIds = [],
  profile = "user",
  whatsappId,
  attendanceGreeting,
  operationalStatus = "offline",
  active = true,
  glpiEnabled = false,
  glpiUserToken,
  specialPermissions
}: Request): Promise<Response> => {
  const normalizedProfile = normalizeProfile(profile);

  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    email: Yup.string()
      .email()
      .required()
      .test(
        "Check-email",
        "An user with this email already exists.",
        async value => {
          if (!value) return false;
          const emailExists = await User.findOne({
            where: { email: value }
          });
          return !emailExists;
        }
      ),
    password: Yup.string().required().min(5)
  });

  try {
    await schema.validate({ email, password, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  const user = await User.create(
    {
      email,
      password,
      name,
      profile: normalizedProfile,
      whatsappId: whatsappId ? whatsappId : null,
      attendanceGreeting,
      operationalStatus,
      active,
      glpiEnabled,
      glpiUserToken: glpiEnabled ? String(glpiUserToken || "").trim() || null : null,
      specialPermissions: serializeSpecialPermissions(specialPermissions)
    },
    { include: ["queues", "whatsapp"] }
  );

  await user.$set("queues", queueIds);

  await user.reload();

  return SerializeUser(user);
};

export default CreateUserService;
