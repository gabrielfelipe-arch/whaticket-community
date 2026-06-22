import axios from "axios";
import { Op } from "sequelize";
import GlpiTicketLink from "../../models/GlpiTicketLink";
import Ticket from "../../models/Ticket";
import { closeGlpiSession, glpiHeaders, initGlpiSession, normalizeGlpiError } from "./GlpiClientService";
import CreateGlpiLogService from "./GlpiLogService";
import { sendSatisfactionSurvey } from "../SatisfactionSurveyServices/SatisfactionSurveyService";
import { logger } from "../../utils/logger";

const SOLVED_STATUS = 5;
const INTERVAL_MS = 5 * 60 * 1000;

const MonitorGlpiSolvedTicketsService = async (): Promise<void> => {
  const links = await GlpiTicketLink.findAll({
    where: {
      status: { [Op.in]: ["created", "processing"] }
    },
    include: [Ticket],
    order: [["updatedAt", "ASC"]],
    limit: 50
  });

  if (!links.length) return;

  let session;
  try {
    session = await initGlpiSession({});

    for (const link of links) {
      try {
        const response = await axios.get(
          `${session.settings.apiUrl}/Ticket/${link.glpiTicketId}`,
          {
            headers: glpiHeaders(session),
            timeout: session.settings.timeoutMs
          }
        );
        const glpiStatus = Number(response.data?.status);
        const nextStatus = glpiStatus === SOLVED_STATUS ? "solved" : "processing";

        await link.update({
          status: nextStatus,
          rawResponse: JSON.stringify(response.data)
        });

        if (nextStatus === "solved" && link.ticket) {
          await sendSatisfactionSurvey(link.ticket, false);
        }
      } catch (err) {
        await CreateGlpiLogService({
          action: "sync_ticket_status",
          status: "error",
          message: "Falha ao consultar status do chamado GLPI.",
          ticketId: link.ticketId,
          error: normalizeGlpiError(err)
        });
      }
    }
  } finally {
    if (session) await closeGlpiSession(session);
  }
};

export const StartGlpiSolvedTicketsMonitor = (): void => {
  const run = async () => {
    try {
      await MonitorGlpiSolvedTicketsService();
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : err },
        "[GLPI STATUS] Failed to monitor solved tickets"
      );
    }
  };

  setInterval(run, INTERVAL_MS);
  setTimeout(run, 30000);
};

export default MonitorGlpiSolvedTicketsService;
