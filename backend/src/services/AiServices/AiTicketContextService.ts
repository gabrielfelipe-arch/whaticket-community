import AiTicketContext from "../../models/AiTicketContext";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";

type CollectedValue = {
  label: string;
  value: string | null;
  rawValue?: string | null;
  source: string;
  updatedAt: string;
};

type CollectedData = Record<string, CollectedValue>;

interface UpdateAiTicketContextRequest {
  ticket: Ticket;
  source: string;
  summary?: string | null;
  collectedData?: Record<string, { label: string; value: string | null; rawValue?: string | null }>;
  missingData?: string[];
  operationalState?: Record<string, any>;
  contradictions?: string[];
  currentObjective?: string | null;
  nextQuestion?: string | null;
  lastAiIntent?: string | null;
  lastAiAction?: string | null;
  lastAiDecisionReason?: string | null;
  lastKnowledgeIds?: number[] | string | null;
  resetActiveContext?: boolean;
}

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
};

const stringify = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
};

const normalizeArray = (items?: string[]): string[] =>
  Array.from(new Set((items || []).map(item => String(item || "").trim()).filter(Boolean)));

const truncate = (value: string | null | undefined, max = 2500): string | null => {
  const text = String(value || "").trim();
  if (!text) return null;
  return text.length <= max ? text : text.slice(text.length - max);
};

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const cleanText = (value = ""): string =>
  normalizeText(value)
    .replace(/[^\w\s/:-]/g, " ")
    .replace(/\bfois\b/g, "dois")
    .replace(/\bfoi\s+de\b/g, "dois de")
    .replace(/\bquadro\b/g, "quatro")
    .replace(/\s+/g, " ")
    .trim();

const firstMatch = (value: string, patterns: RegExp[]): string | null => {
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
    if (match?.[0]) return match[0];
  }
  return null;
};

const hasAny = (value: string, pattern: RegExp): boolean => pattern.test(value);

const isPackageCompositionOrTotalHoursRequest = (normalized = ""): boolean => {
  if (!normalized) return false;

  const packageTerms = /\b(pacote|pacotes|plano|planos|bloco|blocos|composicao|compor|montar|simular|orcamento|calcular)\b/.test(normalized);
  const hasHourValue = /\b\d{1,3}\s*(?:h|hora|horas)\b/.test(normalized);
  const hasSumSignal = /(?:\+|mais|junto|somando)/.test(normalized);
  const saysTotalHours = /\b(total|totais|ao todo|no total|pra|para)\b.{0,25}\b\d{1,3}\s*(?:h|hora|horas)\b/.test(normalized) ||
    /\b\d{1,3}\s*(?:h|hora|horas)\b.{0,25}\b(total|totais|ao todo|no total)\b/.test(normalized);
  const isCorrectionAboutTotal = /\b(?:to|estou|tou|tô)\s+falando\b.{0,30}\b\d{1,3}\s*(?:h|hora|horas)\b/.test(normalized) ||
    /\bnao\s+ha\s+(?:encontro|encontros|dia|dias)\s+de\s+\d{1,3}\s*(?:h|hora|horas)\b/.test(normalized);

  return (packageTerms && (hasSumSignal || hasHourValue)) || saysTotalHours || isCorrectionAboutTotal;
};

const getActiveQuestionText = (value = ""): string => {
  const text = String(value || "").trim();
  if (!text) return "";

  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const questionLine = [...lines].reverse().find(line => line.includes("?"));
  if (questionLine) {
    const questionMatches = questionLine.match(/[^?]+\?/g);
    return (questionMatches?.[questionMatches.length - 1] || questionLine).trim();
  }

  return lines[lines.length - 1] || text;
};

const isHourQuestion = (value = ""): boolean => {
  const normalized = cleanText(getActiveQuestionText(value));
  return /\b(quantas horas|quantos horas|horas|duracao|tempo)\b/.test(normalized);
};

const isOccurrenceCountQuestion = (value = ""): boolean => {
  const normalized = cleanText(getActiveQuestionText(value));
  return /\b(quantos|quantas|qtd|quantidade|numero)\b.{0,80}\b(dias|dia|encontros|encontro|aulas|aula|reunioes|reuniao|cursos|curso|treinamentos|treinamento|sessoes|sessao|consultas|consulta)\b/.test(normalized) ||
    /\b(unico|mais de um|mais de uma)\b.{0,80}\b(dia|dias|encontro|encontros)\b/.test(normalized);
};

