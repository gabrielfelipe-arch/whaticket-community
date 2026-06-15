import AiSetting from "../../models/AiSetting";
import AiTicketContext from "../../models/AiTicketContext";
import Ticket from "../../models/Ticket";
import type { AiDecision } from "./DecideAiTicketActionService";
import { UpdateAiTicketContextService } from "./AiTicketContextService";
import type { AiSemanticDecision } from "./AiSemanticDecisionService";
import { isPostQuoteMenuOption } from "./PostQuoteMenuService";

export type OperationalOfferType = "quote_revision" | "human_transfer" | "close_ticket" | "post_quote_menu" | null;
export type OperationalQuestionKey =
  | "people"
  | "meetingCount"
  | "hoursPerMeeting"
  | "quote_revision_scope"
  | null;

export interface OperationalQuoteState {
  people?: number | null;
  meetingCount?: number | null;
  hoursPerMeeting?: number | null;
  totalHours?: number | null;
  recommendedOption?: string | null;
  total?: number | null;
}

export interface OperationalState {
  lastOfferType?: OperationalOfferType;
  awaitingConfirmationFor?: OperationalOfferType;
  lastQuestionKey?: OperationalQuestionKey;
  lastQuestionText?: string | null;
  lastQuote?: OperationalQuoteState | null;
  quoteRevisionMode?: string | null;
  quoteRevisionNumber?: number;
  repeatedResponseCount?: number;
  lastAssistantMessage?: string | null;
  lastAssistantAction?: string | null;
  lastIntent?: string | null;
  lastToolCalled?: string | null;
  lastResponseGoal?: string | null;
  responseGoalHistory?: string[];
  collectedData?: Record<string, any>;
  missingData?: string[];
}

export interface OperationalDecision {
  detectedIntent: string;
  isReplyToPreviousQuestion: boolean;
  answeredField: string | null;
  isReplyToPreviousOffer: boolean;
  acceptedPreviousOffer: boolean;
  previousOfferType: OperationalOfferType;
  requiresTool: boolean;
  toolToCall: string | null;
  shouldAskClarification: boolean;
  nextQuestionKey: OperationalQuestionKey;
  responseGoal: string;
  mustNotRepeatLastAnswer: boolean;
  aiDecision: AiDecision;
  nextState: OperationalState;
  collectedDataPatch?: Record<string, { label: string; value: string | null; rawValue?: string | null }>;
  missingDataPatch?: string[];
}

interface EvaluateRequest {
  ticket: Ticket;
  message: string;
  aiSetting: AiSetting;
  context?: AiTicketContext | null;
  semanticDecision?: AiSemanticDecision | null;
}

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isClearKnowledgeBaseQuestion = (message = ""): boolean => {
  const normalized = normalizeText(message);

  if (!normalized) return false;

  return (
    /\b(onde|endereco|localizacao|fica|perto|referencia)\b/.test(normalized) ||
    /\b(tabela|preco|precos|valor|valores|quanto custa|pacotes?|planos?)\b/.test(normalized) ||
    /\b(cabe|cabem|capacidade|quantas pessoas|quantas oessoas|quantos participantes)\b/.test(normalized) ||
    /\b(ar|ar condicionado|internet|wifi|tv|cafe|copa|microondas|micro ondas|incluso|inclui|estrutura)\b/.test(normalized) ||
    /\b(pix|cartao|debito|credito|pagamento|divide|parcel)\b/.test(normalized) ||
    /\b(desconto|promocao|condicao especial|barato|negocia)\b/.test(normalized) ||
    /\b(reserva|reservar|sinal|disponibilidade|horario|agenda|sabado|domingo)\b/.test(normalized) ||
    /\b(professor|particular|mensal|mensalista|prata|ouro|diamante)\b/.test(normalized)
  );
};

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (err) {
    return fallback;
  }
};

const stringify = (value: unknown): string => JSON.stringify(value || {});

export const parseOperationalState = (
  value: string | null | undefined
): OperationalState => parseJson<OperationalState>(value, {});

const parseNumberLike = (value = ""): number | null => {
  const normalized = normalizeText(value);
  const digit = normalized.match(/\b\d{1,4}\b/);
  if (digit) return Number(digit[0]);

  const words: Record<string, number> = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
    onze: 11,
    doze: 12,
    treze: 13,
    quatorze: 14,
    catorze: 14,
    quinze: 15,
    dezesseis: 16,
    dezessete: 17,
    dezoito: 18,
    dezenove: 19,
    vinte: 20
  };

  return words[normalized] || null;
};

const isAffirmative = (message = ""): boolean => {
  const normalized = normalizeText(message);
  return /^(sim|s|quero|quero sim|pode|pode ser|pode sim|vamos|vamos sim|ok|okay|isso|isso mesmo|bora|fechado|claro|confirmo|quero fazer|vamos fazer|seguir|prosseguir)$/.test(normalized) ||
    /\b(quero|pode|vamos|confirmo|aceito|prosseguir|seguir)\b/.test(normalized);
};

const isIdentityOrRoleQuestion = (message = ""): boolean => {
  const normalized = normalizeText(message);
  const talksToAssistant = /\b(voce|vc|tu|mari|assistente|robo|bot)\b/.test(normalized);
  const asksIdentity =
    /\b(quem e voce|quem voce e|qual seu nome|seu nome|voce e robo|vc e robo|voce e atendente|vc e atendente|quantos anos voce tem|voce tem quantos anos|qual sua idade|sua idade)\b/.test(normalized);
  const asksRole =
    talksToAssistant &&
    /\b(faz o que|faz oq|faz o q|voce faz|vc faz|ajuda com o que|ajuda em que|qual sua funcao|pra que voce serve|para que voce serve)\b/.test(normalized);
  const asksPersonalAttribute =
    talksToAssistant &&
    /\b(bonita|bonito|linda|lindo|casada|casado|namora|idade|anos)\b/.test(normalized);

  return asksIdentity || asksRole || asksPersonalAttribute;
};

