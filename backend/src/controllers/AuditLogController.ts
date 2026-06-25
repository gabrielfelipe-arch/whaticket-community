import { Request, Response } from "express";

import AppError from "../errors/AppError";
import { isAdminOrSupervisorProfile } from "../helpers/ProfilePermissions";
import AuditLog from "../models/AuditLog";
import { CleanupOldAuditLogs } from "../services/AuditLogServices/AuditLogRetentionService";

const actionLabels: Record<string, string> = {
  create: "criou",
  update: "alterou",
  delete: "excluiu"
};

const resourceLabels: Record<string, string> = {
  ticketCategories: "uma categoria",
  closingReasons: "um motivo de encerramento",
  satisfactionSurveys: "uma pesquisa de satisfacao",
  quickAnswers: "uma mensagem rapida",
  tags: "uma etiqueta",
  uraFlows: "um fluxo da URA",
  uraOptions: "uma opcao da URA",
  aiSettings: "uma configuracao de IA",
  knowledgeBase: "um artigo da base de conhecimento",
  aiCalendarConnections: "uma conexao de agenda",
  qualificationForms: "um formulario",
  qualificationFormQuestions: "uma pergunta do formulario",
  qualificationFormResponses: "uma resposta de formulario",
  qualificationFormAnswers: "uma resposta coletada",
  settings: "uma configuracao"
};

const parseData = (value?: string | null): Record<string, any> => {
  try {
    return value ? JSON.parse(value) : {};
  } catch (err) {
    return {};
  }
};

const getRecordName = (log: AuditLog): string => {
  const beforeData = parseData(log.beforeData);
  const afterData = parseData(log.afterData);
  return String(
    afterData.name ||
    afterData.title ||
    afterData.label ||
    beforeData.name ||
    beforeData.title ||
    beforeData.label ||
    log.resourceId ||
    ""
  ).trim();
};

const buildDisplayMessage = (log: AuditLog): string => {
  const userName = log.userName || "Alguem";
  const action = actionLabels[log.action] || "alterou";
  const resource = resourceLabels[log.resource] || "um registro";
  const recordName = getRecordName(log);
  return recordName
    ? `${userName} ${action} ${resource}: ${recordName}.`
    : `${userName} ${action} ${resource}.`;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (!isAdminOrSupervisorProfile(req.user.profile)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await CleanupOldAuditLogs();

  const logs = await AuditLog.findAll({
    order: [["id", "DESC"]],
    limit: 500
  });

  return res.json(logs.map(log => ({
    ...log.toJSON(),
    displayMessage: buildDisplayMessage(log)
  })));
};