const NUMBER_WORDS: Record<string, number> = {
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
  dezassete: 17,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90
};

const numberWordAlternation = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length).join("|");
const NUMBER_TOKEN_PATTERN = `(?:\\d{1,3}|${numberWordAlternation})(?:\\s+e\\s+(?:${numberWordAlternation}))?`;

const parseNumberToken = (value?: string | null): string | null => {
  const token = String(value || "").trim();
  if (!token) return null;
  if (/^\d{1,3}$/.test(token)) return token;

  const parts = token.split(/\s+e\s+/).map(part => part.trim()).filter(Boolean);
  const total = parts.reduce((sum, part) => {
    const parsed = NUMBER_WORDS[part];
    return Number.isFinite(parsed) ? sum + parsed : NaN;
  }, 0);

  return Number.isFinite(total) && total > 0 ? String(total) : null;
};

const firstNumberToken = (value: string): string | null => {
  const match = value.match(new RegExp(`\\b(${NUMBER_TOKEN_PATTERN})\\b`));
  return parseNumberToken(match?.[1]);
};

const isBareParticipantCountAnswer = (value: string): boolean =>
  new RegExp(`^(?:umas?|uns|cerca\\s+de|aproximadamente|mais\\s+ou\\s+menos|por\\s+volta\\s+de)?\\s*${NUMBER_TOKEN_PATTERN}\\s*(?:pessoas|participantes|alunos|clientes|convidados)?$`).test(value);

const OCCURRENCE_UNITS = [
  "aula",
  "aulas",
  "curso",
  "cursos",
  "cuso",
  "cusos",
  "treinamento",
  "treinamentos",
  "workshop",
  "workshops",
  "palestra",
  "palestras",
  "reuniao",
  "reunioes",
  "encontro",
  "encontros",
  "sessao",
  "sessoes",
  "consulta",
  "consultas",
  "turma",
  "turmas",
  "evento",
  "eventos",
  "modulo",
  "modulos",
  "mentoria",
  "mentorias",
  "visita",
  "visitas",
  "atendimento",
  "atendimentos",
  "agenda",
  "agendas",
  "horario",
  "horarios",
  "dia",
  "dias",
  "turno",
  "turnos"
];

const OCCURRENCE_UNIT_PATTERN = OCCURRENCE_UNITS.join("|");
const occurrenceUnitRegex = new RegExp(`\\b(${OCCURRENCE_UNIT_PATTERN})\\b`);

const isBusinessCloseText = (normalized: string): boolean =>
  /\b(fechar|finalizar|seguir|prosseguir|continuar|avancar)\b.{0,80}\b(negocio|reserva|agendamento|contrato|contratacao|compra|pedido|pacote|plano|orcamento|proposta)\b/.test(normalized) ||
  /\b(quero|queria|gostaria|vamos|bora|preciso|desejo)\b.{0,80}\b(fechar|finalizar|reservar|contratar|agendar)\b/.test(normalized);

const isTicketCloseText = (normalized: string): boolean =>
  /\b(fechar|finalizar|encerrar|concluir)\b.{0,30}\b(atendimento|conversa|ticket|chamado)\b/.test(normalized) ||
  /\b(pode|pode sim|ja pode|quero)\b.{0,20}\b(encerrar|finalizar|concluir)\b/.test(normalized) ||
  /\b(era so isso|era isso|so isso|nada mais|nao preciso de mais nada|nao quero mais nada)\b/.test(normalized);

const isResponseRejectedText = (normalized: string): boolean =>
  /\b(caro|cara|muito caro|ta caro|esta caro|pesado|fora do orcamento|nao cabe|nao da|nao consigo pagar|sem condicao|valor alto|preco alto)\b/.test(normalized) ||
  /\b(nenhuma|nenhum|nao gostei|nao me agradou|nao agradou|nao atende|nao serve|nao encaixa|nao gostei das opcoes)\b/.test(normalized) ||
  /\b(nao funcionou|nao resolveu|nao ajudou|continua com problema|continua igual|nao era isso|nao e isso|nao entendi|confuso|deu erro|falhou)\b/.test(normalized);

const isScenarioChangedText = (normalized: string): boolean =>
  /\b(outro orcamento|novo orcamento|mudar o orcamento|recalcular|refazer|simular|e se for|ao inves|em vez|para outra quantidade|para mais|para menos)\b/.test(normalized) ||
  /\b(na verdade|pensando melhor|mudei de ideia|mudou|trocar|troquei|outra coisa|outro assunto|agora preciso|agora quero|e se)\b/.test(normalized);

