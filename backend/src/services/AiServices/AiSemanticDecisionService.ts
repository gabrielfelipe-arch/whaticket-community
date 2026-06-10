import AiSetting from "../../models/AiSetting";
import AiTicketContext from "../../models/AiTicketContext";
import Ticket from "../../models/Ticket";
import { OperationalState, parseOperationalState } from "./AiConversationStateService";

export type ConversationMode =
  | "commercial"
  | "support"
  | "objection"
  | "complaint"
  | "casual"
  | "handoff"
  | "closing"
  | "unclear";

export type IntentGroup = "conversational" | "commercial" | "operational" | "safety";

export type SemanticIntent =
  | "saudacao"
  | "agradecimento"
  | "confirmacao"
  | "negativa"
  | "duvida"
  | "correcao"
  | "reclamacao"
  | "confusao"
  | "brincadeira"
  | "pergunta_sobre_ia"
  | "pergunta_sobre_servico"
  | "pergunta_sobre_orcamento_anterior"
  | "pedido_de_repeticao"
  | "pedido_de_resumo"
  | "mudanca_de_assunto"
  | "retomada_de_assunto"
  | "fora_de_contexto"
  | "pedir_preco"
  | "pedir_orcamento"
  | "consultar_catalogo"
  | "consultar_estoque"
  | "comparar_opcoes"
  | "pedir_recomendacao"
  | "pedir_desconto"
  | "pedir_cupom"
  | "pedir_condicao_especial"
  | "objecao_comercial"
  | "objecao_preco"
  | "indecisao"
  | "pedido_de_fechamento"
  | "aceite_do_fluxo_pendente"
  | "recusa_do_fluxo_pendente"
  | "resposta_ao_fluxo_pendente"
  | "revisao_de_orcamento"
  | "alteracao_de_parametro"
  | "pedido_de_humano"
  | "pedido_de_encerramento"
  | "pedido_reserva"
  | "pedido_agendamento"
  | "pedido_disponibilidade"
  | "pedido_pagamento"
  | "consultar_status"
  | "tentativa_de_burla"
  | "pedido_fora_da_regra"
  | "assunto_sensivel_ou_proibido"
  | "abuso_ou_ofensa"
  | "dados_insuficientes"
  | "baixa_confianca"
  | "indefinido";

export type BusinessCapability =
  | "knowledge_base"
  | "catalog"
  | "quote"
  | "stock"
  | "appointment"
  | "reservation"
  | "payment"
  | "human_transfer"
  | "ticket_support"
  | "lead_capture"
  | null;

export interface AiSemanticDecision {
  conversationUnderstanding: {
    conversationMode: ConversationMode;
    customerMood: "neutral" | "interested" | "confused" | "frustrated" | "indecisive" | "playful" | "urgent";
    topicStatus: "same_topic" | "new_topic" | "returning_topic" | "off_topic";
    shouldContinueSelling: boolean;
    shouldSlowDown: boolean;
    shouldApologizeOrRecover: boolean;
  };
  messageUnderstanding: {
    primaryIntent: SemanticIntent;
    secondaryIntent: SemanticIntent | null;
    intentGroup: IntentGroup;
    isNewIntent: boolean;
    isReplyToPendingFlow: boolean;
    isQuestion: boolean;
    isCorrection: boolean;
    isRefusal: boolean;
    isAcceptance: boolean;
    confidence: number;
  };
  businessContext: {
    businessType: string | null;
    capability: BusinessCapability;
    targetEntityType: "service" | "product" | "vehicle" | "procedure" | "course" | "room" | "unknown";
    targetEntityName: string | null;
  };
  contextUse: {
    usesLastQuestion: boolean;
    usesLastOffer: boolean;
    usesLastQuote: boolean;
    usesCatalog: boolean;
    usesKnowledgeBase: boolean;
    shouldSuspendPendingFlow: boolean;
    shouldResumePendingFlowAfterAnswer: boolean;
  };
  dataExtraction: {
    updatedFields: Record<string, string | number | boolean | null>;
    filters: Record<string, string | number | boolean | null>;
    requestedInfo: string | null;
  };
  nextAction: {
    type:
      | "answer_question"
      | "ask_clarification"
      | "continue_pending_flow"
      | "suspend_pending_flow"
      | "update_state"
      | "calculate_quote"
      | "search_catalog"
      | "search_knowledge_base"
      | "check_stock"
      | "check_appointment"
      | "transfer_to_human"
      | "close_ticket"
      | "block_or_redirect"
      | "fallback_to_legacy";
    tool: string | null;
    requiresBackendValidation: boolean;
    shouldAskClarification: boolean;
    nextQuestionKey: string | null;
  };
  responsePlan: {
    goal: string;
    style: "short_natural_whatsapp";
    mustNotRepeatLastAnswer: boolean;
    shouldEndWithQuestion: boolean;
  };
}

