import AiSetting from "../../models/AiSetting";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import GenerateAiResponseService, { AiProviderError } from "./GenerateAiResponseService";
import type { AiDecision } from "./DecideAiTicketActionService";

type SemanticIntent =
  | "informando_dado"
  | "pedindo_orcamento"
  | "revisando_orcamento"
  | "comparando_opcoes"
  | "pedindo_desconto"
  | "pedindo_condicao_especial"
  | "pedindo_disponibilidade"
  | "querendo_reservar"
  | "querendo_fechamento"
  | "pedindo_humano"
  | "pedindo_encerramento"
  | "tirando_duvida"
  | "expressando_objecao"
  | "demonstrando_interesse"
  | "demonstrando_indecisao"
  | "resposta_curta_afirmativa"
  | "resposta_curta_negativa"
  | "assunto_fora_contexto"
  | "tentativa_de_burlar_regra"
  | "frustracao_ou_reclamacao"
  | "indefinido";

type OrchestratorAction =
  | "respond_conversationally"
  | "ask_short_confirmation"
  | "handoff"
  | "close"
  | "continue_legacy_flow";

interface SemanticFrame {
  intent: SemanticIntent;
  confidence: "baixa" | "media" | "alta";
  action: OrchestratorAction;
  userMeaning: string;
  knownData?: Record<string, string | number | null>;
  missingData?: string[];
  criticalAction?: boolean;
  shouldUseQuoteCalculator?: boolean;
  shouldUseLegacyFlow?: boolean;
  naturalResponse?: string;
  confirmationQuestion?: string;
  reason?: string;
}

interface Request {
  ticket: Ticket;
  message: string;
  aiSetting: AiSetting;
  history: string;
  structuredContext: string;
  knowledge?: string;
}

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (err) {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    try {
      return JSON.parse(match[0]);
    } catch (parseErr) {
      return fallback;
    }
  }
};