const classifyQuestion = (question = ""): string | null => {
  const normalized = cleanText(getActiveQuestionText(question));
  if (!normalized) return null;

  if (
    hasAny(normalized, /\b(duracao|quanto tempo|horas|periodo|recorrente|pontual)\b/) ||
    occurrenceUnitRegex.test(normalized)
  ) {
    return "duration_occurrence";
  }
  if (hasAny(normalized, /\b(pessoas|participantes|alunos|clientes|convidados|candidatos|equipe)\b/)) {
    return "participant_count";
  }
  if (hasAny(normalized, /\b(data|dia|periodo|quando|agenda|disponibilidade)\b/)) {
    return "date_or_availability";
  }
  if (hasAny(normalized, /\b(pagamento|pagar|cartao|pix|dinheiro|parcel)\b/)) {
    return "payment";
  }
  if (hasAny(normalized, /\b(desconto|promocao|condicao)\b/)) {
    return "discount";
  }
  if (hasAny(normalized, /\b(foto|video|imagem|catalogo|material)\b/)) {
    return "media";
  }

  return "generic";
};

const classifyIntent = (message = ""): string => {
  const normalized = cleanText(message);
  if (!normalized) return "mensagem_vazia";

  if (hasAny(normalized, /\b(atendente|humano|pessoa|transferir|transfere|encaminhar|encaminha|falar com)\b/)) {
    return "pedido_atendente";
  }
  if (isResponseRejectedText(normalized)) {
    return "resposta_rejeitada";
  }
  if (isBusinessCloseText(normalized) || hasAny(normalized, /\b(reservar|reserva|agendar|contratar|seguir com|prosseguir|disponibilidade)\b/)) {
    return "acao_operacional";
  }
  if (isTicketCloseText(normalized) || hasAny(normalized, /\b(encerrar atendimento|finalizar atendimento|fechar atendimento)\b/)) {
    return "pedido_encerramento";
  }
  if (hasAny(normalized, /\b(desconto|promocao|condicao|com desconto)\b/)) {
    return "desconto";
  }
  if (hasAny(normalized, /\b(pagamento|pagar|cartao|pix|parcela|parcelar|taxa)\b/)) {
    return "pagamento";
  }
  if (hasAny(normalized, /\b(foto|video|imagem|catalogo|ver a sala|conhecer o espaco|conhecer a sala)\b/)) {
    return "midia_ou_estrutura";
  }
  if (hasAny(normalized, /\b(orcamento|valor|preco|cotacao|quanto fica|quanto custa|simular)\b/)) {
    return "orcamento";
  }
  if (isScenarioChangedText(normalized)) {
    return "mudanca_de_cenario";
  }
  if (hasAny(normalized, /\b(ja falei|acabei de responder|ja respondi|eu disse|falei agora)\b/)) {
    return "reclamacao_repeticao";
  }

  return "continuidade";
};

