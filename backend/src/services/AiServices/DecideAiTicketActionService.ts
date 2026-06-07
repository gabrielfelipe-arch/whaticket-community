import AiSetting from "../../models/AiSetting";
import KnowledgeBaseArticle from "../../models/KnowledgeBaseArticle";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import GenerateAiResponseService, { AiProviderError } from "./GenerateAiResponseService";
import SearchKnowledgeBaseService, { KnowledgeFragment } from "./SearchKnowledgeBaseService";
import { Op } from "sequelize";
import { htmlToWhatsAppText } from "../../utils/knowledgeFormatting";

export type AiTicketAction =
  | "responder_com_base"
  | "pedir_confirmacao"
  | "pedir_mais_informacoes"
  | "encaminhar_atendente"
  | "encerrar_atendimento"
  | "sem_resposta_segura"
  | "nao_responder";

export interface AiDecisionOption {
  numero: string;
  valor: string;
}

export interface AiDecision {
  intencao: string;
  confianca: "baixa" | "media" | "alta";
  mensagemInterpretada: string;
  contexto: string;
  baseEncontrada: boolean;
  respostaSegura: boolean;
  acao: AiTicketAction;
  motivo: string;
  resposta?: string;
  perguntaConfirmacao?: string;
  opcoes?: AiDecisionOption[];
  knowledgeIds?: number[];
}

interface Request {
  ticket: Ticket;
  message: string;
  contactName?: string;
  aiSettingId?: number | null;
}

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const extractJson = (content: string): any | null => {
  try {
    return JSON.parse(content);
  } catch (err) {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch (parseErr) {
      return null;
    }
  }
};

const safeAction = (value: string): AiTicketAction => {
  const actions: AiTicketAction[] = [
    "responder_com_base",
    "pedir_confirmacao",
    "pedir_mais_informacoes",
    "encaminhar_atendente",
    "encerrar_atendimento",
    "sem_resposta_segura",
    "nao_responder"
  ];

  return actions.includes(value as AiTicketAction)
    ? (value as AiTicketAction)
    : "sem_resposta_segura";
};

const getParsedTextResponse = (parsed: any): string | undefined => {
  const value =
    parsed?.resposta ||
    parsed?.response_value ||
    parsed?.message ||
    parsed?.mensagem ||
    parsed?.answer;

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const buildQualificationQuestion = (
  aiSetting: AiSetting,
  message: string,
  reason: string
): AiDecision => {
  const company = aiSetting.companyName || "nosso atendimento";
  const service = aiSetting.serviceType
    ? ` sobre ${aiSetting.serviceType}`
    : "";

  return {
    intencao: "diagnostico_inicial",
    confianca: "media",
    mensagemInterpretada: message,
    contexto: "A mensagem ainda nao trouxe dados suficientes para localizar uma orientacao segura na base.",
    baseEncontrada: false,
    respostaSegura: true,
    acao: "pedir_mais_informacoes",
    motivo: reason,
    resposta: [
      `Para eu te orientar melhor${service} e encontrar a opcao mais adequada da ${company}, me diga um pouco mais sobre o que voce precisa.`,
      "Qual atividade ou objetivo voce pretende realizar, e esse uso seria pontual ou recorrente?"
    ].join("\n\n")
  };
};

const parseOptions = (value: string | null | undefined): AiDecisionOption[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const getRecentHistory = async (ticket: Ticket): Promise<string> => {
  const where: any = { ticketId: ticket.id };

  if (ticket.aiStartedAt) {
    where.createdAt = { [Op.gte]: ticket.aiStartedAt };
  }

  const messages = await Message.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: 24
  });

  return messages
    .reverse()
    .map(message => {
      const body = message.body || "";
      const senderType = message.senderType || "";
      const sender =
        senderType === "customer" || !message.fromMe
          ? "CLIENTE"
          : senderType === "ai"
            ? "IA"
            : senderType === "human"
              ? "ATENDENTE HUMANO"
              : senderType === "system" || senderType === "ura" || String(message.id || "").startsWith("ticket-history-") ||
                  /atendimento encerrado|atendimento assumido|transferido|\bfila\b|\bura\b|\bmenu\b|seja bem-vindo|mensagem de opcao invalida|mensagem de opção inválida/i.test(body)
                ? "SISTEMA"
                : "IA";

      return `[${sender} - ${new Date(message.createdAt).toISOString()}]\n${body}`;
    })
    .join("\n");
};

const hasHumanMessageInCurrentAiSession = async (ticket: Ticket): Promise<boolean> => {
  const where: any = {
    ticketId: ticket.id,
    senderType: "human"
  };

  if (ticket.aiStartedAt) {
    where.createdAt = { [Op.gte]: ticket.aiStartedAt };
  }

  const message = await Message.findOne({
    where,
    order: [["createdAt", "DESC"]]
  });

  return !!message;
};

const buildKnowledgeText = (fragments: KnowledgeFragment[]): string =>
  fragments
    .map((fragment, index) => [
      `#${index + 1} ${fragment.title}`,
      fragment.tags ? `Tags: ${fragment.tags}` : "",
      fragment.fragment
    ].filter(Boolean).join("\n"))
    .join("\n\n");

const buildTicketStateText = (ticket: Ticket): string => [
  `Ultima acao da IA: ${ticket.lastAiAction || "nao registrada"}`,
  `Ultima intencao: ${ticket.lastAiIntent || "nao registrada"}`,
  `Tipo da ultima pergunta: ${ticket.lastAiQuestionType || "nenhuma"}`,
  `Resposta esperada: ${ticket.lastAiExpectedReply || "nao definida"}`,
  `IA perguntou se podia ajudar em algo mais: ${ticket.lastAiAskedMoreHelp ? "sim" : "nao"}`,
  ticket.lastAiMessage ? `Ultima mensagem da IA: ${ticket.lastAiMessage}` : "",
  ticket.aiConversationSummary ? `Resumo do atendimento atual: ${ticket.aiConversationSummary}` : ""
].filter(Boolean).join("\n");

const cleanKnowledgeFragment = (value = ""): string =>
  value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