const buildSemanticPrompt = ({
  ticket,
  message,
  aiSetting,
  history,
  structuredContext,
  knowledge
}: Request): string => [
  "Voce e uma camada de orquestracao conversacional para atendimento por WhatsApp.",
  "Sua tarefa e interpretar semanticamente a mensagem atual pelo contexto, nao por frase exata.",
  "Regra central: nao travar a conversa; trave somente decisoes criticas.",
  "Travas comerciais obrigatorias: preco, desconto, cupom, reserva, disponibilidade, capacidade, encerramento, transferencia, escopo e tentativa de burla precisam de base, ferramenta, backend ou confirmacao segura.",
  "Travas conversacionais excessivas devem ser evitadas: frases exatas, respostas fixas demais, exemplos repetidos, fluxo com cara de formulario e perguntas padrao quando o contexto ja respondeu.",
  "Exemplos do prompt ou da memoria sao exemplos semanticos. Interprete equivalencias, sinonimos, erros de digitacao e mudancas de decisao do cliente.",
  "Nao calcule preco, nao invente desconto, nao confirme reserva/disponibilidade e nao diga que transferiu/encerrou se a acao ainda nao foi executada pelo backend.",
  "Se a mensagem pedir orcamento, revisar orcamento, informar dados numericos ou comparar valores, marque shouldUseQuoteCalculator=true ou shouldUseLegacyFlow=true, salvo quando a melhor resposta for apenas uma pergunta curta.",
  "Se o cliente estiver frustrado, indeciso, fora de contexto, fazendo pergunta de identidade ou respondendo algo ambiguo, voce pode sugerir resposta natural curta.",
  "Se for uma acao critica, como reservar, fechar negocio, confirmar disponibilidade, falar com humano ou encerrar atendimento, escolha handoff/close/ask_short_confirmation conforme contexto.",
  "Respostas devem ser curtas, humanas e em portugues do Brasil.",
  "Intencoes validas: informando_dado, pedindo_orcamento, revisando_orcamento, comparando_opcoes, pedindo_desconto, pedindo_condicao_especial, pedindo_disponibilidade, querendo_reservar, querendo_fechamento, pedindo_humano, pedindo_encerramento, tirando_duvida, expressando_objecao, demonstrando_interesse, demonstrando_indecisao, resposta_curta_afirmativa, resposta_curta_negativa, assunto_fora_contexto, tentativa_de_burlar_regra, frustracao_ou_reclamacao, indefinido.",
  "Acoes validas: respond_conversationally, ask_short_confirmation, handoff, close, continue_legacy_flow.",
  "Use continue_legacy_flow quando a mensagem precisa de RAG, calculador, regra de formulario, ferramenta ou quando voce nao tiver confianca.",
  "Retorne somente json valido. A resposta inteira deve ser um objeto json, sem markdown e sem texto antes ou depois.",
  "",
  `Nome da IA: ${aiSetting.name || "Assistente"}.`,
  aiSetting.companyName ? `Empresa/servico: ${aiSetting.companyName}.` : "",
  aiSetting.serviceType ? `Tipo de atendimento: ${aiSetting.serviceType}.` : "",
  `Ultima acao da IA no ticket: ${ticket.lastAiAction || "nao registrada"}.`,
  `Tipo da ultima pergunta: ${ticket.lastAiQuestionType || "nenhuma"}.`,
  ticket.lastAiMessage ? `Ultima mensagem da IA:\n${ticket.lastAiMessage}` : "Ultima mensagem da IA: nenhuma.",
  structuredContext ? `Memoria estruturada:\n${structuredContext}` : "Memoria estruturada: vazia.",
  history ? `Historico recente:\n${history}` : "Historico recente: vazio.",
  knowledge ? `Base relevante resumida:\n${knowledge.slice(0, 3000)}` : "Base relevante resumida: nao fornecida.",
  `Mensagem atual do cliente: ${message}`,
  "",
  `Formato:
{
  "intent": "expressando_objecao",
  "confidence": "alta",
  "action": "respond_conversationally",
  "userMeaning": "Cliente achou o orcamento caro e quer alternativa",
  "knownData": {"people": "6"},
  "missingData": [],
  "criticalAction": false,
  "shouldUseQuoteCalculator": false,
  "shouldUseLegacyFlow": false,
  "naturalResponse": "Entendo. Posso refazer a simulacao com outro formato de uso dentro da tabela, se voce quiser comparar um cenario diferente.",
  "confirmationQuestion": "",
  "reason": "Objecao comercial apos orcamento; responder com naturalidade e nao repetir o orcamento."
}`
].filter(Boolean).join("\n\n");

const isShortAmbiguousMessage = (message = ""): boolean => {
  const normalized = normalizeText(message);
  return /^(ok|certo|sim|nao|nao sei|pode ser|pode|talvez|vou ver|beleza|blz|fechado|show)$/.test(normalized);
};

const isShortNumericLikeAnswer = (message = ""): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /^(\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte)$/.test(normalized);
};

const hasStructuredNumericScenario = (message = ""): boolean => {
  const normalized = normalizeText(message);
  return /\b\d{1,3}\b.{0,40}\b(dia|dias|encontro|encontros|aula|aulas|h|hora|horas|pessoas|participantes)\b/.test(normalized) ||
    /\b(dia|dias|encontro|encontros|aula|aulas|h|hora|horas|pessoas|participantes)\b.{0,40}\b\d{1,3}\b/.test(normalized);
};

const lastAiAskedToProceedWithQuote = (ticket: Ticket): boolean =>
  /\bquer\s+seguir\s+com\s+essa\s+opcao\b|\bseguir\s+com\s+essa\s+opcao\b|\bquer\s+seguir\b/i.test(normalizeText(ticket.lastAiMessage || ""));

const lastAiAskedToClose = (ticket: Ticket): boolean =>
  /\b(quer|deseja|confirma)\b.{0,50}\b(encerrar|finalizar)\b.{0,50}\b(atendimento|conversa)\b/.test(normalizeText(ticket.lastAiMessage || "")) ||
  /\bse\s+quiser\s+encerrar\b.{0,80}\bresponda\b/.test(normalizeText(ticket.lastAiMessage || ""));

