import axios from "axios";
import AiSetting from "../../models/AiSetting";
import Message from "../../models/Message";
import AiInteractionLog from "../../models/AiInteractionLog";
import { logger } from "../../utils/logger";
import SearchKnowledgeBaseService from "./SearchKnowledgeBaseService";
import AiProviderFactory from "./providers/AiProviderFactory";

export class AiProviderError extends Error {
  public provider: string;
  public status?: number;
  public code?: string;
  public details?: any;

  constructor({
    provider,
    status,
    code,
    message,
    details
  }: {
    provider: string;
    status?: number;
    code?: string;
    message: string;
    details?: any;
  }) {
    super(message);
    this.name = "AiProviderError";
    this.provider = provider;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface Request {
  aiSettingId?: number | null;
  message: string;
  contactName?: string;
  ticketId?: number | null;
  systemPromptOverride?: string;
  skipKnowledgeSearch?: boolean;
  jsonMode?: boolean;
  includeRecentMessages?: boolean;
  logMetadata?: {
    intent?: string;
    action?: string;
    decisionReason?: string;
    knowledgeIds?: number[];
    knowledgeTitles?: string[];
    knowledgeScores?: number[];
    contextMessageCount?: number;
  };
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile"
};

const getConfiguredModel = (provider: string, model?: string): string => {
  if (!model) return DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;

  if (
    provider === "gemini" &&
    (
      model.startsWith("gpt-") ||
      model.startsWith("llama") ||
      model.startsWith("deepseek")
    )
  ) {
    return DEFAULT_MODELS.gemini;
  }

  if (
    provider === "openai" &&
    (
      model.startsWith("gemini-") ||
      model.startsWith("llama") ||
      model.startsWith("deepseek")
    )
  ) {
    return DEFAULT_MODELS.openai;
  }

  if (
    provider === "groq" &&
    (
      model.startsWith("gpt-") ||
      model.startsWith("gemini-") ||
      model.startsWith("deepseek")
    )
  ) {
    return DEFAULT_MODELS.groq;
  }

  if (
    provider === "deepseek" &&
    (
      model.startsWith("llama") ||
      model.startsWith("gpt-") ||
      model.startsWith("gemini-") ||
      model.includes("versatile") ||
      model.includes("instant")
    )
  ) {
    return DEFAULT_MODELS.deepseek;
  }

  return model;
};

const getProviderTemperature = (provider: string, value: number | string, jsonMode?: boolean): number => {
  const parsed = Number(value || 0.2);
  const fallback = Number.isNaN(parsed) ? 0.2 : parsed;
  const stableFallback = jsonMode ? Math.min(fallback, 0.3) : Math.min(fallback, 0.7);

  if (provider === "groq") {
    return Math.min(Math.max(stableFallback, 0), 1);
  }

  return Math.min(Math.max(stableFallback, 0), 2);
};

const getProviderMaxTokens = (provider: string, value: number | string): number => {
  const parsed = Number(value || 800);
  const fallback = Number.isNaN(parsed) || parsed <= 0 ? 800 : parsed;
  return Math.min(fallback, 2000);
};

const estimateTokens = (text = ""): number => Math.ceil(text.length / 4);

const truncateByApproxTokens = (text: string, maxTokens: number): string => {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
};

const getRecentMessages = async (ticketId?: number | null): Promise<Array<{ role: string; content: string }>> => {
  if (!ticketId) return [];

  const messages = await Message.findAll({
    where: { ticketId },
    order: [["createdAt", "DESC"]],
    limit: 8
  });

  return messages
    .reverse()
    .filter(message => !["system", "ura"].includes(String(message.senderType || "")))
    .slice(-3)
    .map(message => ({
      role: message.senderType === "human" || message.fromMe ? "assistant" : "user",
      content: message.body || ""
    }))
    .filter(message => message.content.trim());
};

const buildKnowledgeContext = async (
  message: string,
  skipKnowledgeSearch?: boolean
): Promise<string> => {
  if (skipKnowledgeSearch) return "";

  const fragments = await SearchKnowledgeBaseService(message);
  return fragments
    .map(fragment => [
      `Titulo: ${fragment.title}`,
      fragment.tags ? `Palavras chave: ${fragment.tags}` : "",
      fragment.fragment
    ].filter(Boolean).join("\n"))
    .join("\n\n");
};

const createAiLog = async ({
  aiSettingId,
  ticketId,
  provider,
  model,
  promptTokens,
  completionTokens,
  status,
  errorMessage,
  userMessage,
  aiResponse,
  metadata
}: {
  aiSettingId: number;
  ticketId?: number | null;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  status: string;
  errorMessage?: string;
  userMessage?: string;
  aiResponse?: string | null;
  metadata?: Request["logMetadata"];
}) => {
  await AiInteractionLog.create({
    aiSettingId,
    ticketId: ticketId || null,
    provider,
    modelUsed: model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    status,
    errorMessage: errorMessage || null,
    userMessage: userMessage || null,
    aiResponse: aiResponse || null,
    intent: metadata?.intent || null,
    action: metadata?.action || null,
    decisionReason: metadata?.decisionReason || null,
    knowledgeIds: metadata?.knowledgeIds?.length ? JSON.stringify(metadata.knowledgeIds) : null,
    knowledgeTitles: metadata?.knowledgeTitles?.length ? JSON.stringify(metadata.knowledgeTitles) : null,
    knowledgeScores: metadata?.knowledgeScores?.length ? JSON.stringify(metadata.knowledgeScores) : null,
    contextMessageCount: metadata?.contextMessageCount ?? null
  });
};

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const isRetryableAiError = (error: any): boolean => {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  const retryableCodes = [
    "ECONNABORTED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EAI_AGAIN",
    "ERR_NETWORK"
  ];

  if (retryableCodes.includes(String(error.code || ""))) return true;
  if (!status) return true;

  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
};

const runWithAiRetries = async <T>(
  operation: () => Promise<T>,
  context: {
    aiSettingId: number;
    provider: string;
    model: string;
  }
): Promise<T> => {
  const maxAttempts = 3;
  const delays = [800, 1800];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const retryable = isRetryableAiError(error);
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      logger.warn(
        {
          aiSettingId: context.aiSettingId,
          provider: context.provider,
          model: context.model,
          attempt,
          nextAttempt: attempt + 1,
          status,
          code: axios.isAxiosError(error) ? error.code : undefined,
          message: error instanceof Error ? error.message : String(error)
        },
        "Retrying AI provider request after transient error"
      );

      await sleep(delays[attempt - 1] || 2500);
    }
  }