const limitCustomerText = (value = "", maxLength = 1800): string => {
  const text = value.trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
};

const getCustomerFallbackFragment = (article?: KnowledgeFragment): string => {
  if (!article) return "";

  const formattedHtml = article.contentHtml ? htmlToWhatsAppText(article.contentHtml) : "";
  const preferred = formattedHtml && formattedHtml.length <= 2200
    ? formattedHtml
    : cleanKnowledgeFragment(article.fragment || "");

  return limitCustomerText(preferred || formattedHtml || "", 1800);
};

const cleanCustomerAiAnswer = (value = ""): string => {
  let answer = value
    .replace(/\r\n/g, "\n")
    .replace(/^\u200e+/, "")
    .trim();

  const forbiddenBlockPattern = /^(?:#+\s*)?(?:base\s+de\s+conhecimento|conhecimento\s+encontrado|manual|artigo\s+encontrado|documento\s+interno)\s*:?\s*[\s\S]*?(?:-{3,}|={3,}|\n\s*\n(?=(?:entendi|certo|ol[aá]|nesse|para|a orienta[cç][aã]o|pelo que|conforme)\b))/i;
  answer = answer.replace(forbiddenBlockPattern, "").trim();

  answer = answer
    .replace(/^\s*(?:de acordo com|conforme|segundo)\s+a\s+(?:base\s+de\s+conhecimento|base|manual|documento\s+interno)\s*:?\s*/i, "")
    .replace(/^\s*(?:base\s+de\s+conhecimento|conhecimento\s+encontrado|manual|documento\s+interno|artigo\s+encontrado)\s*:?\s*/gim, "")
    .replace(/\b(?:base\s+de\s+conhecimento|RAG|prompt|documento\s+interno|artigo\s+encontrado|manual cadastrado)\b\s*:?\s*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return answer;
};

const buildKnowledgeFallbackDecision = (
  message: string,
  articles: KnowledgeFragment[],
  reason: string
): AiDecision => {
  const mainArticle = articles[0];
  const fragment = getCustomerFallbackFragment(mainArticle);

  return {
    intencao: "pergunta_sobre_produto_ou_servico",
    confianca: "media",
    mensagemInterpretada: message,
    contexto: "A base de conhecimento encontrou um artigo relevante, mas a IA nao retornou decisao estruturada.",
    baseEncontrada: true,
    respostaSegura: !!fragment,
    acao: fragment ? "responder_com_base" : "sem_resposta_segura",
    motivo: reason,
    knowledgeIds: articles.map(article => article.id),
    resposta: fragment
      ? [
          "Encontrei uma orientacao que pode te ajudar:",
          "",
          fragment,
          "",
          "Consegue verificar dessa forma?"
        ].join("\n")
      : undefined
  };
};

const AI_UNAVAILABLE_HANDOFF_MESSAGE =
  "O servico de IA esta indisponivel no momento. Vou transferir seu atendimento para um atendente.";

const buildProviderErrorKnowledgeFallbackDecision = (
  message: string,
  articles: KnowledgeFragment[],
  reason: string
): AiDecision => {
  return {
    intencao: "erro_api_ia",
    confianca: "alta",
    mensagemInterpretada: message,
    contexto: "O provedor de IA ficou indisponivel durante a geracao da resposta.",
    baseEncontrada: articles.length > 0,
    respostaSegura: false,
    acao: "encaminhar_atendente",
    motivo: reason,
    knowledgeIds: articles.map(article => article.id),
    resposta: AI_UNAVAILABLE_HANDOFF_MESSAGE
  };
};

const parseKnowledgeIds = (value: string | null | undefined): number[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map(id => Number(id)).filter(Number.isFinite)
      : [];
  } catch (error) {
    return [];
  }
};

const getPreviousKnowledgeArticles = async (
  ticket: Ticket
): Promise<KnowledgeFragment[]> => {
  const ids = parseKnowledgeIds(ticket.lastAiKnowledgeIds);
  if (!ids.length) return [];

  const articles = await KnowledgeBaseArticle.findAll({
    where: { id: ids, active: true }
  });

  return articles.map(article => ({
    id: article.id,
    title: article.title,
    tags: article.tags,
    fragment: article.content,
    contentHtml: article.contentHtml,
    rank: 0.3,
    source: "fallback"
  }));
};

const buildAnswerPrompt = ({
  message,
  history,
  knowledge,
  ticket,
  aiSetting
}: {
  message: string;
  history: string;
  knowledge: string;
  ticket: Ticket;
  aiSetting: AiSetting;
}): string => [
  "Escreva a resposta final para o cliente em portugues do Brasil.",
  "Use linguagem natural, educada, objetiva e humana.",
  "O atendimento pode ser de qualquer ramo: vendas, suporte, clinica, escola, loja, oficina, servicos, delivery, imobiliaria, financeiro, cobranca, agendamento, promocao ou relacionamento.",
  "Adapte a resposta ao tipo de atendimento configurado, a mensagem do cliente e a base encontrada.",
  "Use somente as INFORMACOES INTERNAS ENCONTRADAS.",
  "Nao copie a base literalmente quando puder explicar melhor. Reescreva de forma clara, humana e especifica para a pergunta do cliente.",
  "Nao invente valores, prazos, links, telefones, regras, procedimentos ou nomes que nao estejam na base.",
  "Pode explicar opcoes, sugerir proximos passos, listar possiveis causas, orientar uma triagem inicial, informar promocoes ou conduzir uma venda somente quando isso estiver sustentado pela base.",
  "Nao diga que consultou a base de conhecimento, banco de dados, RAG ou prompt.",
  "Nao escreva titulos como 'Base de Conhecimento', 'Manual', 'Artigo encontrado' ou 'Documento interno'. Esses blocos sao internos e nunca podem aparecer para o cliente.",
  "Nao cole o bloco interno da base na resposta. Extraia apenas a orientacao util e responda como atendente.",
  "Nao retorne JSON, markdown tecnico, tags internas ou explicacoes do sistema.",
  `Mensagem atual do cliente, que deve guiar a resposta: ${message}`,
  "A mensagem atual tem prioridade sobre respostas anteriores. Se ela responder uma pergunta que a IA acabou de fazer, trate como continuidade e avance a conversa.",
  "Se o cliente escolher uma opcao textual como 'por hora', 'mensal', 'pacote', '10 horas' ou informar uma quantidade como '3 horas', use essa informacao para responder. Nao pergunte novamente a mesma coisa.",
  "Se a pergunta pedir calculo simples e a base trouxer o numero necessario, calcule o resultado e mostre a conta de forma curta. Exemplo: diaria de R$ 300 por 10 dias = R$ 3.000.",
  "Se a base trouxer plano avulso de 2 horas por R$ 140 e o cliente pedir valor por hora, explique que o plano avulso cadastrado e de 2 horas por R$ 140. Se pedir 3 horas e nao houver preco de hora adicional, informe o valor cadastrado e diga que o valor exato para 3 horas precisa ser confirmado por atendente.",
  "Se a pergunta atual for complemento da resposta anterior, use o historico recente para entender a continuidade. Exemplo: depois de informar diaria, 'e para 10 dias?' pede calculo com a diaria anterior.",
  "Se a pergunta for diferente da anterior, responda o novo assunto usando a base encontrada; nao repita resposta antiga.",
  ticket.lastAiMessage
    ? `Ultima resposta enviada pela IA, para evitar repeticao literal:\n${ticket.lastAiMessage}`
    : "",
  "Se sua resposta ficaria igual ou muito parecida com a ultima resposta da IA, gere uma resposta diferente e mais especifica para a mensagem atual.",
  "Se a base nao tiver informacao suficiente para responder, diga que vai encaminhar para um atendente.",
  `Estado do atendimento atual:\n${buildTicketStateText(ticket)}`,
  "Quando responder uma duvida com seguranca, finalize com uma pergunta natural de checagem ou continuidade, sem repetir sempre a mesma frase.",
  "Nao inclua [FECHAR TICKET] na resposta de uma duvida recem respondida. O fechamento deve acontecer somente se o cliente confirmar depois que nao precisa de mais nada, ou pedir explicitamente para fechar.",
  aiSetting.name ? `Nome da IA, se precisar se apresentar: ${aiSetting.name}.` : "",
  aiSetting.companyName ? `Empresa ou servico: ${aiSetting.companyName}.` : "",
  `Historico recente:\n${history || "Sem historico."}`,
  `INFORMACOES INTERNAS ENCONTRADAS:\n${knowledge}`,
  "Resposta final ao cliente:"
].filter(Boolean).join("\n\n");

const generateAnswerFromKnowledge = async ({
  aiSetting,
  ticket,
  message,
  contactName,
  history,
  knowledge
}: {
  aiSetting: AiSetting;
  ticket: Ticket;
  message: string;
  contactName?: string;
  history: string;
  knowledge: string;
}): Promise<string | null> => {
  if (!knowledge) return null;

  const answerPrompt = buildAnswerPrompt({
    message,
    history,
    knowledge,
    ticket,
    aiSetting
  });

  try {
    const answer = await GenerateAiResponseService({
      aiSettingId: aiSetting.id,
      message: answerPrompt,
      contactName,
      ticketId: ticket.id,
      skipKnowledgeSearch: true,
      includeRecentMessages: false,
      logMetadata: {
        action: "gerar_resposta_final",
        knowledgeIds: ticket.lastAiKnowledgeIds ? parseKnowledgeIds(ticket.lastAiKnowledgeIds) : undefined,
        contextMessageCount: history.split("\n").filter(Boolean).length
      }
    });

    return cleanCustomerAiAnswer(answer || "") || null;
  } catch (error) {
    if (error instanceof AiProviderError) {
      throw error;
    }

    logger.warn(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        error: error instanceof Error ? error.message : String(error)
      },
      "[AI ANSWER] Failed to generate final answer from knowledge"
    );
    return null;
  }
};

