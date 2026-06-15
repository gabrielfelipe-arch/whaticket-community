import AiSetting from "../../models/AiSetting";
import KnowledgeBaseArticle from "../../models/KnowledgeBaseArticle";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import BuildKnowledgeBaseQueryService, {
  KnowledgeBaseQueryRewrite
} from "./BuildKnowledgeBaseQueryService";
import GenerateAiResponseService from "./GenerateAiResponseService";

export interface FullBaseGroundingResult {
  intent: string;
  userAsked: string;
  foundInBase: boolean;
  baseSectionsUsed: string[];
  shouldAnswer: boolean;
  needsHuman: boolean;
  needsQuoteCalculation: boolean;
  shouldTransfer: boolean;
  customerAnswer: string;
  reasoningSummary?: string;
  baseSentToModel: boolean;
  baseVersion: string;
  promptVersion: string;
  model: string;
}

interface Request {
  ticket: Ticket;
  aiSetting: AiSetting;
  message: string;
  history: string;
  structuredContext: string;
  contactName?: string;
}

const SAFE_NOT_FOUND =
  "Nao encontrei essa informacao confirmada aqui. Posso encaminhar para a equipe verificar?";

const FULL_BASE_PROMPT_VERSION = "full-base-grounding-mari-v2";

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseJsonObject = (value = ""): any | null => {
  const trimmed = value.trim();

  try {
    return JSON.parse(trimmed);
  } catch (err) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch (innerErr) {
      return null;
    }
  }
};

const lastRelevantHistory = (history = ""): string => {
  const lines = history
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  return lines.slice(-8).join("\n");
};

const getFullBase = async (): Promise<{
  baseText: string;
  baseVersion: string;
  articleIds: number[];
}> => {
  const articles = await KnowledgeBaseArticle.findAll({
    where: { active: true },
    order: [["updatedAt", "DESC"]]
  });

  const baseText = articles
    .map(article => [
      `# ${article.title}`,
      article.tags ? `Tags: ${article.tags}` : "",
      article.content || article.contentHtml || ""
    ].filter(Boolean).join("\n"))
    .join("\n\n---\n\n");

  const baseVersion = articles
    .map(article => `${article.id}:${article.updatedAt?.toISOString?.() || ""}`)
    .join("|");

  return {
    baseText,
    baseVersion,
    articleIds: articles.map(article => article.id)
  };
};

const isFactQuestion = (intent = "", message = ""): boolean => {
  if ([
    "request_payment_info",
    "request_reservation_rules",
    "request_availability",
    "request_location",
    "request_capacity",
    "request_included_structure",
    "request_price_table",
    "request_packages",
    "request_monthly_plans",
    "request_teacher_package",
    "request_discount_rules"
  ].includes(intent)) {
    return true;
  }

  return /\b(pix|cartao|debito|credito|reserva|reservar|desconto|professor|mensalista|endereco|onde|capacidade|cabe|pessoas|tabela|valor|valores|preco|precos|incluso|inclui|ar|internet|tv|copa|cafe)\b/.test(
    normalizeText(message)
  );
};

const validatesCriticalAnswer = (intent = "", answer = ""): boolean => {
  const normalized = normalizeText(answer);

  if (intent === "request_discount_rules" && /\b\d+\s*%|desconto de|r\$\s*\d+.*desconto/.test(normalized)) {
    return false;
  }

  if (
    ["request_reservation_rules", "request_availability", "request_payment_info"].includes(intent) &&
    (
      /\b(esta|esta|fica|ficou|ja|já)\b.{0,40}\b(confirmado|confirmada|garantido|garantida|reservado|reservada)\b/.test(normalized) ||
      /\b(reserva feita|pagamento confirmado|horario disponivel confirmado)\b/.test(normalized)
    ) &&
    !/\b(nao|não|nunca)\b.{0,30}\b(confirmado|confirmada|garantido|garantida|reservado|reservada)\b/.test(normalized) &&
    !/\b(precisa|precisam|deve|devem)\b.{0,60}\b(confirmado|confirmada|validado|validada|verificado|verificada)\b.{0,40}\b(equipe|atendente)\b/.test(normalized)
  ) {
    return false;
  }

  return true;
};

