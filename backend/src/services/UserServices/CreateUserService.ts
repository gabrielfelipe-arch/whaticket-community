import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { normalizeProfile, serializeSpecialPermissions } from "../../helpers/ProfilePermissions";
import { SerializeUser } from "../../helpers/SerializeUser";
import { initialPasswordFromCpf, normalizeCpf } from "../../helpers/UserAccessRules";
import User from "../../models/User";
import UserProfile from "../../models/UserProfile";

interface Request {
  email?: string;
  password?: string;
  cpf?: string;
  birthDate?: string;
  jobTitle?: string;
  messageSignature?: string;
  name: string;
  queueIds?: number[];
  profile?: string;
  profileId?: number;
  whatsappId?: number;
  attendanceGreeting?: string;
  operationalStatus?: string;
  active?: boolean;
  glpiEnabled?: boolean;
  glpiUserToken?: string;
  specialPermissions?: Record<string, boolean>;
  workHours?: string;
}

interface Response {
  email: string;
  name: string;
  id: number;
  cpf: string;
  birthDate: string;
  jobTitle: string;
  messageSignature: string;
  profile: string;
}

const CreateUserService = async ({
  email,
  cpf,
  birthDate,
  jobTitle,
  messageSignature,
  name,
  queueIds = [],
  profile = "user",
  profileId,
  whatsappId,
  attendanceGreeting,
  operationalStatus = "offline",
  active = true,
  glpiEnabled = false,
  glpiUserToken,
  specialPermissions,
  workHours
}: Request): Promise<Response> => {
  let normalizedProfile = normalizeProfile(profile);
  let selectedProfileId = profileId;

  if (profileId) {
    const accessProfile = await UserProfile.findByPk(profileId);
    if (!accessProfile || accessProfile.active === false) {
      throw new AppError("Perfil de acesso invalido.", 400);
    }
    normalizedProfile = normalizeProfile(accessProfile.baseRole);
    selectedProfileId = accessProfile.id;
  } else {
    const defaultProfileNameByRole: Record<string, string> = {
      admin: "Administrador",
      supervisor: "Supervisor",
      user: "Atendente"
    };
    const accessProfile = await UserProfile.findOne({
      where: {
        name: defaultProfileNameByRole[normalizedProfile],
        active: true
      }
    });
    selectedProfileId = accessProfile?.id;
  }

  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    attendanceGreeting: Yup.string().nullable(),
    birthDate: Yup.string().required("Data de nascimento obrigatoria."),
    jobTitle: Yup.string().required("Cargo obrigatorio.").min(2),
    messageSignature: Yup.string().required("Assinatura de mensagens obrigatoria.").min(2).max(50),
    cpf: Yup.string()
      .required("CPF obrigatorio.")
      .test("Check-cpf-length", "CPF deve ter 11 digitos.", value => normalizeCpf(value).length === 11)
      .test("Check-cpf", "Ja existe um usuario com este CPF.", async value => {
        const normalizedCpf = normalizeCpf(value);
        if (normalizedCpf.length !== 11) return false;
        const cpfExists = await User.findOne({ where: { cpf: normalizedCpf } });
        return !cpfExists;
      }),
    email: Yup.string()
      .nullable()
      .required("E-mail obrigatorio.")
      .email()
      .test(
        "Check-email",
        "An user with this email already exists.",
        async value => {
          if (!value) return true;
          const emailExists = await User.findOne({
            where: { email: value }
          });
          return !emailExists;
        }
      )
  });

  try {
    await schema.validate({ email, cpf, name, attendanceGreeting, birthDate, jobTitle, messageSignature });
  } catch (err) {
    throw new AppError(err.message);
  }

  const normalizedCpf = normalizeCpf(cpf);
  const initialPassword = initialPasswordFromCpf(normalizedCpf);

  const user = await User.create(
    {
      email: email || null,
      cpf: normalizedCpf,
      birthDate,
      jobTitle,
      messageSignature,
      password: initialPassword,
      mustChangePassword: true,
      workHours: workHours || null,
      name,
      profile: normalizedProfile,
      profileId: selectedProfileId || null,
      whatsappId: whatsappId ? whatsappId : null,
      attendanceGreeting,
      operationalStatus,
      active,
      glpiEnabled,
      glpiUserToken: glpiEnabled ? String(glpiUserToken || "").trim() || null : null,
      specialPermissions: serializeSpecialPermissions(specialPermissions)
    },
    { include: ["queues", "whatsapp", "accessProfile"] }
  );

  await user.$set("queues", queueIds);

  await user.reload({ include: ["queues", "whatsapp", "accessProfile"] });

  return SerializeUser(user);
};

export default CreateUserService;
