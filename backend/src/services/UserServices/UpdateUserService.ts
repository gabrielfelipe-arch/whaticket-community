import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { isMaskedSecret } from "../../helpers/MaskSecret";
import { normalizeProfile, serializeSpecialPermissions } from "../../helpers/ProfilePermissions";
import { SerializeUser } from "../../helpers/SerializeUser";
import ShowUserService from "./ShowUserService";

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  profile?: string;
  queueIds?: number[];
  whatsappId?: number;
  attendanceGreeting?: string;
  active?: boolean;
  glpiEnabled?: boolean;
  glpiUserToken?: string;
  specialPermissions?: Record<string, boolean>;
}

interface Request {
  userData: UserData;
  userId: string | number;
}

interface Response {
  id: number;
  name: string;
  email: string;
  profile: string;
}

const UpdateUserService = async ({
  userData,
  userId
}: Request): Promise<Response | undefined> => {
  const user = await ShowUserService(userId);

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().email(),
    profile: Yup.string(),
    password: Yup.string()
  });

  const {
    email,
    password,
    profile,
    name,
    queueIds = [],
    whatsappId,
    attendanceGreeting,
    active,
    glpiEnabled,
    glpiUserToken,
    specialPermissions
  } = userData;

  try {
    await schema.validate({ email, password, profile, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  const updateData: Record<string, unknown> = {
    email,
    password,
    profile: profile !== undefined ? normalizeProfile(profile) : undefined,
    name,
    whatsappId: whatsappId ? whatsappId : null,
    attendanceGreeting,
    active,
    glpiEnabled,
    specialPermissions: specialPermissions !== undefined
      ? serializeSpecialPermissions(specialPermissions)
      : undefined
  };

  if (glpiEnabled === false) {
    updateData.glpiUserToken = null;
  } else if (glpiUserToken !== undefined && !isMaskedSecret(glpiUserToken)) {
    updateData.glpiUserToken = String(glpiUserToken || "").trim() || null;
  }

  await user.update(updateData);

  await user.$set("queues", queueIds);

  await user.reload();

  return SerializeUser(user);
};

export default UpdateUserService;
