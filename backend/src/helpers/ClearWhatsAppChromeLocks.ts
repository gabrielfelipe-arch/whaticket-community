import { existsSync, rmSync } from "fs";
import { join } from "path";
import { logger } from "../utils/logger";

const chromeLockFiles = ["SingletonLock", "SingletonSocket", "SingletonCookie"];

const ClearWhatsAppChromeLocks = (whatsappId: number): void => {
  const sessionPath = join(process.cwd(), ".wwebjs_auth", `session-bd_${whatsappId}`);

  try {
    chromeLockFiles.forEach(file => {
      const lockPath = join(sessionPath, file);
      if (existsSync(lockPath)) {
        rmSync(lockPath, { force: true, recursive: true });
      }
    });
  } catch (err) {
    logger.warn({ err, whatsappId, sessionPath }, "Could not clear whatsapp chrome locks");
  }
};

export default ClearWhatsAppChromeLocks;