const isLoopOrBugComplaint = (message = ""): boolean =>
  /\b(loop|looping|repetindo|repetiu|mesma coisa|bugou|travou|nao foi isso|nao entendeu|voce nao entendeu|vc nao entendeu|ja falei|ja respondi|acabei de responder)\b/.test(normalizeText(message));

const isNonQuoteCustomerTurn = (message = ""): boolean => {
  const normalized = normalizeText(message);

  return (
    isClearKnowledgeBaseQuestion(message) ||
    isIdentityOrRoleQuestion(message) ||
    isLoopOrBugComplaint(message) ||
    /\b(calcinha|sexual|sexo|nude|pelada|pelado)\b/.test(normalized) ||
    /\b(placar|jogo|futebol|flamengo|vasco|botafogo|fluminense|dolar|euro|moeda|cambio)\b/.test(normalized)
  );
};

const inferOfferTypeFromText = (message = ""): OperationalOfferType => {
  const normalized = normalizeText(message);
  if (
    /\bcomo deseja prosseguir\b/.test(normalized) &&
    /\bconfirmar disponibilidade reserva com a equipe\b/.test(normalized) &&
    /\bfazer uma nova simulacao\b/.test(normalized) &&
    /\btenho outra duvida\b/.test(normalized)
  ) {
    return "post_quote_menu";
  }
  if (/\b(refazer|recalcular|revisar|ajustar|mudar)\b.{0,80}\b(orcamento|simulacao|valor|cenario)\b/.test(normalized) ||
      /\b(posso|podemos)\b.{0,60}\b(refazer|recalcular|revisar|ajustar)\b/.test(normalized)) {
    return "quote_revision";
  }
  if (/\b(encaminhar|transferir|passar)\b.{0,80}\b(atendente|equipe|humano|pessoa)\b/.test(normalized)) {
    return "human_transfer";
  }
  if (/\b(encerrar|finalizar)\b.{0,80}\b(atendimento|conversa)\b/.test(normalized) ||
      /\b(vou|posso)\b.{0,40}\b(finalizar|encerrar)\b/.test(normalized)) {
    return "close_ticket";
  }
  return null;
};

const inferQuestionKeyFromText = (message = ""): OperationalQuestionKey => {
  const normalized = normalizeText(message);
  if (/\b(pessoas|participantes|alunos|clientes|convidados|equipe)\b/.test(normalized)) return "people";
  if (/\b(dias|dia|encontros|encontro|aulas|aula|reunioes|reuniao|sessoes|sessao)\b/.test(normalized) &&
      !/\b(horas|hora|duracao|tempo)\b/.test(normalized)) {
    return "meetingCount";
  }
  if (/\b(horas|hora|duracao|tempo)\b/.test(normalized)) return "hoursPerMeeting";
  if (/\b(mudar|alterar|trocar)\b.{0,80}\b(pessoas|dias|horas|encontros)\b/.test(normalized)) return "quote_revision_scope";
  return null;
};

const getStateWithFallbacks = (
  ticket: Ticket,
  context?: AiTicketContext | null
): OperationalState => {
  const stored = parseOperationalState(context?.operationalState);
  const collectedData = parseJson<Record<string, any>>(context?.collectedData, {});
  const missingData = parseJson<string[]>(context?.missingData, []);
  const lastAssistantMessage = stored.lastAssistantMessage || ticket.lastAiMessage || null;
  const inferredOffer = stored.lastOfferType || inferOfferTypeFromText(lastAssistantMessage || "");
  const inferredQuestion = stored.lastQuestionKey || inferQuestionKeyFromText(lastAssistantMessage || "");

  return {
    repeatedResponseCount: 0,
    quoteRevisionNumber: 0,
    ...stored,
    collectedData: stored.collectedData || collectedData,
    missingData: stored.missingData || missingData,
    lastAssistantMessage,
    lastAssistantAction: stored.lastAssistantAction || ticket.lastAiAction || null,
    lastIntent: stored.lastIntent || ticket.lastAiIntent || null,
    lastOfferType: inferredOffer,
    awaitingConfirmationFor: stored.awaitingConfirmationFor || inferredOffer,
    lastQuestionKey: inferredQuestion,
    lastQuestionText: stored.lastQuestionText || ticket.lastAiMessage || null
  };
};

const buildDecision = (
  params: Omit<OperationalDecision, "aiDecision"> & { aiDecision: AiDecision }
): OperationalDecision => params;

const buildQuoteRevisionStartDecision = (
  message: string,
  state: OperationalState
): OperationalDecision => {
  const hasQuote = Boolean(state.lastQuote);
  const nextState: OperationalState = {
    ...state,
    lastOfferType: null,
    awaitingConfirmationFor: null,
    quoteRevisionMode: hasQuote ? "awaiting_scope" : "collecting_new_quote",
    quoteRevisionNumber: Number(state.quoteRevisionNumber || 0) + 1,
    lastQuestionKey: hasQuote ? "quote_revision_scope" : "people",
    lastQuestionText: hasQuote
      ? "Perfeito. Quer mudar pessoas, dias ou horas do orcamento anterior?"
      : "Para quantas pessoas?"
  };

  return buildDecision({
    detectedIntent: "revisar_orcamento",
    isReplyToPreviousQuestion: false,
    answeredField: null,
    isReplyToPreviousOffer: true,
    acceptedPreviousOffer: true,
    previousOfferType: "quote_revision",
    requiresTool: false,
    toolToCall: null,
    shouldAskClarification: true,
    nextQuestionKey: nextState.lastQuestionKey || null,
    responseGoal: hasQuote ? "iniciar_revisao_orcamento" : "iniciar_novo_orcamento",
    mustNotRepeatLastAnswer: true,
    nextState,
    aiDecision: {
      intencao: "revisar_orcamento",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente aceitou a oferta anterior de revisar orcamento.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Estado operacional: aceite de oferta quote_revision tem prioridade sobre orquestrador.",
      resposta: nextState.lastQuestionText || undefined
    }
  });
};