const extractCollectedData = (
  message: string,
  lastQuestion?: string | null
): Record<string, { label: string; value: string | null; rawValue?: string | null }> => {
  const normalized = cleanText(message);
  const questionType = classifyQuestion(lastQuestion || "");
  const collected: Record<string, { label: string; value: string | null; rawValue?: string | null }> = {};
  const packageCompositionOrTotalHours = isPackageCompositionOrTotalHoursRequest(normalized);

  const number = firstNumberToken(normalized);
  const countAndDuration = normalized.match(new RegExp(`\\b(${NUMBER_TOKEN_PATTERN})\\s*(?:de|x|por|vezes)\\s*(${NUMBER_TOKEN_PATTERN})\\s*(?:h|hora|horas)\\b`));
  const unitCountAndDuration = normalized.match(new RegExp(`\\b(${NUMBER_TOKEN_PATTERN})\\s+(${OCCURRENCE_UNIT_PATTERN})\\s*(?:de|com|por|para|durando)?\\s*(${NUMBER_TOKEN_PATTERN})\\s*(?:h|hora|horas)\\b`));
  const occurrenceUnit = unitCountAndDuration?.[2] || normalized.match(occurrenceUnitRegex)?.[1] || null;
  const singleDayOccurrence = hasAny(normalized, /\b(unico dia|um unico dia|apenas 1 dia|apenas um dia|so 1 dia|so um dia|somente 1 dia|somente um dia)\b/);
  const singleOccurrence = singleDayOccurrence || hasAny(normalized, /\b(unico|um unico|apenas 1|apenas um|so 1|so um|somente 1|somente um|pontual)\b/);
  const speaksAboutTimeOrOccurrences = hasAny(
    normalized,
    /\b(h|hora|horas|semana|semanal|mes|mensal|unico|recorrente|dia inteiro|unico dia|o dia todo)\b/
  ) || occurrenceUnitRegex.test(normalized);
  const speaksAboutPeople = hasAny(
    normalized,
    /\b(pessoas|participantes|alunos|clientes|convidados|candidatos|equipe)\b/
  );

  if (
    number &&
    (
      speaksAboutPeople ||
      (questionType === "participant_count" && !speaksAboutTimeOrOccurrences && isBareParticipantCountAnswer(normalized))
    )
  ) {
    collected.participant_count = {
      label: "Quantidade de pessoas/participantes",
      value: number,
      rawValue: message
    };
  }

  const rawHour = firstMatch(normalized, [
    /\b(\d{1,2})\s*h\b/,
    /\b(\d{1,2})\s*horas?\b/,
    new RegExp(`\\b(${NUMBER_TOKEN_PATTERN})\\s*(?:hora|horas)\\s*(?:cada|por|ao|a)\\b`)
  ]);
  const hour =
    parseNumberToken(unitCountAndDuration?.[3]) ||
    parseNumberToken(countAndDuration?.[2]) ||
    parseNumberToken(rawHour) ||
    (questionType === "duration_occurrence" && isHourQuestion(lastQuestion || "") ? number : null) ||
    rawHour;
  if (!packageCompositionOrTotalHours && (hour || hasAny(normalized, /\b(manha|tarde|noite|turno|diaria|dia inteiro|o dia todo)\b/))) {
    collected.duration = {
      label: "Duracao/tempo informado",
      value: hour ? `${hour}h` : firstMatch(normalized, [/\b(manha|tarde|noite|turno|diaria|dia inteiro|o dia todo)\b/]),
      rawValue: message
    };
  }

  const rawOccurrences = firstMatch(normalized, [
    new RegExp(`\\b(${NUMBER_TOKEN_PATTERN})\\s*(?:${OCCURRENCE_UNIT_PATTERN})\\b`)
  ]);
  const occurrences =
    parseNumberToken(unitCountAndDuration?.[1]) ||
    parseNumberToken(countAndDuration?.[1]) ||
    parseNumberToken(rawOccurrences) ||
    (questionType === "duration_occurrence" && isOccurrenceCountQuestion(lastQuestion || "") && !hour ? number : null) ||
    rawOccurrences;
  if (!packageCompositionOrTotalHours && (occurrences || hasAny(normalized, /\b(unico|um unico|apenas 1|apenas um|so 1|so um|somente 1|somente um|recorrente|semanal|mensal|pontual|unico dia|um unico dia|apenas 1 dia|apenas um dia|so 1 dia|so um dia|somente 1 dia|somente um dia)\b/))) {
    collected.occurrences = {
      label: "Quantidade de ocorrencias/unidades de agenda",
      value: occurrences || (singleOccurrence ? "1" : firstMatch(normalized, [/\b(recorrente|semanal|mensal)\b/])),
      rawValue: message
    };
    if (occurrenceUnit || singleDayOccurrence) {
      collected.occurrence_unit = {
        label: "Unidade contextual informada",
        value: occurrenceUnit || "dia",
        rawValue: message
      };
    }
  }

  const date = firstMatch(normalized, [
    /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/,
    /\b(dia\s+\d{1,2}(?:\/\d{1,2})?)\b/
  ]);
  if (date) {
    collected.date_or_period = {
      label: "Data ou periodo",
      value: date,
      rawValue: message
    };
  }

  const payment = firstMatch(normalized, [/\b(cartao|credito|debito|pix|dinheiro|parcela|parcelar)\b/]);
  if (payment) {
    collected.payment_topic = {
      label: "Assunto de pagamento",
      value: payment,
      rawValue: message
    };
  }

  if (hasAny(normalized, /\b(desconto|promocao|condicao|com desconto)\b/)) {
    collected.discount_requested = {
      label: "Cliente perguntou sobre desconto",
      value: "sim",
      rawValue: message
    };
  }

  if (hasAny(normalized, /\b(foto|video|imagem|catalogo|material)\b/)) {
    collected.media_requested = {
      label: "Cliente pediu midia/material",
      value: "sim",
      rawValue: message
    };
  }

  if (hasAny(normalized, /\b(ja falei|acabei de responder|ja respondi|eu disse|falei agora)\b/)) {
    collected.context_repetition_complaint = {
      label: "Cliente indicou que ja respondeu",
      value: "sim",
      rawValue: message
    };
  }

  if (isResponseRejectedText(normalized)) {
    const rejectionValue = hasAny(normalized, /\b(caro|cara|pesado|orcamento|valor alto|preco alto|pagar)\b/)
      ? "cliente achou caro ou fora do orçamento"
      : hasAny(normalized, /\b(nao funcionou|nao resolveu|nao ajudou|continua com problema|deu erro|falhou)\b/)
        ? "cliente indicou que a solução anterior não funcionou"
        : "cliente rejeitou ou não entendeu a resposta/opções anteriores";

    collected.response_rejected = {
      label: "Resposta/opções anteriores rejeitadas",
      value: rejectionValue,
      rawValue: message
    };
    collected.customer_objection = {
      label: "Objeção ou insatisfação atual",
      value: rejectionValue,
      rawValue: message
    };
    collected.commercial_objection = {
      label: "Objeção/insatisfação atual",
      value: hasAny(normalized, /\b(caro|cara|pesado|orcamento|valor alto|preco alto|pagar)\b/)
        ? "cliente achou caro ou fora do orçamento"
        : rejectionValue,
      rawValue: message
    };
    collected.previous_options_rejected = {
      label: "Resposta/opções anteriores não atenderam",
      value: "não insistir na mesma resposta sem ajustar o caminho",
      rawValue: message
    };
    collected.rejected_options = collected.previous_options_rejected;
  }

  if (isScenarioChangedText(normalized)) {
    collected.scenario_changed = {
      label: "Cliente mudou cenário, assunto ou simulação",
      value: "sim",
      rawValue: message
    };
    collected.quote_revision_requested = {
      label: "Cliente pediu ajuste ou nova simulação",
      value: "sim",
      rawValue: message
    };
  }

  if (isBusinessCloseText(normalized)) {
    collected.action_requested = {
      label: "Cliente pediu uma ação operacional",
      value: "fechar negócio, reservar, agendar ou contratar",
      rawValue: message
    };
    collected.business_close_requested = {
      label: "Cliente quer fechar negócio/reserva",
      value: "sim",
      rawValue: message
    };
  }

  return collected;
};

