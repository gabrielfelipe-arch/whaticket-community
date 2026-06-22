import { Op } from "sequelize";
import { getIO } from "../../libs/socket";
import { SerializeUser } from "../../helpers/SerializeUser";
import Setting from "../../models/Setting";
import User from "../../models/User";
import { logger } from "../../utils/logger";
import { updateUserOperationalStatus } from "../QueueService/QueueDistributionService";

const CHECK_INTERVAL_MS = 60000;

const getSettingsMap = async (): Promise<Record<string, string>> => {
  const settings = await Setting.findAll({
    where: {
      key: [
        "autoLogoutEnabled",
        "autoLogoutMinutes",
        "inactivityAppliesToAdmins"
      ]
    }
  });

  return settings.reduce<Record<string, string>>((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
};

const MarkInactiveUsersOffline = async (): Promise<void> => {
  const settings = await getSettingsMap();
  const autoLogoutEnabled = settings.autoLogoutEnabled === "true";
  const autoLogoutMinutes = Number(settings.autoLogoutMinutes || 0);

  if (!autoLogoutEnabled || autoLogoutMinutes <= 0) return;

  const threshold = new Date(Date.now() - autoLogoutMinutes * 60 * 1000);
  const includeAdmins = settings.inactivityAppliesToAdmins === "true";

  const users = await User.findAll({
    where: {
      active: true,
      operationalStatus: { [Op.in]: ["online", "away"] },
      ...(includeAdmins ? {} : { profile: { [Op.ne]: "admin" } }),
      [Op.or]: [
        { lastActivityAt: { [Op.lte]: threshold } },
        {
          lastActivityAt: null,
          lastStatusChangeAt: { [Op.lte]: threshold }
        }
      ]
    }
  });

  if (!users.length) return;

  const io = getIO();

  for (const user of users) {
    const updatedUser = await updateUserOperationalStatus({
      userId: user.id,
      status: "offline",
      reason: "auto_logout"
    });

    io.emit("user", {
      action: "update",
      user: SerializeUser(updatedUser)
    });
  }
};

export const StartUserInactivityMonitor = (): void => {
  setInterval(() => {
    MarkInactiveUsersOffline().catch(err =>
      logger.error({ err }, "Error running user inactivity monitor")
    );
  }, CHECK_INTERVAL_MS);
};