const buildIdentityDecision = (
  message: string,
  state: OperationalState,
  aiSetting: AiSetting
): OperationalDecision => {
  const company = aiSetting.companyName || "Salinha Meier";
  const name = aiSetting.name || "Mari";
  const response = [
    `Sou a ${name}, assistente virtual da ${company}. Te ajudo com valores, estrutura, orcamento e encaminhamento para a equipe quando for reserva ou disponibilidade.`,
    state.lastQuote
      ? "Quer ajustar o orcamento anterior ou ver outra informacao?"
      : "Me diga como posso te ajudar por aqui."
  ].join("\n\n");

  const nextState: OperationalState = {
    ...state,
    lastQuestionKey: null,
    lastQuestionText: null
  };

  return buildDecision({
    detectedIntent: "identidade_ou_funcao_ia",
    isReplyToPreviousQuestion: false,
    answeredField: null,
    isReplyToPreviousOffer: false,
    acceptedPreviousOffer: false,
    previousOfferType: state.lastOfferType || null,
    requiresTool: false,
    toolToCall: null,
    shouldAskClarification: false,
    nextQuestionKey: null,
    responseGoal: "responder_identidade_funcao",
    mustNotRepeatLastAnswer: true,
    nextState,
    aiDecision: {
      intencao: "identidade_ou_funcao_ia",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente perguntou sobre identidade ou funcao da IA; isso faz parte do contexto.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "responder_com_base",
      motivo: "Estado operacional: pergunta sobre identidade/funcao deve ser respondida antes do orquestrador.",
      resposta: response
    }
  });
};

const buildPostQuoteMenuDecision = (
  message: string,
  state: OperationalState,
  option: "1" | "2" | "3"
): OperationalDecision => {
  if (option === "1") {
    const nextState: OperationalState = {
      ...state,
      lastOfferType: null,
      awaitingConfirmationFor: null,
      lastQuestionKey: null,
      lastQuestionText: null
    };

    return buildDecision({
      detectedIntent: "confirmar_reserva_com_equipe",
      isReplyToPreviousQuestion: false,
      answeredField: null,
      isReplyToPreviousOffer: true,
      acceptedPreviousOffer: true,
      previousOfferType: "post_quote_menu",
      requiresTool: true,
      toolToCall: "transferirParaFila",
      shouldAskClarification: false,
      nextQuestionKey: null,
      responseGoal: "encaminhar_equipe_para_validar_reserva",
      mustNotRepeatLastAnswer: true,
      nextState,
      aiDecision: {
        intencao: "pedido_reserva",
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: "Cliente escolheu confirmar disponibilidade/reserva com a equipe apos orcamento.",
        baseEncontrada: false,
        respostaSegura: false,
        acao: "encaminhar_atendente",
        motivo: "Menu pos-orcamento: disponibilidade/reserva so pode ser validada pela equipe.",
        resposta: "Perfeito. Vou encaminhar para a equipe validar disponibilidade, reserva e condicoes finais."
      }
    });
  }

  if (option === "2") {
    const nextState: OperationalState = {
      ...state,
      lastOfferType: null,
      awaitingConfirmationFor: null,
      quoteRevisionMode: "collecting_new_quote",
      quoteRevisionNumber: Number(state.quoteRevisionNumber || 0) + 1,
      lastQuestionKey: "people",
      lastQuestionText: "Para quantas pessoas?"
    };

    return buildDecision({
      detectedIntent: "nova_simulacao",
      isReplyToPreviousQuestion: false,
      answeredField: null,
      isReplyToPreviousOffer: true,
      acceptedPreviousOffer: true,
      previousOfferType: "post_quote_menu",
      requiresTool: false,
      toolToCall: null,
      shouldAskClarification: true,
      nextQuestionKey: "people",
      responseGoal: "iniciar_nova_simulacao",
      mustNotRepeatLastAnswer: true,
      nextState,
      aiDecision: {
        intencao: "revisar_orcamento",
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: "Cliente escolheu fazer uma nova simulacao no menu pos-orcamento.",
        baseEncontrada: false,
        respostaSegura: true,
        acao: "pedir_mais_informacoes",
        motivo: "Menu pos-orcamento: iniciar nova coleta de dados.",
        resposta: nextState.lastQuestionText || undefined
      }
    });
  }

  const nextState: OperationalState = {
    ...state,
    lastOfferType: null,
    awaitingConfirmationFor: null,
    lastQuestionKey: null,
    lastQuestionText: "Claro. Qual e a sua duvida?"
  };

  return buildDecision({
    detectedIntent: "outra_duvida",
    isReplyToPreviousQuestion: false,
    answeredField: null,
    isReplyToPreviousOffer: true,
    acceptedPreviousOffer: true,
    previousOfferType: "post_quote_menu",
    requiresTool: false,
    toolToCall: null,
    shouldAskClarification: true,
    nextQuestionKey: null,
    responseGoal: "coletar_duvida_livre",
    mustNotRepeatLastAnswer: true,
    nextState,
    aiDecision: {
      intencao: "duvida_geral",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente escolheu tirar outra duvida no menu pos-orcamento.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Menu pos-orcamento: abrir campo livre sem prender em URA.",
      resposta: nextState.lastQuestionText || undefined
    }
  });
};