const getValue = (data: CollectedData, key: string): string | null =>
  data[key]?.value || data[key]?.rawValue || null;

const getQualificationText = (collected: CollectedData): string =>
  Object.entries(collected)
    .filter(([, item]) => item.source === "qualification_form")
    .map(([, item]) => `${item.label || ""} ${item.value || ""} ${item.rawValue || ""}`)
    .join(" ");

const buildOccurrenceWords = (collected: CollectedData): {
  unit: string;
  durationTarget: string;
  singleTarget: string;
  asksSingleFirst: boolean;
} => {
  const text = cleanText(getQualificationText(collected));

  if (/\b(reuniao|reunioes|equipe)\b/.test(text)) {
    return {
      unit: "dias de reuniao",
      durationTarget: "cada dia de reuniao",
      singleTarget: "essa reuniao",
      asksSingleFirst: true
    };
  }

  if (/\b(processo seletivo|seletivo|entrevista|entrevistas)\b/.test(text)) {
    return {
      unit: "dias de processo seletivo",
      durationTarget: "cada dia de processo seletivo",
      singleTarget: "esse processo seletivo",
      asksSingleFirst: true
    };
  }

  if (/\b(professor|aula|aulas|particular)\b/.test(text)) {
    return {
      unit: "aulas/encontros",
      durationTarget: "cada aula/encontro",
      singleTarget: "essa aula",
      asksSingleFirst: /\b(1 encontro|um encontro|unico encontro)\b/.test(text)
    };
  }

  if (/\b(curso|treinamento|turma|workshop|palestra)\b/.test(text)) {
    return {
      unit: "dias de treinamento",
      durationTarget: "cada dia de treinamento",
      singleTarget: "esse encontro unico",
      asksSingleFirst: /\b(1 encontro|um encontro|unico encontro)\b/.test(text)
    };
  }

  return {
    unit: "dias/encontros",
    durationTarget: "cada dia/encontro",
    singleTarget: "esse encontro unico",
    asksSingleFirst: false
  };
};