const asksAbout = (message = "", patterns: RegExp[]): boolean => {
  const normalized = normalizeText(message);
  return patterns.some(pattern => pattern.test(normalized));
};

const answerMatchesIntent = (intent = "", message = "", answer = ""): boolean => {
  const normalizedAnswer = normalizeText(answer);

  if (!normalizedAnswer) return false;

  switch (intent) {
    case "request_payment_info":
      if (asksAbout(message, [/\bdivide\b/, /\bparcel/])) {
        return /\b(pix|cartao|debito|credito)\b/.test(normalizedAnswer) &&
          /\b(50|reserva|orcamento|3 dias|equipe|atendente|verificar|validar)\b/.test(normalizedAnswer) &&
          !/\b(nao e possivel dividir|nao pode dividir|parcelamos|sem juros)\b/.test(normalizedAnswer);
      }
      if (asksAbout(message, [/\bcartao\b/, /\bdebito\b/, /\bcredito\b/])) {
        return /\b(cartao|debito|credito)\b/.test(normalizedAnswer);
      }
      return /\bpix\b/.test(normalizedAnswer) && /\b(debito|credito|cartao)\b/.test(normalizedAnswer);
    case "request_reservation_rules":
      return /\b50\b/.test(normalizedAnswer) && /\b(reserv|data|3 dias)\b/.test(normalizedAnswer);
    case "request_location":
      return /\bdias da cruz\b/.test(normalizedAnswer) && /\b(185|sala 215|meier)\b/.test(normalizedAnswer);
    case "request_capacity":
      if (asksAbout(message, [/\b25\b/, /\bvinte e cinco\b/, /\bmais de 20\b/, /\bpassar de 20\b/, /\bacima de 20\b/])) {
        return /\b20\b/.test(normalizedAnswer) && /\b(equipe|atendente|avaliar|acima|passa|mais)\b/.test(normalizedAnswer);
      }
      return /\b20\b/.test(normalizedAnswer) && /\b(pessoas|capacidade|comporta)\b/.test(normalizedAnswer);
    case "request_discount_rules":
      return /\b(atendente|equipe|avaliar|verificar)\b/.test(normalizedAnswer) && !/\b\d+\s*%|desconto de\b/.test(normalizedAnswer);
    case "request_teacher_package":
      if (asksAbout(message, [/\b1 hora\b/, /\buma hora\b/, /\bhora semanal\b/, /\bhora por semana\b/])) {
        return /\bprofessor\b/.test(normalizedAnswer) &&
          /\b(nao|nÃ£o)\b/.test(normalizedAnswer) &&
          /\b(1 dia|2 dias|dias de uso|opcoes por dias|opÃ§Ãµes por dias)\b/.test(normalizedAnswer);
      }
      return /\bprofessor\b/.test(normalizedAnswer) && /\b(1 mes|tercas|quintas|13h|17h30|2 dias|1 dia)\b/.test(normalizedAnswer);
    case "request_price_table":
      return /\br\$\b/.test(answer.toLowerCase()) || /\b(valor|valores|tabela|preco|precos)\b/.test(normalizedAnswer);
    case "request_monthly_plans":
      return /\b(prata|ouro|diamante|mensal|mensalista)\b/.test(normalizedAnswer);
    case "request_packages":
      return /\b(pacote|horas livres|6 horas|12 horas|24 horas)\b/.test(normalizedAnswer);
    case "request_included_structure":
      if (asksAbout(message, [/\bestacionamento\b/, /\bprojetor\b/, /\bmesa de som\b/, /\bimpressora\b/])) {
        return /\b(nao encontrei|não encontrei|confirmar|verificar|equipe)\b/.test(normalizedAnswer);
      }
      if (asksAbout(message, [/\bar\b/, /\bar condicionado\b/, /\bar-condicionado\b/])) {
        return /\bar\b/.test(normalizedAnswer) && /\b(condicionado|sim)\b/.test(normalizedAnswer);
      }
      if (asksAbout(message, [/\binternet\b/, /\bwifi\b/, /\bwi-fi\b/])) {
        return /\b(internet|wifi|wi-fi)\b/.test(normalizedAnswer);
      }
      if (asksAbout(message, [/\btv\b/, /\btelevisao\b/, /\bapresentacao\b/, /\bslide\b/, /\bslides\b/])) {
        return /\btv\b/.test(normalizedAnswer);
      }
      if (asksAbout(message, [/\bcafe\b/, /\bcopa\b/, /\bcafeteira\b/, /\bmicro\b/, /\bfiltro\b/])) {
        return /\b(copa|cafeteira|micro|filtro|agua gelada)\b/.test(normalizedAnswer);
      }
      return /\b(ar|internet|tv|quadro|recepcao|banheiro|copa)\b/.test(normalizedAnswer);
    case "out_of_scope":
    case "inappropriate_message":
      return true;
    default:
      return true;
  }
};