const buildPreviousQuoteAnswerDecision = (
  message: string,
  state: OperationalState
): OperationalDecision => {
  const quote = state.lastQuote;
  const total = quote?.total !== null && quote?.total !== undefined
    ? `R$ ${Number(quote.total).toFixed(2).replace(".", ",")}`
    : null;
  const scenario = [
    quote?.people ? `${quote.people} pessoa(s)` : "",
    quote?.meetingCount && quote?.hoursPerMeeting
      ? `${quote.meetingCount} encontro(s) de ${quote.hoursPerMeeting}h`
      : quote?.totalHours ? `${quote.totalHours}h no total` : ""
  ].filter(Boolean).join(", ");
  const response = total
    ? [`O ultimo orcamento ficou em *${total}*.`, scenario ? `Cenario: ${scenario}.` : "", "Quer manter esse orcamento, ajustar algum dado ou falar com a equipe?"].filter(Boolean).join("\n\n")
    : "Eu nao encontrei um ultimo valor fechado na memoria deste atendimento. Quer que eu monte ou refaca o orcamento?";
  const nextState: OperationalState = {
    ...state,
    lastQuestionKey: quote ? "quote_revision_scope" : "people",
    lastQuestionText: response,
    quoteRevisionMode: quote ? "answering_previous_quote" : "collecting_new_quote"
  };

  return buildDecision({
    detectedIntent: "pergunta_sobre_orcamento_anterior",
    isReplyToPreviousQuestion: false,
    answeredField: null,
    isReplyToPreviousOffer: false,
    acceptedPreviousOffer: false,
    previousOfferType: state.lastOfferType || null,
    requiresTool: false,
    toolToCall: null,
    shouldAskClarification: !quote,
    nextQuestionKey: nextState.lastQuestionKey || null,
    responseGoal: "responder_valor_anterior_e_retornar_ao_contexto",
    mustNotRepeatLastAnswer: true,
    nextState,
    aiDecision: {
      intencao: "pergunta_sobre_orcamento_anterior",
      confianca: quote ? "alta" : "media",
      mensagemInterpretada: message,
      contexto: "Cliente perguntou sobre o ultimo orcamento; responder usando lastQuote quando existir.",
      baseEncontrada: Boolean(quote),
      respostaSegura: true,
      acao: quote ? "responder_com_base" : "pedir_mais_informacoes",
      motivo: "Decisao semantica: pergunta nova clara usa ultimo orcamento e suspende fluxo pendente.",
      resposta: response
    }
  });
};

const buildPendingFlowRefusalDecision = (
  message: string,
  state: OperationalState
): OperationalDecision => {
  const hadQuote = Boolean(state.lastQuote);
  const response = hadQuote
    ? "Tudo bem, mantenho o orcamento anterior como referencia. Quer que eu te relembre o valor, ajuste algum dado ou encaminhe para a equipe?"
    : "Tudo bem, nao vou seguir por esse caminho agora. Voce quer ver outra informacao ou falar com a equipe?";
  const nextState: OperationalState = {
    ...state,
    lastOfferType: null,
    awaitingConfirmationFor: null,
    quoteRevisionMode: null,
    lastQuestionKey: hadQuote ? "quote_revision_scope" : null,
    lastQuestionText: response
  };

  return buildDecision({
    detectedIntent: "recusa_do_fluxo_pendente",
    isReplyToPreviousQuestion: false,
    answeredField: null,
    isReplyToPreviousOffer: Boolean(state.lastOfferType || state.awaitingConfirmationFor),
    acceptedPreviousOffer: false,
    previousOfferType: state.lastOfferType || state.awaitingConfirmationFor || null,
    requiresTool: false,
    toolToCall: null,
    shouldAskClarification: false,
    nextQuestionKey: nextState.lastQuestionKey || null,
    responseGoal: "suspender_fluxo_pendente_e_oferecer_proximo_passo",
    mustNotRepeatLastAnswer: true,
    nextState,
    aiDecision: {
      intencao: "recusa_do_fluxo_pendente",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente recusou o fluxo pendente; suspender estado sem insistir.",
      baseEncontrada: hadQuote,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Decisao semantica: recusa do fluxo pendente deve suspender a rota atual.",
      resposta: response
    }
  });
};

const buildSemanticClarificationDecision = (
  message: string,
  state: OperationalState
): OperationalDecision => {
  const response = state.lastQuote
    ? "So para eu seguir certo: voce quer manter o orcamento anterior, ajustar algum dado ou falar com a equipe?"
    : "So para eu entender melhor: voce quer ver opcoes, saber preco ou falar com a equipe?";
  const nextState: OperationalState = {
    ...state,
    lastQuestionKey: null,
    lastQuestionText: response
  };

  return buildDecision({
    detectedIntent: "baixa_confianca",
    isReplyToPreviousQuestion: false,
    answeredField: null,
    isReplyToPreviousOffer: false,
    acceptedPreviousOffer: false,
    previousOfferType: state.lastOfferType || null,
    requiresTool: false,
    toolToCall: null,
    shouldAskClarification: true,
    nextQuestionKey: null,
    responseGoal: "pedir_esclarecimento_curto",
    mustNotRepeatLastAnswer: true,
    nextState,
    aiDecision: {
      intencao: "baixa_confianca",
      confianca: "media",
      mensagemInterpretada: message,
      contexto: "Decisao semantica com baixa confianca; nao assumir acao critica.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Decisao semantica: pedir esclarecimento curto.",
      resposta: response
    }
  });
};

const fieldFromRevisionScope = (message = ""): OperationalQuestionKey => {
  const normalized = normalizeText(message);
  if (/\b(pessoas|participantes|alunos|clientes|convidados)\b/.test(normalized)) return "people";
  if (/\b(dias|dia|encontros|encontro|aulas|aula|reunioes|reuniao)\b/.test(normalized)) return "meetingCount";
  if (/\b(horas|hora|duracao|tempo)\b/.test(normalized)) return "hoursPerMeeting";
  return null;
};

const questionForField = (field: OperationalQuestionKey): string => {
  if (field === "people") return "Para quantas pessoas?";
  if (field === "meetingCount") return "Quantos dias/encontros?";
  if (field === "hoursPerMeeting") return "Quantas horas por dia/encontro?";
  return "Quer mudar pessoas, dias ou horas do orcamento anterior?";
};

