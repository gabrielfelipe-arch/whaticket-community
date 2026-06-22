import { Request, Response } from "express";
import AppError from "../errors/AppError";

import TicketCategory from "../models/TicketCategory";
import ClosingReason from "../models/ClosingReason";
import UraFlow from "../models/UraFlow";
import UraOption from "../models/UraOption";
import AiSetting from "../models/AiSetting";
import KnowledgeBaseArticle from "../models/KnowledgeBaseArticle";
import SatisfactionSurvey from "../models/SatisfactionSurvey";
import QualificationForm from "../models/QualificationForm";
import QualificationFormQuestion from "../models/QualificationFormQuestion";
import QualificationFormResponse from "../models/QualificationFormResponse";
import QualificationFormAnswer from "../models/QualificationFormAnswer";
import AiTicketContext from "../models/AiTicketContext";
import AiLead from "../models/AiLead";
import AiCalendarConnection from "../models/AiCalendarConnection";
import AiToolExecution from "../models/AiToolExecution";
import CreateAuditLogService from "../services/AuditLogServices/CreateAuditLogService";
import GenerateAiResponseService, { AiProviderError } from "../services/AiServices/GenerateAiResponseService";
import {
  htmlToPlainText,
  plainTextToHtml,
  sanitizeKnowledgeHtml
} from "../utils/knowledgeFormatting";

type AnyModel = any;

const modelMap: Record<string, AnyModel> = {
  ticketCategories: TicketCategory,
  closingReasons: ClosingReason,
  uraFlows: UraFlow,
  uraOptions: UraOption,
  aiSettings: AiSetting,
  knowledgeBaseArticles: KnowledgeBaseArticle,
  satisfactionSurveys: SatisfactionSurvey,
  qualificationForms: QualificationForm,
  qualificationFormQuestions: QualificationFormQuestion,
  qualificationFormResponses: QualificationFormResponse,
  qualificationFormAnswers: QualificationFormAnswer,
  aiTicketContexts: AiTicketContext,
  aiLeads: AiLead,
  aiCalendarConnections: AiCalendarConnection,
  aiToolExecutions: AiToolExecution
};

function getModel(resource: string): AnyModel {
  const model = modelMap[resource];

  if (!model) {
    throw new AppError("ERR_INVALID_CUSTOM_RESOURCE", 400);
  }

  return model;
}

function nullableNumber(value: any): number | null {
  if (value === "" || value === null || value === undefined || value === 0 || value === "0") {
    return null;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
}

function defaultAiModel(provider: string): string {
  const normalizedProvider = String(provider || "openai").toLowerCase();
  const defaults: Record<string, string> = {
    openai: "gpt-4o-mini",
    gemini: "gemini-2.5-flash",
    groq: "llama-3.3-70b-versatile",
    deepseek: "deepseek-chat"
  };

  return defaults[normalizedProvider] || defaults.openai;
}

function normalizeAiProvider(provider: any): string {
  const normalizedProvider = String(provider || "openai").toLowerCase().trim();
  return ["openai", "gemini", "groq", "deepseek"].includes(normalizedProvider)
    ? normalizedProvider
    : "openai";
}

function normalizeAiModel(provider: string, model: any): string {
  const normalizedModel = String(model || "").trim();
  const fallback = defaultAiModel(provider);

  if (!normalizedModel) return fallback;

  const incompatibleByProvider: Record<string, RegExp[]> = {
    openai: [/^llama/i, /^gemini/i, /^deepseek/i],
    gemini: [/^gpt-/i, /^llama/i, /^deepseek/i],
    groq: [/^gpt-/i, /^gemini/i, /^deepseek/i],
    deepseek: [/^gpt-/i, /^gemini/i, /^llama/i, /versatile/i, /instant/i]
  };

  const incompatible = incompatibleByProvider[provider] || [];
  return incompatible.some(pattern => pattern.test(normalizedModel))
    ? fallback
    : normalizedModel;
}

function requireField(value: any, message: string): void {
  if (value === null || value === undefined || String(value).trim() === "") {
    throw new AppError(message, 400);
  }
}

function isEnabled(value: any): boolean {
  return value === true || value === "true" || value === "enabled";
}

function serializeAiCalendarConnection(row: any): any {
  const data = row?.toJSON ? row.toJSON() : { ...(row || {}) };
  delete data.accessToken;
  delete data.refreshToken;
  delete data.accessTokenEncrypted;
  delete data.refreshTokenEncrypted;

  return {
    ...data,
    isActive: data.active,
    connectionStatus: data.lastError
      ? "error"
      : data.googleAccountEmail || data.calendarId
        ? "connected"
        : "not_connected"
  };
}

function serializeResource(resource: string, row: any): any {
  if (resource === "aiCalendarConnections") return serializeAiCalendarConnection(row);
  return row;
}

function sanitizeAuditData(resource: string, row: any): any {
  if (resource === "aiCalendarConnections") return serializeAiCalendarConnection(row);
  return row?.toJSON ? row.toJSON() : row;
}

function normalizeJsonArray(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return JSON.stringify(value.map(item => String(item).trim()).filter(Boolean));

  const text = String(value || "").trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return JSON.stringify(parsed.map(item => String(item).trim()).filter(Boolean));
  } catch (err) {
    // fall through to comma/newline parser
  }

  const items = text.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
  return items.length ? JSON.stringify(items) : null;
}