const buildDeterministicGroundedAnswer = (
  rewrite: KnowledgeBaseQueryRewrite,
  message = ""
): Partial<FullBaseGroundingResult> | null => {
  const normalizedMessage = normalizeText(message);

  switch (rewrite.detectedIntent) {
    case "request_payment_info":
      if (/\bdivide\b|\bparcel/.test(normalizedMessage)) {
        return {
          foundInBase: true,
          baseSectionsUsed: ["Reserva e pagamento", "Formas de pagamento"],
          customerAnswer: "A base confirma Pix, cartao de debito e cartao de credito. Para reservar, e necessario pagar 50% do valor do orcamento; os 50% restantes devem ser pagos ate 3 dias antes da data. Sobre dividir/parcelar, posso encaminhar para a equipe verificar."
        };
      }

      if (/\bcartao\b|\bdebito\b|\bcredito\b/.test(normalizedMessage)) {
        return {
          foundInBase: true,
          baseSectionsUsed: ["Formas de pagamento"],
          customerAnswer: "Sim. A Salinha Meier aceita cartao de debito e cartao de credito. Tambem aceita Pix."
        };
      }

      return {
        foundInBase: true,
        baseSectionsUsed: ["Formas de pagamento"],
        customerAnswer: "Sim. A Salinha Meier aceita Pix, cartao de debito e cartao de credito."
      };
    case "request_reservation_rules":
      return {
        foundInBase: true,
        baseSectionsUsed: ["Reserva e pagamento"],
        customerAnswer: "Para reservar a data, e necessario pagar 50% do valor do orcamento. A outra metade deve ser paga ate 3 dias antes da data. A confirmacao da disponibilidade, reserva e pagamento precisa ser validada pela equipe."
      };
    case "request_location":
      return {
        foundInBase: true,
        baseSectionsUsed: ["Endereco"],
        customerAnswer: "A Salinha Meier fica na Rua Dias da Cruz, 185, sala 215, Meier, Rio de Janeiro - RJ, proximo ao Imperator e a Smart Fit."
      };
    case "request_capacity":
      if (/\b25\b|vinte e cinco|mais de 20|passar de 20|acima de 20/.test(normalizedMessage)) {
        return {
          foundInBase: true,
          baseSectionsUsed: ["Capacidade"],
          needsHuman: true,
          customerAnswer: "A capacidade da Salinha Meier e de ate 20 pessoas. Para grupos acima disso, preciso encaminhar para a equipe avaliar se existe alguma alternativa."
        };
      }

      return {
        foundInBase: true,
        baseSectionsUsed: ["Capacidade"],
        customerAnswer: "A capacidade da Salinha Meier e de ate 20 pessoas."
      };
    case "request_discount_rules":
      return {
        foundInBase: true,
        baseSectionsUsed: ["Descontos e condicoes especiais"],
        needsHuman: true,
        customerAnswer: "Sobre descontos ou condicoes especiais, preciso encaminhar para a equipe avaliar com voce."
      };
    case "request_teacher_package":
      return {
        foundInBase: true,
        baseSectionsUsed: ["Pacote Professor Particular"],
        customerAnswer: "O Pacote Professor Particular tem contratacao minima de 1 mes e esta disponivel as tercas e quintas, das 13h as 17h30. A base informa opcoes por dias de uso, nao como pacote avulso de 1 hora."
      };
    case "request_included_structure":
      if (/\bestacionamento\b|projetor|mesa de som|impressora/.test(normalizedMessage)) {
        return {
          foundInBase: false,
          baseSectionsUsed: [],
          needsHuman: true,
          customerAnswer: SAFE_NOT_FOUND
        };
      }
      if (/\bar\b|ar condicionado|ar-condicionado/.test(normalizedMessage)) {
        return {
          foundInBase: true,
          baseSectionsUsed: ["Estrutura"],
          customerAnswer: "Sim. A sala conta com ar-condicionado."
        };
      }
      if (/\binternet\b|\bwifi\b|\bwi-fi\b/.test(normalizedMessage)) {
        return {
          foundInBase: true,
          baseSectionsUsed: ["Estrutura"],
          customerAnswer: "Sim. A sala inclui internet."
        };
      }
      if (/\btv\b|televisao|apresentacao|slide|slides/.test(normalizedMessage)) {
        return {
          foundInBase: true,
          baseSectionsUsed: ["Estrutura"],
          customerAnswer: "Sim. A sala inclui TV para reproducao de conteudo."
        };
      }
      if (/\bcafe\b|\bcopa\b|cafeteira|micro|filtro/.test(normalizedMessage)) {
        return {
          foundInBase: true,
          baseSectionsUsed: ["Estrutura"],
          customerAnswer: "Sim. A sala inclui copa compartilhavel com cafeteira, micro-ondas e filtro com agua gelada."
        };
      }
      return {
        foundInBase: true,
        baseSectionsUsed: ["Estrutura"],
        customerAnswer: "O valor inclui ar-condicionado, internet, TV, quadro branco, recepcao, banheiro e copa compartilhavel com cafeteira, micro-ondas e filtro com agua gelada."
      };
    case "out_of_scope":
    case "inappropriate_message":
      return {
        foundInBase: false,
        baseSectionsUsed: ["Politica de atendimento"],
        customerAnswer: "Posso te ajudar com informacoes da Salinha Meier, como valores, estrutura, capacidade, endereco, reserva e orcamento."
      };
    default:
      return null;
  }
};