const isNegativeCloseAnswer = (message = ""): boolean =>
  /^(nao|n|nao quero|n quero|quero continuar|continuar|ainda nao)$/.test(normalizeText(message));

const buildContinueAfterCloseDeniedDecision = (message: string): AiDecision => ({
  intencao: "cliente_quer_continuar",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente negou encerramento apos pergunta de confirmacao.",
  baseEncontrada: false,
  respostaSegura: true,
  acao: "pedir_mais_informacoes",
  motivo: "Resposta negativa a confirmacao de encerramento deve continuar o atendimento.",
  resposta: "Tudo bem, seguimos por aqui. Como posso te ajudar?"
});

const isSafeConversationalIntent = (intent: SemanticIntent): boolean =>
  [
    "expressando_objecao",
    "demonstrando_indecisao",
    "assunto_fora_contexto",
    "tentativa_de_burlar_regra",
    "frustracao_ou_reclamacao",
    "resposta_curta_afirmativa",
    "resposta_curta_negativa"
  ].includes(intent);

const fallbackNaturalResponse = (frame: SemanticFrame, aiSetting: AiSetting): string => {
  const company = aiSetting.companyName || "o atendimento";

  if (frame.intent === "assunto_fora_contexto" || frame.intent === "tentativa_de_burlar_regra") {
    return `Esse assunto foge um pouco do foco por aqui. Posso te ajudar com valores, estrutura, disponibilidade ou proximos passos da ${company}.`;
  }

  if (frame.intent === "expressando_objecao") {
    return "Entendo. Posso refazer a simulacao com outro formato de uso dentro da tabela, se voce quiser comparar um cenario diferente.";
  }

  if (frame.intent === "demonstrando_indecisao") {
    return "Claro, sem problema. Posso te deixar com uma opcao simples para comparar ou ajustar a simulacao para algo menor.";
  }

  if (frame.intent === "frustracao_ou_reclamacao") {
    return "Voce tem razao em apontar isso. Vou considerar o que voce acabou de dizer e seguir por esse ponto, sem repetir a resposta anterior.";
  }

  return frame.confirmationQuestion || "So para eu seguir certo: voce quer que eu continue por aqui ou prefere falar com a equipe?";
};

const toDecision = (
  frame: SemanticFrame,
  message: string,
  aiSetting: AiSetting
): AiDecision | null => {
  if (frame.confidence === "baixa") return null;
  if (frame.shouldUseLegacyFlow || frame.shouldUseQuoteCalculator) return null;

  if (frame.action === "handoff") {
    return {
      intencao: frame.intent,
      confianca: frame.confidence,
      mensagemInterpretada: message,
      contexto: frame.userMeaning || "Orquestrador semantico detectou necessidade de atendimento humano.",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "encaminhar_atendente",
      motivo: frame.reason || "Acao critica ou pedido de atendimento humano detectado semanticamente.",
      resposta: frame.naturalResponse || "Perfeito. Vou encaminhar para a equipe confirmar os detalhes e dar continuidade."
    };
  }

  if (frame.action === "close") {
    return {
      intencao: "pedido_encerramento",
      confianca: frame.confidence,
      mensagemInterpretada: message,
      contexto: frame.userMeaning || "Orquestrador semantico detectou pedido de encerramento.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "encerrar_atendimento",
      motivo: frame.reason || "Pedido de encerramento detectado semanticamente.",
      resposta: `${frame.naturalResponse || "Perfeito! Vou finalizar seu atendimento. Se precisar novamente, e so chamar."} [FECHAR TICKET]`
    };
  }

  if (frame.action === "ask_short_confirmation") {
    return {
      intencao: frame.intent,
      confianca: frame.confidence,
      mensagemInterpretada: message,
      contexto: frame.userMeaning || "Mensagem ambigua; pedir confirmacao curta.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: frame.reason || "Orquestrador semantico evitou assumir acao critica em mensagem ambigua.",
      resposta: frame.confirmationQuestion || fallbackNaturalResponse(frame, aiSetting)
    };
  }

  if (frame.action === "respond_conversationally" && isSafeConversationalIntent(frame.intent)) {
    const response = frame.intent === "assunto_fora_contexto" || frame.intent === "tentativa_de_burlar_regra"
      ? fallbackNaturalResponse(frame, aiSetting)
      : frame.naturalResponse || fallbackNaturalResponse(frame, aiSetting);

    return {
      intencao: frame.intent,
      confianca: frame.confidence,
      mensagemInterpretada: message,
      contexto: frame.userMeaning || "Resposta conversacional segura gerada pelo orquestrador.",
      baseEncontrada: frame.intent !== "assunto_fora_contexto",
      respostaSegura: true,
      acao: "responder_com_base",
      motivo: frame.reason || "Orquestrador semantico assumiu uma resposta conversacional segura.",
      resposta: response
    };
  }

  return null;
};