function applyMediaUpload(data: any, req: Request, fields: { url: string; type: string; name: string }): void {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return;

  data[fields.url] = file.filename;
  data[fields.type] = file.mimetype;
  data[fields.name] = file.originalname;
}

function normalizeKeywordText(value: any): string | null {
  if (value === null || value === undefined) return null;

  const items = Array.isArray(value)
    ? value
    : String(value)
      .split(",");

  const normalized = items
    .map(item => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, list) =>
      list.findIndex(other => other.toLowerCase() === item.toLowerCase()) === index
    );

  return normalized.length ? normalized.join(", ") : null;
}

function normalizeQuestionKey(value: any): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "");
}

function normalizeConditionalMessages(value: any): any[] {
  const rawMessages = Array.isArray(value) ? value : [];
  return rawMessages
    .map(message => ({
      body: message?.body ? String(message.body).trim() : null,
      mediaUrl: message?.mediaUrl ? String(message.mediaUrl).trim() : null,
      mediaType: message?.mediaType ? String(message.mediaType).trim() : null,
      mediaName: message?.mediaName ? String(message.mediaName).trim() : null
    }))
    .filter(message => message.body || message.mediaUrl);
}

function normalizeQuestionOptions(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (Array.isArray(value)) {
    const normalized = value
      .map((item, index) => {
        if (typeof item === "object" && item !== null) {
          const tagRefs = Array.isArray(item.tagRefs)
            ? item.tagRefs
            : Array.isArray(item.tagIds)
              ? item.tagIds
              : Array.isArray(item.tags)
                ? item.tags
                : [];

          return {
            value: String(item.value || item.numero || index + 1).trim(),
            label: String(item.label || item.valor || item.value || item.numero || "").trim(),
            tagRefs: tagRefs.map((tag: unknown) => String(tag).trim()).filter(Boolean),
            nextAction: item.nextAction ? String(item.nextAction).trim() : "NEXT",
            nextMessage: item.nextMessage ? String(item.nextMessage).trim() : null,
            nextMessages: normalizeConditionalMessages(item.nextMessages),
            nextQuestionId: nullableNumber(item.nextQuestionId),
            targetQueueId: nullableNumber(item.targetQueueId),
            uraOptionId: nullableNumber(item.uraOptionId)
          };
        }

        return {
          value: String(index + 1),
          label: String(item || "").trim(),
          tagRefs: [],
          nextAction: "NEXT",
          nextMessage: null,
          nextMessages: [],
          nextQuestionId: null,
          targetQueueId: null,
          uraOptionId: null
        };
      })
      .filter(item => item.value && item.label);

    return normalized.length ? JSON.stringify(normalized) : null;
  }

  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return normalizeQuestionOptions(parsed);
  } catch (error) {
    const normalized = trimmed
      .split(/\r?\n|;/)
      .map((item, index) => item.trim())
      .filter(Boolean)
      .map((item, index) => {
        const parts = item.split("|").map(part => part.trim());
        const value = parts[0];
        const label = parts[1];
        const tagRefs = parts
          .slice(2)
          .join("|")
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean);

        return {
          value: label ? value : String(index + 1),
          label: label || value,
          tagRefs
        };
      });

    return normalized.length ? JSON.stringify(normalized) : null;
  }
}