interface Request {
  ticket: Ticket;
  message: string;
  aiSetting: AiSetting;
  history: string;
  structuredContext: string;
  context?: AiTicketContext | null;
  operationalState?: OperationalState;
}

interface IntentScore {
  intent: SemanticIntent;
  score: number;
  group: IntentGroup;
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
    return fallback;
  }
};

const has = (text: string, pattern: RegExp): boolean => pattern.test(text);

const score = (text: string, intent: SemanticIntent, group: IntentGroup, patterns: RegExp[]): IntentScore => {
  const hits = patterns.reduce((total, pattern) => total + (has(text, pattern) ? 1 : 0), 0);
  return { intent, group, score: hits };
};

const parseNumber = (value = ""): number | null => {
  const digit = normalizeText(value).match(/\b\d{1,6}\b/);
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
    quinze: 15,
    vinte: 20
  };
  return words[normalizeText(value)] || null;
};

const getPendingOffer = (state: OperationalState): string | null =>
  state.awaitingConfirmationFor || state.lastOfferType || null;

const getPendingQuestion = (state: OperationalState): string | null =>
  state.lastQuestionKey || null;

const getCapabilities = (aiSetting: AiSetting): Set<string> => {
  const raw = [
    "knowledge_base",
    "human_transfer",
    (aiSetting as any).allowedTools,
    (aiSetting as any).enabledCapabilities,
    (aiSetting as any).serviceType,
    (aiSetting as any).prompt
  ].filter(Boolean).join(" ");
  const text = normalizeText(raw);
  const capabilities = new Set<string>(["knowledge_base", "human_transfer"]);

  if (/\b(orcamento|quote|calcular|preco|valor|venda|comercial)\b/.test(text)) capabilities.add("quote");
  if (/\b(catalogo|catalog|produto|estoque|stock|veiculo|carro)\b/.test(text)) capabilities.add("catalog");
  if (/\b(estoque|stock|disponivel em|cor|tamanho)\b/.test(text)) capabilities.add("stock");
  if (/\b(agenda|agendamento|consulta|horario|appointment)\b/.test(text)) capabilities.add("appointment");
  if (/\b(reserva|reservar|reservation)\b/.test(text)) capabilities.add("reservation");
  if (/\b(pagamento|payment|pix|cartao)\b/.test(text)) capabilities.add("payment");
  if (/\b(suporte|support|ticket|chamado|login|problema)\b/.test(text)) capabilities.add("ticket_support");
  if (/\b(lead|captura|contato)\b/.test(text)) capabilities.add("lead_capture");

  return capabilities;
};

const inferBusinessType = (aiSetting: AiSetting): string | null =>
  (aiSetting as any).serviceType || (aiSetting as any).companyName || null;