const withGeneratedKnowledgeAnswer = async ({
  decision,
  aiSetting,
  ticket,
  message,
  contactName,
  history,
  knowledge,
  articles
}: {
  decision: AiDecision;
  aiSetting: AiSetting;
  ticket: Ticket;
  message: string;
  contactName?: string;
  history: string;
  knowledge: string;
  articles: KnowledgeFragment[];
}): Promise<AiDecision> => {
  let generatedAnswer: string | null = null;

  try {
    generatedAnswer = await generateAnswerFromKnowledge({
      aiSetting,
      ticket,
      message,
      contactName,
      history,
      knowledge
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      logger.warn(
        {
          ticketId: ticket.id,
          aiSettingId: aiSetting.id,
          provider: error.provider,
          status: error.status,
          code: error.code
        },
        "[AI ACTION] Provider failed during final answer, handoff requested"
      );

      return {
        ...decision,
        intencao: "erro_api_ia",
        confianca: "alta",
        contexto: "O provedor de IA ficou indisponivel durante a resposta final.",
        baseEncontrada: articles.length > 0,
        respostaSegura: false,
        acao: "encaminhar_atendente",
        motivo: `Servico de IA indisponivel: ${error.message}`,
        resposta: AI_UNAVAILABLE_HANDOFF_MESSAGE,
        knowledgeIds: articles.map(article => article.id)
      };
    }

    throw error;
  }

  if (generatedAnswer) {
    logger.info(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        action: "responder_com_base",
        responsePreview: generatedAnswer.slice(0, 240)
      },
      "[AI ANSWER] Final answer generated from knowledge"
    );

    return {
      ...decision,
      acao: "responder_com_base",
      baseEncontrada: true,
      respostaSegura: true,
      resposta: generatedAnswer,
      motivo: decision.motivo || "Resposta final gerada com base nos artigos encontrados."
    };
  }

  if (articles.length > 0) {
    return buildKnowledgeFallbackDecision(
      message,
      articles,
      decision.motivo || "Fallback local: nao foi possivel gerar resposta humanizada."
    );
  }

  return decision;
};

