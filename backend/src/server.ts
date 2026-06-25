import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { initRedis } from "./libs/redisStore";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { StartCampaignDispatcher } from "./services/CampaignServices/DispatchCampaignsService";
import { StartAiAutoClose } from "./services/AiServices/AiAutoCloseService";
import { StartUraAutoClose } from "./services/UraServices/UraAutoCloseService";
import { StartUserInactivityMonitor } from "./services/UserServices/UserInactivityMonitorService";
import { StartGlpiSolvedTicketsMonitor } from "./services/GlpiServices/MonitorGlpiSolvedTicketsService";
import { StartAuditLogRetention } from "./services/AuditLogServices/AuditLogRetentionService";

const server = app.listen(process.env.PORT, () => {
  logger.info(`Server started on port: ${process.env.PORT}`);
});

initIO(server);
initRedis();
StartAllWhatsAppsSessions();
StartCampaignDispatcher();
StartAiAutoClose();
StartUraAutoClose();
StartUserInactivityMonitor();
StartGlpiSolvedTicketsMonitor();
StartAuditLogRetention();
gracefulShutdown(server);

process.on("uncaughtException", err => {
  logger.error({ info: "Global uncaught exception", err });
});

process.on("unhandledRejection", err => {
  if (err) logger.error({ info: "Global unhandled rejection", err });
});