async function normalizeBody(resource: string, body: any): Promise<any> {
  const data = { ...body };

  delete data.id;
  delete data.createdAt;
  delete data.updatedAt;

  if (resource === "ticketCategories") {
    requireField(data.name, "Informe o nome da categoria.");

    return {
      name: data.name,
      description: data.description || null,
      active: data.active !== false
    };
  }

  if (resource === "closingReasons") {
    requireField(data.name, "Informe o nome do motivo de encerramento.");
    if (isEnabled(data.sendFarewellMessage)) {
      requireField(data.farewellMessage, "Informe a mensagem de despedida ou desative o envio automatico.");
    }

    return {
      name: data.name,
      description: data.description || null,
      farewellMessage: data.farewellMessage || null,
      sendFarewellMessage: data.sendFarewellMessage === true || data.sendFarewellMessage === "true",
      active: data.active !== false
    };
  }

  if (resource === "uraFlows") {
    requireField(data.name, "Informe o nome do fluxo da URA.");
    if (data.active !== false && data.active !== "false") {
      requireField(data.welcomeMessage, "Informe a mensagem inicial da URA.");
    }
    const aiAutoCloseEnabled = isEnabled(data.aiAutoCloseEnabled);

    if (aiAutoCloseEnabled) {
      if (!data.aiAutoCloseMinutes || Number(data.aiAutoCloseMinutes) <= 0) {
        throw new AppError("Informe o tempo sem resposta para encerrar o atendimento.", 400);
      }

      if (!data.aiAutoCloseMessage) {
        throw new AppError("Informe a mensagem que sera enviada antes do encerramento.", 400);
      }

      if (!nullableNumber(data.aiAutoCloseReasonId)) {
        throw new AppError("Escolha o motivo de encerramento.", 400);
      }
    }

    return {
      name: data.name,
      description: data.description || null,
      welcomeMessage: data.welcomeMessage || "",
      welcomeMediaUrl: data.welcomeMediaUrl || null,
      welcomeMediaType: data.welcomeMediaType || null,
      welcomeMediaName: data.welcomeMediaName || null,
      invalidOptionMessage: data.invalidOptionMessage || null,
      maxInvalidAttempts: Number(data.maxInvalidAttempts || 3),
      fallbackQueueId: nullableNumber(data.fallbackQueueId),
      aiAutoCloseEnabled,
      aiAutoCloseMinutes: aiAutoCloseEnabled ? Number(data.aiAutoCloseMinutes) : null,
      aiAutoCloseMessage: aiAutoCloseEnabled ? data.aiAutoCloseMessage || null : null,
      aiAutoCloseReasonId: aiAutoCloseEnabled ? nullableNumber(data.aiAutoCloseReasonId) : null,
      aiAutoCloseOnlyIfNotHandedOff: data.aiAutoCloseOnlyIfNotHandedOff !== false && data.aiAutoCloseOnlyIfNotHandedOff !== "false",
      active: data.active !== false
    };
  }

  if (resource === "uraOptions") {
    requireField(data.flowId, "Escolha o fluxo da URA.");
    requireField(data.optionKey, "Informe a opcao que o cliente deve digitar.");
    requireField(data.title, "Informe o titulo da opcao da URA.");

    const aiAutoCloseEnabled = isEnabled(data.aiAutoCloseEnabled);
    const aiHumanHandoffEnabled = isEnabled(data.aiHumanHandoffEnabled);
    const aiHandoffAlertEnabled = isEnabled(data.aiHandoffAlertEnabled);
    const action = data.action || "SEND_MESSAGE";
    const runQualificationFormBeforeAction = isEnabled(data.runQualificationFormBeforeAction);

    if (action === "SEND_MESSAGE" && !runQualificationFormBeforeAction) {
      requireField(data.responseMessage, "Informe a mensagem que sera enviada ao cliente.");
    }

    if (action === "OPEN_SUBMENU") {
      requireField(data.responseMessage, "Informe a mensagem propria deste submenu.");
    }

    if (action === "TRANSFER_QUEUE" || action === "HUMAN" || action === "START_AI") {
      if (!nullableNumber(data.targetQueueId)) {
        throw new AppError("Escolha a fila destino desta opcao.", 400);
      }
    }

    if (action === "CLOSE_TICKET" && !nullableNumber(data.closingReasonId)) {
      throw new AppError("Escolha o motivo de encerramento desta opcao.", 400);
    }

    if (runQualificationFormBeforeAction && !nullableNumber(data.qualificationFormId)) {
      throw new AppError("Escolha o formulario de qualificacao desta opcao.", 400);
    }

    if (aiHumanHandoffEnabled) {
      if (!nullableNumber(data.aiHumanHandoffQueueId)) {
        throw new AppError("Escolha a fila humana para encaminhamento da IA.", 400);
      }

      requireField(
        data.aiHumanHandoffMessage,
        "Informe a mensagem enviada ao cliente antes de transferir para um atendente."
      );
    }

    if (aiHandoffAlertEnabled) {
      requireField(data.aiHandoffAlertTo, "Informe o numero ou grupo que recebera o aviso da IA.");
      requireField(data.aiHandoffAlertMessage, "Informe a mensagem do aviso da IA.");
    }

    if (aiAutoCloseEnabled) {
      if (!data.aiAutoCloseMinutes || Number(data.aiAutoCloseMinutes) <= 0) {
        throw new AppError("Informe o tempo sem resposta para encerrar o atendimento.", 400);
      }

      if (!data.aiAutoCloseMessage) {
        throw new AppError("Informe a mensagem que sera enviada antes do encerramento.", 400);
      }

      if (!nullableNumber(data.aiAutoCloseReasonId)) {
        throw new AppError("Escolha o motivo de encerramento.", 400);
      }
    }

    const parentOptionId = nullableNumber(data.parentOptionId);
    const currentOptionId = nullableNumber(data.id);
    const optionKey = String(data.optionKey || "").trim();
    const duplicatedOptions = await UraOption.findAll({
      where: {
        flowId: Number(data.flowId),
        parentOptionId,
        optionKey
      }
    });
    const duplicatedOption = duplicatedOptions.find(option =>
      !currentOptionId || Number(option.id) !== Number(currentOptionId)
    );

    if (duplicatedOption) {
      throw new AppError("Ja existe uma opcao com esse numero neste menu/submenu.", 400);
    }

    return {
      flowId: Number(data.flowId),
      parentOptionId,
      optionKey,
      title: data.title,
      responseMessage: data.responseMessage || null,
      responseMediaUrl: data.responseMediaUrl || null,
      responseMediaType: data.responseMediaType || null,
      responseMediaName: data.responseMediaName || null,
      action,
      targetQueueId: nullableNumber(data.targetQueueId),
      closingReasonId: nullableNumber(data.closingReasonId),
      qualificationFormId: nullableNumber(data.qualificationFormId),
      runQualificationFormBeforeAction,
      allowQualificationFormSkip: data.allowQualificationFormSkip === true || data.allowQualificationFormSkip === "true",
      showMainMenuAfterMessage: data.showMainMenuAfterMessage === true || data.showMainMenuAfterMessage === "true",
      aiHumanHandoffEnabled,
      aiHumanHandoffQueueId: nullableNumber(data.aiHumanHandoffQueueId),
      aiHumanHandoffMessage: data.aiHumanHandoffMessage || null,
      aiAutoCloseEnabled,
      aiAutoCloseMinutes: data.aiAutoCloseMinutes ? Number(data.aiAutoCloseMinutes) : null,
      aiAutoCloseMessage: data.aiAutoCloseMessage || null,
      aiAutoCloseReasonId: nullableNumber(data.aiAutoCloseReasonId),
      aiAutoCloseOnlyIfNotHandedOff: data.aiAutoCloseOnlyIfNotHandedOff !== false && data.aiAutoCloseOnlyIfNotHandedOff !== "false",
      aiHandoffAlertEnabled,
      aiHandoffAlertTo: data.aiHandoffAlertTo || null,
      aiHandoffAlertMessage: data.aiHandoffAlertMessage || null,
      order: Number(data.order || 0),
      active: data.active !== false
    };
  }

  if (resource === "aiSettings") {
    const active = isEnabled(data.active);
    const provider = normalizeAiProvider(data.provider);
    const model = normalizeAiModel(provider, data.model);
    if (active) {
      requireField(data.name, "Informe o nome da IA.");
      requireField(provider, "Escolha o provedor da IA.");
      requireField(model, "Informe o modelo da IA.");
      requireField(data.apiKey, "Informe a chave da API da IA.");
    }

    return {
      name: data.name || "Principal",
      companyName: data.companyName || null,
      serviceType: data.serviceType || null,
      behaviorPrompt: data.behaviorPrompt || null,
      provider,
      model,
      apiKey: data.apiKey || null,
      baseUrl: data.baseUrl || null,
      systemPrompt: data.systemPrompt || null,
      temperature: data.temperature || 0.2,
      maxTokens: Number(data.maxTokens || 800),
      transferToHumanOnFailure: data.transferToHumanOnFailure !== false,
      aiQueueId: nullableNumber(data.aiQueueId),
      confirmationMaxAttempts: Number(data.confirmationMaxAttempts || 2),
      confirmationFailureMessage: data.confirmationFailureMessage || null,
      allowedTools: normalizeJsonArray(data.allowedTools),
      allowedTransferQueueIds: normalizeJsonArray(data.allowedTransferQueueIds),
      calendarConnectionId: nullableNumber(data.calendarConnectionId),
      active
    };
  }

  if (resource === "aiCalendarConnections") {
    requireField(data.name, "Informe o nome da conexao de agenda.");
    const provider = String(data.provider || "").trim().toLowerCase();
    if (!["google", "microsoft"].includes(provider)) {
      throw new AppError("Escolha o provedor da agenda.", 400);
    }

    return {
      name: data.name,
      provider,
      calendarId: data.calendarId || null,
      calendarName: data.calendarName || null,
      googleAccountEmail: data.googleAccountEmail || null,
      userPrincipalName: data.userPrincipalName || null,
      ...(provider === "microsoft" ? {
        accessToken: data.accessToken || null,
        refreshToken: data.refreshToken || null
      } : {}),
      tokenExpiresAt: data.tokenExpiresAt || null,
      accessTokenExpiresAt: data.accessTokenExpiresAt || null,
      scopes: data.scopes || null,
      timezone: data.timezone || "America/Sao_Paulo",
      active: data.active === true || data.active === "true"
    };
  }

  if (resource === "knowledgeBaseArticles") {
    requireField(data.title, "Informe o titulo do artigo da base de conhecimento.");
    const contentHtml = sanitizeKnowledgeHtml(data.contentHtml || plainTextToHtml(data.content || ""));
    const contentText = htmlToPlainText(contentHtml);

    requireField(contentText, "Informe o conteudo do artigo da base de conhecimento.");

    return {
      title: data.title,
      content: contentText,
      contentHtml,
      tags: normalizeKeywordText(data.tags),
      active: data.active !== false
    };
  }

  if (resource === "satisfactionSurveys") {
    const allowedScales = ["1_5", "1_10"];
    const allowedSendModes = ["optional", "always", "disabled"];
    const active = data.active !== false && data.active !== "false";
    const sendMode = allowedSendModes.includes(data.sendMode) ? data.sendMode : "optional";

    requireField(data.name, "Informe o nome da pesquisa de satisfacao.");
    if (active && sendMode !== "disabled") {
      requireField(data.question, "Informe a mensagem da pesquisa de satisfacao.");
    }
    const collectFeedbackText = data.collectFeedbackText === true || data.collectFeedbackText === "true";
    const feedbackTimeoutMinutes = Math.max(Number(data.feedbackTimeoutMinutes || 60), 1);

    return {
      name: data.name,
      question: data.question || "",
      thankYouMessage: data.thankYouMessage || null,
      collectFeedbackText,
      feedbackQuestion: data.feedbackQuestion || null,
      feedbackTimeoutMinutes,
      scaleType: allowedScales.includes(data.scaleType) ? data.scaleType : "1_5",
      sendMode,
      active
    };
  }

  if (resource === "qualificationForms") {
    requireField(data.name, "Informe o nome do formulario.");

    return {
      name: data.name,
      description: data.description || null,
      greetingMessage: data.greetingMessage || null,
      active: data.active !== false && data.active !== "false"
    };
  }

  if (resource === "qualificationFormQuestions") {
    requireField(data.formId, "Escolha o formulario.");
    requireField(data.label, "Informe a pergunta.");

    const allowedTypes = ["text", "single_choice", "multiple_choice", "number", "date", "time", "boolean", "email", "phone", "glpi_entity", "glpi_location"];
    const type = allowedTypes.includes(data.type) ? data.type : "text";
    const allowedGlpiFieldsByType = type === "glpi_entity"
      ? ["entity", "ignore"]
      : type === "glpi_location"
        ? ["location", "ignore"]
        : ["description", "ignore"];
    const glpiField = allowedGlpiFieldsByType.includes(data.glpiField)
      ? data.glpiField
      : allowedGlpiFieldsByType[0];
    const key = normalizeQuestionKey(data.key || data.label);

    requireField(key, "Informe uma chave valida para a pergunta.");

    const options = normalizeQuestionOptions(data.options);
    if (["single_choice", "multiple_choice"].includes(type) && !options) {
      throw new AppError("Informe as opcoes da pergunta, uma por linha ou no formato valor|rotulo.", 400);
    }

    return {
      formId: Number(data.formId),
      key,
      label: data.label,
      type,
      glpiField,
      options,
      required: data.required !== false && data.required !== "false",
      includeInAiContext: data.includeInAiContext !== false && data.includeInAiContext !== "false",
      includeInReports: data.includeInReports !== false && data.includeInReports !== "false",
      maxInvalidAttempts: Number(data.maxInvalidAttempts || 2),
      order: Number(data.order || 0),
      active: data.active !== false && data.active !== "false"
    };
  }

  return data;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { resource } = req.params;
  const publicLookupResources = ["ticketCategories", "closingReasons", "satisfactionSurveys"];

  if (req.user.profile !== "admin" && !publicLookupResources.includes(resource)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const model = getModel(resource);

  const rows = await model.findAll({
    where: req.user.profile !== "admin" && publicLookupResources.includes(resource)
      ? { active: true }
      : undefined,
    order: [["id", "DESC"]]
  });

  return res.json(rows.map((row: any) => serializeResource(resource, row)));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { resource } = req.params;
  const model = getModel(resource);
  const data = await normalizeBody(resource, req.body);
  if (resource === "uraFlows") {
    applyMediaUpload(data, req, { url: "welcomeMediaUrl", type: "welcomeMediaType", name: "welcomeMediaName" });
    if (!req.file) {
      delete data.welcomeMediaUrl;
      delete data.welcomeMediaType;
      delete data.welcomeMediaName;
    }
  }
  if (resource === "uraOptions") {
    applyMediaUpload(data, req, { url: "responseMediaUrl", type: "responseMediaType", name: "responseMediaName" });
    if (!req.file) {
      delete data.responseMediaUrl;
      delete data.responseMediaType;
      delete data.responseMediaName;
    }
  }

  const row = await model.create(data);
  await CreateAuditLogService({
    req,
    action: "create",
    resource,
    resourceId: row.id,
    afterData: sanitizeAuditData(resource, row)
  });

  return res.status(200).json(serializeResource(resource, row));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { resource, id } = req.params;
  const model = getModel(resource);
  const row = await model.findByPk(id);

  if (!row) {
    throw new AppError("ERR_CUSTOM_RESOURCE_NOT_FOUND", 404);
  }

  const data = await normalizeBody(resource, { ...req.body, id });
  if (resource === "uraFlows") {
    applyMediaUpload(data, req, { url: "welcomeMediaUrl", type: "welcomeMediaType", name: "welcomeMediaName" });
    if (!req.file) {
      delete data.welcomeMediaUrl;
      delete data.welcomeMediaType;
      delete data.welcomeMediaName;
    }
  }
  if (resource === "uraOptions") {
    applyMediaUpload(data, req, { url: "responseMediaUrl", type: "responseMediaType", name: "responseMediaName" });
    if (!req.file) {
      delete data.responseMediaUrl;
      delete data.responseMediaType;
      delete data.responseMediaName;
    }
  }
  const beforeData = sanitizeAuditData(resource, row);
  await row.update(data);
  await CreateAuditLogService({
    req,
    action: "update",
    resource,
    resourceId: row.id,
    beforeData,
    afterData: sanitizeAuditData(resource, row)
  });

  return res.status(200).json(serializeResource(resource, row));
};

export const uploadQualificationMessageMedia = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    throw new AppError("Informe o anexo da mensagem.", 400);
  }

  return res.status(200).json({
    mediaUrl: file.filename,
    mediaType: file.mimetype,
    mediaName: file.originalname
  });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { resource, id } = req.params;
  const model = getModel(resource);
  const row = await model.findByPk(id);

  if (!row) {
    throw new AppError("ERR_CUSTOM_RESOURCE_NOT_FOUND", 404);
  }

  const beforeData = row.toJSON();
  await row.destroy();
  await CreateAuditLogService({
    req,
    action: "delete",
    resource,
    resourceId: id,
    beforeData
  });

  return res.status(200).json({ message: "deleted" });
};

export const testAiSetting = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { id } = req.params;
  const aiSetting = await AiSetting.findByPk(id);

  if (!aiSetting) {
    throw new AppError("ERR_CUSTOM_RESOURCE_NOT_FOUND", 404);
  }

  try {
    const response = await GenerateAiResponseService({
      aiSettingId: aiSetting.id,
      message: "Responda apenas: teste ok"
    });

    if (!response) {
      return res.status(200).json({
        ok: false,
        success: false,
        provider: aiSetting.provider,
        model: aiSetting.model,
        errorMessage: "A API respondeu, mas nao retornou texto."
      });
    }

    return res.status(200).json({
      ok: true,
      success: true,
      message: "API da IA funcionando.",
      provider: aiSetting.provider,
      model: aiSetting.model,
      responseText: response
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return res.status(200).json({
        ok: false,
        success: false,
        errorMessage: error.message,
        message: error.message,
        provider: error.provider,
        model: aiSetting.model,
        statusCode: error.status,
        code: error.code
      });
    }

    throw error;
  }
};