const isExplicitHumanRequest = (message: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  return (
    /\b(quero|preciso|pode|consegue|gostaria|desejo)\s+(falar\s+com\s+)?(um\s+|uma\s+)?(atendente|humano|pessoa|alguem)\b/.test(normalized) ||
    /\b(falar|fala|conversar|conversa)\s+com\s+(um\s+|uma\s+)?(atendente|humano|pessoa|alguem)\b/.test(normalized) ||
    /\b(me\s+)?(transfere|transferir|encaminha|encaminhar|passa|passar)(\s+(para|pra|pro|a|ao)?\s*(um\s+|uma\s+)?(atendente|humano|pessoa|alguem)?)?\b/.test(normalized) ||
    /\b(atendimento|suporte)\s+humano\b/.test(normalized) ||
    /\b(nao|n)\s+quero\s+(robo|ia|bot)\b/.test(normalized)
  );
};

const isExplicitCloseRequest = (message: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  if (/\b(erro|problema|falha|nao consigo|n consigo|dificuldade)\s+(ao|para|pra|de)?\s*(fechar|finalizar|encerrar|concluir)\b/.test(normalized)) {
    return false;
  }

  return /^(encerrar|encerra|finalizar|finaliza|fechar|fecha|concluir|conclui|pode encerrar|pode finalizar|pode fechar|pode concluir|quero encerrar|quero finalizar|quero fechar|quero concluir|encerra atendimento|encerrar atendimento|finaliza atendimento|finalizar atendimento|fecha atendimento|fechar atendimento)$/.test(normalized);
};

const shouldPreferKnowledgeFallback = (
  decision: AiDecision,
  message: string,
  articles: KnowledgeFragment[]
): boolean => {
  if (!articles.length) return false;
  if (isExplicitHumanRequest(message)) return false;
  if (decision.acao === "encerrar_atendimento" || decision.acao === "nao_responder") return false;
  if (decision.acao === "pedir_confirmacao" && decision.perguntaConfirmacao && decision.opcoes?.length) return false;

  return (
    decision.acao === "sem_resposta_segura" ||
    decision.acao === "encaminhar_atendente" ||
    (decision.acao === "responder_com_base" && (!decision.respostaSegura || !decision.resposta))
  );
};

const historyHasRecentAiAnswer = (history: string): boolean => {
  const lines = history
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const relevantAiLines = lines.filter(line =>
    (line.startsWith("IA:") || line.startsWith("IA/Sistema:") || line.startsWith("[IA")) &&
    !/menu|opcao|opção|ola como posso ajudar|seja bem-vindo/i.test(line)
  );

  return relevantAiLines.length > 0;
};

const lastAiAskedToFinish = (history: string): boolean => {
  const lines = history
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
  const lastAiLine =
    [...lines].reverse().find(line => line.startsWith("IA:") || line.startsWith("IA/Sistema:") || line.startsWith("[IA")) || "";

  return /posso finalizar|pode finalizar|finalizar seu atendimento|posso encerrar|pode encerrar|ajudo em algo mais|ajuda em algo mais|algo mais|mais alguma coisa|posso ajudar em mais alguma coisa|consegui te ajudar|consegui ajudar|te ajudei|essa informacao te ajudou|essa informação te ajudou/i.test(lastAiLine);
};

const isAffirmativeShortAnswer = (normalized: string): boolean =>
  /^(sim|s|ss|certo|ok|okay|ta bom|esta bom|beleza|blz|perfeito|show|deu certo|funcionou|resolveu|resolvido|ajudou|me ajudou|obrigado|obrigada|obg|valeu|agradeco)$/.test(normalized);

const isNegativeShortAnswer = (normalized: string): boolean =>
  /^(nao|n|nao obrigado|nao obrigada|n obrigado|n obrigada|nao obg|n obg|nao valeu|n valeu|nao era so isso|n era so isso|nao so isso|n so isso|so isso|era so isso|era isso|nada mais)$/.test(normalized);

const hasUnresolvedMeaning = (normalized: string): boolean =>
  /\b(nao resolveu|n resolveu|nao ajudou|n ajudou|nao deu certo|n deu certo|continua com problema|ainda nao|nao funcionou|n funcionou|mas nao resolveu|mas n resolveu|obrigado mas nao|obg mas nao)\b/.test(normalized);

const isContextualClosingIntent = (
  message: string,
  history: string,
  ticket: Ticket,
  pendingOptions: AiDecisionOption[]
): boolean => {
  if (pendingOptions.length > 0) return false;

  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;
  if (hasUnresolvedMeaning(normalized)) return false;

  const explicitClose =
    /\b(pode finalizar|pode fechar|pode encerrar|pode sim finalizar|pode sim fechar|pode sim encerrar|ja pode finalizar|ja pode fechar|ja pode encerrar|quero finalizar|quero fechar|quero encerrar|finaliza o atendimento|fechar atendimento|encerra o atendimento|encerrar atendimento)\b/.test(normalized) ||
    /\b(era so isso|era isso|so isso|somente isso|nao preciso de mais nada|nao quero mais nada|nada mais|tudo certo|tudo resolvido|resolveu|resolvido)\b/.test(normalized);

  if (explicitClose) return true;

  const hasNewQuestion =
    /(\?)|\b(qual|quanto|como|quando|onde|porque|por que|me explica|me passa|manda|preciso|quero saber|ainda|mas|porem)\b/.test(normalized);

  if (hasNewQuestion) return false;

  const isNegativeAnswerToMoreHelp =
    ticket.lastAiQuestionType !== "satisfaction_check" &&
    !/consegui te ajudar|consegui ajudar|te ajudei|essa orientacao te ajudou|essa informacao te ajudou|isso te ajuda|isso resolve|conseguiu verificar|consegue verificar dessa forma|funcionou/i.test(normalizeText(ticket.lastAiMessage || "")) &&
    (ticket.lastAiQuestionType === "more_help" ||
      ticket.lastAiAskedMoreHelp ||
      lastAiAskedToFinish(history)) &&
    isNegativeShortAnswer(normalized);

  if (isNegativeAnswerToMoreHelp) return true;

  const isPositiveAnswerToSatisfactionCheck =
    ticket.lastAiQuestionType === "satisfaction_check" &&
    isAffirmativeShortAnswer(normalized);

  if (isPositiveAnswerToSatisfactionCheck) return true;

  if (["missing_info", "confirmacao_opcao"].includes(String(ticket.lastAiQuestionType || ""))) {
    return false;
  }

  const isSatisfactionAfterAnswer =
    historyHasRecentAiAnswer(history) &&
    /\b(certo|ok|okay|ta bom|esta bom|beleza|blz|perfeito|show|entendi|combinado|obrigado|obrigada|obg|valeu|agradeco|agradeço)\b/.test(normalized) &&
    normalized.length <= 80;

  return isSatisfactionAfterAnswer;
};