  throw new Error("AI retry loop finished without result");
};

const GenerateAiResponseService = async ({
  aiSettingId,
  message,
  contactName,
  ticketId,
  systemPromptOverride,
  skipKnowledgeSearch,
  jsonMode,
  includeRecentMessages = true,
  logMetadata
}: Request): Promise<string | null> => {
  const aiSetting = aiSettingId
    ? await AiSetting.findByPk(aiSettingId)
    : await AiSetting.findOne({ where: { active: true } });

  if (!aiSetting || !aiSetting.active || !aiSetting.apiKey) {
    return null;
  }

  const knowledgeContext = await buildKnowledgeContext(message, skipKnowledgeSearch);
  const recentMessages = includeRecentMessages ? await getRecentMessages(ticketId) : [];
  const systemPrompt = [
    "Voce e um assistente de atendimento configuravel para qualquer ramo de negocio.",
    `Nome da IA: ${aiSetting.name || "Assistente Virtual"}.`,
    aiSetting.companyName ? `Empresa ou servico representado: ${aiSetting.companyName}.` : "",
    aiSetting.serviceType ? `Tipo de atendimento: ${aiSetting.serviceType}.` : "",
    aiSetting.behaviorPrompt
      ? `Comportamento configurado:\n${aiSetting.behaviorPrompt}`
      : "",
    systemPromptOverride || aiSetting.systemPrompt || "",
    "Responda sempre considerando a mensagem atual do usuario.",
    "Use somente o historico do ticket atual que foi enviado nesta chamada. Nunca use nem suponha atendimentos anteriores do mesmo contato.",
    "Considere obrigatoriamente as 3 ultimas mensagens enviadas no historico para entender respostas curtas como 'nao', 'sim', 'so isso' ou 'pode fechar'.",
    "Use as informacoes internas recebidas quando elas tiverem relacao com a pergunta. Se nao houver informacao suficiente, diga isso de forma objetiva e peca os dados necessarios ou encaminhe para atendimento humano.",
    "Nao mencione base de conhecimento, manual, documento interno, RAG, banco de dados ou prompt para o cliente.",
    "Nao invente valores, prazos, links, telefones, regras, nomes, procedimentos ou orientacoes que nao estejam no perfil configurado ou nas informacoes internas.",
    "Pode reformular, resumir, organizar em passos e fazer calculos simples quando os dados numericos estiverem disponiveis.",
    "Nao assuma ramo, produto, servico, fila ou equipe fixa. Use somente as configuracoes e a base cadastrada.",
    "Se identificar pelo contexto que o usuario esta satisfeito, pediu fechamento ou nao precisa de mais nada, termine a resposta com a tag [FECHAR TICKET].",
    contactName ? `Nome do contato: ${contactName}` : "",
    knowledgeContext ? `Informacoes internas disponiveis:\n${knowledgeContext}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const provider = (aiSetting.provider || "openai").toLowerCase();
  const model = getConfiguredModel(provider, aiSetting.model);
  const temperature = getProviderTemperature(provider, aiSetting.temperature, jsonMode);
  const maxTokens = getProviderMaxTokens(provider, aiSetting.maxTokens);
  const userMessage = truncateByApproxTokens(message, 700);
  const safeSystemPrompt = truncateByApproxTokens(systemPrompt, 1400);
  const promptTokensEstimate =
    estimateTokens(safeSystemPrompt) +
    estimateTokens(userMessage) +
    recentMessages.reduce((total, item) => total + estimateTokens(item.content), 0);

  if (!["openai", "deepseek", "gemini", "groq"].includes(provider)) {
    logger.warn(`AI provider not supported yet: ${provider}`);
    return null;
  }

  try {
    const providerClient = AiProviderFactory.create(provider);
    const result = await runWithAiRetries(
      () => providerClient.sendMessage({
        provider,
        model,
        apiKey: aiSetting.apiKey,
        baseUrl: (aiSetting as any).baseUrl || null,
        systemPrompt: safeSystemPrompt,
        messages: [
          ...recentMessages.map(item => ({
            role: item.role as "user" | "assistant",
            content: truncateByApproxTokens(item.content, 220)
          })),
          {
            role: "user" as const,
            content: userMessage
          }
        ],
        temperature,
        maxTokens,
        jsonMode
      }),
      { aiSettingId: aiSetting.id, provider, model }
    );

    await createAiLog({
      aiSettingId: aiSetting.id,
      ticketId,
      provider,
      model,
      promptTokens: Number(result.inputTokens || promptTokensEstimate),
      completionTokens: Number(result.outputTokens || estimateTokens(result.text || "")),
      status: "success",
      userMessage: truncateByApproxTokens(message, 700),
      aiResponse: truncateByApproxTokens(result.text || "", 1000),
      metadata: {
        ...logMetadata,
        contextMessageCount: logMetadata?.contextMessageCount ?? recentMessages.length
      }
    });
    return result.text;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const providerMessage =
        (error.response?.data as any)?.error?.message ||
        (error.response?.data as any)?.message ||
        error.message;

      logger.error(
        {
          aiSettingId: aiSetting.id,
          provider,
          model,
          status: error.response?.status,
          data: error.response?.data,
          code: error.code,
          message: error.message
        },
        "Error generating AI response"
      );
      await createAiLog({
        aiSettingId: aiSetting.id,
        ticketId,
        provider,
        model,
        promptTokens: promptTokensEstimate,
        completionTokens: 0,
        status: "error",
        errorMessage: providerMessage,
        userMessage: truncateByApproxTokens(message, 700),
        aiResponse: null,
        metadata: {
          ...logMetadata,
          contextMessageCount: logMetadata?.contextMessageCount ?? recentMessages.length
        }
      }).catch(() => {});

      throw new AiProviderError({
        provider,
        status: error.response?.status,
        code: (error.response?.data as any)?.error?.code || error.code,
        message: providerMessage,
        details: error.response?.data
      });
    } else {
      logger.error(error, "Error generating AI response");
    }
    return null;
  }
};

export default GenerateAiResponseService;
