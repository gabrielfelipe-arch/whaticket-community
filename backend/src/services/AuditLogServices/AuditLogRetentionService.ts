import { Op } from "sequelize";

import AuditLog from "../../models/AuditLog";
import { logger } from "../../utils/logger";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
let interval: NodeJS.Timeout | null = null;

export const CleanupOldAuditLogs = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  return AuditLog.destroy({
    where: {
      createdAt: { [Op.lt]: cutoff }
    }
  });
};

export const StartAuditLogRetention = (): void => {
  CleanupOldAuditLogs()
    .then(deleted => {
      if (deleted) logger.info(`Audit retention removed ${deleted} old log(s).`);
    })
    .catch(err => logger.warn(`Audit retention failed: ${err}`));

  if (interval) clearInterval(interval);
  interval = setInterval(() => {
    CleanupOldAuditLogs()
      .then(deleted => {
        if (deleted) logger.info(`Audit retention removed ${deleted} old log(s).`);
      })
      .catch(err => logger.warn(`Audit retention failed: ${err}`));
  }, 6 * 60 * 60 * 1000);
};