const inferSingleOccurrenceFromQualification = (collected: CollectedData): boolean => {
  const text = cleanText(getQualificationText(collected));
  return /\b(1 encontro|um encontro|unico encontro|encontro unico|1 dia|um dia|unico dia|dia unico)\b/.test(text) &&
    !/\b(mais de 1|mais de um|mais de uma|varios|varias)\b/.test(text);
};

const buildMissingData = (
  intent: string,
  collected: CollectedData
): string[] | undefined => {
  if (!["orcamento", "desconto", "acao_operacional"].includes(intent)) return undefined;

  const missing: string[] = [];
  if (!getValue(collected, "participant_count")) missing.push("quantidade de pessoas/participantes");
  if (!getValue(collected, "duration")) missing.push("duracao/tempo de uso");
  if (!getValue(collected, "occurrences") && !inferSingleOccurrenceFromQualification(collected)) {
    missing.push("quantidade de ocorrencias/unidades, dias ou recorrencia");
  }
  return missing;
};

const buildNextQuestion = (missing?: string[], collected: CollectedData = {}): string | null => {
  if (!missing?.length) return null;
  const words = buildOccurrenceWords(collected);
  if (missing.includes("quantidade de pessoas/participantes")) {
    return "Quantas pessoas ou participantes serao atendidos?";
  }
  if (missing.includes("duracao/tempo de uso") && missing.includes("quantidade de ocorrencias/unidades, dias ou recorrencia")) {
    if (words.asksSingleFirst) {
      return `Quantas horas tera ${words.singleTarget}?`;
    }
    return `Sera em um unico dia/encontro ou em mais de um? Se for mais de um, quantos ${words.unit} serao ao todo?`;
  }
  if (missing.includes("duracao/tempo de uso")) {
    return `Quantas horas tera ${words.durationTarget}?`;
  }
  if (missing.includes("quantidade de ocorrencias/unidades, dias ou recorrencia")) {
    return `Quantos ${words.unit} serao ao todo?`;
  }
  return null;
};

export const UpdateAiTicketContextService = async ({
  ticket,
  source,
  summary,
  collectedData,
  missingData,
  operationalState,
  contradictions,
  currentObjective,
  nextQuestion,
  lastAiIntent,
  lastAiAction,
  lastAiDecisionReason,
  lastKnowledgeIds,
  resetActiveContext = false
}: UpdateAiTicketContextRequest): Promise<AiTicketContext> => {
  const existing = await AiTicketContext.findOne({ where: { ticketId: ticket.id } });
  const now = new Date();

  const mergedCollected: CollectedData = resetActiveContext
    ? {}
    : parseJson<CollectedData>(existing?.collectedData, {});
  Object.entries(collectedData || {}).forEach(([key, item]) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;

    mergedCollected[normalizedKey] = {
      label: item.label || normalizedKey,
      value: item.value,
      rawValue: item.rawValue,
      source,
      updatedAt: now.toISOString()
    };
  });

  const nextMissing = missingData
    ? normalizeArray(missingData)
    : resetActiveContext ? [] : parseJson<string[]>(existing?.missingData, []);
  const nextContradictions = contradictions
    ? normalizeArray(contradictions)
    : resetActiveContext ? [] : parseJson<string[]>(existing?.contradictions, []);
  const nextOperationalState = operationalState
    ? stringify(operationalState)
    : resetActiveContext ? null : existing?.operationalState || null;
  const serializedKnowledgeIds = Array.isArray(lastKnowledgeIds)
    ? JSON.stringify(lastKnowledgeIds)
    : lastKnowledgeIds || existing?.lastKnowledgeIds || null;

  const payload = {
    ticketId: ticket.id,
    summary: truncate(summary || (resetActiveContext ? null : existing?.summary) || ticket.aiConversationSummary),
    collectedData: stringify(mergedCollected),
    missingData: stringify(nextMissing),
    operationalState: nextOperationalState,
    contradictions: stringify(nextContradictions),
    currentObjective: currentObjective !== undefined ? currentObjective : resetActiveContext ? null : existing?.currentObjective || null,
    nextQuestion: nextQuestion !== undefined ? nextQuestion : resetActiveContext ? null : existing?.nextQuestion || null,
    lastSource: source,
    lastAiIntent: lastAiIntent !== undefined ? lastAiIntent : resetActiveContext ? null : existing?.lastAiIntent || null,
    lastAiAction: lastAiAction !== undefined ? lastAiAction : resetActiveContext ? null : existing?.lastAiAction || null,
    lastAiDecisionReason: lastAiDecisionReason !== undefined ? lastAiDecisionReason : resetActiveContext ? null : existing?.lastAiDecisionReason || null,
    lastKnowledgeIds: serializedKnowledgeIds,
    lastUpdatedAt: now
  };

  const context = existing
    ? await existing.update(payload)
    : await AiTicketContext.create(payload as any);

  logger.info(
    {
      ticketId: ticket.id,
      source,
      collectedKeys: Object.keys(collectedData || {}),
      missingCount: nextMissing.length,
      contradictionCount: nextContradictions.length,
      lastAiAction: payload.lastAiAction
    },
    "[AI CONTEXT] Ticket context updated"
  );

  return context;
};