const isPositiveAnswerToMoreHelp = (message: string, ticket: Ticket): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (ticket.lastAiQuestionType !== "more_help" && !ticket.lastAiAskedMoreHelp) return false;

  return /^(sim|s|ss|claro|pode|quero|preciso|tenho outra duvida|tenho mais uma duvida)$/.test(normalized);
};

const isContextualHandoffIntent = (message: string, history: string, ticket: Ticket): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    ticket.lastAiQuestionType === "satisfaction_check" &&
    /^(nao|n|nao ajudou|nao resolveu|n ajudou|n resolveu|nao deu certo|n deu certo)$/.test(normalized)
  ) {
    return true;
  }

  if (!historyHasRecentAiAnswer(history)) return false;

  return /\b(nao resolveu|n resolveu|nao ajudou|n ajudou|nao deu certo|n deu certo|continua com problema|ainda nao|nao funcionou|n funcionou)\b/.test(normalized);
};

const buildDecisionPrompt = ({
  message,
  history,
  knowledge,
  aiSetting,
  ticket,
  queue,
  pendingOptions
}: {
  message: string;
  history: string;
  knowledge: string;
  aiSetting: AiSetting;
  ticket: Ticket;
  queue: Queue | null;
  pendingOptions: AiDecisionOption[];
}): string => {
  const pendingQuestion = pendingOptions.length
    ? `Existe uma pergunta pendente da IA. Opcoes: ${JSON.stringify(pendingOptions)}. Interprete a resposta do cliente considerando essas opcoes.`
    : "Nao existe pergunta pendente da IA.";

  return [
    "Voce e uma camada de decisao de atendimento com IA para qualquer ramo de negocio. Nao responda em texto livre fora do JSON.",
    "O atendimento pode ser de vendas, suporte, comercial, clinica, escola, oficina, loja, servicos, delivery, imobiliaria, financeiro, cobranca, agendamento, promocao ou relacionamento.",
    "Nao limite sua interpretacao a suporte tecnico. Identifique a intencao conforme a configuracao, o historico do ticket atual, a ultima mensagem da IA e a base de conhecimento.",
    "Nao assuma que o atendimento e de suporte tecnico, comercial, clinica, escola, loja ou qualquer ramo especifico sem isso estar configurado ou na base.",
    `Nome da IA: ${aiSetting.name || "Assistente Virtual"}.`,
    aiSetting.companyName ? `Empresa ou servico: ${aiSetting.companyName}.` : "",
    aiSetting.serviceType ? `Tipo de atendimento: ${aiSetting.serviceType}.` : "",
    aiSetting.behaviorPrompt ? `Comportamento configurado:\n${aiSetting.behaviorPrompt}` : "",
    aiSetting.systemPrompt ? `Instrucoes adicionais:\n${aiSetting.systemPrompt}` : "",
    "Analise contexto, erros de digitacao, abreviacoes, historico recente, estado atual do ticket e a base de conhecimento.",
    "Use somente o historico mostrado deste ticket atual. Nunca suponha mensagens de atendimentos anteriores do mesmo contato.",
    "Diferencie CLIENTE, IA, ATENDENTE HUMANO e SISTEMA. Mensagens de SISTEMA/URA servem como estado, nao como pedido do cliente.",
    "Use o estado do atendimento para interpretar respostas curtas. Se a ultima pergunta foi 'Consegui te ajudar?' ou uma checagem de satisfacao e o cliente respondeu 'sim', 'certo', 'obrigado' ou 'deu certo', a intencao e encerramento. Se respondeu 'nao' ou 'nao resolveu', a intencao e encaminhar_atendente.",
    "Se a ultima pergunta foi 'Posso ajudar em algo mais?' e o cliente respondeu 'nao', 'nao obrigado' ou 'era so isso', a intencao e encerramento. Se respondeu 'sim', a intencao e continuar pedindo mais detalhes.",
    "Se a ultima pergunta foi diagnostica, como 'o erro acontece ao finalizar?', respostas como 'sim' ou 'nao' nao significam encerramento; continue o diagnostico.",
    "Se a ultima pergunta foi escolher uma opcao e o cliente disse '2' ou o nome da opcao, a intencao e confirmacao_opcao.",
    "REGRA DE ESCOPO: quando a base de conhecimento relevante tiver artigos, considere que o assunto faz parte do escopo do atendimento, mesmo que o nome da empresa, fila ou tipo de atendimento pareca diferente.",
    "A base de conhecimento encontrada tem prioridade sobre qualquer suposicao pelo nome da empresa, nome da fila ou tipo de atendimento.",
    "Se houver artigo relevante na base, nunca diga que o assunto nao parece relacionado ao atendimento antes de avaliar o conteudo do artigo.",
    "A IA nao pode inventar valores, prazos, links, telefones, regras, procedimentos ou nomes que nao estejam na base.",
    "Pode responder perguntas sobre quem e a IA, qual seu papel, ou explicar uma resposta anterior usando o perfil configurado e o historico da conversa.",
    "Pode conversar de forma natural e humanizada, mas sem criar informacoes comerciais, tecnicas, promocionais, financeiras, medicas, juridicas ou operacionais fora da base.",
    "Pode vender, orientar, sugerir possiveis causas, explicar promocao, informar preco, conduzir agendamento, acompanhar pedido ou tirar duvidas somente quando houver base suficiente.",
    "Pode fazer calculos simples quando a base trouxer os dados numericos necessarios, como diaria x quantidade de dias, valor unitario x unidades ou soma simples.",
    "Se a pergunta atual for uma continuacao da resposta anterior, use o historico recente para entender o sentido. Exemplo: depois de informar uma diaria, 'quanto fica 10 dias?' deve ser tratado como calculo.",
    "Nao use expressoes como base de conhecimento, manual, artigo encontrado, documento interno, RAG ou prompt na resposta ao cliente.",
    "Nao repita a mesma resposta se o cliente mudou de assunto. Reavalie a mensagem atual e o RAG encontrado.",
    "Se nao houver base segura para responder diretamente, nao encaminhe de imediato. Primeiro qualifique a pergunta para aproximar o cliente das categorias e dados existentes na base.",
    "Quando faltar informacao para localizar uma resposta segura, use acao pedir_mais_informacoes e faca uma pergunta objetiva sobre necessidade, contexto, categoria, objetivo, prazo, local, recorrencia ou outro dado que ajude a enquadrar o cliente na base.",
    "Se houver varias possibilidades na base e a pergunta estiver ambigua, use pedir_confirmacao.",
    "Se o cliente pedir atendente/humano/pessoa ou rejeitar robo/IA, use encaminhar_atendente.",
    "Use encerrar_atendimento somente quando o contexto mostrar que o cliente ja recebeu a informacao/solucao que queria e indicou claramente que nao precisa de mais nada.",
    "Nao encerre apenas por uma palavra isolada como obrigado, ok, sim ou valeu se o contexto ainda nao indicar resolucao.",
    "Nunca interprete uma frase como 'erro ao encerrar', 'erro ao finalizar', 'nao consigo finalizar' ou 'problema para fechar' como pedido de encerramento. Isso e relato de problema.",
    "Se o cliente agradecer depois de uma resposta util da IA e o historico indicar que a duvida foi atendida, pode encerrar_atendimento.",
    "Se o cliente pedir para fechar/finalizar, disser que era so isso, nao quer mais nada, tudo certo, resolveu ou pode fechar, use encerrar_atendimento.",
    "Se o cliente disser que nao resolveu ou ainda tem problema, use encaminhar_atendente.",
    "Quando estiver respondendo uma duvida com base, nao encerre no mesmo turno. Responda e pergunte se pode ajudar em algo mais.",
    "So use encerrar_atendimento quando a mensagem atual do cliente indicar encerramento, satisfacao final ou resposta negativa a uma pergunta anterior como 'Posso ajudar em algo mais?'.",
    "Quando decidir encerrar o atendimento, inclua obrigatoriamente [FECHAR TICKET] no final do campo resposta.",
    "Intencoes validas: consulta_valor, interesse_compra, promocao, pedido_atendente, pedido_encerramento, cliente_satisfeito, cliente_nao_satisfeito, pergunta_sobre_produto_ou_servico, agendamento, acompanhamento, reclamacao, diagnostico_inicial, cobranca, financeiro, sem_resposta_segura, confirmacao_opcao.",
    "Acoes validas: responder_com_base, pedir_confirmacao, pedir_mais_informacoes, encaminhar_atendente, encerrar_atendimento, sem_resposta_segura, nao_responder.",
    "Quando acao for responder_com_base, preencha resposta com uma resposta curta, objetiva e baseada somente na base.",
    "Quando acao for pedir_confirmacao, preencha perguntaConfirmacao e opcoes com numero e valor.",
    "Quando acao for pedir_mais_informacoes, preencha resposta com a pergunta de qualificacao que sera enviada ao cliente.",
    "Nunca use chaves response_type ou response_value. O texto para o cliente deve ficar sempre no campo resposta.",
    "Retorne somente JSON valido, sem markdown, sem saudacao fora do JSON e sem texto antes ou depois do JSON. O primeiro caractere da resposta deve ser { e o ultimo deve ser }.",
    `Configuracao da IA: ${aiSetting.name}`,
    `Fila atual: ${queue?.name || "sem fila"}`,
    `Ticket aiActive: ${ticket.aiActive ? "true" : "false"}`,
    `Estado do atendimento atual:\n${buildTicketStateText(ticket)}`,
    pendingQuestion,
    `Historico recente:\n${history || "Sem historico."}`,
    `Base de conhecimento relevante:\n${knowledge || "Nenhum artigo encontrado."}`,
    `Mensagem atual do cliente: ${message}`,
    `Formato esperado:
{
  "intencao": "pergunta_sobre_produto_ou_servico",
  "confianca": "alta",
  "mensagemInterpretada": "Qual o valor do plano?",
  "contexto": "Cliente quer uma informacao sobre produto, servico, agendamento, status, valor ou regra cadastrada",
  "baseEncontrada": true,
  "respostaSegura": true,
  "acao": "responder_com_base",
  "motivo": "Existe informacao suficiente na base",
  "resposta": "Resposta ao cliente, quando aplicavel",
  "perguntaConfirmacao": "Pergunta de confirmacao, quando aplicavel",
  "opcoes": [{"numero":"1","valor":"Plano mensal"}]
}`
  ].join("\n\n");
};