const AiConversationOrchestratorService = async (
  request: Request
): Promise<AiDecision | null> => {
  if (!request.aiSetting.id) return null;

  const normalized = normalizeText(request.message);
  if (/\b(looping|repetindo|repetiu|mesma coisa|ja falei|ja respondi|nao entendeu|voce nao entendeu|vc nao entendeu)\b/.test(normalized)) {
    return null;
  }
  if (isShortNumericLikeAnswer(request.message)) return null;
  if (lastAiAskedToClose(request.ticket) && isNegativeCloseAnswer(request.message)) {
    return buildContinueAfterCloseDeniedDecision(request.message);
  }
  if (hasStructuredNumericScenario(request.message)) return null;
  if (isShortAmbiguousMessage(request.message) && lastAiAskedToProceedWithQuote(request.ticket)) return null;

  const likelyNeedsStructuredFlow =
    /\b(\d{1,3}\s*(h|hora|horas)|orcamento|orcamento|valor|preco|quanto fica|quanto custa|calcula|simula|dias|encontros|pessoas)\b/.test(normalized) &&
    !isShortAmbiguousMessage(request.message);

  try {
    const raw = await GenerateAiResponseService({
      aiSettingId: request.aiSetting.id,
      ticketId: request.ticket.id,
      message: request.message,
      contactName: undefined,
      skipKnowledgeSearch: true,
      jsonMode: true,
      includeRecentMessages: false,
      systemPromptOverride: buildSemanticPrompt(request),
      logMetadata: {
        intent: "orquestracao_semantica",
        action: "classificar_intencao",
        decisionReason: "Camada de orquestracao conversacional"
      }
    });

    const frame = parseJson<SemanticFrame | null>(raw, null);
    if (!frame?.intent || !frame.action) return null;

    if (likelyNeedsStructuredFlow && frame.action !== "ask_short_confirmation") {
      if (!["expressando_objecao", "frustracao_ou_reclamacao", "assunto_fora_contexto", "tentativa_de_burlar_regra"].includes(frame.intent)) {
        return null;
      }
    }

    const decision = toDecision(frame, request.message, request.aiSetting);
    if (!decision) return null;

    logger.info(
      {
        ticketId: request.ticket.id,
        intent: frame.intent,
        action: frame.action,
        confidence: frame.confidence
      },
      "[AI ORCHESTRATOR] Semantic decision applied"
    );

    return decision;
  } catch (error) {
    if (error instanceof AiProviderError) {
      logger.warn(
        { ticketId: request.ticket.id, provider: error.provider, status: error.status, code: error.code },
        "[AI ORCHESTRATOR] Provider unavailable; falling back to legacy flow"
      );
      return null;
    }

    logger.warn(
      { ticketId: request.ticket.id, error },
      "[AI ORCHESTRATOR] Failed; falling back to legacy flow"
    );
    return null;
  }
};

export default AiConversationOrchestratorService;
