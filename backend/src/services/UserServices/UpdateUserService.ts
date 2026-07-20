import * as Yup from "yup";
import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import { isMaskedSecret } from "../../helpers/MaskSecret";
import { normalizeProfile, serializeSpecialPermissions } from "../../helpers/ProfilePermissions";
import { SerializeUser } from "../../helpers/SerializeUser";
import { normalizeCpf } from "../../helpers/UserAccessRules";
import User from "../../models/User";
import UserProfile from "../../models/UserProfile";
import ShowUserService from "./ShowUserService";

interface UserData {
  email?: string;
  cpf?: string;
  birthDate?: string;
  jobTitle?: string;
  messageSignature?: string;
  password?: string;
  name?: string;
  profile?: string;
  profileId?: number;
  queueIds?: number[];
  whatsappId?: number;
  attendanceGreeting?: string;
  active?: boolean;
  glpiEnabled?: boolean;
  glpiUserToken?: string;
  specialPermissions?: Record<string, boolean>;
  workHours?: string;
}

interface Request {
  userData: UserData;
  userId: string | number;
}

interface Response {
  id: number;
  name: string;
  email: string;
  cpf: string;
  birthDate: string;
  jobTitle: string;
  messageSignature: string;
  profile: string;
}

const UpdateUserService = async ({
  userData,
  userId
}: Request): Promise<Response | undefined> => {
  const user = await ShowUserService(userId);

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().nullable().required("E-mail obrigatorio.").email(),
    attendanceGreeting: Yup.string().nullable(),
    birthDate: Yup.string().required("Data de nascimento obrigatoria."),
    jobTitle: Yup.string().required("Cargo obrigatorio.").min(2),
    messageSignature: Yup.string().required("Assinatura de mensagens obrigatoria.").min(2).max(50),
    cpf: Yup.string().test("Check-cpf-length", "CPF deve ter 11 digitos.", value =>
      value === undefined || value === null || value === "" || normalizeCpf(value).length === 11
    ),
    profile: Yup.string(),
    password: Yup.string()
  });

  const {
    email,
    cpf,
    birthDate,
    jobTitle,
    messageSignature,
    password,
    profile,
    profileId,
    name,
    queueIds = [],
    whatsappId,
    attendanceGreeting,
    active,
    glpiEnabled,
    glpiUserToken,
    specialPermissions,
    workHours
  } = userData;

  try {
    await schema.validate({ email, cpf, password, profile, name, attendanceGreeting, birthDate, jobTitle, messageSignature });
  } catch (err) {
    throw new AppError(err.message);
  }

  const normalizedCpf = cpf !== undefined ? normalizeCpf(cpf) : undefined;

  if (normalizedCpf) {
    const cpfExists = await User.findOne({
      where: {
        cpf: normalizedCpf,
        id: { [Op.ne]: user.id }
      }
    });

    if (cpfExists) {
      throw new AppError("Ja existe um usuario com este CPF.", 400);
    }
  }

  let nextProfile = profile !== undefined ? normalizeProfile(profile) : undefined;
  let nextProfileId = profileId === undefined ? undefined : profileId || null;

  if (profileId) {
    const accessProfile = await UserProfile.findByPk(profileId);
    if (!accessProfile || accessProfile.active === false) {
      throw new AppError("Perfil de acesso invalido.", 400);
    }
    nextProfile = normalizeProfile(accessProfile.baseRole);
    nextProfileId = accessProfile.id;
  }

  const updateData: Record<string, unknown> = {
    email: email === "" ? null : email,
    cpf: normalizedCpf,
    birthDate,
    jobTitle,
    messageSignature,
    password,
    profile: nextProfile,
    profileId: nextProfileId,
    name,
    whatsappId: whatsappId ? whatsappId : null,
    attendanceGreeting,
    active,
    workHours: workHours === "" ? null : workHours,
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

  await user.reload({ include: ["queues", "whatsapp", "accessProfile"] });

  return SerializeUser(user);
};

export default UpdateUserService;