const buildRevisionScopeFieldDecision = (
  message: string,
  state: OperationalState,
  field: OperationalQuestionKey
): OperationalDecision => {
  const nextState: OperationalState = {
    ...state,
    quoteRevisionMode: field,
    lastQuestionKey: field,
    lastQuestionText: questionForField(field)
  };

  return buildDecision({
    detectedIntent: "revisar_orcamento",
    isReplyToPreviousQuestion: true,
    answeredField: "quote_revision_scope",
    isReplyToPreviousOffer: false,
    acceptedPreviousOffer: false,
    previousOfferType: state.lastOfferType || null,
    requiresTool: false,
    toolToCall: null,
    shouldAskClarification: true,
    nextQuestionKey: field,
    responseGoal: "coletar_campo_revisao",
    mustNotRepeatLastAnswer: true,
    nextState,
    aiDecision: {
      intencao: "revisar_orcamento",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente escolheu qual campo do orcamento deseja alterar.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Estado operacional: escopo da revisao definido.",
      resposta: questionForField(field)
    }
  });
};

const extractQuoteFieldChange = (message = ""): { field: OperationalQuestionKey; value: number } | null => {
  const normalized = normalizeText(message);
  const value = parseNumberLike(normalized);
  if (!value) return null;

  if (/\b(pessoas|participantes|alunos|clientes|convidados)\b/.test(normalized)) {
    return { field: "people", value };
  }
  if (/\b(dias|dia|encontros|encontro|aulas|aula|reunioes|reuniao)\b/.test(normalized)) {
    return { field: "meetingCount", value };
  }
  if (/\b(horas|hora|h|duracao|tempo)\b/.test(normalized)) {
    return { field: "hoursPerMeeting", value };
  }
  return null;
};

const collectedPatchForField = (
  field: OperationalQuestionKey,
  value: number,
  rawValue: string
): Record<string, { label: string; value: string | null; rawValue?: string | null }> => {
  if (field === "people") {
    return {
      participant_count: {
        label: "Quantidade de pessoas/participantes",
        value: String(value),
        rawValue
      }
    };
  }
  if (field === "meetingCount") {
    return {
      occurrences: {
        label: "Quantidade de ocorrencias/unidades de agenda",
        value: String(value),
        rawValue
      }
    };
  }
  if (field === "hoursPerMeeting") {
    return {
      duration: {
        label: "Duracao/tempo informado",
        value: `${value}h`,
        rawValue
      }
    };
  }
  return {};
};

const updateQuoteField = (
  quote: OperationalQuoteState | null | undefined,
  field: OperationalQuestionKey,
  value: number
): OperationalQuoteState => {
  const nextQuote: OperationalQuoteState = { ...(quote || {}) };
  if (field === "people") nextQuote.people = value;
  if (field === "meetingCount") nextQuote.meetingCount = value;
  if (field === "hoursPerMeeting") nextQuote.hoursPerMeeting = value;
  if (nextQuote.meetingCount && nextQuote.hoursPerMeeting) {
    nextQuote.totalHours = nextQuote.meetingCount * nextQuote.hoursPerMeeting;
  }
  return nextQuote;
};

const buildFieldAnswerDecision = (
  message: string,
  state: OperationalState,
  field: OperationalQuestionKey,
  value: number
): OperationalDecision => {
  const nextQuote = updateQuoteField(state.lastQuote, field, value);
  const nextMissing: OperationalQuestionKey =
    !nextQuote.people ? "people" :
    !nextQuote.meetingCount ? "meetingCount" :
    !nextQuote.hoursPerMeeting ? "hoursPerMeeting" :
    null;
  const nextState: OperationalState = {
    ...state,
    lastQuote: nextQuote,
    lastQuestionKey: nextMissing,
    lastQuestionText: nextMissing ? questionForField(nextMissing) : null,
    quoteRevisionMode: nextMissing ? nextMissing : "ready_to_quote"
  };
  const collectedDataPatch = collectedPatchForField(field, value, message);

  return buildDecision({
    detectedIntent: "informando_dado_orcamento",
    isReplyToPreviousQuestion: true,
    answeredField: field,
    isReplyToPreviousOffer: false,
    acceptedPreviousOffer: false,
    previousOfferType: state.lastOfferType || null,
    requiresTool: !nextMissing,
    toolToCall: !nextMissing ? "calcularOrcamento" : null,
    shouldAskClarification: Boolean(nextMissing),
    nextQuestionKey: nextMissing,
    responseGoal: nextMissing ? "coletar_proximo_dado" : "calcular_orcamento",
    mustNotRepeatLastAnswer: true,
    nextState,
    collectedDataPatch,
    missingDataPatch: nextMissing ? [String(nextMissing)] : [],
    aiDecision: {
      intencao: "consulta_valor",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente respondeu a pergunta operacional anterior.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: nextMissing ? "pedir_mais_informacoes" : "responder_com_base",
      motivo: "Estado operacional: dado de orcamento atualizado antes do orquestrador.",
      resposta: nextMissing
        ? questionForField(nextMissing)
        : "Perfeito, vou recalcular com os dados atualizados."
    }
  });
};

const buildLoopRecoveryDecision = (
  message: string,
  state: OperationalState
): OperationalDecision => {
  const response = "Voce tem razao, me perdi aqui. Me diga em uma frase qual duvida voce quer resolver agora.";
  const nextState: OperationalState = {
    ...state,
    repeatedResponseCount: Number(state.repeatedResponseCount || 0) + 1,
    lastOfferType: null,
    awaitingConfirmationFor: null,
    lastQuestionKey: null,
    lastQuestionText: response,
    quoteRevisionMode: null
  };

  return buildDecision({
    detectedIntent: "reclamacao_loop_ou_erro",
    isReplyToPreviousQuestion: false,
    answeredField: null,
    isReplyToPreviousOffer: false,
    acceptedPreviousOffer: false,
    previousOfferType: state.lastOfferType || null,
    requiresTool: false,
    toolToCall: null,
    shouldAskClarification: true,
    nextQuestionKey: nextState.lastQuestionKey || null,
    responseGoal: "recuperar_loop",
    mustNotRepeatLastAnswer: true,
    nextState,
    aiDecision: {
      intencao: "reclamacao_loop_ou_erro",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente apontou repeticao, bug ou erro de entendimento.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Estado operacional: recuperar conversa sem repetir ultima resposta.",
      resposta: response
    }
  });
};

