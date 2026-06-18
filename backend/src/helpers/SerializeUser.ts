import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import { maskSecret } from "./MaskSecret";

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  active: boolean;
  glpiEnabled: boolean;
  glpiUserToken: string;
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
    profile: user.profile,
    active: user.active,
    glpiEnabled: user.glpiEnabled,
    glpiUserToken: maskSecret(user.glpiUserToken),
    attendanceGreeting: user.attendanceGreeting,
    operationalStatus: user.operationalStatus,
    lastActivityAt: user.lastActivityAt,
    lastStatusChangeAt: user.lastStatusChangeAt,
    statusReason: user.statusReason,
    queues: user.queues,
    whatsapp: user.whatsapp
  };
};