const DecideAiTicketActionService = async ({
  ticket,
  message,
  contactName,
  aiSettingId
}: Request): Promise<AiDecision> => {
  const aiSetting = aiSettingId
    ? await AiSetting.findByPk(aiSettingId)
    : await AiSetting.findOne({ where: { active: true } });

  if (!aiSetting || !aiSetting.active) {
    return {
      intencao: "sem_configuracao",
      confianca: "baixa",
      mensagemInterpretada: message,
      contexto: "Configuracao de IA ausente ou inativa",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "nao_responder",
      motivo: "IA sem configuracao ativa"
    };
  }

  const queue = ticket.queueId ? await Queue.findByPk(ticket.queueId) : null;
  const configuredAiQueueId = aiSetting.aiQueueId || ticket.aiQueueId;
  const isInAiQueue = configuredAiQueueId
    ? Number(ticket.queueId) === Number(configuredAiQueueId)
    : !!queue?.useAI || Number(queue?.aiSettingId) === Number(aiSetting.id);

  if (
    !ticket.aiActive ||
    !isInAiQueue ||
    ticket.userId ||
    ticket.status === "closed" ||
    ticket.aiHumanHandoffAt
  ) {
    return {
      intencao: "fora_da_ia",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Ticket nao esta elegivel para resposta automatica",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "nao_responder",
      motivo: "Ticket saiu da fila da IA, foi assumido, encaminhado ou encerrado"
    };
  }

  if (await hasHumanMessageInCurrentAiSession(ticket)) {
    return {
      intencao: "atendimento_humano_em_andamento",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Uma mensagem humana foi enviada neste atendimento depois que a IA iniciou.",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "nao_responder",
      motivo: "IA bloqueada para nao responder por cima de atendente humano"
    };
  }

  if (isExplicitHumanRequest(message)) {
    return {
      intencao: "pedido_atendente",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente pediu atendimento humano de forma explicita.",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "encaminhar_atendente",
      motivo: "Pedido explicito de atendente humano."
    };
  }

  if (isExplicitCloseRequest(message)) {
    return {
      intencao: "pedido_encerramento",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente pediu explicitamente para encerrar o atendimento.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "encerrar_atendimento",
      motivo: "Pedido explicito de encerramento.",
      resposta: "Perfeito! Vou finalizar seu atendimento. Se precisar novamente, e so chamar. [FECHAR TICKET]"
    };
  }

  const pendingOptions = parseOptions(ticket.lastAiQuestionOptions);
  const history = await getRecentHistory(ticket);

  if (isContextualClosingIntent(message, history, ticket, pendingOptions)) {
    return {
      intencao: "cliente_satisfeito",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente respondeu com satisfacao ou agradecimento depois de uma resposta util da IA.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "encerrar_atendimento",
      motivo: "Intencao contextual de finalizar atendimento.",
      resposta: "Perfeito, fico feliz em ter ajudado. Vou finalizar seu atendimento. Se precisar novamente, e so chamar. [FECHAR TICKET]"
    };
  }

  if (isPositiveAnswerToMoreHelp(message, ticket)) {
    return {
      intencao: "cliente_quer_continuar",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente confirmou que ainda precisa de ajuda depois da pergunta de continuidade.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Cliente quer continuar o atendimento.",
      resposta: "Claro. Me diga em que mais posso ajudar."
    };
  }

  if (isContextualHandoffIntent(message, history, ticket)) {
    return {
      intencao: "cliente_nao_satisfeito",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente informou que a resposta anterior da IA nao resolveu.",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "encaminhar_atendente",
      motivo: "Intencao contextual de transferir para atendimento humano."
    };
  }

  let articles = await SearchKnowledgeBaseService(
    pendingOptions.length
      ? `${message} ${pendingOptions.map(option => option.valor).join(" ")}`
      : message
  );

  if (!articles.length && ticket.lastAiKnowledgeIds) {
    const previousArticles = await getPreviousKnowledgeArticles(ticket);
    if (previousArticles.length) {
      articles = previousArticles;
    }
  }

  const knowledge = buildKnowledgeText(articles);

  logger.info(
    {
      ticketId: ticket.id,
      aiSettingId: aiSetting.id,
      queueId: ticket.queueId,
      aiQueueId: configuredAiQueueId,
      messagePreview: message.slice(0, 180),
      knowledgeFound: articles.length,
      knowledge: articles.map(article => ({
        id: article.id,
        title: article.title,
        rank: article.rank,
        source: article.source
      }))
    },
    "[AI FLOW] Decision context prepared"
  );

  const prompt = buildDecisionPrompt({
    message,
    history,
    knowledge,
    aiSetting,
    ticket,
    queue,
    pendingOptions
  });

  let rawDecision: string | null = null;
  try {
    rawDecision = await GenerateAiResponseService({
      aiSettingId: aiSetting.id,
      message: prompt,
      contactName,
      ticketId: ticket.id,
      skipKnowledgeSearch: true,
      jsonMode: true,
      includeRecentMessages: false,
      logMetadata: {
        action: "decidir_acao",
        knowledgeIds: articles.map(article => article.id),
        knowledgeTitles: articles.map(article => article.title),
        knowledgeScores: articles.map(article => Number(article.rank || 0)),
        contextMessageCount: history.split("\n").filter(Boolean).length
      }
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      if (articles.length > 0) {
        const fallbackDecision = buildProviderErrorKnowledgeFallbackDecision(
          message,
          articles,
          `Fallback organizado: provedor de IA indisponivel (${error.message}), mas uma orientacao foi encontrada.`
        );

        logger.warn(
          {
            ticketId: ticket.id,
            aiSettingId: aiSetting.id,
            provider: error.provider,
            status: error.status,
            code: error.code,
            action: fallbackDecision.acao,
            knowledgeId: articles[0]?.id,
            knowledgeTitle: articles[0]?.title
          },
          "[AI ACTION] Provider failed, formatted knowledge fallback used"
        );

        return fallbackDecision;
      }

      logger.warn(
        {
          ticketId: ticket.id,
          aiSettingId: aiSetting.id,
          provider: error.provider,
          status: error.status,
          code: error.code,
          knowledgeFound: articles.length,
          knowledgeIds: articles.map(article => article.id)
        },
        "[AI ACTION] Provider failed, handoff requested"
      );

      return {
        intencao: "erro_api_ia",
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: `Falha ao chamar o provedor de IA ${error.provider}`,
        baseEncontrada: articles.length > 0,
        respostaSegura: false,
        acao: "encaminhar_atendente",
        motivo: `Servico de IA indisponivel: ${error.message}`,
        resposta: AI_UNAVAILABLE_HANDOFF_MESSAGE,
        knowledgeIds: articles.map(article => article.id)
      };
    }

    throw error;
  }

  const parsed = rawDecision ? extractJson(rawDecision) : null;
  if (!parsed) {
    logger.warn(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        rawDecisionPreview: rawDecision?.slice(0, 500) || null,
        knowledgeFound: articles.length
      },
      "[AI PARSER] Invalid structured decision"
    );

    if (articles.length > 0) {
      const fallbackDecision = await withGeneratedKnowledgeAnswer({
        decision: buildKnowledgeFallbackDecision(
          message,
          articles,
          "Fallback local: base encontrada, mas a IA retornou texto livre em vez de JSON."
        ),
        aiSetting,
        ticket,
        message,
        contactName,
        history,
        knowledge,
        articles
      });

      logger.info(
        {
          ticketId: ticket.id,
          aiSettingId: aiSetting.id,
          action: fallbackDecision.acao,
          knowledgeId: articles[0]?.id,
          knowledgeTitle: articles[0]?.title,
          responsePreview: fallbackDecision.resposta?.slice(0, 240)
        },
        "[AI ACTION] Knowledge fallback decision completed"
      );

      return fallbackDecision;
    }

    return buildQualificationQuestion(
      aiSetting,
      message,
      "A IA nao retornou uma decisao estruturada valida; qualificando antes de encaminhar."
    );
  }

  const parsedResponse = getParsedTextResponse(parsed);
  const inferredAction =
    parsed.acao ||
    (parsedResponse ? "pedir_mais_informacoes" : "sem_resposta_segura");

  const decision: AiDecision = {
    intencao: String(parsed.intencao || "pergunta_sobre_produto_ou_servico"),
    confianca: ["baixa", "media", "alta"].includes(parsed.confianca)
      ? parsed.confianca
      : "media",
    mensagemInterpretada: String(parsed.mensagemInterpretada || message),
    contexto: String(parsed.contexto || ""),
    baseEncontrada: parsed.baseEncontrada === true || articles.length > 0,
    respostaSegura: parsed.respostaSegura === true || !!parsedResponse,
    acao: safeAction(String(inferredAction)),
    motivo: String(parsed.motivo || ""),
    resposta: parsedResponse,
    perguntaConfirmacao: parsed.perguntaConfirmacao
      ? String(parsed.perguntaConfirmacao)
      : undefined,
    opcoes: Array.isArray(parsed.opcoes) ? parsed.opcoes : undefined,
    knowledgeIds: articles.map(article => article.id)
  };

  if (shouldPreferKnowledgeFallback(decision, message, articles)) {
    const fallbackDecision = await withGeneratedKnowledgeAnswer({
      decision: buildKnowledgeFallbackDecision(
        message,
        articles,
        `Fallback local: a decisao foi ${decision.acao}, mas o RAG encontrou base relevante.`
      ),
      aiSetting,
      ticket,
      message,
      contactName,
      history,
      knowledge,
      articles
    });

    logger.info(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        originalAction: decision.acao,
        fallbackAction: fallbackDecision.acao,
        knowledgeId: articles[0]?.id,
        knowledgeTitle: articles[0]?.title
      },
      "[AI ACTION] Knowledge fallback overrode unsafe decision"
    );

    return fallbackDecision;
  }

  if (decision.acao === "responder_com_base" && (!decision.respostaSegura || !decision.resposta)) {
    if (articles.length > 0) {
      const fallbackDecision = await withGeneratedKnowledgeAnswer({
        decision: buildKnowledgeFallbackDecision(
          message,
          articles,
          "Fallback local: decisao indicou resposta com base, mas nao trouxe resposta segura."
        ),
        aiSetting,
        ticket,
        message,
        contactName,
        history,
        knowledge,
        articles
      });
      return fallbackDecision;
    } else {
      const fallbackDecision = buildQualificationQuestion(
        aiSetting,
        message,
        decision.motivo || "Resposta sem base segura; qualificando antes de encaminhar."
      );
      return {
        ...fallbackDecision,
        resposta: decision.resposta || fallbackDecision.resposta
      };
    }
  }

  if (decision.acao === "responder_com_base" && decision.respostaSegura && articles.length > 0) {
    const answerDecision = await withGeneratedKnowledgeAnswer({
      decision,
      aiSetting,
      ticket,
      message,
      contactName,
      history,
      knowledge,
      articles
    });

    return answerDecision;
  }

  if (decision.acao === "pedir_confirmacao" && (!decision.perguntaConfirmacao || !decision.opcoes?.length)) {
    decision.acao = "pedir_mais_informacoes";
    decision.motivo = decision.motivo || "Confirmacao sem opcoes suficientes";
  }

  if (!decision.baseEncontrada && decision.acao === "responder_com_base") {
    if (articles.length > 0 && decision.resposta) {
      decision.baseEncontrada = true;
      decision.respostaSegura = true;
      decision.motivo = "Base encontrada pelo RAG local.";
    } else {
      const fallbackDecision = buildQualificationQuestion(
        aiSetting,
        message,
        "Nao foi encontrada base suficiente para responder; qualificando antes de encaminhar."
      );
      return {
        ...fallbackDecision,
        resposta: decision.resposta || fallbackDecision.resposta
      };
    }
  }

  if (decision.acao === "sem_resposta_segura" && !articles.length) {
    const fallbackDecision = buildQualificationQuestion(
      aiSetting,
      message,
      decision.motivo || "Sem base segura; qualificando antes de encaminhar."
    );
    return {
      ...fallbackDecision,
      resposta: decision.resposta || fallbackDecision.resposta
    };
  }

  if (decision.acao === "encerrar_atendimento") {
    if (!decision.resposta) {
      decision.resposta =
        "Que bom que pude ajudar. Vou finalizar seu atendimento. Se precisar novamente, e so chamar. [FECHAR TICKET]";
    } else if (!decision.resposta.includes("[FECHAR TICKET]")) {
      decision.resposta = `${decision.resposta} [FECHAR TICKET]`;
    }
  }

  logger.info(
    {
      ticketId: ticket.id,
      aiSettingId: aiSetting.id,
      action: decision.acao,
      intent: decision.intencao,
      confidence: decision.confianca,
      baseFound: decision.baseEncontrada,
      safeAnswer: decision.respostaSegura,
      reason: decision.motivo,
      responsePreview: decision.resposta?.slice(0, 240)
    },
    "[AI ACTION] Decision completed"
  );

  return decision;
};

export default DecideAiTicketActionService;