const inferTargetEntityType = (text: string, aiSetting: AiSetting): AiSemanticDecision["businessContext"]["targetEntityType"] => {
  const combined = `${text} ${normalizeText(String((aiSetting as any).serviceType || ""))} ${normalizeText(String((aiSetting as any).companyName || ""))}`;
  if (/\b(carro|veiculo|automovel|automatico|manual|km)\b/.test(combined)) return "vehicle";
  if (/\b(produto|cor|tamanho|estoque|preto|branco|catalogo)\b/.test(combined)) return "product";
  if (/\b(sessao|procedimento|estetica|clinica|consulta)\b/.test(combined)) return "procedure";
  if (/\b(curso|turma|aula|online|presencial)\b/.test(combined)) return "course";
  if (/\b(sala|salinha|espaco|aluguel)\b/.test(combined)) return "room";
  if (/\b(servico|suporte|consultoria|orcamento)\b/.test(combined)) return "service";
  return "unknown";
};

const collectIntentScores = (text: string, state: OperationalState): IntentScore[] => {
  const pendingOffer = getPendingOffer(state);
  const pendingQuestion = getPendingQuestion(state);
  const affirmative = /^(sim|s|ok|okay|quero|pode|vamos|isso|claro|fechado|confirmo|aceito|bora)(\s|$)/;
  const negative = /^(nao|n|deixa|nao quero|nao precisa|mantem|mantem o anterior|depois|agora nao)(\s|$)/;

  const scores: IntentScore[] = [
    score(text, "pergunta_sobre_ia", "conversational", [
      /\b(voce|vc|tu|atendente|assistente|robo|bot|ia|inteligencia artificial|quem)\b.{0,40}\b(voce|vc|tu|falando|funcao|faz|ajuda|nome|robo|bot|ia|atendente)\b/,
      /\b(qual|quem|o que)\b.{0,30}\b(funcao|papel|nome|falando)\b/
    ]),
    score(text, "pergunta_sobre_orcamento_anterior", "commercial", [
      /\b(quanto|qual|valor|preco|total|deu|ficou|ficaria|lembra|lembrar)\b.{0,50}\b(deu|ficou|total|valor|preco|orcamento|anterior|mesmo)\b/,
      /\b(me lembra|lembra)\b.{0,40}\b(total|valor|preco|orcamento)\b/
    ]),
    score(text, "pergunta_sobre_servico", "conversational", [
      /\b(o que|oq|que)\b.{0,40}\b(incluso|inclui|vem|direito|entra|oferece|funciona)\b/,
      /\b(endereco|localizacao|estrutura|como funciona|duvida|login|acessar|senha|entrar no sistema)\b/
    ]),
    score(text, "pedido_de_humano", "operational", [
      /\b(atendente|humano|pessoa|equipe|vendedor|consultor)\b/,
      /\b(falar|passar|transferir|encaminhar|chamar)\b.{0,40}\b(alguem|atendente|equipe|humano)\b/
    ]),
    score(text, "pedido_de_encerramento", "operational", [
      /\b(encerrar|finalizar|fechar)\b.{0,30}\b(atendimento|conversa|chat|ticket)\b/,
      /\b(finaliza|encerra|fecha)\b.{0,30}\b(atendimento|conversa|chat|ticket)\b/,
      /\b(tchau|ate mais|sair)\b/
    ]),
    score(text, "pedir_orcamento", "commercial", [
      /\b(orcamento|cotacao|simulacao|simular|quanto custa|quanto fica|valor|preco)\b/,
      /\b(fica|ficaria)\b.{0,30}\b(quanto|valor|preco)\b/
    ]),
    score(text, "revisao_de_orcamento", "operational", [
      /\b(refazer|recalcular|revisar|ajustar|mudar|alterar|outro|novo|cenario|refaz)\b.{0,50}\b(orcamento|valor|preco|simulacao|cenario)?\b/
    ]),
    score(text, "alteracao_de_parametro", "operational", [
      /\b(agora|muda|altera|troca|coloca|bota|faz|seriam|sao)\b.{0,40}\b(pessoas|dias|encontros|aulas|horas|sessoes|unidades|cor|preto|automatico|online)\b/,
      /\b\d{1,6}\b.{0,25}\b(pessoas|dias|encontros|aulas|horas|sessoes|mil|reais)\b/
    ]),
    score(text, "consultar_catalogo", "commercial", [
      /\b(tem|possui|vende|disponivel|opcoes|modelo|produto|catalogo|turma)\b/,
      /\b(automatico|manual|online|presencial|ate\s+\d|preto|branco)\b/
    ]),
    score(text, "consultar_estoque", "commercial", [
      /\b(estoque|tem em|disponivel em|cor|tamanho|preto|branco|pronta entrega)\b/
    ]),
    score(text, "pedido_agendamento", "operational", [
      /\b(agendar|agenda|marcar|horario|consulta|encaixe|amanha|hoje)\b/,
      /\b(tem|possui|existe)\b.{0,30}\b(horario|agenda|vaga|encaixe|amanha|hoje)\b/
    ]),
    score(text, "pedido_disponibilidade", "operational", [
      /\b(disponibilidade|disponivel|tem horario|tem vaga|livre)\b/
    ]),
    score(text, "pedido_reserva", "operational", [
      /\b(reservar|reserva|segurar|garantir vaga|fechar reserva)\b/
    ]),
    score(text, "pedido_pagamento", "operational", [
      /\b(pagamento|pagar|pix|cartao|boleto|parcelar|parcela)\b/
    ]),
    score(text, "pedir_desconto", "commercial", [
      /\b(desconto|promocao|abatimento|melhorar valor|valor melhor|negociar)\b/
    ]),
    score(text, "pedir_cupom", "commercial", [
      /\b(cupom|codigo promocional|voucher)\b/
    ]),
    score(text, "objecao_comercial", "commercial", [
      /\b(caro|pesado|fora do orcamento|nao cabe|nao gostei|nao serve|nenhuma|alto)\b/,
      /\b(tem como melhorar|melhor condicao|opcao menor|mais barato|ficou pesado|valor pesado)\b/
    ]),
    score(text, "tentativa_de_burla", "safety", [
      /\b(ignora|finge|inventa|faz de conta|valor que eu quiser|sem tabela|burlar|quebra regra)\b/,
      /\b(calcula com valor|simula com valor)\b.{0,40}\b(que nao existe|inventado|qualquer)\b/
    ]),
    score(text, "fora_de_contexto", "safety", [
      /\b(camisa|futebol|politica|receita|piada|musica|filme)\b/
    ]),
    score(text, "reclamacao", "conversational", [
      /\b(erro|bug|bugou|travou|loop|looping|repetindo|nao entendeu|ja falei|ja respondi|nao foi isso)\b/
    ]),
    score(text, "confusao", "conversational", [
      /\b(nao entendi|confuso|como assim|explica melhor|me perdi)\b/
    ]),
    score(text, "pedido_de_resumo", "conversational", [
      /\b(resume|resumo|recapitul|me explica em poucas|simplifica)\b/
    ]),
    score(text, "pedido_de_repeticao", "conversational", [
      /\b(repete|repetir|manda de novo|fala de novo)\b/
    ]),
    score(text, "saudacao", "conversational", [
      /^(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/
    ]),
    score(text, "agradecimento", "conversational", [
      /\b(obrigado|obrigada|valeu|agradeco|grato)\b/
    ]),
    score(text, "retomada_de_assunto", "conversational", [
      /\b(voltando|sobre aquilo|aquele orcamento|como eu disse|retomando)\b/
    ]),
    score(text, "mudanca_de_assunto", "conversational", [
      /\b(outra coisa|mudando de assunto|agora quero|na verdade|pensando melhor)\b/
    ])
  ];

  if (pendingOffer && affirmative.test(text)) {
    scores.push({ intent: "aceite_do_fluxo_pendente", group: "conversational", score: 4 });
  }
  if ((pendingOffer || pendingQuestion) && negative.test(text)) {
    scores.push({ intent: "recusa_do_fluxo_pendente", group: "conversational", score: 4 });
  }
  if (pendingQuestion && (parseNumber(text) !== null || affirmative.test(text) || negative.test(text))) {
    scores.push({ intent: "resposta_ao_fluxo_pendente", group: "conversational", score: 3 });
  }
  if (!text.trim()) {
    scores.push({ intent: "dados_insuficientes", group: "safety", score: 5 });
  }

  return scores.sort((left, right) => right.score - left.score);
};

const extractData = (text: string): { updatedFields: Record<string, any>; filters: Record<string, any>; requestedInfo: string | null } => {
  const updatedFields: Record<string, any> = {};
  const filters: Record<string, any> = {};
  const number = parseNumber(text);

  if (number !== null && /\b(pessoas|participantes|alunos|clientes|convidados)\b/.test(text)) updatedFields.people = number;
  if (number !== null && /\b(dias|encontros|aulas|reunioes|sessoes|consultas)\b/.test(text)) updatedFields.meetingCount = number;
  if (number !== null && /\b(h|hora|horas)\b/.test(text)) updatedFields.hoursPerMeeting = number;
  if (number !== null && /\b(sessao|sessoes|unidades|itens)\b/.test(text)) updatedFields.quantity = number;
  if (number !== null && /\b(mil|reais|r)\b/.test(text)) filters.budgetMax = /\bmil\b/.test(text) ? number * 1000 : number;
  if (/\bautomatico\b/.test(text)) filters.transmission = "automatico";
  if (/\bmanual\b/.test(text)) filters.transmission = "manual";
  if (/\bpreto\b/.test(text)) filters.color = "preto";
  if (/\bbranco\b/.test(text)) filters.color = "branco";
  if (/\bonline\b/.test(text)) filters.modality = "online";
  if (/\bpresencial\b/.test(text)) filters.modality = "presencial";

  let requestedInfo: string | null = null;
  if (/\b(total|valor|preco|quanto|ficou|deu)\b/.test(text)) requestedInfo = "last_quote_total";
  if (/\b(incluso|inclui|vem|direito|entra)\b/.test(text)) requestedInfo = "included_items";
  if (/\b(endereco|localizacao|onde fica)\b/.test(text)) requestedInfo = "address";

  return { updatedFields, filters, requestedInfo };
};

const chooseCapability = (
  primaryIntent: SemanticIntent,
  capabilities: Set<string>
): BusinessCapability => {
  if (["pedir_orcamento", "pedir_preco", "revisao_de_orcamento", "alteracao_de_parametro", "pergunta_sobre_orcamento_anterior"].includes(primaryIntent) && capabilities.has("quote")) return "quote";
  if (["consultar_catalogo", "comparar_opcoes", "pedir_recomendacao"].includes(primaryIntent) && capabilities.has("catalog")) return "catalog";
  if (primaryIntent === "consultar_estoque" && capabilities.has("stock")) return "stock";
  if (primaryIntent === "pedido_agendamento" && capabilities.has("appointment")) return "appointment";
  if (primaryIntent === "pedido_reserva" && capabilities.has("reservation")) return "reservation";
  if (primaryIntent === "pedido_pagamento" && capabilities.has("payment")) return "payment";
  if (["pedido_de_humano", "pedido_de_fechamento"].includes(primaryIntent) && capabilities.has("human_transfer")) return "human_transfer";
  if (["pergunta_sobre_servico", "duvida"].includes(primaryIntent) && capabilities.has("knowledge_base")) return "knowledge_base";
  return null;
};

const chooseNextAction = (
  primaryIntent: SemanticIntent,
  capability: BusinessCapability,
  decisionData: ReturnType<typeof extractData>,
  state: OperationalState
): AiSemanticDecision["nextAction"] => {
  if (primaryIntent === "dados_insuficientes" || primaryIntent === "baixa_confianca" || primaryIntent === "indefinido") {
    return { type: "ask_clarification", tool: null, requiresBackendValidation: false, shouldAskClarification: true, nextQuestionKey: null };
  }
  if (primaryIntent === "pedido_de_humano") {
    return { type: "transfer_to_human", tool: "transferirParaFila", requiresBackendValidation: true, shouldAskClarification: false, nextQuestionKey: null };
  }
  if (primaryIntent === "pedido_de_encerramento") {
    return { type: "close_ticket", tool: "encerrarAtendimento", requiresBackendValidation: true, shouldAskClarification: false, nextQuestionKey: null };
  }
  if (primaryIntent === "aceite_do_fluxo_pendente" || primaryIntent === "resposta_ao_fluxo_pendente") {
    return { type: "continue_pending_flow", tool: null, requiresBackendValidation: Boolean(getPendingOffer(state)), shouldAskClarification: false, nextQuestionKey: state.lastQuestionKey || null };
  }
  if (primaryIntent === "recusa_do_fluxo_pendente") {
    return { type: "suspend_pending_flow", tool: null, requiresBackendValidation: false, shouldAskClarification: false, nextQuestionKey: null };
  }
  if (primaryIntent === "alteracao_de_parametro") {
    return { type: "update_state", tool: capability === "quote" ? "calcularOrcamento" : null, requiresBackendValidation: capability === "quote", shouldAskClarification: false, nextQuestionKey: null };
  }
  if (primaryIntent === "revisao_de_orcamento" || primaryIntent === "pedir_orcamento" || primaryIntent === "pedir_preco") {
    return { type: "calculate_quote", tool: capability === "quote" ? "calcularOrcamento" : null, requiresBackendValidation: true, shouldAskClarification: false, nextQuestionKey: null };
  }
  if (primaryIntent === "consultar_catalogo") {
    return { type: "search_catalog", tool: capability === "catalog" ? "consultarCatalogo" : null, requiresBackendValidation: true, shouldAskClarification: false, nextQuestionKey: null };
  }
  if (primaryIntent === "consultar_estoque") {
    return { type: "check_stock", tool: capability === "stock" ? "consultarEstoque" : null, requiresBackendValidation: true, shouldAskClarification: false, nextQuestionKey: null };
  }
  if (primaryIntent === "pedido_agendamento" || primaryIntent === "pedido_disponibilidade") {
    return { type: "check_appointment", tool: capability === "appointment" ? "consultarAgenda" : null, requiresBackendValidation: true, shouldAskClarification: !capability, nextQuestionKey: null };
  }
  if (["tentativa_de_burla", "pedido_fora_da_regra", "assunto_sensivel_ou_proibido", "abuso_ou_ofensa", "fora_de_contexto"].includes(primaryIntent)) {
    return { type: "block_or_redirect", tool: null, requiresBackendValidation: primaryIntent === "tentativa_de_burla", shouldAskClarification: false, nextQuestionKey: null };
  }
  if (primaryIntent === "pergunta_sobre_servico") {
    return { type: "search_knowledge_base", tool: null, requiresBackendValidation: false, shouldAskClarification: false, nextQuestionKey: null };
  }
  return { type: "answer_question", tool: null, requiresBackendValidation: false, shouldAskClarification: false, nextQuestionKey: null };
};

const getConversationMode = (intent: SemanticIntent): ConversationMode => {
  if (["pedido_de_humano"].includes(intent)) return "handoff";
  if (["pedido_de_encerramento"].includes(intent)) return "closing";
  if (["reclamacao", "correcao"].includes(intent)) return "complaint";
  if (["objecao_comercial", "objecao_preco"].includes(intent)) return "objection";
  if (["fora_de_contexto", "brincadeira", "pergunta_sobre_ia"].includes(intent)) return "casual";
  if (["pergunta_sobre_servico", "duvida"].includes(intent)) return "support";
  if (["pedir_orcamento", "pedir_preco", "consultar_catalogo", "consultar_estoque", "comparar_opcoes", "revisao_de_orcamento", "alteracao_de_parametro"].includes(intent)) return "commercial";
  return "unclear";
};

const buildDecision = ({
  message,
  aiSetting,
  context,
  state
}: Request & { state: OperationalState }): AiSemanticDecision => {
  const text = normalizeText(message);
  const capabilities = getCapabilities(aiSetting);
  const data = extractData(text);
  const scores = collectIntentScores(text, state).filter(item => item.score > 0);
  const refusalScore = scores.find(item => item.intent === "recusa_do_fluxo_pendente");
  const safetyScore = scores.find(item => item.group === "safety" && item.intent !== "fora_de_contexto");
  const objectionScore = scores.find(item => ["objecao_comercial", "objecao_preco", "pedir_desconto"].includes(item.intent));
  let primary = scores[0] || { intent: "indefinido" as SemanticIntent, group: "safety" as IntentGroup, score: 0 };
  let secondary = scores.find(item => item.intent !== primary.intent)?.intent || null;

  if (safetyScore) {
    primary = safetyScore;
    secondary = scores.find(item => item.intent !== primary.intent)?.intent || null;
  } else if (objectionScore && /(\bcaro\b|\bpesado\b|\bmelhorar\b|\bmais barato\b|\bfora do orcamento\b)/.test(text)) {
    primary = objectionScore;
    secondary = scores.find(item => item.intent !== primary.intent)?.intent || null;
  } else if (data.requestedInfo === "last_quote_total") {
    primary = { intent: "pergunta_sobre_orcamento_anterior", group: "commercial", score: Math.max(primary.score, 4) };
    secondary = refusalScore ? "recusa_do_fluxo_pendente" : secondary;
  }

  const capability = chooseCapability(primary.intent, capabilities);
  const nextAction = chooseNextAction(primary.intent, capability, data, state);
  const pendingOffer = getPendingOffer(state);
  const pendingQuestion = getPendingQuestion(state);
  const hasLastQuote = Boolean(state.lastQuote);
  const isQuestion = /\?/.test(message) || /\b(qual|quanto|como|onde|quando|quem|o que|oq|porque|por que|tem|existe|pode)\b/.test(text);
  const isAcceptance = primary.intent === "aceite_do_fluxo_pendente" || /\b(sim|quero|pode|vamos|ok|aceito|confirmo)\b/.test(text);
  const isRefusal = primary.intent === "recusa_do_fluxo_pendente" || /\b(nao|deixa|nao quero|nao precisa|mantem)\b/.test(text);
  const confidence = Math.min(0.98, Math.max(0.2, primary.score / 4 + (secondary ? 0.08 : 0)));
  const isClearNewQuestion = isQuestion && !["aceite_do_fluxo_pendente", "recusa_do_fluxo_pendente", "resposta_ao_fluxo_pendente"].includes(primary.intent);
  const shouldSuspendPendingFlow =
    primary.intent === "recusa_do_fluxo_pendente" ||
    (Boolean(pendingOffer || pendingQuestion) && isClearNewQuestion);

  return {
    conversationUnderstanding: {
      conversationMode: getConversationMode(primary.intent),
      customerMood: primary.intent === "reclamacao" ? "frustrated" :
        primary.intent === "confusao" ? "confused" :
        primary.intent === "indecisao" || primary.intent === "objecao_comercial" ? "indecisive" :
        primary.intent === "brincadeira" ? "playful" :
        ["pedido_de_humano", "pedido_de_encerramento"].includes(primary.intent) ? "urgent" :
        "neutral",
      topicStatus: primary.intent === "fora_de_contexto" ? "off_topic" :
        primary.intent === "retomada_de_assunto" ? "returning_topic" :
        isClearNewQuestion || primary.intent === "mudanca_de_assunto" ? "new_topic" :
        "same_topic",
      shouldContinueSelling: ["commercial", "objection"].includes(getConversationMode(primary.intent)) && !isRefusal,
      shouldSlowDown: ["confusao", "reclamacao", "objecao_comercial", "indecisao"].includes(primary.intent),
      shouldApologizeOrRecover: ["reclamacao", "correcao"].includes(primary.intent)
    },
    messageUnderstanding: {
      primaryIntent: primary.intent,
      secondaryIntent: secondary,
      intentGroup: primary.group,
      isNewIntent: !["aceite_do_fluxo_pendente", "recusa_do_fluxo_pendente", "resposta_ao_fluxo_pendente"].includes(primary.intent),
      isReplyToPendingFlow: ["aceite_do_fluxo_pendente", "recusa_do_fluxo_pendente", "resposta_ao_fluxo_pendente"].includes(primary.intent),
      isQuestion,
      isCorrection: ["correcao", "reclamacao"].includes(primary.intent),
      isRefusal,
      isAcceptance,
      confidence: Number(confidence.toFixed(2))
    },
    businessContext: {
      businessType: inferBusinessType(aiSetting),
      capability,
      targetEntityType: inferTargetEntityType(text, aiSetting),
      targetEntityName: null
    },
    contextUse: {
      usesLastQuestion: Boolean(pendingQuestion) && ["resposta_ao_fluxo_pendente", "aceite_do_fluxo_pendente", "recusa_do_fluxo_pendente"].includes(primary.intent),
      usesLastOffer: Boolean(pendingOffer) && ["aceite_do_fluxo_pendente", "recusa_do_fluxo_pendente"].includes(primary.intent),
      usesLastQuote: hasLastQuote && ["pergunta_sobre_orcamento_anterior", "alteracao_de_parametro", "revisao_de_orcamento", "objecao_comercial", "objecao_preco"].includes(primary.intent),
      usesCatalog: ["consultar_catalogo", "consultar_estoque", "comparar_opcoes"].includes(primary.intent),
      usesKnowledgeBase: ["pergunta_sobre_servico", "duvida"].includes(primary.intent),
      shouldSuspendPendingFlow,
      shouldResumePendingFlowAfterAnswer: shouldSuspendPendingFlow && Boolean(pendingOffer || pendingQuestion)
    },
    dataExtraction: data,
    nextAction,
    responsePlan: {
      goal:
        primary.intent === "pergunta_sobre_orcamento_anterior" ? "responder_valor_anterior_e_retornar_ao_contexto" :
        primary.intent === "pergunta_sobre_ia" ? "responder_identidade_e_retornar_ao_contexto" :
        primary.intent === "recusa_do_fluxo_pendente" ? "suspender_fluxo_pendente_e_oferecer_proximo_passo" :
        primary.intent === "alteracao_de_parametro" ? "atualizar_parametro_e_validar_proxima_acao" :
        nextAction.type,
      style: "short_natural_whatsapp",
      mustNotRepeatLastAnswer: true,
      shouldEndWithQuestion: !["pedido_de_encerramento", "tentativa_de_burla", "pedido_de_humano"].includes(primary.intent)
    }
  };
};

const AiSemanticDecisionService = async (request: Request): Promise<AiSemanticDecision> => {
  const operationalState = request.operationalState || parseOperationalState(request.context?.operationalState);
  const collectedData = parseJson<Record<string, any>>(request.context?.collectedData, {});
  const missingData = parseJson<string[]>(request.context?.missingData, []);
  const state: OperationalState = {
    ...operationalState,
    collectedData: operationalState.collectedData || collectedData,
    missingData: operationalState.missingData || missingData
  };

  return buildDecision({ ...request, state });
};

export default AiSemanticDecisionService;
