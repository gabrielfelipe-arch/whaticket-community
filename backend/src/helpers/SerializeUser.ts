import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import { maskSecret } from "./MaskSecret";
import {
  getEffectivePermissions,
  parseSpecialPermissions
} from "./ProfilePermissions";

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
  profileId: number;
  profileName: string;
  permissions: Record<string, boolean>;
  active: boolean;
  glpiEnabled: boolean;
  glpiUserToken: string;
  specialPermissions: Record<string, boolean>;
  attendanceGreeting: string;
  operationalStatus: string;
  lastActivityAt: Date;
  lastStatusChangeAt: Date;
  statusReason: string;
  queues: Queue[];
  whatsapp: Whatsapp;
}

export const SerializeUser = (user: User): SerializedUser => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    cpf: user.cpf,
    birthDate: user.birthDate,
    jobTitle: user.jobTitle,
    messageSignature: user.messageSignature,
    mustChangePassword: user.mustChangePassword,
    workHours: user.workHours,
    profile: user.profile,
    profileId: user.profileId,
    profileName: user.accessProfile?.name,
    permissions: getEffectivePermissions(user),
    active: user.active,
    glpiEnabled: user.glpiEnabled,
    glpiUserToken: maskSecret(user.glpiUserToken),
    specialPermissions: parseSpecialPermissions(user.specialPermissions),
    attendanceGreeting: user.attendanceGreeting,
    operationalStatus: user.operationalStatus,
    lastActivityAt: user.lastActivityAt,
    lastStatusChangeAt: user.lastStatusChangeAt,
    statusReason: user.statusReason,
    queues: user.queues,
    whatsapp: user.whatsapp
  };
};
