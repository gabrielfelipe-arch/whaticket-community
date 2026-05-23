import { existsSync, rmSync } from "fs";
import { join } from "path";
import { logger } from "../utils/logger";

const ClearWhatsAppLocalAuth = (whatsappId: number): void => {
  const sessionPath = join(process.cwd(), ".wwebjs_auth", `session-bd_${whatsappId}`);

  try {
    if (existsSync(sessionPath)) {
      rmSync(sessionPath, { recursive: true, force: true });
    }
  } catch (err) {
    logger.warn({ err, whatsappId, sessionPath }, "Could not clear whatsapp local auth");
  }
};

export default ClearWhatsAppLocalAuth;