const persistOperationalDecision = async (
  ticket: Ticket,
  decision: OperationalDecision
): Promise<void> => {
  await UpdateAiTicketContextService({
    ticket,
    source: "operational_state",
    collectedData: decision.collectedDataPatch,
    missingData: decision.missingDataPatch,
    currentObjective: decision.responseGoal,
    nextQuestion: decision.nextState.lastQuestionText || null,
    lastAiIntent: decision.aiDecision.intencao,
    lastAiAction: decision.aiDecision.acao,
    lastAiDecisionReason: decision.aiDecision.motivo,
    operationalState: decision.nextState
  });
};

export const EvaluateAiConversationStateService = async ({
  ticket,
  message,
  aiSetting,
  context,
  semanticDecision
}: EvaluateRequest): Promise<OperationalDecision | null> => {
  const state = getStateWithFallbacks(ticket, context);
  const normalized = normalizeText(message);
  const semanticIntent = semanticDecision?.messageUnderstanding.primaryIntent;
  const clearKnowledgeBaseQuestion = isClearKnowledgeBaseQuestion(message);
  const postQuoteMenuOption =
    state.awaitingConfirmationFor === "post_quote_menu" || state.lastOfferType === "post_quote_menu"
      ? isPostQuoteMenuOption(message)
      : null;

  if (postQuoteMenuOption) {
    const decision = buildPostQuoteMenuDecision(message, state, postQuoteMenuOption);
    await persistOperationalDecision(ticket, decision);
    return decision;
  }

  if (semanticIntent === "pergunta_sobre_ia") {
    const decision = buildIdentityDecision(message, state, aiSetting);
    await persistOperationalDecision(ticket, decision);
    return decision;
  }

  if (semanticIntent === "pergunta_sobre_orcamento_anterior") {
    const decision = buildPreviousQuoteAnswerDecision(message, state);
    await persistOperationalDecision(ticket, decision);
    return decision;
  }

  if (semanticIntent === "recusa_do_fluxo_pendente") {
    const decision = buildPendingFlowRefusalDecision(message, state);
    await persistOperationalDecision(ticket, decision);
    return decision;
  }

  if (clearKnowledgeBaseQuestion) {
    return null;
  }

  if (state.lastQuote) {
    const change = extractQuoteFieldChange(message);
    if (change) {
      const decision = buildFieldAnswerDecision(message, state, change.field, change.value);
      await persistOperationalDecision(ticket, decision);
      return decision;
    }
  }

  if (semanticDecision?.messageUnderstanding.confidence && semanticDecision.messageUnderstanding.confidence < 0.35) {
    const decision = buildSemanticClarificationDecision(message, state);
    await persistOperationalDecision(ticket, decision);
    return decision;
  }

  if (
    semanticDecision?.contextUse.shouldSuspendPendingFlow &&
    semanticDecision.messageUnderstanding.isNewIntent &&
    ["pergunta_sobre_servico", "consultar_catalogo", "consultar_estoque", "pedido_agendamento", "pedido_disponibilidade"].includes(semanticIntent || "")
  ) {
    return null;
  }

  if (!semanticDecision && isIdentityOrRoleQuestion(message)) {
    const decision = buildIdentityDecision(message, state, aiSetting);
    await persistOperationalDecision(ticket, decision);
    return decision;
  }

  if ((!semanticDecision && isLoopOrBugComplaint(message)) || semanticIntent === "reclamacao") {
    const decision = buildLoopRecoveryDecision(message, state);
    await persistOperationalDecision(ticket, decision);
    return decision;
  }

  if (
    (state.awaitingConfirmationFor === "quote_revision" || state.lastOfferType === "quote_revision") &&
    (semanticIntent === "aceite_do_fluxo_pendente" || (!semanticDecision && isAffirmative(message)))
  ) {
    const decision = buildQuoteRevisionStartDecision(message, state);
    await persistOperationalDecision(ticket, decision);
    return decision;
  }

  if (
    (state.awaitingConfirmationFor === "human_transfer" || state.lastOfferType === "human_transfer") &&
    (semanticIntent === "aceite_do_fluxo_pendente" || (!semanticDecision && isAffirmative(message)))
  ) {
    const nextState: OperationalState = {
      ...state,
      lastOfferType: null,
      awaitingConfirmationFor: null,
      lastQuestionKey: null,
      lastQuestionText: null
    };
    const decision = buildDecision({
      detectedIntent: "aceite_transferencia_humana",
      isReplyToPreviousQuestion: false,
      answeredField: null,
      isReplyToPreviousOffer: true,
      acceptedPreviousOffer: true,
      previousOfferType: "human_transfer",
      requiresTool: true,
      toolToCall: "transferirParaFila",
      shouldAskClarification: false,
      nextQuestionKey: null,
      responseGoal: "encaminhar_atendente",
      mustNotRepeatLastAnswer: true,
      nextState,
      aiDecision: {
        intencao: "pedido_atendente",
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: "Cliente aceitou a transferencia humana oferecida anteriormente.",
        baseEncontrada: false,
        respostaSegura: false,
        acao: "encaminhar_atendente",
        motivo: "Estado operacional: aceite de oferta human_transfer.",
        resposta: "Perfeito. Vou te encaminhar para a equipe."
      }
    });
    await persistOperationalDecision(ticket, decision);
    return decision;
  }

  if (
    (state.awaitingConfirmationFor === "close_ticket" || state.lastOfferType === "close_ticket") &&
    (semanticIntent === "aceite_do_fluxo_pendente" || (!semanticDecision && isAffirmative(message)))
  ) {
    const nextState: OperationalState = {
      ...state,
      lastOfferType: null,
      awaitingConfirmationFor: null,
      lastQuestionKey: null,
      lastQuestionText: null
    };
    const decision = buildDecision({
      detectedIntent: "aceite_encerramento",
      isReplyToPreviousQuestion: false,
      answeredField: null,
      isReplyToPreviousOffer: true,
      acceptedPreviousOffer: true,
      previousOfferType: "close_ticket",
      requiresTool: true,
      toolToCall: "encerrarAtendimento",
      shouldAskClarification: false,
      nextQuestionKey: null,
      responseGoal: "encerrar_atendimento",
      mustNotRepeatLastAnswer: true,
      nextState,
      aiDecision: {
        intencao: "pedido_encerramento",
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: "Cliente aceitou o encerramento oferecido anteriormente.",
        baseEncontrada: false,
        respostaSegura: true,
        acao: "encerrar_atendimento",
        motivo: "Estado operacional: aceite de oferta close_ticket.",
        resposta: "Tudo certo. Vou finalizar o atendimento por aqui. [FECHAR TICKET]"
      }
    });
    await persistOperationalDecision(ticket, decision);
    return decision;
  }

  if (state.lastQuestionKey === "quote_revision_scope") {
    const field = fieldFromRevisionScope(message);
    if (field) {
      const decision = buildRevisionScopeFieldDecision(message, state, field);
      await persistOperationalDecision(ticket, decision);
      return decision;
    }
    if (semanticIntent === "aceite_do_fluxo_pendente" || (!semanticDecision && isAffirmative(message))) {
      const decision = buildQuoteRevisionStartDecision(message, state);
      await persistOperationalDecision(ticket, decision);
      return decision;
    }
  }

  if (state.lastQuestionKey && ["people", "meetingCount", "hoursPerMeeting"].includes(state.lastQuestionKey)) {
    const value = parseNumberLike(message);
    if (value) {
      const decision = buildFieldAnswerDecision(message, state, state.lastQuestionKey, value);
      await persistOperationalDecision(ticket, decision);
      return decision;
    }
  }

  if (state.lastQuote) {
    const change = extractQuoteFieldChange(message);
    if (change && (!semanticDecision || semanticIntent === "alteracao_de_parametro" || semanticIntent === "revisao_de_orcamento")) {
      const decision = buildFieldAnswerDecision(message, state, change.field, change.value);
      await persistOperationalDecision(ticket, decision);
      return decision;
    }
    if ((!semanticDecision && /\b(opcao menor|opcao mais barata|menor|mais barato|reduzir|diminui|diminuir)\b/.test(normalized)) || semanticIntent === "objecao_comercial" || semanticIntent === "objecao_preco") {
      const decision = buildQuoteRevisionStartDecision(message, {
        ...state,
        lastOfferType: "quote_revision",
        awaitingConfirmationFor: "quote_revision"
      });
      await persistOperationalDecision(ticket, decision);
      return decision;
    }
  }

  return null;
};