const buildSafeFallbackResult = ({
  aiSetting,
  message,
  baseSentToModel,
  baseVersion,
  rewrite
}: {
  aiSetting: AiSetting;
  message: string;
  baseSentToModel: boolean;
  baseVersion: string;
  rewrite: KnowledgeBaseQueryRewrite;
}): FullBaseGroundingResult => ({
  intent: rewrite.detectedIntent || "knowledge_base_question",
  userAsked: message,
  foundInBase: false,
  baseSectionsUsed: [],
  shouldAnswer: true,
  needsHuman: true,
  needsQuoteCalculation: false,
  shouldTransfer: false,
  customerAnswer: SAFE_NOT_FOUND,
  reasoningSummary: "Fallback seguro: base ausente ou resposta invalida do modelo.",
  baseSentToModel,
  baseVersion,
  promptVersion: FULL_BASE_PROMPT_VERSION,
  model: aiSetting.model || ""
});

const buildQuoteDelegationResult = ({
  aiSetting,
  message,
  baseSentToModel,
  baseVersion,
  rewrite
}: {
  aiSetting: AiSetting;
  message: string;
  baseSentToModel: boolean;
  baseVersion: string;
  rewrite: KnowledgeBaseQueryRewrite;
}): FullBaseGroundingResult => ({
  intent: rewrite.detectedIntent,
  userAsked: message,
  foundInBase: true,
  baseSectionsUsed: ["Orcamento personalizado"],
  shouldAnswer: false,
  needsHuman: false,
  needsQuoteCalculation: true,
  shouldTransfer: false,
  customerAnswer: "",
  reasoningSummary: "Orcamento delegado ao fluxo oficial para coletar dados e chamar calculadora.",
  baseSentToModel,
  baseVersion,
  promptVersion: FULL_BASE_PROMPT_VERSION,
  model: aiSetting.model || ""
});

