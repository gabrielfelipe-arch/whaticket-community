import axios from "axios";
import AiSetting from "../../models/AiSetting";
import Message from "../../models/Message";
import AiInteractionLog from "../../models/AiInteractionLog";
import { logger } from "../../utils/logger";
import SearchKnowledgeBaseService from "./SearchKnowledgeBaseService";

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
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-v3",
  gemini: "gemini-1.5-flash",
  groq: "llama-3.3-70b-versatile"
};

const getConfiguredModel = (provider: string, model?: string): string => {
  if (!model) return DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;

  if (provider === "gemini" && model.startsWith("gpt-")) {
    return DEFAULT_MODELS.gemini;
  }

  if (provider === "openai" && model.startsWith("gemini-")) {
    return DEFAULT_MODELS.openai;
  }

  if (provider === "groq" && (model.startsWith("gpt-") || model.startsWith("gemini-"))) {
    return DEFAULT_MODELS.groq;
  }

  return model;
};

const getProviderTemperature = (provider: string, value: number | string): number => {
  const parsed = Number(value || 0.2);
  const fallback = Number.isNaN(parsed) ? 0.2 : parsed;

  if (provider === "groq") {
    return Math.min(Math.max(fallback, 0), 1);
  }

  return Math.min(Math.max(fallback, 0), 2);
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
    limit: 3
  });

  return messages.reverse().map(message => ({
    role: message.fromMe ? "assistant" : "user",
    content: message.body || ""
  }));
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
  errorMessage
}: {
  aiSettingId: number;
  ticketId?: number | null;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  status: string;
  errorMessage?: string;
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
    errorMessage: errorMessage || null
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
  skipKnowledgeSearch
}: Request): Promise<string | null> => {
  const aiSetting = aiSettingId
    ? await AiSetting.findByPk(aiSettingId)
    : await AiSetting.findOne({ where: { active: true } });

  if (!aiSetting || !aiSetting.active || !aiSetting.apiKey) {
    return null;
  }

  const knowledgeContext = await buildKnowledgeContext(message, skipKnowledgeSearch);
  const recentMessages = await getRecentMessages(ticketId);
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
    "Considere obrigatoriamente as 3 ultimas mensagens enviadas no historico para entender respostas curtas como 'nao', 'sim', 'so isso' ou 'pode fechar'.",
    "Use a base de conhecimento quando ela tiver informacao relacionada. Se a base nao tiver informacao suficiente, diga isso de forma objetiva e peca os dados necessarios ou encaminhe para atendimento humano.",
    "Nao invente valores, prazos, links, telefones, regras, nomes, procedimentos ou orientacoes que nao estejam no perfil configurado ou na base de conhecimento.",
    "Nao assuma ramo, produto, servico, fila ou equipe fixa. Use somente as configuracoes e a base cadastrada.",
    "Se identificar pelo contexto que o usuario esta satisfeito, pediu fechamento ou nao precisa de mais nada, termine a resposta com a tag [FECHAR TICKET].",
    contactName ? `Nome do contato: ${contactName}` : "",
    knowledgeContext ? `Base de conhecimento:\n${knowledgeContext}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const provider = (aiSetting.provider || "openai").toLowerCase();
  const model = getConfiguredModel(provider, aiSetting.model);
  const temperature = getProviderTemperature(provider, aiSetting.temperature);
  const maxTokens = getProviderMaxTokens(provider, aiSetting.maxTokens);
  const userMessage = truncateByApproxTokens(message, 900);
  const safeSystemPrompt = truncateByApproxTokens(systemPrompt, 900);
  const promptTokensEstimate =
    estimateTokens(safeSystemPrompt) +
    estimateTokens(userMessage) +
    recentMessages.reduce((total, item) => total + estimateTokens(item.content), 0);

  if (!["openai", "deepseek", "gemini", "groq"].includes(provider)) {
    logger.warn(`AI provider not supported yet: ${provider}`);
    return null;
  }

  try {
    if (provider === "gemini") {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`;

      const { data } = await runWithAiRetries(
        () => axios.post(
          endpoint,
          {
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              ...recentMessages.map(item => ({
                role: item.role === "assistant" ? "model" : "user",
                parts: [{ text: truncateByApproxTokens(item.content, 160) }]
              })),
              {
                role: "user",
                parts: [{ text: userMessage }]
              }
            ],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              thinkingConfig: {
                thinkingBudget: 0
              }
            }
          },
          {
            headers: {
              "x-goog-api-key": aiSetting.apiKey,
              "Content-Type": "application/json"
            },
            timeout: 30000
          }
        ),
        { aiSettingId: aiSetting.id, provider, model }
      );

      const parts = data?.candidates?.[0]?.content?.parts || [];
      const output = parts
        .map((part: { text?: string }) => part.text || "")
        .join("")
        .trim() || null;
      const completionTokens = Number(data?.usageMetadata?.candidatesTokenCount || estimateTokens(output || ""));
      const promptTokens = Number(data?.usageMetadata?.promptTokenCount || promptTokensEstimate);
      await createAiLog({
        aiSettingId: aiSetting.id,
        ticketId,
        provider,
        model,
        promptTokens,
        completionTokens,
        status: "success"
      });
      return output;
    }

    const endpoint =
      provider === "deepseek"
        ? "https://api.deepseek.com/chat/completions"
        : provider === "groq"
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";

    const { data } = await runWithAiRetries(
      () => axios.post(
        endpoint,
        {
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: safeSystemPrompt },
            ...recentMessages.map(item => ({
              role: item.role,
              content: truncateByApproxTokens(item.content, 160)
            })),
            {
              role: "user",
              content: userMessage
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${aiSetting.apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      ),
      { aiSettingId: aiSetting.id, provider, model }
    );

    const output = data?.choices?.[0]?.message?.content?.trim() || null;
    await createAiLog({
      aiSettingId: aiSetting.id,
      ticketId,
      provider,
      model,
      promptTokens: Number(data?.usage?.prompt_tokens || promptTokensEstimate),
      completionTokens: Number(data?.usage?.completion_tokens || estimateTokens(output || "")),
      status: "success"
    });
    return output;
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
        errorMessage: providerMessage
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