export const AnalyzeAndUpdateAiTicketContextService = async ({
  ticket,
  message,
  source = "customer_message"
}: {
  ticket: Ticket;
  message: string;
  source?: string;
}): Promise<AiTicketContext> => {
  const existing = await AiTicketContext.findOne({ where: { ticketId: ticket.id } });
  const now = new Date();
  const previousCollected = parseJson<CollectedData>(existing?.collectedData, {});
  const extracted = extractCollectedData(message, ticket.lastAiMessage);
  const intent = classifyIntent(message);
  const questionType = classifyQuestion(ticket.lastAiMessage || existing?.nextQuestion || "");
  const answeredPendingQuestion = Object.keys(extracted).length > 0 && !!questionType;
  const intentForMissing =
    answeredPendingQuestion && questionType === "duration_occurrence"
      ? "orcamento"
      : intent;

  const mergedCollected: CollectedData = { ...previousCollected };
  Object.entries(extracted).forEach(([key, item]) => {
    mergedCollected[key] = {
      label: item.label || key,
      value: item.value,
      rawValue: item.rawValue,
      source,
      updatedAt: now.toISOString()
    };
  });

  if (!getValue(mergedCollected, "occurrences") && inferSingleOccurrenceFromQualification(mergedCollected)) {
    mergedCollected.occurrences = {
      label: "Quantidade de ocorrencias/unidades de agenda",
      value: "1",
      rawValue: "inferido do formulario: encontro unico",
      source: "qualification_form",
      updatedAt: now.toISOString()
    };
    mergedCollected.occurrence_unit = {
      label: "Unidade contextual informada",
      value: "encontro",
      rawValue: "inferido do formulario: encontro unico",
      source: "qualification_form",
      updatedAt: now.toISOString()
    };
  }

  const missing = buildMissingData(intentForMissing, mergedCollected);
  const nextQuestion = buildNextQuestion(missing, mergedCollected);
  const currentObjective = [
    `Intencao aparente da mensagem atual: ${intent}`,
    questionType ? `Tipo da pergunta pendente/recente: ${questionType}` : "",
    answeredPendingQuestion
      ? "A mensagem atual trouxe dado concreto e deve ser tratada como resposta a pergunta pendente. Nao repetir a mesma pergunta."
      : "",
    intent === "resposta_rejeitada"
      ? "Cliente rejeitou, nao entendeu ou indicou que a resposta/solucao anterior nao funcionou. Contornar com empatia, entender prioridade e propor outro caminho; nao repetir a mesma resposta nem encerrar."
      : "",
    extracted.scenario_changed || extracted.quote_revision_requested
      ? "Cliente mudou cenário, assunto ou pediu nova simulação. Usar os novos dados quando existirem e nao ficar preso ao caminho anterior."
      : "",
    extracted.action_requested || extracted.business_close_requested
      ? "Cliente pediu uma ação operacional. Conduzir proximos passos ou handoff, sem prometer execução se o backend nao executar."
      : "",
    nextQuestion ? `Proxima pergunta deve pedir apenas: ${missing?.join(", ")}` : "Nao ha proxima pergunta obrigatoria detectada pela memoria local."
  ].filter(Boolean).join(" | ");

  return UpdateAiTicketContextService({
    ticket,
    source,
    summary: ticket.aiConversationSummary || existing?.summary || null,
    collectedData: extracted,
    missingData: missing,
    currentObjective,
    nextQuestion,
    lastAiIntent: intent,
    lastAiAction: existing?.lastAiAction || ticket.lastAiAction || null,
    lastAiDecisionReason: answeredPendingQuestion
      ? "Analise local: cliente respondeu a pergunta pendente com dado concreto."
      : existing?.lastAiDecisionReason || ticket.lastAiDecisionReason || null,
    lastKnowledgeIds: existing?.lastKnowledgeIds || ticket.lastAiKnowledgeIds || null
  });
};