const buildFullBasePrompt = ({
  aiSetting,
  message,
  history,
  structuredContext,
  baseText,
  rewrite
}: {
  aiSetting: AiSetting;
  message: string;
  history: string;
  structuredContext: string;
  baseText: string;
  rewrite: KnowledgeBaseQueryRewrite;
}): string => [
  "SYSTEM:",
  aiSetting.behaviorPrompt || "",
  aiSetting.systemPrompt || "",
  "",
  "DEVELOPER:",
  "Voce recebeu a BASE COMPLETA DA SALINHA MEIER.",
  "Antes de responder, entenda a pergunta atual do cliente e verifique se a informacao existe na base completa.",
  "A PERGUNTA_ATUAL e a tarefa dominante. Use historico apenas para resolver referencia curta, nunca para trocar o assunto perguntado agora.",
  "Responda somente com base na BASE COMPLETA DA SALINHA MEIER e resultados de ferramentas oficiais.",
  "Nao invente informacao.",
  "Nao responda assuntos que nao foram perguntados.",
  "Se o cliente perguntar uma coisa simples, responda apenas aquela coisa.",
  "Se a informacao nao estiver na base, use exatamente o fallback seguro.",
  "Nunca mencione base, prompt, sistema, API ou JSON para o cliente.",
  "Retorne somente JSON valido, sem markdown.",
  "O backend enviara ao WhatsApp apenas customerAnswer.",
  "A IA nao pode calcular desconto, aplicar desconto, confirmar reserva, confirmar disponibilidade, confirmar pagamento, inventar horario, criar condicao de pagamento ou criar valor fora da base.",
  "Orcamento personalizado: colete quantidade de pessoas, quantidade de dias/encontros e quantidade de horas por dia/encontro. Quando os 3 dados existirem, marque needsQuoteCalculation=true e nao calcule manualmente.",
  "Se a intencao esperada abaixo for sobre pagamento, responda pagamento. Se for endereco, responda endereco. Se for capacidade, responda capacidade. Nao misture tabela, endereco, estrutura ou reserva se nao foi perguntado.",
  "",
  "TAREFA_ATUAL_DIRECIONADA:",
  JSON.stringify({
    userMessage: message,
    detectedIntent: rewrite.detectedIntent,
    directedKnowledgeBaseQuery: rewrite.directedKnowledgeBaseQuery,
    entities: rewrite.entities,
    requiresKnowledgeBaseSearch: rewrite.requiresKnowledgeBaseSearch
  }),
  "",
  "EXEMPLOS_DE_FOCO_OBRIGATORIO:",
  "Cliente: tem ar? Responder somente se a sala inclui ar-condicionado.",
  "Cliente: onde fica? Responder endereco e referencias.",
  "Cliente: cabe 25? Responder capacidade maxima e encaminhar avaliacao.",
  "Cliente: aceita pix? Responder formas de pagamento.",
  "Cliente: como reserva? Responder regra dos 50%.",
  "",
  "SCHEMA_JSON_OBRIGATORIO:",
  JSON.stringify({
    intent: "string",
    userAsked: "string",
    foundInBase: true,
    baseSectionsUsed: ["string"],
    shouldAnswer: true,
    needsHuman: false,
    needsQuoteCalculation: false,
    shouldTransfer: false,
    customerAnswer: "string",
    reasoningSummary: "string"
  }),
  "",
  "CONTEXTO_RECENTE:",
  lastRelevantHistory(history) || "Sem historico recente.",
  "",
  "ESTADO_MINIMO:",
  structuredContext || "Sem estado minimo registrado.",
  "",
  "BASE_COMPLETA_SALINHA_MEIER:",
  baseText || "BASE VAZIA.",
  "",
  "USER:",
  message
].join("\n");

