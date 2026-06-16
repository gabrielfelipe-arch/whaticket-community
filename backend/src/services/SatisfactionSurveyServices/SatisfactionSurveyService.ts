import { Op } from "sequelize";

import Ticket from "../../models/Ticket";
import SatisfactionSurvey from "../../models/SatisfactionSurvey";
import SatisfactionSurveyResponse from "../../models/SatisfactionSurveyResponse";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import FormatTicketTemplate from "../../helpers/FormatTicketTemplate";

const scaleHelp = (scaleType: string): string => {
  if (scaleType === "1_10") return "Responda com uma nota de 1 a 10.";
  return "Responda com uma nota de 1 a 5.";
};

const maxRating = (scaleType: string): number => (scaleType === "1_10" ? 10 : 5);

const DEFAULT_FEEDBACK_QUESTION =
  "Se quiser, deixe tambem um elogio, sugestao ou reclamacao sobre o atendimento. Voce pode responder em uma frase.";

const isFeedbackSkipAnswer = (answer = ""): boolean => {
  const normalized = String(answer || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /^(nao|n|nao quero|sem comentario|sem comentarios|nada|nao obrigado|nao obrigada)$/.test(normalized);
};

const classifyFeedback = (answer = ""): string => {
  const normalized = String(answer || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\b(parabens|otimo|otima|excelente|bom|boa|gostei|perfeito|maravilhoso|atencioso|rapido|eficiente)\b/.test(normalized)) {
    return "elogio";
  }

  if (/\b(sugiro|sugestao|poderia|deveria|melhorar|melhoria|recomendo|recomendacao)\b/.test(normalized)) {
    return "sugestao";
  }

  if (/\b(reclamacao|ruim|pessimo|pessima|demorou|atraso|problema|insatisfeito|insatisfeita|nao gostei)\b/.test(normalized)) {
    return "reclamacao";
  }

  return "outro";
};

const feedbackStillOpen = (ticket: Ticket): boolean =>
  !!ticket.satisfactionFeedbackPendingAt &&
  !ticket.satisfactionFeedbackClosedAt &&
  !!ticket.satisfactionFeedbackExpiresAt &&
  new Date(ticket.satisfactionFeedbackExpiresAt).getTime() >= Date.now();

const closeExpiredFeedback = async (ticket: Ticket): Promise<boolean> => {
  if (
    ticket.satisfactionFeedbackPendingAt &&
    !ticket.satisfactionFeedbackClosedAt &&
    ticket.satisfactionFeedbackExpiresAt &&
    new Date(ticket.satisfactionFeedbackExpiresAt).getTime() < Date.now()
  ) {
    await ticket.update({ satisfactionFeedbackClosedAt: new Date() });
    return true;
  }

  return false;
};

export const parseSatisfactionRating = (
  answer: string,
  scaleType: string
): number | null => {
  const value = String(answer || "").trim();
  const numeric = value.match(/\d+/)?.[0];

  if (!numeric) return null;

  const rating = Number(numeric);
  return rating >= 1 && rating <= maxRating(scaleType) ? rating : null;
};

export const getActiveSatisfactionSurvey = async (): Promise<SatisfactionSurvey | null> =>
  SatisfactionSurvey.findOne({
    where: {
      active: true,
      sendMode: { [Op.ne]: "disabled" }
    },
    order: [["id", "DESC"]]
  });

export const sendSatisfactionSurvey = async (
  ticket: Ticket,
  force = false
): Promise<void> => {
  const survey = await getActiveSatisfactionSurvey();
  if (!survey) return;
  if (survey.sendMode === "disabled") return;
  if (!force && survey.sendMode !== "always") return;
  if (ticket.isGroup || ticket.satisfactionSurveySentAt) return;

  const body = await buildSatisfactionSurveyMessage(ticket, survey);
  await SendWhatsAppMessage({ body, ticket });
  await markSatisfactionSurveySent(ticket, survey);
};

export const buildSatisfactionSurveyMessage = async (
  ticket: Ticket,
  survey: SatisfactionSurvey
): Promise<string> =>
  FormatTicketTemplate(
    [survey.question, scaleHelp(survey.scaleType)].filter(Boolean).join("\n\n"),
    ticket
  );

export const markSatisfactionSurveySent = async (
  ticket: Ticket,
  survey: SatisfactionSurvey
): Promise<void> => {
  await ticket.update({
    satisfactionSurveyId: survey.id,
    satisfactionSurveySentAt: new Date(),
    satisfactionSurveyAnsweredAt: null
  });
};

export const shouldUseTicketForSatisfactionResponse = async (
  ticket: Ticket,
  answer?: string
): Promise<boolean> => {
  if (
    !answer ||
    !ticket.satisfactionSurveyId ||
    !ticket.satisfactionSurveySentAt ||
    ticket.status !== "closed"
  ) {
    return false;
  }

  if (feedbackStillOpen(ticket)) return true;
  await closeExpiredFeedback(ticket);
  if (ticket.satisfactionSurveyAnsweredAt) return false;

  const survey = await SatisfactionSurvey.findByPk(ticket.satisfactionSurveyId);
  if (!survey) return false;

  return parseSatisfactionRating(answer, survey.scaleType) !== null;
};

export const tryRegisterSatisfactionResponse = async (
  ticket: Ticket,
  answer: string
): Promise<boolean> => {
  if (!ticket.satisfactionSurveyId || !ticket.satisfactionSurveySentAt || ticket.satisfactionSurveyAnsweredAt) {
    return false;
  }

  const survey = await SatisfactionSurvey.findByPk(ticket.satisfactionSurveyId);
  if (!survey) return false;

  if (feedbackStillOpen(ticket)) {
    const response = await SatisfactionSurveyResponse.findOne({
      where: {
        satisfactionSurveyId: survey.id,
        ticketId: ticket.id
      },
      order: [["id", "DESC"]]
    });

    await ticket.update({ satisfactionFeedbackClosedAt: new Date() });

    if (!isFeedbackSkipAnswer(answer) && response) {
      await response.update({
        feedbackText: answer,
        feedbackType: classifyFeedback(answer)
      });
    }

    if (survey.thankYouMessage) {
      await SendWhatsAppMessage({
        body: await FormatTicketTemplate(survey.thankYouMessage, ticket),
        ticket
      });
    }

    return true;
  }

  if (await closeExpiredFeedback(ticket)) return false;
  if (ticket.satisfactionSurveyAnsweredAt) return false;

  const rating = parseSatisfactionRating(answer, survey.scaleType);
  if (!rating) return false;

  await SatisfactionSurveyResponse.create({
    satisfactionSurveyId: survey.id,
    ticketId: ticket.id,
    contactId: ticket.contactId,
    userId: ticket.userId,
    queueId: ticket.queueId,
    categoryId: ticket.categoryId,
    closingReasonId: ticket.closingReasonId,
    rating,
    rawAnswer: answer
  });

  const shouldCollectFeedback = survey.collectFeedbackText && survey.sendMode !== "disabled";
  if (shouldCollectFeedback) {
    const timeoutMinutes = Math.max(Number(survey.feedbackTimeoutMinutes || 60), 1);
    const now = new Date();
    await ticket.update({
      satisfactionSurveyAnsweredAt: now,
      satisfactionFeedbackPendingAt: now,
      satisfactionFeedbackExpiresAt: new Date(now.getTime() + timeoutMinutes * 60000),
      satisfactionFeedbackClosedAt: null
    });

    await SendWhatsAppMessage({
      body: await FormatTicketTemplate(survey.feedbackQuestion || DEFAULT_FEEDBACK_QUESTION, ticket),
      ticket
    });

    return true;
  }

  await ticket.update({ satisfactionSurveyAnsweredAt: new Date() });

  if (survey.thankYouMessage) {
    await SendWhatsAppMessage({
      body: await FormatTicketTemplate(survey.thankYouMessage, ticket),
      ticket
    });
  }

  return true;
};