const textSimilarity = (left = "", right = ""): number => {
  const leftWords = new Set(normalizeText(left).split(" ").filter(word => word.length > 2));
  const rightWords = new Set(normalizeText(right).split(" ").filter(word => word.length > 2));
  if (!leftWords.size || !rightWords.size) return 0;

  let intersection = 0;
  leftWords.forEach(word => {
    if (rightWords.has(word)) intersection += 1;
  });

  return intersection / Math.max(leftWords.size, rightWords.size);
};

export const ApplyAiResponseAntiLoopService = async (
  ticket: Ticket,
  decision: AiDecision,
  response: string
): Promise<{ decision: AiDecision; response: string }> => {
  const context = await AiTicketContext.findOne({ where: { ticketId: ticket.id } });
  const state = getStateWithFallbacks(ticket, context);
  const previous = state.lastAssistantMessage || ticket.lastAiMessage || "";
  const statePatch = (decision as any).operationalStatePatch as Partial<OperationalState> | undefined;
  const currentGoal = statePatch?.lastResponseGoal || decision.contexto || decision.acao;
  const normalizedResponse = normalizeText(response);
  const normalizedPrevious = normalizeText(previous);
  const isQuoteOrRecalculationAnswer =
    /\b(orcamento|simulacao|recalcular|recalculo|total|r\$|pacote|turno|diaria)\b/.test(normalizedResponse) &&
    /\b(\d+\s*h|\d+\s*hora|r\$|\d+,\d{2}|\d{2,})\b/.test(normalizedResponse);
  const repeatedGoal =
    !isQuoteOrRecalculationAnswer &&
    Boolean(currentGoal && state.lastResponseGoal && normalizeText(currentGoal) === normalizeText(state.lastResponseGoal)) &&
    Boolean(decision.acao === state.lastAssistantAction || state.lastQuestionKey);
  const isRepeated =
    response.trim() &&
    previous.trim() &&
    (
      normalizedResponse === normalizedPrevious ||
      textSimilarity(response, previous) >= 0.86 ||
      repeatedGoal
    );

  if (!isRepeated) return { decision, response };

  const nextCount = Number(state.repeatedResponseCount || 0) + 1;
  const customerMessage = decision.mensagemInterpretada || "";
  if (
    isNonQuoteCustomerTurn(customerMessage) ||
    decision.acao === "sem_resposta_segura" ||
    decision.intencao === "inappropriate_message" ||
    decision.intencao === "out_of_scope" ||
    decision.intencao === "pergunta_sobre_ia" ||
    decision.intencao === "identidade_ou_funcao_ia"
  ) {
    const nextState: OperationalState = {
      ...state,
      repeatedResponseCount: nextCount,
      lastResponseGoal: currentGoal,
      responseGoalHistory: [...(state.responseGoalHistory || []).slice(-2), currentGoal || decision.acao],
      lastOfferType: null,
      awaitingConfirmationFor: null,
      lastQuestionKey: null,
      lastQuestionText: null,
      quoteRevisionMode: null
    };

    await UpdateAiTicketContextService({
      ticket,
      source: "anti_loop",
      currentObjective: "pergunta_atual_fora_do_orcamento",
      nextQuestion: null,
      lastAiIntent: decision.intencao,
      lastAiAction: decision.acao,
      lastAiDecisionReason: "Anti-loop: pergunta atual e factual, institucional ou fora do escopo; nao forcar retorno ao orcamento.",
      operationalState: nextState
    });

    return { decision, response };
  }

  const hasQuote = Boolean(state.lastQuote);
  const requestedField = extractQuoteFieldChange(customerMessage)?.field ||
    (/\b(horas|hora|duracao|tempo)\b/.test(normalizeText(customerMessage)) ? "hoursPerMeeting" : null);
  const quoteQuestion = requestedField
    ? questionForField(requestedField)
    : "Me passa os novos dados em uma frase, por exemplo: 5 pessoas, 3 encontros de 4h.";
  const fallback = hasQuote ? quoteQuestion : "Para quantas pessoas?";
  const loopFallback = hasQuote
    ? `Voce tem razao, me repeti. ${quoteQuestion}`
    : "Para quantas pessoas?";
  const nextResponse = nextCount >= 2 ? loopFallback : fallback;
  const nextState: OperationalState = {
    ...state,
    repeatedResponseCount: nextCount,
    lastResponseGoal: "fallback_anti_loop",
    responseGoalHistory: [...(state.responseGoalHistory || []).slice(-2), currentGoal || decision.acao],
    lastOfferType: hasQuote ? null : state.lastOfferType || null,
    awaitingConfirmationFor: hasQuote ? null : state.awaitingConfirmationFor || null,
    lastQuestionKey: hasQuote ? requestedField || "quote_revision_scope" : "people",
    lastQuestionText: nextResponse,
    quoteRevisionMode: hasQuote ? "awaiting_scope" : "collecting_new_quote"
  };

  await UpdateAiTicketContextService({
    ticket,
    source: "anti_loop",
    currentObjective: "bloqueio_resposta_repetida",
    nextQuestion: nextResponse,
    lastAiIntent: decision.intencao,
    lastAiAction: "pedir_mais_informacoes",
    lastAiDecisionReason: "Anti-loop: resposta final era igual ou muito parecida com a anterior.",
    operationalState: nextState
  });

  return {
    decision: {
      ...decision,
      acao: "pedir_mais_informacoes",
      resposta: nextResponse,
      motivo: [
        decision.motivo,
        "Anti-loop: resposta repetida bloqueada e rota avancada por estado operacional."
      ].filter(Boolean).join(" | ")
    },
    response: nextResponse
  };
};