export const BuildAiTicketContextTextService = async (ticketId: number): Promise<string> => {
  const context = await AiTicketContext.findOne({ where: { ticketId } });
  if (!context) return "";

  const collected = parseJson<CollectedData>(context.collectedData, {});
  const missing = parseJson<string[]>(context.missingData, []);
  const contradictions = parseJson<string[]>(context.contradictions, []);
  const collectedLines = Object.entries(collected)
    .map(([key, item]) => `- ${item.label || key}: ${item.value || item.rawValue || "nao informado"}`)
    .join("\n");
  const hasObjection = Boolean(collected.customer_objection || collected.commercial_objection);
  const hasRejectedOptions = Boolean(collected.response_rejected || collected.previous_options_rejected || collected.rejected_options);
  const wantsScenarioChange = Boolean(collected.scenario_changed || collected.quote_revision_requested);
  const wantsBusinessClose = Boolean(collected.action_requested || collected.business_close_requested);
  const hasRepetitionComplaint = Boolean(collected.context_repetition_complaint);
  const objection = collected.customer_objection || collected.commercial_objection;
  const liveStateLines = [
    context.currentObjective ? `Objetivo/estado atual: ${context.currentObjective}` : "",
    hasObjection ? `Objeção/insatisfação atual: ${objection.value || objection.rawValue}` : "",
    hasRejectedOptions ? "Resposta, solução ou opções anteriores não atenderam; não insistir do mesmo jeito." : "",
    wantsScenarioChange ? "Cliente sinalizou mudança de cenário, assunto ou nova simulação; adaptar o caminho com os novos dados." : "",
    wantsBusinessClose ? "Cliente pediu ação operacional; conduzir próximos passos ou encaminhar, sem encerrar por engano." : "",
    hasRepetitionComplaint ? "Cliente reclamou que já respondeu; usar histórico/memória antes de perguntar novamente." : "",
    missing.length ? `Ainda falta: ${missing.join(", ")}` : "Não há dado obrigatório faltante detectado pela memória local.",
    context.nextQuestion ? `Próxima pergunta sugerida: ${context.nextQuestion}` : ""
  ].filter(Boolean);
  const bestActionLines = [
    hasObjection
      ? "- Contornar com empatia: reconhecer a objeção/insatisfação, perguntar o que pesou ou falhou e oferecer outro caminho sustentado pela base."
      : "",
    wantsScenarioChange
      ? "- Se o cliente mudou o cenário/assunto, responder o novo ponto primeiro; se faltar dado, pedir só o necessário."
      : "",
    wantsBusinessClose
      ? "- Não dizer que a ação já foi executada sem ferramenta. Informar o próximo passo real e encaminhar quando configurado."
      : "",
    hasRepetitionComplaint
      ? "- Não repetir a mesma pergunta; reconhecer que o cliente já respondeu e avançar."
      : "",
    !hasObjection && !wantsScenarioChange && !wantsBusinessClose && !hasRepetitionComplaint
      ? "- Responder a mensagem atual primeiro, usando a base e a conversa recente; manter tom natural."
      : ""
  ].filter(Boolean);

  return [
    liveStateLines.length ? `Estado vivo da conversa:\n${liveStateLines.map(line => `- ${line}`).join("\n")}` : "",
    bestActionLines.length ? `Próxima melhor postura:\n${bestActionLines.join("\n")}` : "",
    context.summary ? `Resumo estruturado:\n${context.summary}` : "",
    collectedLines ? `Dados ja coletados:\n${collectedLines}` : "",
    missing.length ? `Dados faltantes:\n${missing.map(item => `- ${item}`).join("\n")}` : "",
    contradictions.length ? `Contradicoes/incertezas:\n${contradictions.map(item => `- ${item}`).join("\n")}` : "",
    context.currentObjective ? `Objetivo atual: ${context.currentObjective}` : "",
    context.nextQuestion
      ? "Regra de continuidade: se a mensagem atual respondeu a pergunta pendente, nao repita essa pergunta; reconheca o dado recebido e avance."
      : "",
    context.nextQuestion ? `Proxima pergunta sugerida: ${context.nextQuestion}` : "",
    context.lastAiAction ? `Ultima acao registrada no contexto: ${context.lastAiAction}` : "",
    context.lastAiDecisionReason ? `Motivo da ultima decisao: ${context.lastAiDecisionReason}` : ""
  ].filter(Boolean).join("\n\n");
};