const FullBaseGroundingMariService = async ({
  ticket,
  aiSetting,
  message,
  history,
  structuredContext,
  contactName
}: Request): Promise<FullBaseGroundingResult | null> => {
  const { baseText, baseVersion } = await getFullBase();
  const baseSentToModel = Boolean(baseText.trim());
  const rewrite = BuildKnowledgeBaseQueryService({
    userMessage: message,
    history,
    structuredContext
  });
  const prompt = buildFullBasePrompt({
    aiSetting,
    message,
    history,
    structuredContext,
    baseText,
    rewrite
  });

  if (!baseSentToModel) {
    const fallback = buildSafeFallbackResult({
      aiSetting,
      message,
      baseSentToModel,
      baseVersion,
      rewrite
    });

    logger.warn(
      {
        ticketId: ticket.id,
        contactId: ticket.contactId,
        assistantId: aiSetting.id,
        userMessage: message,
        detectedIntent: rewrite.detectedIntent,
        directedKnowledgeBaseQuery: rewrite.directedKnowledgeBaseQuery,
        baseSentToModel,
        baseVersion,
        promptVersion: FULL_BASE_PROMPT_VERSION,
        retrievedChunks: [],
        finalAnswer: fallback.customerAnswer,
        customerAnswer: fallback.customerAnswer,
        grounded: false,
        usedOldFlow: false
      },
      "[AI FULL BASE] Base unavailable, safe fallback"
    );

    return fallback;
  }

  if (["request_custom_quote", "provide_quote_data"].includes(rewrite.detectedIntent)) {
    const delegated = buildQuoteDelegationResult({
      aiSetting,
      message,
      baseSentToModel,
      baseVersion,
      rewrite
    });

    logger.info(
      {
        ticketId: ticket.id,
        contactId: ticket.contactId,
        assistantId: aiSetting.id,
        userMessage: message,
        detectedIntent: rewrite.detectedIntent,
        directedKnowledgeBaseQuery: rewrite.directedKnowledgeBaseQuery,
        entities: rewrite.entities,
        baseSentToModel,
        baseVersion,
        promptVersion: FULL_BASE_PROMPT_VERSION,
        retrievedChunks: delegated.baseSectionsUsed,
        needsQuoteCalculation: true,
        finalAnswer: "",
        customerAnswer: "",
        grounded: true,
        sentToWhatsapp: false,
        usedOldFlow: false
      },
      "[AI FULL BASE] Quote delegated to official flow"
    );

    return delegated;
  }

  const rawAnswer = await GenerateAiResponseService({
    aiSettingId: aiSetting.id,
    message: prompt,
    contactName,
    ticketId: ticket.id,
      skipKnowledgeSearch: true,
      includeRecentMessages: false,
      jsonMode: true,
      logMetadata: {
        action: "full_base_grounding",
        contextMessageCount: lastRelevantHistory(history).split("\n").filter(Boolean).length,
        intent: rewrite.detectedIntent,
        decisionReason: rewrite.directedKnowledgeBaseQuery
      }
    });

  const parsed = parseJsonObject(rawAnswer || "");
  if (!parsed) {
    const fallback = buildSafeFallbackResult({
      aiSetting,
      message,
      baseSentToModel,
      baseVersion,
      rewrite
    });

    logger.warn(
      {
        ticketId: ticket.id,
        contactId: ticket.contactId,
        assistantId: aiSetting.id,
        userMessage: message,
        detectedIntent: rewrite.detectedIntent,
        directedKnowledgeBaseQuery: rewrite.directedKnowledgeBaseQuery,
        baseSentToModel,
        baseVersion,
        promptVersion: FULL_BASE_PROMPT_VERSION,
        rawAnswer,
        retrievedChunks: [],
        finalAnswer: fallback.customerAnswer,
        customerAnswer: fallback.customerAnswer,
        grounded: false,
        usedOldFlow: false
      },
      "[AI FULL BASE] Invalid JSON returned"
    );

    return fallback;
  }

  const result: FullBaseGroundingResult = {
    intent: rewrite.detectedIntent || String(parsed.intent || "knowledge_base_question"),
    userAsked: String(parsed.userAsked || message),
    foundInBase: parsed.foundInBase === true,
    baseSectionsUsed: Array.isArray(parsed.baseSectionsUsed)
      ? parsed.baseSectionsUsed.map(String)
      : [],
    shouldAnswer: parsed.shouldAnswer !== false,
    needsHuman: parsed.needsHuman === true,
    needsQuoteCalculation: parsed.needsQuoteCalculation === true,
    shouldTransfer: parsed.shouldTransfer === true,
    customerAnswer: String(parsed.customerAnswer || "").trim(),
    reasoningSummary: parsed.reasoningSummary ? String(parsed.reasoningSummary) : undefined,
    baseSentToModel,
    baseVersion,
    promptVersion: FULL_BASE_PROMPT_VERSION,
    model: aiSetting.model || ""
  };

  if (!result.customerAnswer) {
    result.customerAnswer = SAFE_NOT_FOUND;
    result.foundInBase = false;
  }

  if (
    rewrite.detectedIntent === "request_payment_info" &&
    asksAbout(message, [/\bdivide\b/, /\bparcel/])
  ) {
    result.foundInBase = true;
    result.baseSectionsUsed = ["Reserva e pagamento", "Formas de pagamento"];
    result.needsHuman = true;
    result.customerAnswer = "A Salinha Meier aceita Pix, cartao de debito e cartao de credito. Para reservar, e necessario pagar 50% do valor do orcamento; os 50% restantes devem ser pagos ate 3 dias antes da data. Sobre dividir/parcelar, posso encaminhar para a equipe verificar.";
    result.reasoningSummary = [
      result.reasoningSummary,
      "Resposta substituida por guardrail local para nao inventar regra de parcelamento."
    ].filter(Boolean).join(" ");
  }

  if (
    rewrite.detectedIntent === "request_reservation_rules" &&
    asksAbout(message, [/\bautomatico\b/, /\bautomaticamente\b/])
  ) {
    result.foundInBase = true;
    result.baseSectionsUsed = ["Reserva e pagamento"];
    result.needsHuman = true;
    result.customerAnswer = "Nao. A reserva nao fica confirmada automaticamente. Para reservar, e necessario pagar 50% do valor do orcamento; os 50% restantes devem ser pagos ate 3 dias antes da data. A disponibilidade, reserva e pagamento precisam ser validados pela equipe.";
    result.reasoningSummary = [
      result.reasoningSummary,
      "Resposta ajustada para deixar claro que reserva automatica precisa validacao da equipe."
    ].filter(Boolean).join(" ");
  }

  const deterministicAnswer = buildDeterministicGroundedAnswer(rewrite, message);
  const answerIsAligned = answerMatchesIntent(
    rewrite.detectedIntent,
    message,
    result.customerAnswer
  );

  if (deterministicAnswer && (!answerIsAligned || !result.foundInBase)) {
    result.foundInBase = deterministicAnswer.foundInBase ?? result.foundInBase;
    result.baseSectionsUsed = deterministicAnswer.baseSectionsUsed || result.baseSectionsUsed;
    result.needsHuman = deterministicAnswer.needsHuman ?? result.needsHuman;
    result.customerAnswer = deterministicAnswer.customerAnswer || result.customerAnswer;
    result.reasoningSummary = [
      result.reasoningSummary,
      "Resposta substituida por guardrail local porque a saida do modelo nao respondia a pergunta atual."
    ].filter(Boolean).join(" ");
  }

  if (isFactQuestion(rewrite.detectedIntent, message) && !result.foundInBase) {
    result.customerAnswer = SAFE_NOT_FOUND;
  }

  if (!validatesCriticalAnswer(rewrite.detectedIntent, result.customerAnswer)) {
    result.customerAnswer = SAFE_NOT_FOUND;
    result.foundInBase = false;
    result.needsHuman = true;
  }

  logger.info(
    {
      ticketId: ticket.id,
      contactId: ticket.contactId,
      companyId: null,
      assistantId: aiSetting.id,
      userMessage: message,
      baseSentToModel: result.baseSentToModel,
      baseVersion: result.baseVersion,
      promptVersion: result.promptVersion,
      model: result.model,
      intent: result.intent,
      detectedIntent: rewrite.detectedIntent,
      directedKnowledgeBaseQuery: rewrite.directedKnowledgeBaseQuery,
      entities: rewrite.entities,
      foundInBase: result.foundInBase,
      baseSectionsUsed: result.baseSectionsUsed,
      retrievedChunks: result.baseSectionsUsed,
      needsHuman: result.needsHuman,
      needsQuoteCalculation: result.needsQuoteCalculation,
      shouldTransfer: result.shouldTransfer,
      finalAnswer: result.customerAnswer,
      customerAnswer: result.customerAnswer,
      grounded: result.baseSentToModel && result.foundInBase,
      sentToWhatsapp: true,
      usedOldFlow: false
    },
    "[AI FULL BASE] Grounded answer ready"
  );

  return result;
};

export default FullBaseGroundingMariService;