const inferOfferTypeFromDecision = (decision: AiDecision, response = ""): OperationalOfferType => {
  const byText = inferOfferTypeFromText(response);
  if (byText) return byText;
  if (decision.acao === "encaminhar_atendente") return "human_transfer";
  if (decision.acao === "encerrar_atendimento" || /\[FECHAR TICKET\]/i.test(response)) return "close_ticket";
  return null;
};

export const UpdateOperationalStateAfterAiDecisionService = async (
  ticket: Ticket,
  decision: AiDecision,
  response?: string | null
): Promise<void> => {
  const context = await AiTicketContext.findOne({ where: { ticketId: ticket.id } });
  const state = getStateWithFallbacks(ticket, context);
  const statePatch = (decision as any).operationalStatePatch as Partial<OperationalState> | undefined;
  const inferredOffer = inferOfferTypeFromDecision(decision, response || decision.resposta || "");
  const inferredQuestion = inferQuestionKeyFromText(response || decision.resposta || "");
  const nextGoal = statePatch?.lastResponseGoal || decision.contexto || decision.acao;
  const shouldClearPendingQuoteState =
    !statePatch &&
    !inferredOffer &&
    decision.acao === "responder_com_base" &&
    isNonQuoteCustomerTurn(decision.mensagemInterpretada || "") &&
    decision.intencao !== "consulta_valor" &&
    decision.intencao !== "revisar_orcamento" &&
    decision.intencao !== "request_custom_quote";
  const nextState: OperationalState = {
    ...state,
    ...(statePatch || {}),
    lastAssistantMessage: response || decision.resposta || state.lastAssistantMessage || null,
    lastAssistantAction: decision.acao,
    lastIntent: decision.intencao,
    lastResponseGoal: nextGoal,
    responseGoalHistory: [...(state.responseGoalHistory || []).slice(-2), nextGoal],
    lastToolCalled: decision.ferramenta || statePatch?.lastToolCalled || state.lastToolCalled || null,
    lastOfferType: shouldClearPendingQuoteState ? null : statePatch?.lastOfferType !== undefined ? statePatch.lastOfferType : inferredOffer,
    awaitingConfirmationFor: shouldClearPendingQuoteState ? null : statePatch?.awaitingConfirmationFor !== undefined ? statePatch.awaitingConfirmationFor : inferredOffer,
    lastQuestionKey: shouldClearPendingQuoteState ? null : statePatch?.lastQuestionKey !== undefined ? statePatch.lastQuestionKey : inferredQuestion,
    lastQuestionText: shouldClearPendingQuoteState ? null : inferredQuestion ? response || decision.resposta || null : statePatch?.lastQuestionText || null,
    quoteRevisionMode: shouldClearPendingQuoteState ? null : statePatch?.quoteRevisionMode !== undefined ? statePatch.quoteRevisionMode : state.quoteRevisionMode,
    repeatedResponseCount: /anti-loop/i.test(decision.motivo || "") ? state.repeatedResponseCount || 0 : 0
  };

  await UpdateAiTicketContextService({
    ticket,
    source: "ai_response",
    currentObjective: decision.contexto || undefined,
    nextQuestion: nextState.lastQuestionText || null,
    lastAiIntent: decision.intencao,
    lastAiAction: decision.acao,
    lastAiDecisionReason: decision.motivo,
    lastKnowledgeIds: decision.knowledgeIds || null,
    operationalState: nextState
  });
};

export const serializeOperationalState = stringify;
