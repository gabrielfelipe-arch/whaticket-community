import AiSetting from "../../models/AiSetting";
import AiTicketContext from "../../models/AiTicketContext";
import KnowledgeBaseArticle from "../../models/KnowledgeBaseArticle";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import GenerateAiResponseService, { AiProviderError } from "./GenerateAiResponseService";
import SearchKnowledgeBaseService, { KnowledgeFragment } from "./SearchKnowledgeBaseService";
import { Op } from "sequelize";
import { htmlToWhatsAppText } from "../../utils/knowledgeFormatting";
import {
  AnalyzeAndUpdateAiTicketContextService,
  BuildAiTicketContextTextService,
  UpdateAiTicketContextService
} from "./AiTicketContextService";
import CalculateCommercialQuoteService from "../CommercialServices/CalculateCommercialQuoteService";
import {
  EvaluateAiConversationStateService,
  OperationalState
} from "./AiConversationStateService";
import AiSemanticDecisionService from "./AiSemanticDecisionService";
import { appendPostQuoteMenu } from "./PostQuoteMenuService";
import BuildKnowledgeBaseQueryService from "./BuildKnowledgeBaseQueryService";
import FullBaseGroundingMariService from "./FullBaseGroundingMariService";

export type AiTicketAction =
  | "responder_com_base"
  | "pedir_confirmacao"
  | "pedir_mais_informacoes"
  | "encaminhar_atendente"
  | "encerrar_atendimento"
  | "executar_ferramenta"
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
  ferramenta?: string;
  parametrosFerramenta?: Record<string, any>;
  knowledgeIds?: number[];
  operationalStatePatch?: Partial<OperationalState>;
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
    "executar_ferramenta",
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

const hasDecisionContract = (parsed: any): boolean => {
  if (!parsed || typeof parsed !== "object") return false;

  return Boolean(
    parsed.acao ||
    parsed.intencao ||
    parsed.resposta ||
    parsed.perguntaConfirmacao ||
    parsed.ferramenta ||
    parsed.baseEncontrada !== undefined ||
    parsed.respostaSegura !== undefined
  );
};

const parseAllowedTools = (value?: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(item => String(item)) : [];
  } catch (err) {
    return [];
  }
};

const parseObject = (value?: string | null): Record<string, any> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    return {};
  }
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
      `Para eu te orientar melhor${service} e encontrar a opcao mais adequada da ${company}, preciso so de mais um detalhe.`,
      "Quantos dias/encontros voce pretende fazer e quantas horas tera cada um?"
    ].join("\n\n")
  };
};

const applyNoToolConfirmationGuardrail = (decision: AiDecision): AiDecision => {
  const alignedDecision = alignActionWithPromisedHandoff(decision);
  if (alignedDecision.acao === "encaminhar_atendente" && decision.acao !== "encaminhar_atendente") {
    return alignedDecision;
  }

  const response = normalizeText(alignedDecision.resposta || "");
  const hasInformationalQuote =
    /\b(orcamento|cotacao|estimativa|valor|preco|fica|ficaria|total|calculo)\b/.test(response) &&
    !/\b(reserva|agendamento|contratacao|contrato|pagamento|pedido|chamado)\b/.test(response);
  const hasHumanValidationCaveat =
    /\b(?:disponibilidade|reserva|agenda|agendamento|contratacao|pagamento).{0,80}(?:precisa|precisam|deve|devem|necessita|necessitam|dependem|depende).{0,80}(?:confirmad|validada|validado|verificada|verificado|equipe|atendente|humano|pessoa)\b/.test(response) ||
    /\b(?:precisa|precisam|deve|devem|necessita|necessitam|dependem|depende).{0,80}(?:confirmad|validada|validado|verificada|verificado).{0,80}(?:equipe|atendente|humano|pessoa)\b/.test(response);

  const promisedRealAction =
    !hasHumanValidationCaveat && !hasInformationalQuote && /(?:agendamento|reserva|venda|pedido|contratacao|contrato|pagamento|chamado).{0,90}(?:confirmad|marcad|finalizad|realizad|criad|abert|registrad|efetuad|aprovad)/i.test(response) ||
    /(?:esta|ficou|ja)\s+(?:agendad|marcad|confirmad|finalizad|registrad|criad|abert)/i.test(response);

  if (!promisedRealAction) return alignedDecision;

  return {
    ...alignedDecision,
    confianca: "alta",
    respostaSegura: false,
    acao: "encaminhar_atendente",
    motivo: [
      decision.motivo,
      "Guardrail: a resposta tentou confirmar uma acao real sem ferramenta executada pelo backend."
    ].filter(Boolean).join(" | "),
    resposta: "Para evitar confirmar algo sem validacao da equipe, vou encaminhar seu atendimento para um atendente finalizar essa etapa com seguranca."
  };
};

const isInformationalQuoteAnswer = (value = ""): boolean => {
  const normalized = normalizeText(value);
  return /\b(orcamento|cotacao|estimativa|valor|preco|fica|ficaria|total|calculo|r\$)\b/.test(normalized);
};

const hasExplicitNumericDetail = (value = ""): boolean => {
  const normalized = normalizeText(value)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const numberWordPattern = "(?:um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)(?:\\s+e\\s+(?:um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove))?";

  return (
    /\d/.test(normalized) ||
    new RegExp(`\\b${numberWordPattern}\\b`).test(normalized)
  );
};

const isNewQuoteRequestMissingDetails = (message: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || hasExplicitNumericDetail(normalized)) return false;

  const asksAnotherQuote =
    /\b(consigo|posso|pode|quero|queria|gostaria|preciso).{0,60}\b(outro|outra|novo|nova|diferente|diferentes|refazer|recalcular|simular).{0,60}\b(orcamento|cotacao|valor|preco|proposta)\b/.test(normalized) ||
    /\b(outro|outra|novo|nova|diferente|diferentes|refazer|recalcular|simular).{0,60}\b(orcamento|cotacao|valor|preco|proposta)\b/.test(normalized) ||
    /\b(outro|outra|novo|nova|refazer|recalcular|simular)\b/.test(normalized) && /\bor\b.{0,12}\bamento\b/.test(normalized) ||
    /\b(podemos|posso|pode|vamos|quero|queria|bora)\b.{0,40}\b(recalcular|refazer|revisar|ajustar|mudar)\b/.test(normalized) ||
    /^(recalcular|refazer|revisar|ajustar|mudar|vamos recalcular|podemos recalcular)$/.test(normalized);

  const asksDifferentQuantity =
    /\b(quantidade|quantidades|pessoas|itens|unidades|encontros|horas|dias|opcoes|opcao|planos|pacotes).{0,60}\b(diferente|diferentes|outra|outras|outro|outros|nova|novo)\b/.test(normalized) ||
    /\b(diferente|diferentes|outra|outras|outro|outros|nova|novo).{0,60}\b(quantidade|quantidades|pessoas|itens|unidades|encontros|horas|dias|opcoes|opcao|planos|pacotes)\b/.test(normalized);

  return asksAnotherQuote || asksDifferentQuantity;
};

const isParticipantCountQuestion = (value = ""): boolean => {
  const normalized = normalizeText(getActiveQuestionText(value));
  return (
    /\b(quantas|quantos|qtd|quantidade|numero).{0,80}\b(pessoas|participantes|alunos|clientes|convidados|candidatos|equipe)\b/.test(normalized) ||
    /\b(mesma|mesmo|manter|mantemos|continua|continua a).{0,80}\b(quantidade|pessoas|participantes|alunos|clientes|convidados|equipe)\b/.test(normalized)
  );
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

const hasDurationOrOccurrenceDetail = (value = ""): boolean => {
  const normalized = normalizeText(value)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(\d+\s*h|\d+\s*hora|hora|horas|encontro|encontros|aula|aulas|curso|cursos|cuso|cusos|treinamento|treinamentos|workshop|workshops|palestra|palestras|reuniao|reunioes|sessao|sessoes|consulta|consultas|turma|turmas|evento|eventos|modulo|modulos|mentoria|mentorias|visita|visitas|atendimento|atendimentos|dia|dias|turno|diaria|recorrente|semanal|mensal|duracao|duração|periodo|período|manha|manhã|tarde|noite)\b/.test(normalized);
};

const isDurationOrOccurrenceQuestion = (value = ""): boolean => {
  const normalized = normalizeText(getActiveQuestionText(value));
  return (
    /\b(duracao|duração|quanto tempo|quantas horas|horas|periodo|período)\b/.test(normalized) ||
    /\b(unico|único|mais de um|quantos|quantas).{0,80}\b(encontro|encontros|aula|aulas|curso|cursos|cuso|cusos|treinamento|treinamentos|workshop|workshops|palestra|palestras|reuniao|reunioes|sessao|sessoes|consulta|consultas|turma|turmas|evento|eventos|modulo|modulos|mentoria|mentorias|visita|visitas|atendimento|atendimentos|dia|dias)\b/.test(normalized) ||
    /\b(encontro|encontros|aula|aulas|curso|cursos|cuso|cusos|treinamento|treinamentos|workshop|workshops|palestra|palestras|reuniao|reunioes|sessao|sessoes|consulta|consultas|turma|turmas|evento|eventos|modulo|modulos|mentoria|mentorias|visita|visitas|atendimento|atendimentos|dia|dias)\b.{0,80}\b(unico|único|mais de um|quantos|quantas)\b/.test(normalized)
  );
};

const isHourQuestion = (value = ""): boolean => {
  const normalized = normalizeText(getActiveQuestionText(value));
  return /\b(quantas horas|quantos horas|horas|duracao|duração|tempo)\b/.test(normalized);
};

const isOccurrenceCountQuestion = (value = ""): boolean => {
  const normalized = normalizeText(getActiveQuestionText(value));
  if (/\b(horas|hora|duracao|duração|tempo)\b/.test(normalized)) return false;

  return /\b(quantos|quantas|qtd|quantidade|numero)\b.{0,80}\b(dias|dia|encontros|encontro|aulas|aula|reunioes|reuniao|cursos|curso|treinamentos|treinamento|sessoes|sessao|consultas|consulta)\b/.test(normalized) ||
    /\b(unico|mais de um|mais de uma)\b.{0,80}\b(dia|dias|encontro|encontros)\b/.test(normalized);
};

const answersLastDurationOrOccurrenceQuestion = (
  message: string,
  ticket: Ticket
): boolean =>
  isDurationOrOccurrenceQuestion(ticket.lastAiMessage || "") &&
  hasDurationOrOccurrenceDetail(message);

const hasHourDurationDetail = (value = ""): boolean => {
  const normalized = normalizeText(value)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(\d+\s*h|\d+\s*hora|hora|horas|manha|manhã|tarde|noite|turno|diaria|dia inteiro|o dia todo)\b/.test(normalized);
};

const hasOccurrenceCountDetail = (value = ""): boolean => {
  const normalized = normalizeText(value)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(?:\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\b.{0,30}\b(dia|dias|encontro|encontros|aula|aulas|reuniao|reunioes|curso|cursos|treinamento|treinamentos)\b/.test(normalized) ||
    /\b(dia|dias|encontro|encontros|aula|aulas|reuniao|reunioes|curso|cursos|treinamento|treinamentos)\b.{0,30}\b(?:\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\b/.test(normalized);
};

const extractQuoteScenarioFromText = (value = ""): Partial<CurrentQuoteData> => {
  const normalized = normalizeText(value)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const scenario: Partial<CurrentQuoteData> = {};
  const number = `(?:${numberLikeTokenPattern})`;

  const participantPatterns = [
    new RegExp(`\\b(${number})\\s*(?:pessoas|participantes|alunos|clientes|convidados|candidatos|equipe)\\b`),
    new RegExp(`\\b(?:pessoas|participantes|alunos|clientes|convidados|candidatos|equipe)\\s*(?:para|pra|de|com)?\\s*(${number})\\b`)
  ];
  const occurrencePatterns = [
    new RegExp(`\\b(${number})\\s*(?:dias|dia|encontros|encontro|aulas|aula|reunioes|reuniao|cursos|curso|treinamentos|treinamento|sessoes|sessao|consultas|consulta)\\b`),
    new RegExp(`\\b(?:dias|dia|encontros|encontro|aulas|aula|reunioes|reuniao|cursos|curso|treinamentos|treinamento|sessoes|sessao|consultas|consulta)\\s*(?:por|de|com)?\\s*(${number})\\b`)
  ];
  const durationPatterns = [
    new RegExp(`\\b(?:de|com|por|cada|terao|tera|dura|duram)?\\s*(${number})\\s*(?:h|hora|horas)\\b`),
    new RegExp(`\\b(${number})\\s*(?:h|hora|horas)\\s*(?:cada|por dia|por encontro|por aula)?\\b`)
  ];

  for (const pattern of participantPatterns) {
    const match = normalized.match(pattern);
    const parsed = parseNumberLikeToken(match?.[1]);
    if (parsed) {
      scenario.participantCount = parsed;
      break;
    }
  }

  for (const pattern of occurrencePatterns) {
    const match = normalized.match(pattern);
    const parsed = parseNumberLikeToken(match?.[1]);
    if (parsed) {
      scenario.occurrenceCount = parsed;
      break;
    }
  }

  for (const pattern of durationPatterns) {
    const match = normalized.match(pattern);
    const parsed = parseNumberLikeToken(match?.[1]);
    if (parsed) {
      scenario.durationHours = parsed;
      break;
    }
  }

  return scenario;
};

const getMostRecentCustomerMessagesFromHistory = (history = ""): string[] => {
  const messages: string[] = [];
  const regex = /\[CLIENTE[^\]]*\]\s*\n([\s\S]*?)(?=\n\[[A-Z]|$)/g;
  let match = regex.exec(history);

  while (match) {
    if (match[1]?.trim()) messages.push(match[1].trim());
    match = regex.exec(history);
  }

  return messages.reverse();
};

const collectedDataIndicatesSingleOccurrence = (collected: Record<string, any>): boolean => {
  const text = Object.values(collected)
    .map((item: any) => `${item?.label || ""} ${item?.value || ""} ${item?.rawValue || ""}`)
    .join(" ");
  const normalized = normalizeText(text)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    /\b(1 encontro|um encontro|unico encontro|encontro unico|1 dia|um dia|unico dia|dia unico)\b/.test(normalized) &&
    !/\b(mais de 1|mais de um|mais de uma|varios|varias)\b/.test(normalized)
  );
};

const collectedDataIndicatesMultipleOccurrences = (collected: Record<string, any>): boolean => {
  const text = Object.values(collected)
    .map((item: any) => `${item?.label || ""} ${item?.value || ""} ${item?.rawValue || ""}`)
    .join(" ");
  const normalized = normalizeText(text)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(mais de 1|mais de um|mais de uma|varios|varias)\b.{0,80}\b(encontro|encontros|dia|dias|aula|aulas|reuniao|reunioes|curso|cursos|treinamento|treinamentos)\b/.test(normalized) ||
    /\b(encontro|encontros|dia|dias|aula|aulas|reuniao|reunioes|curso|cursos|treinamento|treinamentos)\b.{0,80}\b(mais de 1|mais de um|mais de uma|varios|varias)\b/.test(normalized);
};

const buildSingleOccurrenceHoursQuestionDecision = (message: string): AiDecision => ({
  intencao: "diagnostico_inicial",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente esta em um cenario de ocorrencia unica; falta somente a duracao para orcar.",
  baseEncontrada: false,
  respostaSegura: true,
  acao: "pedir_mais_informacoes",
  motivo: "Formulario/contexto indica encontro unico; nao perguntar quantidade de dias/encontros novamente.",
  resposta: [
    "Perfeito, anotei.",
    "Quantas horas terá esse encontro único?"
  ].join("\n\n")
});

const buildMultipleOccurrencesQuestionDecision = (message: string): AiDecision => ({
  intencao: "diagnostico_inicial",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente esta em um cenario de mais de uma ocorrencia; falta saber quantas ocorrencias serao.",
  baseEncontrada: false,
  respostaSegura: true,
  acao: "pedir_mais_informacoes",
  motivo: "Formulario/contexto indica mais de um encontro; perguntar quantidade de dias/encontros antes das horas.",
  resposta: [
    "Perfeito, anotei a quantidade de pessoas.",
    "Quantos dias/encontros serão ao todo?"
  ].join("\n\n")
});

const buildHoursPerOccurrenceQuestionDecision = (message: string): AiDecision => ({
  intencao: "diagnostico_inicial",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente informou a quantidade de dias/encontros; falta saber a duracao de cada ocorrencia.",
  baseEncontrada: false,
  respostaSegura: true,
  acao: "pedir_mais_informacoes",
  motivo: "Quantidade de ocorrencias coletada; perguntar horas por ocorrencia.",
  resposta: [
    "Perfeito, anotei.",
    "Quantas horas terá cada dia/encontro?"
  ].join("\n\n")
});

const buildOccurrenceThenHoursCorrectionDecision = (message: string): AiDecision => ({
  intencao: "diagnostico_inicial",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente respondeu quantidade de dias/encontros quando a IA perguntava horas.",
  baseEncontrada: false,
  respostaSegura: true,
  acao: "pedir_mais_informacoes",
  motivo: "Correcao local: nao interpretar dias/encontros como horas.",
  resposta: [
    "Perfeito, anotei a quantidade de dias/encontros.",
    "Quantas horas tera cada dia/encontro?"
  ].join("\n\n")
});

const isBareNumericAnswer = (message = ""): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /^\d{1,2}$/.test(normalized) ||
    /^(?:um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)$/.test(normalized);
};

const bareNumericAnswerToValue = (message = ""): string | null => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words: Record<string, string> = {
    um: "1",
    uma: "1",
    dois: "2",
    duas: "2",
    tres: "3",
    quatro: "4",
    cinco: "5",
    seis: "6",
    sete: "7",
    oito: "8",
    nove: "9",
    dez: "10",
    onze: "11",
    doze: "12"
  };

  if (/^\d{1,2}$/.test(normalized)) return normalized;
  return words[normalized] || null;
};

const answersOccurrenceButMissingHours = (message: string, ticket: Ticket): boolean => {
  const lastQuestion = normalizeText(getActiveQuestionText(ticket.lastAiMessage || ""));
  if (/\b(horas|hora|duracao|duração|tempo)\b/.test(lastQuestion)) return false;

  const lastAskedOccurrenceCount =
    /\b(dias|dia|encontros|encontro|aulas|aula|reunioes|reuniao|sessoes|sessao|consultas|consulta)\b/.test(lastQuestion) &&
    /\b(quantos|quantas|qtd|quantidade|numero|ao todo|serao|serão)\b/.test(lastQuestion) &&
    !/\b(horas|hora|duracao|duração|tempo)\b/.test(lastQuestion);

  if (!isDurationOrOccurrenceQuestion(ticket.lastAiMessage || "") && !lastAskedOccurrenceCount) return false;
  if (isHourQuestion(ticket.lastAiMessage || "") && !lastAskedOccurrenceCount) return false;
  if (hasHourDurationDetail(message)) return false;

  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    (lastAskedOccurrenceCount && isBareNumericAnswer(message)) ||
    (isOccurrenceCountQuestion(ticket.lastAiMessage || "") && isBareNumericAnswer(message)) ||
    /\b(apenas|so|só|somente|unico|único|um|uma|\d+)\b.{0,40}\b(dia|dias|encontro|encontros|aula|aulas|reuniao|reunioes|curso|cursos|treinamento|treinamentos)\b/.test(normalized) ||
    /^(?:apenas|so|só|somente)?\s*(?:um|uma|1)\s*$/.test(normalized)
  );
};

const QUESTION_TOKEN_STOPWORDS = new Set([
  "a",
  "as",
  "ao",
  "aos",
  "o",
  "os",
  "de",
  "da",
  "das",
  "do",
  "dos",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "um",
  "uma",
  "uns",
  "umas",
  "para",
  "pra",
  "por",
  "com",
  "que",
  "qual",
  "quais",
  "sera",
  "serao",
  "será",
  "serão",
  "voce",
  "você",
  "me",
  "te",
  "se",
  "ja",
  "já"
]);

const getQuestionTokens = (value = ""): string[] =>
  Array.from(new Set(
    normalizeText(value)
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length >= 3 && !QUESTION_TOKEN_STOPWORDS.has(token))
  ));

const getQuestionSimilarity = (current = "", previous = ""): number => {
  const currentTokens = getQuestionTokens(current);
  const previousTokens = getQuestionTokens(previous);
  if (!currentTokens.length || !previousTokens.length) return 0;

  const previousSet = new Set(previousTokens);
  const overlap = currentTokens.filter(token => previousSet.has(token)).length;
  return overlap / Math.min(currentTokens.length, previousTokens.length);
};

const isQuestionLike = (value = ""): boolean =>
  /\?/.test(value) ||
  /\b(qual|quais|quanto|quantos|quantas|quando|onde|como|me diga|informe|voce sabe|você sabe|preciso saber)\b/i.test(normalizeText(value));

const hasConcreteAnswerSignal = (value = ""): boolean => {
  const normalized = normalizeText(value)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  return (
    hasExplicitNumericDetail(normalized) ||
    hasDurationOrOccurrenceDetail(normalized) ||
    /\b(sim|nao|não|recorrente|pontual|mensal|semanal|manha|manhã|tarde|noite|presencial|online|processo seletivo|reuniao|reunião|curso|treinamento|pos|pós)\b/.test(normalized) ||
    normalized.split(/\s+/).length >= 4
  );
};

const isRepeatedMissingInfoQuestion = (
  decision: AiDecision,
  message: string,
  ticket: Ticket
): boolean => {
  if (decision.acao !== "pedir_mais_informacoes") return false;
  if (ticket.lastAiQuestionType !== "missing_info") return false;
  if (!decision.resposta || !ticket.lastAiMessage) return false;
  if (!isQuestionLike(decision.resposta) || !isQuestionLike(ticket.lastAiMessage)) return false;
  if (!hasConcreteAnswerSignal(message)) return false;

  return getQuestionSimilarity(decision.resposta, ticket.lastAiMessage) >= 0.45;
};

const isLikelyParticipantCountAnswer = (message: string, ticket: Ticket): boolean => {
  const lastQuestion = normalizeText(getActiveQuestionText(ticket.lastAiMessage || ""));
  const lastAskedParticipantCount =
    /\b(pessoas|participantes|participar|alunos|clientes|convidados|candidatos|equipe)\b/.test(lastQuestion) &&
    /\b(quantas|quantos|qtd|quantidade|numero|vao|vão|serao|serão)\b/.test(lastQuestion);

  if (!isParticipantCountQuestion(ticket.lastAiMessage || "") && !lastAskedParticipantCount) return false;
  if (hasDurationOrOccurrenceDetail(message)) return false;

  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;
  if (/\b(apenas|so|só|somente|unico|único)\b/.test(normalized)) return false;

  return (
    (lastAskedParticipantCount && isBareNumericAnswer(message)) ||
    changesParticipantCount(message) ||
    /^\d{1,3}$/.test(normalized) ||
    /^(?:umas?|uns|cerca de|aproximadamente|mais ou menos|por volta de)?\s*(?:um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)(?:\s+e\s+(?:um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove))?$/.test(normalized)
  );
};

const changesParticipantCount = (message: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const numberPattern = "(?:\\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)(?:\\s+e\\s+(?:um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove))?";

  return new RegExp(`\\b${numberPattern}\\b.{0,40}\\b(pessoas|participantes|alunos|clientes|convidados|candidatos|equipe)\\b`).test(normalized) ||
    new RegExp("\\b(pessoas|participantes|alunos|clientes|convidados|candidatos|equipe)\\b.{0,40}\\b" + numberPattern + "\\b").test(normalized);
};

const asksForValueOrSimulation = (message: string): boolean => {
  const normalized = normalizeText(message);
  return /\b(quanto|valor|preco|preco|orcamento|cotacao|fica|ficaria|custa|custaria|simular|simulacao)\b/.test(normalized);
};

const getParticipantCountFromContext = (structuredContext: string): number | null => {
  const normalized = normalizeText(structuredContext)
    .replace(/[^\w\s/:]/g, " ")
    .replace(/\s+/g, " ");

  const explicitMatch = normalized.match(/quantidade de pessoas\/participantes:\s*(\d{1,3})\b/i);
  if (explicitMatch) return Number(explicitMatch[1]);

  const genericMatch = normalized.match(/\b(?:pessoas|participantes|alunos|clientes|convidados|candidatos|equipe):\s*(\d{1,3})\b/i);
  return genericMatch ? Number(genericMatch[1]) : null;
};

const NUMBER_WORD_VALUES: Record<string, number> = {
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
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90
};

const parseNumberLikeText = (value: string): number | null => {
  const normalized = normalizeText(value)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const digitMatch = normalized.match(/\b(\d{1,3})\b/);
  if (digitMatch) return Number(digitMatch[1]);

  const numberWordPattern = Object.keys(NUMBER_WORD_VALUES)
    .sort((a, b) => b.length - a.length)
    .join("|");
  const wordMatch = normalized.match(new RegExp(`\\b(${numberWordPattern})(?:\\s+e\\s+(${numberWordPattern}))?\\b`));
  if (!wordMatch) return null;

  const first = NUMBER_WORD_VALUES[wordMatch[1]] ?? 0;
  const second = wordMatch[2] ? NUMBER_WORD_VALUES[wordMatch[2]] ?? 0 : 0;

  return first + second || null;
};

const numberLikeTokenPattern = `(?:\\d{1,3}|${Object.keys(NUMBER_WORD_VALUES)
  .sort((a, b) => b.length - a.length)
  .join("|")})`;

const parseNumberLikeToken = (value?: string | null): number | null =>
  value ? parseNumberLikeText(value) : null;

const isPackageCompositionOrTotalHoursMessage = (message = ""): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const hasPackageTerm = /\b(pacote|pacotes|plano|planos|bloco|blocos|composicao|composição|compor|montar)\b/.test(normalized);
  const hasQuoteTerm = /\b(orcamento|orcamento|simulacao|simulação|calcular|calculo|valor)\b/.test(normalized);
  const hasSumSignal = /(?:\+|\bmais\b|\bsomando\b|\bjunto\b)/.test(normalized);
  const hasHourValue = new RegExp(`\\b${numberLikeTokenPattern}\\s*(?:h|hora|horas)\\b`).test(normalized);
  const hasTotalSignal =
    new RegExp(`\\b(?:total|totais|ao todo|no total)\\b.{0,25}\\b${numberLikeTokenPattern}\\s*(?:h|hora|horas)\\b`).test(normalized) ||
    new RegExp(`\\b${numberLikeTokenPattern}\\s*(?:h|hora|horas)\\b.{0,25}\\b(?:total|totais|ao todo|no total)\\b`).test(normalized);
  const isCorrectionAboutTotal =
    new RegExp(`\\b(?:to|estou|tou|tô)\\s+falando\\b.{0,30}\\b${numberLikeTokenPattern}\\s*(?:h|hora|horas)\\b`).test(normalized) ||
    new RegExp(`\\bnao\\s+ha\\s+(?:encontro|encontros|dia|dias)\\s+de\\s+${numberLikeTokenPattern}\\s*(?:h|hora|horas)\\b`).test(normalized);

  return (
    (hasPackageTerm && (hasHourValue || hasSumSignal)) ||
    (hasQuoteTerm && hasPackageTerm && hasHourValue) ||
    hasTotalSignal ||
    isCorrectionAboutTotal
  );
};

const extractRequestedTotalHours = (message = ""): number | null => {
  if (!isPackageCompositionOrTotalHoursMessage(message)) return null;

  const normalized = normalizeText(message)
    .replace(/[^\w\s+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const correctionMatch = normalized.match(
    new RegExp(`\\b(?:to|estou|tou|tô)\\s+falando\\b.{0,30}\\b(${numberLikeTokenPattern})\\s*(?:h|hora|horas)\\b`)
  ) || normalized.match(
    new RegExp(`\\bnao\\s+ha\\s+(?:encontro|encontros|dia|dias)\\s+de\\s+(${numberLikeTokenPattern})\\s*(?:h|hora|horas)\\b`)
  ) || normalized.match(
    new RegExp(`\\b(?:total|totais|ao todo|no total)\\b.{0,25}\\b(${numberLikeTokenPattern})\\s*(?:h|hora|horas)\\b`)
  );

  if (correctionMatch?.[1]) {
    return parseNumberLikeToken(correctionMatch[1]);
  }

  let total = 0;
  let found = false;

  const explicitHourRegex = new RegExp(`\\b(${numberLikeTokenPattern})\\s*(?:h|hora|horas)\\b`, "g");
  let hourMatch = explicitHourRegex.exec(normalized);
  while (hourMatch) {
    const value = parseNumberLikeToken(hourMatch[1]);
    if (value) {
      total += value;
      found = true;
    }
    hourMatch = explicitHourRegex.exec(normalized);
  }

  const plusPackageRegex = new RegExp(
    `(?:\\+|\\bmais\\b|\\bjunto\\b|\\bsomando\\b)\\s*(?:(${numberLikeTokenPattern})\\s+)?(?:pacote|plano|bloco)?\\s*(?:de\\s+)?(${numberLikeTokenPattern})\\s*(?:h|hora|horas)?\\b`,
    "g"
  );
  let plusMatch = plusPackageRegex.exec(normalized);
  while (plusMatch) {
    const count = parseNumberLikeToken(plusMatch[1]) || 1;
    const hours = parseNumberLikeToken(plusMatch[2]);
    if (hours) {
      total += count * hours;
      found = true;
    }
    plusMatch = plusPackageRegex.exec(normalized);
  }

  return found && total > 0 ? total : null;
};

const getExplicitNumberFromMessage = (message: string): number | null => {
  return parseNumberLikeText(message);
};

const getCapacityLimitFromKnowledge = (knowledge: string): number | null => {
  const normalized = normalizeText(knowledge)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const peopleTerms = "(?:pessoas|participantes|alunos|clientes|convidados|candidatos|equipe)";
  const aboveCapacityMatch = normalized.match(
    new RegExp(`\\bacima\\s+de\\s+(\\d{1,3})\\s+${peopleTerms}.{0,90}\\b(?:validar|verificar|confirmar|avaliar).{0,60}\\b(?:capacidade|limite|lotacao|equipe|humano|atendente)\\b`)
  );
  if (aboveCapacityMatch) return Number(aboveCapacityMatch[1]);

  const capacityMatch = normalized.match(
    new RegExp(`\\b(?:capacidade|comporta|suporta|limite|maximo|maxima|lotacao).{0,90}\\b(?:ate|de ate|para ate)?\\s*(\\d{1,3})\\s+${peopleTerms}\\b`)
  );
  if (capacityMatch) return Number(capacityMatch[1]);

  const untilMatch = normalized.match(new RegExp(`\\bate\\s+(\\d{1,3})\\s+${peopleTerms}\\b`));
  if (!untilMatch || untilMatch.index === undefined) return null;

  const nearbyText = normalized.slice(
    Math.max(0, untilMatch.index - 120),
    Math.min(normalized.length, untilMatch.index + 120)
  );

  return /\b(capacidade|comporta|suporta|limite|maximo|maxima|lotacao)\b/.test(nearbyText)
    ? Number(untilMatch[1])
    : null;
};

const isCapacityLimitAdjustmentRequest = (
  message: string,
  lastAiMessage: string | null | undefined,
  capacityLimit: number | null
): boolean => {
  if (!capacityLimit || !lastAiMessage) return false;

  const last = normalizeText(lastAiMessage);
  const current = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!/\b(capacidade|limite|comporta|suporta)\b/.test(last)) return false;
  if (!/\b(refazer|ajustar|considerando|considerar|ate|calcular|orcamento|estimativa)\b/.test(last)) return false;
  if (isExplicitHumanRequest(message) || isExplicitCloseRequest(message) || isOperationalHandoffRequest(message)) return false;

  if (
    /\b(gostaria|quer|queria|pode|posso).{0,80}\b(considerar|refazer|ajustar|calcular|orcar|orcamento|opcao)\b/.test(last) &&
    /^(sim|s|ss|pode|pode sim|claro|isso|isso mesmo|pode ser|sim pode|ok|certo|fechado|beleza|blz|vamos|bora)$/.test(current)
  ) {
    return true;
  }

  const explicitNumber = getExplicitNumberFromMessage(message);
  if (explicitNumber !== null && explicitNumber <= capacityLimit) {
    return /\b(faz|faca|fazer|refaz|refaca|refazer|ajusta|ajuste|ajustar|considera|considerando|considerar|bota|botar|coloca|colocar|poe|por|manda|mandar|calcula|calcular|orca|orcar|orcamento|simula|simular|cota|cotar|pode|pra|para|com|ate)\b/.test(current) ||
      current === String(explicitNumber);
  }

  return /\b(primeira|primeira opcao|refazer|ajustar|ajusta|pode refazer|pode ajustar|faz isso|pode ser|essa opcao|essa primeira)\b/.test(current);
};

const isAffirmativeCapacityLimitQuoteRequest = (
  message: string,
  lastAiMessage: string | null | undefined
): boolean => {
  const last = normalizeText(lastAiMessage || "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const current = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const lastAskedCapacityQuote =
    /\b(capacidade|limite|comporta|suporta)\b/.test(last) &&
    /\b(posso|pode|calcular|orcamento|estimativa|considerar|limite)\b/.test(last);

  if (!lastAskedCapacityQuote) return false;
  if (isExplicitHumanRequest(message) || isExplicitCloseRequest(message) || isOperationalHandoffRequest(message)) return false;

  return /^(sim|s|ss|pode|pode sim|pode fazer|faz|fazer|calcula|calcular|ok|certo|isso|isso mesmo|manda|mande|me manda|me manda o orcamento|manda o orcamento)$/.test(current) ||
    /\b(pode|faz|fazer|calcula|calcular|manda|mande)\b.{0,40}\b(orcamento|estimativa|simulacao|20|vinte|limite)\b/.test(current) ||
    /\b(manda|mande|me manda)\b.{0,40}\bor\b.{0,12}\bamento\b/.test(current);
};

const buildCapacityExceededDecision = (
  message: string,
  articles: KnowledgeFragment[],
  participantCount: number,
  capacityLimit: number
): AiDecision => ({
  intencao: "restricao_capacidade",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: `Cliente informou ${participantCount} pessoas/participantes, mas a base informa capacidade maxima de ${capacityLimit}.`,
  baseEncontrada: articles.length > 0,
  respostaSegura: true,
  acao: "responder_com_base",
  motivo: "Guardrail local: nao montar orcamento como viavel quando a quantidade excede a capacidade informada na base.",
  resposta: [
    `Para ${participantCount} pessoas, preciso considerar um ponto importante: a capacidade informada e de ate ${capacityLimit} pessoas.`,
    `Para seguir com uma estimativa, vou considerar o limite de ${capacityLimit} pessoas.`,
    `Posso calcular o orcamento para ${capacityLimit} pessoas com os dados que voce informou?`
  ].join("\n\n"),
  knowledgeIds: articles.map(article => article.id)
});

const hasPriorDurationAndOccurrences = (structuredContext: string): boolean =>
  /Duracao\/tempo informado/i.test(structuredContext) &&
  /Quantidade de (?:encontros\/dias\/recorrencia|ocorrencias\/unidades de agenda)/i.test(structuredContext);

const hasPriorParticipantCount = (structuredContext: string): boolean =>
  /Quantidade de pessoas\/participantes/i.test(structuredContext);

const hasMinimumQuoteData = (structuredContext: string): boolean =>
  hasPriorParticipantCount(structuredContext) && hasPriorDurationAndOccurrences(structuredContext);

const getActiveKnowledgeFragments = async (): Promise<KnowledgeFragment[]> => {
  const articles = await KnowledgeBaseArticle.findAll({
    where: { active: true },
    order: [["id", "ASC"]]
  });

  return articles.map(article => ({
    id: article.id,
    title: article.title,
    tags: article.tags,
    fragment: article.content,
    contentHtml: article.contentHtml,
    rank: 0.25,
    source: "fallback"
  }));
};

const buildCompleteQuoteDataDecision = (
  message: string,
  articles: KnowledgeFragment[],
  reason: string
): AiDecision => ({
  intencao: "consulta_valor",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Dados minimos de orcamento ja foram coletados no contexto estruturado.",
  baseEncontrada: articles.length > 0,
  respostaSegura: true,
  acao: "responder_com_base",
  motivo: reason,
  knowledgeIds: articles.map(article => article.id)
});

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
  [
    "CONTEXTO AUTORIZADO DA BASE:",
    ...fragments.map(fragment => [
      `[Secao: ${fragment.section || fragment.title}]`,
      fragment.tags ? `Tags: ${fragment.tags}` : "",
      fragment.fragment
    ].filter(Boolean).join("\n"))
  ].join("\n\n");

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
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, "*$1*")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return answer;
};

const stripRepeatedGreeting = (
  answer: string,
  ticket: Ticket,
  history: string,
  contactName?: string
): string => {
  if (!answer.trim()) return answer;
  if (!ticket.lastAiMessage && !historyHasRecentAiAnswer(history)) return answer;

  const firstName = normalizeText(String(contactName || "").trim().split(/\s+/)[0] || "");
  const escapedFirstName = firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const greetingPattern = escapedFirstName
    ? new RegExp(`^\\s*(?:ola|oi|bom dia|boa tarde|boa noite)\\s*,?\\s*${escapedFirstName}?\\s*!?\\s*(?:\\n+)?`, "i")
    : /^\s*(?:ola|oi|bom dia|boa tarde|boa noite)\s*!?\s*(?:\n+)?/i;

  return answer.replace(greetingPattern, "").trim() || answer;
};

const isIncludedItemsQuestion = (message = ""): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\bo\s*q\b/g, "o que")
    .replace(/\boq\b/g, "o que")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(o\s+que\s+(?:eu\s+)?tenho\s+direito|que\s+(?:eu\s+)?tenho\s+direito|(?:eu\s+)?tenho\s+direito(?:\s+a\s+que)?|o\s+que\s+entra|o\s+que\s+inclui|o\s+que\s+vem|o\s+que\s+esta\s+incluso|o\s+que\s+ta\s+incluso|vem\s+incluso|esta\s+incluso|ta\s+incluso|incluso|inclusos|incluido|inclui|tem\s+direito)\b/.test(normalized);
};

const getActiveConversationHistory = (history = ""): string => {
  const lines = history.split("\n");
  let resetIndex = -1;

  lines.forEach((line, index) => {
    const normalized = normalizeText(line);
    if (
      /\batendimento encerrado\b/.test(normalized) ||
      /\bdigite o numero da opcao desejada\b/.test(normalized)
    ) {
      resetIndex = index;
    }
  });

  return resetIndex >= 0 ? lines.slice(resetIndex + 1).join("\n").trim() : history;
};

const extractIncludedItemsFromAnswer = (value = ""): string[] => {
  const lines = value.split("\n");
  const items: string[] = [];
  let reading = false;

  for (const line of lines) {
    const normalized = normalizeText(line).replace(/\*/g, "").trim();

    if (/^(?:incluso|inclusos|inclui)\s*:/.test(normalized)) {
      reading = true;
      continue;
    }

    if (!reading) continue;

    const trimmed = line.trim();
    if (!trimmed) continue;

    const bullet = trimmed.match(/^[-*•]\s*(.+?)\s*[.;:]?$/);
    if (bullet?.[1]) {
      items.push(bullet[1].trim());
      continue;
    }

    if (!/^(?:sala|internet|wi|wifi|ar|capacidade|tv|quadro|recepcao|banheiro|copa|cafeteira|micro|filtro|agua|estrutura)\b/.test(normalized)) {
      reading = false;
    }
  }

  return Array.from(new Set(items));
};

const historyHasIncludedSection = (history = ""): boolean =>
  extractIncludedItemsFromAnswer(getActiveConversationHistory(history)).length >= 5;

const stripIncludedSection = (answer = ""): string => {
  const lines = answer.split("\n");
  const result: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const normalized = normalizeText(line).replace(/\*/g, "").trim();

    if (!skipping && /^(?:incluso|inclusos|inclui)\s*:/.test(normalized)) {
      skipping = true;
      continue;
    }

    if (skipping) {
      const trimmed = line.trim();
      const normalizedTrimmed = normalizeText(trimmed);
      const isIncludedItem =
        !trimmed ||
        /^[-•*]/.test(trimmed) ||
        /^(?:sala|internet|wi|wifi|ar|capacidade|tv|quadro|recepcao|banheiro|copa|cafeteira|micro|filtro|agua|estrutura)\b/.test(normalizedTrimmed);

      if (isIncludedItem) continue;
      skipping = false;
    }

    result.push(line);
  }

  return result
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const answerHasIncludedSection = (answer = ""): boolean =>
  /\b(?:incluso|inclusos|inclui)\s*:/i.test(normalizeText(answer));

const isQuoteAnswer = (answer = ""): boolean => {
  const normalized = normalizeText(answer);
  return /\br\$\s*\d/.test(normalized) ||
    /\b(orcamento|valor|preco|total|desconto|bloco|pacote|diaria|turno|melhor custo)\b/.test(normalized);
};

const isClearlyOutOfScopeMessage = (message = ""): boolean => {
  const normalized = normalizeText(message);
  if (!normalized) return false;

  const asksWorldCup =
    /\b(copa|copas).{0,40}\b(mundo|mundial|brasil|argentina|italia|franca|alemanha)\b/.test(normalized) ||
    /\b(quantas|quantos).{0,40}\b(copas|titulos|mundiais)\b/.test(normalized);

  const asksFootballOrClothing =
    /\b(camisa|camiseta|uniforme).{0,50}\b(time|selecao|brasil|italia|futebol)\b/.test(normalized) ||
    /\b(futebol|flamengo|vasco|botafogo|fluminense|corinthians|palmeiras|sao paulo)\b/.test(normalized);

  const asksGeneralTrivia =
    /\b(quem ganhou|quem venceu|qual e a capital|quantos anos tem|quando nasceu|curiosidade)\b/.test(normalized) ||
    /\b(me explica|explique|me fala|qual e|o que e|quem e|quando foi|onde fica).{0,80}\b(?:futebol|politica|religiao|filme|serie|novela|jogo|game|receita|criptomoeda|bitcoin|dolar|euro|presidente|celebridade)\b/.test(normalized);

  return asksWorldCup || asksFootballOrClothing || asksGeneralTrivia;
};

const buildOutOfScopeDecision = (message: string, aiSetting: AiSetting): AiDecision => ({
  intencao: "sem_resposta_segura",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente perguntou assunto fora do escopo do atendimento configurado.",
  baseEncontrada: false,
  respostaSegura: true,
  acao: "responder_com_base",
  motivo: "Guardrail local: contornar assunto fora do escopo sem encaminhar automaticamente.",
  resposta: [
    `Por aqui eu nao consigo te ajudar com esse assunto fora do atendimento da ${aiSetting.companyName || "empresa"}.`,
    "Mas posso te ajudar com valores, estrutura, disponibilidade, reserva ou duvidas do servico.",
    "Quer seguir por qual desses pontos?"
  ].join("\n\n")
});

const isAddressQuestion = (message = ""): boolean => {
  const normalized = normalizeText(message);
  return /\b(endereco|endere[cç]o|onde fica|localizacao|localiza[cç][aã]o|rua|bairro|como chegar)\b/.test(normalized);
};

const buildAddressAnswerDecision = (message: string): AiDecision => ({
  intencao: "pergunta_sobre_produto_ou_servico",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente perguntou endereco/localizacao da Salinha.",
  baseEncontrada: true,
  respostaSegura: true,
  acao: "responder_com_base",
  motivo: "Resposta deterministica para evitar endereco antigo ou inventado.",
  resposta: [
    "A Salinha Meier fica na Rua Dias da Cruz, 185, sala 215 - Meier, Rio de Janeiro.",
    "Posso te ajudar tambem com valores, estrutura ou uma simulacao de uso."
  ].join("\n\n")
});

const isCapacityInfoQuestion = (message = ""): boolean => {
  const normalized = normalizeText(message);
  return /\b(capacidade|maxima|maximo|comporta|cabem|quantas pessoas|lotacao|lota[cç][aã]o)\b/.test(normalized);
};

const buildCapacityInfoAnswerDecision = (message: string): AiDecision => ({
  intencao: "pergunta_sobre_produto_ou_servico",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente perguntou capacidade maxima da sala.",
  baseEncontrada: true,
  respostaSegura: true,
  acao: "responder_com_base",
  motivo: "Resposta deterministica para capacidade cadastrada.",
  resposta: [
    "A capacidade informada da Salinha Meier e de ate 20 pessoas.",
    "Se passar disso, eu nao monto como uma opcao viavel; posso simular considerando o limite de 20 pessoas."
  ].join("\n\n")
});

const isMinimumRentalQuestion = (message = ""): boolean => {
  const normalized = normalizeText(message);
  return /\b(uma|1)\s*(?:h|hora)\b/.test(normalized) ||
    /\b(alugar|locar|usar).{0,80}\b(uma|1).{0,20}\b(hora|h)\b/.test(normalized) ||
    /\b(minimo|minimo de horas|tempo minimo|menor tempo|hora avulsa)\b/.test(normalized);
};

const buildMinimumRentalAnswerDecision = (message: string): AiDecision => ({
  intencao: "pergunta_sobre_produto_ou_servico",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente perguntou sobre aluguel minimo ou uso de 1 hora.",
  baseEncontrada: true,
  respostaSegura: true,
  acao: "responder_com_base",
  motivo: "Resposta deterministica para regra de bloco minimo.",
  resposta: [
    "Para 1 hora sozinha, o valor cadastrado nao e vendido como hora isolada.",
    "O minimo avulso e o bloco de 2h por R$ 140.",
    "Se quiser, eu posso simular esse bloco ou montar um orcamento com mais dias/encontros."
  ].join("\n\n")
});

const isIdentityQuestion = (message = ""): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(voce|vc|ce|quem)\b.{0,30}\b(ia|robo|bot|assistente|mari|quem e voce|quem e vc|faz oq|faz o que|pode fazer)\b/.test(normalized) ||
    /\b(qual|como)\b.{0,20}\b(seu nome|voce chama|vc chama|te chama|se chama)\b/.test(normalized) ||
    /\b(voce|vc)\b.{0,25}\b(atendente|humano|pessoa|virtual)\b/.test(normalized) ||
    /^(quem e voce|quem e vc|qual seu nome|vc e uma ia|voce e uma ia|vc faz oq|voce faz o que|voce se chama como|vc se chama como)$/.test(normalized);
};

const buildIdentityAnswerDecision = (message: string, aiSetting: AiSetting): AiDecision => ({
  intencao: "pergunta_sobre_produto_ou_servico",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente perguntou quem e a IA ou o que ela faz.",
  baseEncontrada: true,
  respostaSegura: true,
  acao: "responder_com_base",
  motivo: "Responder identidade/função sem repetir orcamento.",
  resposta: [
    `Eu sou a ${aiSetting.name || "assistente virtual"}, assistente da ${aiSetting.companyName || "empresa"}.`,
    "Posso te ajudar com valores, estrutura, capacidade, endereço, inclusos e simulações de orçamento.",
    "Me diga o que você quer ver agora 🙂"
  ].join("\n\n")
});

const buildContextualIdentityAnswerDecision = (
  message: string,
  aiSetting: AiSetting,
  history = ""
): AiDecision => {
  const normalizedHistory = normalizeText(history);
  const identityQuestionCount = (
    normalizedHistory.match(/\b(quem e voce|quem e vc|vc e uma ia|voce e uma ia|vc faz oq|voce faz o que|assistente|robo|bot)\b/g) || []
  ).length;

  if (identityQuestionCount <= 1) return buildIdentityAnswerDecision(message, aiSetting);

  return {
    intencao: "pergunta_sobre_produto_ou_servico",
    confianca: "alta",
    mensagemInterpretada: message,
    contexto: "Cliente voltou a perguntar sobre identidade ou funcao da IA.",
    baseEncontrada: true,
    respostaSegura: true,
    acao: "responder_com_base",
    motivo: "Responder de forma curta e conduzir para a necessidade atual.",
    resposta: [
      `Sou a ${aiSetting.name || "assistente virtual"}, por aqui para te orientar no atendimento da ${aiSetting.companyName || "empresa"}.`,
      "Posso seguir com valores, estrutura, inclusos, endereco ou ajuste de orcamento. Qual ponto voce quer ver?"
    ].join("\n\n")
  };
};

const isPersonalFlirtQuestion = (message = ""): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(voce|vc|tu)\b.{0,25}\b(bonita|bonito|linda|lindo|simpatica|simpatico|legal|engracada|engracado|gata|gato|casada|casado|solteira|solteiro|namora|sair comigo)\b/.test(normalized);
};

const isLoopingComplaint = (message = ""): boolean => {
  const normalized = normalizeText(message);
  return /\b(looping|repetindo|repetiu|mesma coisa|ja falei|ja respondi|nao entendeu|voce nao entendeu|vc nao entendeu|nao foi isso|nao era isso|nao e isso|nao to perguntando isso|nao estou perguntando isso|para de perguntar|pare de perguntar|voce nao perguntou|vc nao perguntou|bugou|hugou|travou|se perdeu|voce se perdeu|vc se perdeu)\b/.test(normalized);
};


const isHumanHandoffConfirmationComplaint = (message = ""): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(voce|vc)\b.{0,40}\b(nao perguntou|perguntou)\b.{0,80}\b(atendente|humano|pessoa|equipe|encaminhar|transferir)\b/.test(normalized);
};


const buildHumanHandoffConfirmationComplaintDecision = (message: string): AiDecision => ({
  intencao: "cliente_nao_satisfeito",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente questionou a conducao sobre encaminhamento humano.",
  baseEncontrada: false,
  respostaSegura: true,
  acao: "pedir_confirmacao",
  motivo: "Reconhecer falha e confirmar antes de transferir; nao executar acao critica automaticamente.",
  perguntaConfirmacao: "Voce quer que eu te encaminhe para um atendente agora?",
  opcoes: [
    { numero: "1", valor: "Sim, falar com atendente" },
    { numero: "2", valor: "Nao, continuar por aqui" }
  ],
  resposta: "Verdade, eu deveria ter confirmado antes. Voce quer que eu te encaminhe para um atendente agora ou prefere que eu continue te ajudando por aqui?"
});

const isUnknownColorOrVisualQuestion = (message = ""): boolean => {
  const normalized = normalizeText(message);
  return /\b(cor|cores|aparencia|foto|imagem|parece|visual)\b/.test(normalized) &&
    /\b(sala|salinha|espaco|espaço|parede|mesa|cadeira)\b/.test(normalized);
};

const buildUnknownVisualAnswerDecision = (message: string): AiDecision => ({
  intencao: "pergunta_sobre_produto_ou_servico",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente perguntou detalhe visual nao cadastrado na base.",
  baseEncontrada: false,
  respostaSegura: true,
  acao: "responder_com_base",
  motivo: "Nao inventar detalhe visual sem cadastro; contornar com alternativa util.",
  resposta: [
    "Essa informação visual específica eu não tenho cadastrada com segurança.",
    "Posso te ajudar com estrutura, capacidade, endereço, itens inclusos ou montar uma simulação de valor."
  ].join("\n\n")
});

type CurrentQuoteData = {
  participantCount: number | null;
  occurrenceCount: number | null;
  durationHours: number | null;
};

const formatMoney = (value: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(value)
    .replace(/\s+/g, " ");

const getCurrentQuoteDataFromContext = (structuredContext = ""): CurrentQuoteData => {
  const normalized = normalizeText(structuredContext)
    .replace(/[^\w\s/:]/g, " ")
    .replace(/\s+/g, " ");

  const participantMatch = normalized.match(/quantidade de pessoas\/participantes:\s*(\d{1,3})\b/i);
  const adjustedPeopleRegex = /\bconsiderando\s+(\d{1,3})\s+pessoas?\b/gi;
  let adjustedParticipantCount: number | null = null;
  let adjustedPeopleMatch = adjustedPeopleRegex.exec(normalized);
  while (adjustedPeopleMatch) {
    adjustedParticipantCount = Number(adjustedPeopleMatch[1]);
    adjustedPeopleMatch = adjustedPeopleRegex.exec(normalized);
  }
  const occurrenceMatch = normalized.match(/quantidade de (?:ocorrencias\/unidades de agenda|encontros\/dias\/recorrencia):\s*(\d{1,3})\b/i);
  const durationMatch = normalized.match(/duracao\/tempo informado:\s*(\d{1,3})\s*h\b/i);

  return {
    participantCount: adjustedParticipantCount !== null
      ? adjustedParticipantCount
      : participantMatch
        ? Number(participantMatch[1])
        : null,
    occurrenceCount: occurrenceMatch ? Number(occurrenceMatch[1]) : null,
    durationHours: durationMatch ? Number(durationMatch[1]) : null
  };
};

const isCurrentExact15hScenario = (quoteData: CurrentQuoteData | null): boolean => {
  if (!quoteData?.occurrenceCount || !quoteData.durationHours) return false;
  return quoteData.occurrenceCount * quoteData.durationHours === 15;
};

const shouldCorrectExact15hQuote = (
  answer = "",
  context = "",
  currentQuoteData: CurrentQuoteData | null = null
): boolean => {
  const normalizedAnswer = normalizeText(answer);
  const normalizedContext = normalizeText(`${answer}\n${context}`);

  if (currentQuoteData && !isCurrentExact15hScenario(currentQuoteData)) return false;

  const mentions15h =
    /\b15\s*h\b/.test(normalizedContext) ||
    /\b15\s+horas\b/.test(normalizedContext) ||
    /\b3\s*(?:encontros|aulas|dias|reunioes).{0,40}\b5\s*(?:h|horas)\b/.test(normalizedContext) ||
    /\b3\s*x\s*5\s*h\b/.test(normalizedContext);

  const wronglyOffers20h =
    /\bpacote\s+(?:de\s+)?20\s*(?:h|horas)\b/.test(normalizedAnswer) ||
    /\b20\s*(?:h|horas).{0,80}\b(?:saldo|uso futuro|cobre tudo)\b/.test(normalizedAnswer);

  return mentions15h && wronglyOffers20h;
};

const hasLessThanThreeMonths = (context = ""): boolean => {
  const normalized = normalizeText(context);
  return /\b(?:1|um|uma|2|dois|duas)\s+mes(?:es)?\b/.test(normalized);
};

const buildCorrected15hQuoteAnswer = (
  context = "",
  currentQuoteData: CurrentQuoteData | null = null
): string => {
  const normalized = normalizeText(context);
  const peopleMatch = normalized.match(/\b(\d{1,2})\s+pessoas?\b/);
  const occurrences = currentQuoteData?.occurrenceCount || 3;
  const duration = currentQuoteData?.durationHours || 5;
  const recurrenceNote = hasLessThanThreeMonths(context)
    ? [
        "",
        "Como o uso informado foi por menos de 3 meses, nao vou tratar como plano mensalista recorrente. Nesse caso, considero como datas/encontros especificos."
      ].join("\n")
    : "";

  return appendPostQuoteMenu([
    "📌 Orçamento estimado",
    "",
    currentQuoteData?.participantCount || peopleMatch?.[1]
      ? `👥 Pessoas: ${currentQuoteData?.participantCount || peopleMatch?.[1]}`
      : "",
    `📅 Uso: ${occurrences} encontros de ${duration}h`,
    "⏱️ Total: 15h",
    "",
    "Melhor opção encontrada:",
    "",
    "Pacote flexível 15h",
    "R$ 900,00",
    "",
    "Total estimado: R$ 900,00",
    recurrenceNote,
    "",
    "Esse pacote cobre as 15h solicitadas.",
    "",
    "Simulação informativa: este orçamento precisa ser validado por um atendente, assim como disponibilidade, reserva e condições finais."
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim());
};

type HourlyPackageOption = {
  hours: number;
  price: number;
  label: string;
  mode?: "flex" | "consecutive";
};

type HourlyPackageCandidate = {
  totalHours: number;
  totalPrice: number;
  items: HourlyPackageOption[];
};

const parseBrazilianCurrency = (value = ""): number | null => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatBrazilianCurrency = (value: number): string =>
  `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  })}`;

const extractHourlyPackageOptions = (knowledge = ""): HourlyPackageOption[] => {
  const options: HourlyPackageOption[] = [];
  const seen = new Set<string>();

  for (const rawLine of knowledge.split("\n")) {
    const line = rawLine.trim();
    const normalized = normalizeText(line);
    if (!line || !/r\$\s*\d/i.test(line) || !/\d{1,3}\s*h/i.test(line)) continue;
    if (/^\|/.test(line) || /^total solicitado\b/i.test(normalized)) continue;
    if (/\b(melhor que|alternativa|observacao|cobre|sobra|total real|nao oferecer|nao usar)\b/.test(normalized)) continue;
    if (/\b(semanal|semanais|mensal|mensais|mes|meses)\b/.test(normalized)) continue;
    if (!/\b(pacote|bloco|periodo|período|turno|diaria|diária)\b/.test(normalized)) continue;

    const hourMatch = line.match(/\b(\d{1,3})\s*h\b/i);
    const priceMatch = line.match(/R\$\s*([\d.]+(?:,\d{2})?)/i);
    if (!hourMatch?.[1] || !priceMatch?.[1]) continue;

    const hours = Number(hourMatch[1]);
    const price = parseBrazilianCurrency(priceMatch[1]);
    if (!Number.isFinite(hours) || !price) continue;

    const cleanedLabel = line
      .replace(/^[-*]\s*/, "")
      .replace(/\s+/g, " ")
      .replace(/\s*[|:].*$/, "")
      .trim();
    const fallbackLabel = normalized.includes("bloco")
      ? `bloco de ${hours}h`
      : normalized.includes("turno")
        ? `turno de ${hours}h`
        : normalized.includes("diaria") || normalized.includes("diária")
          ? `diaria de ${hours}h`
          : `pacote de ${hours}h`;
    const label = cleanedLabel && cleanedLabel.length <= 80 ? cleanedLabel : fallbackLabel;
    const key = `${hours}:${price}:${fallbackLabel}`;
    if (seen.has(key)) continue;

    seen.add(key);
    options.push({ hours, price, label: fallbackLabel });
  }

  return options.sort((a, b) => a.hours - b.hours || a.price - b.price);
};

const extractOfficialHourlyPackageOptions = (knowledge = ""): HourlyPackageOption[] => {
  const options: HourlyPackageOption[] = [];
  const seen = new Set<string>();

  for (const rawLine of knowledge.split("\n")) {
    const line = rawLine.trim();
    const normalized = normalizeText(line);
    if (!line || !/r\$\s*\d/i.test(line) || !/\d{1,3}\s*h/i.test(line)) continue;

    const isOfficialValueLine =
      /^(?:[-*]\s*)?(?:pacote|bloco|turno|diaria|periodo)\b/.test(normalized);
    const isDerivedOrExampleLine =
      /^\|/.test(line) ||
      /[+=]|(?:\s|^)\d+\s*x\s*\d+/i.test(line) ||
      /\b(total solicitado|melhor que|alternativa|observacao|cobre|sobra|total real|nao oferecer|nao usar|exemplo|composicao|resultado|simulacao|demanda|solicitado|pedido)\b/.test(normalized);

    if (!isOfficialValueLine || isDerivedOrExampleLine) continue;
    if (/\b(semanal|semanais|mensal|mensais|mes|meses)\b/.test(normalized)) continue;

    const hourMatch = line.match(/\b(\d{1,3})\s*h\b/i);
    const priceMatch = line.match(/R\$\s*([\d.]+(?:,\d{2})?)/i);
    if (!hourMatch?.[1] || !priceMatch?.[1]) continue;

    const hours = Number(hourMatch[1]);
    const price = parseBrazilianCurrency(priceMatch[1]);
    if (!Number.isFinite(hours) || !price) continue;

    const label = normalized.includes("bloco")
      ? `bloco de ${hours}h`
      : normalized.includes("turno")
        ? `turno de ${hours}h`
        : normalized.includes("diaria")
          ? `diaria de ${hours}h`
          : `pacote de ${hours}h`;
    const key = `${hours}:${price}:${label}`;
    if (seen.has(key)) continue;

    seen.add(key);
    options.push({
      hours,
      price,
      label,
      mode: normalized.includes("turno") || normalized.includes("diaria") ? "consecutive" : "flex"
    });
  }

  return options.sort((a, b) => a.hours - b.hours || a.price - b.price);
};

const summarizePackageItems = (items: HourlyPackageOption[]): string => {
  const grouped = new Map<string, { option: HourlyPackageOption; count: number }>();

  for (const item of items) {
    const key = `${item.label}:${item.hours}:${item.price}`;
    const current = grouped.get(key);
    grouped.set(key, { option: item, count: (current?.count || 0) + 1 });
  }

  return Array.from(grouped.values())
    .map(({ option, count }) =>
      count > 1
        ? `${option.label} x ${count} = ${formatBrazilianCurrency(option.price)} x ${count}`
        : `${option.label} = ${formatBrazilianCurrency(option.price)}`
    )
    .join(" + ");
};

const findHourlyPackageCandidates = (
  options: HourlyPackageOption[],
  targetHours: number
): HourlyPackageCandidate[] => {
  const normalizedOptions = Array.from(
    options
      .reduce((map, option) => {
        const previous = map.get(option.hours);
        if (!previous || option.price < previous.price) map.set(option.hours, option);
        return map;
      }, new Map<number, HourlyPackageOption>())
      .values()
  ).sort((a, b) => a.hours - b.hours || a.price - b.price);

  if (!normalizedOptions.length) return [];

  const maxOptionHours = Math.max(...normalizedOptions.map(option => option.hours));
  const maxHours = Math.min(Math.max(targetHours, maxOptionHours) + maxOptionHours, targetHours + 25);
  const bestByHour: Array<HourlyPackageCandidate | null> = Array(maxHours + 1).fill(null);
  bestByHour[0] = { items: [], totalHours: 0, totalPrice: 0 };

  for (let hours = 0; hours <= maxHours; hours += 1) {
    const current = bestByHour[hours];
    if (!current) continue;

    for (const option of normalizedOptions) {
      const nextHours = hours + option.hours;
      if (nextHours > maxHours) continue;

      const candidate: HourlyPackageCandidate = {
        items: [...current.items, option],
        totalHours: nextHours,
        totalPrice: current.totalPrice + option.price
      };
      const previous = bestByHour[nextHours];
      if (
        !previous ||
        candidate.totalPrice < previous.totalPrice ||
        (candidate.totalPrice === previous.totalPrice && candidate.items.length < previous.items.length)
      ) {
        bestByHour[nextHours] = candidate;
      }
    }
  }

  return bestByHour
    .slice(targetHours)
    .filter((candidate): candidate is HourlyPackageCandidate => Boolean(candidate?.items.length))
    .sort((a, b) =>
      a.totalPrice - b.totalPrice ||
      (a.totalHours - targetHours) - (b.totalHours - targetHours) ||
      a.items.length - b.items.length
    )
    .slice(0, 5);
};

const findConsecutiveCandidate = (
  options: HourlyPackageOption[],
  occurrenceCount: number,
  durationHours: number
): HourlyPackageCandidate | null => {
  const consecutiveOptions = options
    .filter(option => option.mode === "consecutive" && option.hours >= durationHours)
    .sort((a, b) => a.price - b.price || a.hours - b.hours);

  const best = consecutiveOptions[0];
  if (!best) return null;

  return {
    items: Array.from({ length: occurrenceCount }, () => best),
    totalHours: best.hours * occurrenceCount,
    totalPrice: best.price * occurrenceCount
  };
};

const describeQuoteCandidate = (
  candidate: HourlyPackageCandidate,
  targetHours: number
): string => {
  const saldo = candidate.totalHours - targetHours;
  return [
    "Composição:",
    "",
    summarizePackageItems(candidate.items),
    "",
    `Total estimado: ${formatBrazilianCurrency(candidate.totalPrice)}`,
    saldo > 0
      ? `Observacao: cobre ${candidate.totalHours}h e deixa ${saldo}h de saldo.`
      : ""
  ].filter(Boolean).join("\n");
};

const buildHourlyPackageComparisonHint = (structuredContext = "", knowledge = ""): string => {
  const quoteData = getCurrentQuoteDataFromContext(structuredContext);
  if (!quoteData.occurrenceCount || !quoteData.durationHours) return "";

  const targetHours = quoteData.occurrenceCount * quoteData.durationHours;
  if (!targetHours || targetHours > 80) return "";

  const options = extractOfficialHourlyPackageOptions(knowledge);
  if (options.length < 2) return "";

  const candidates = findHourlyPackageCandidates(options, targetHours);
  if (!candidates.length) return "";

  const lines = candidates.map((candidate, index) => {
    const saldo = candidate.totalHours - targetHours;
    return `${index + 1}. ${summarizePackageItems(candidate.items)} = ${formatBrazilianCurrency(candidate.totalPrice)}; cobre ${candidate.totalHours}h${saldo > 0 ? `, sobra ${saldo}h` : ""}.`;
  });

  return [
    "Comparacao interna de pacotes por hora detectados na base:",
    `- Demanda atual: ${quoteData.occurrenceCount} ocorrencia(s) x ${quoteData.durationHours}h = ${targetHours}h.`,
    "- Use esta comparacao apenas se for compativel com o cenario e com as regras da base.",
    "- Recomende a opcao de menor valor que cubra 100% da necessidade; se houver saldo, explique curto.",
    ...lines
  ].join("\n");
};

const buildDirectHourlyPackageQuestionAnswer = (message = "", knowledge = ""): string | null => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!/\b(pacote|oacote|plano)\b/.test(normalized)) return null;

  const hourMatch =
    normalized.match(/\b(\d{1,3})\s*(?:h|hora|horas)\b/) ||
    normalized.match(/\b(?:de|com|para)\s+(\d{1,3})\b/);
  if (!hourMatch?.[1]) return null;

  const requestedHours = Number(hourMatch[1]);
  if (!requestedHours || requestedHours > 80) return null;

  const options = extractOfficialHourlyPackageOptions(knowledge);
  if (!options.length) return null;

  const directOption = options.find(option => option.hours === requestedHours);
  if (directOption) {
    return [
      `Sim, existe ${directOption.label}: ${formatBrazilianCurrency(directOption.price)}.`,
      "",
      "Simulacao informativa: disponibilidade, reserva e condicoes finais precisam ser confirmadas por um atendente."
    ].join("\n");
  }

  const candidates = findHourlyPackageCandidates(options, requestedHours);
  const best = candidates[0];
  if (!best) {
    return `Nao encontrei pacote direto de ${requestedHours}h na tabela cadastrada. Posso pedir para a equipe confirmar a melhor composicao para esse total.`;
  }

  const saldo = best.totalHours - requestedHours;
  return [
    `Nao existe pacote direto de ${requestedHours}h na tabela cadastrada.`,
    "",
    `A melhor composicao para cobrir ${requestedHours}h e:`,
    `${summarizePackageItems(best.items)} = ${formatBrazilianCurrency(best.totalPrice)}.`,
    saldo > 0 ? `Ela cobre ${best.totalHours}h e deixa ${saldo}h de saldo.` : "Ela cobre exatamente o total solicitado.",
    "",
    "Simulacao informativa: disponibilidade, reserva e condicoes finais precisam ser confirmadas por um atendente."
  ].filter(Boolean).join("\n");
};

const buildProfessionalHourlyQuoteAnswer = (
  quoteData: CurrentQuoteData,
  knowledge = ""
): string | null => {
  if (!quoteData.occurrenceCount || !quoteData.durationHours) return null;

  const targetHours = quoteData.occurrenceCount * quoteData.durationHours;
  if (!targetHours || targetHours > 80) return null;

  const options = extractOfficialHourlyPackageOptions(knowledge);
  if (!options.length) return null;

  const flexOptions = options.filter(option => option.mode !== "consecutive");
  const directOption = flexOptions.find(option => option.hours === targetHours);
  const flexBest = directOption
    ? { items: [directOption], totalHours: directOption.hours, totalPrice: directOption.price }
    : findHourlyPackageCandidates(flexOptions, targetHours)[0];
  const consecutiveBest = findConsecutiveCandidate(options, quoteData.occurrenceCount, quoteData.durationHours);
  const candidates = [flexBest, consecutiveBest].filter((candidate): candidate is HourlyPackageCandidate => Boolean(candidate));
  const best = candidates.sort((a, b) => a.totalPrice - b.totalPrice || a.totalHours - b.totalHours)[0];

  if (!best) return null;

  const peopleText = quoteData.participantCount ? ` para ${quoteData.participantCount} pessoas` : "";
  const bestIsConsecutive = Boolean(
    consecutiveBest &&
    best.totalPrice === consecutiveBest.totalPrice &&
    best.totalHours === consecutiveBest.totalHours &&
    best.items.every(item => item.mode === "consecutive")
  );

  const lines = [
    "*Orcamento estimado*",
    `Cenario: ${quoteData.occurrenceCount} encontro(s) de ${quoteData.durationHours}h${peopleText}.`,
    `Total: ${targetHours}h.`,
    "",
    "*Analise*",
    bestIsConsecutive
      ? "Como cada encontro precisa de horas consecutivas no mesmo dia, a melhor leitura e calcular por dia/encontro:"
      : directOption
        ? "Existe pacote flexivel direto para esse total:"
        : "Nao existe pacote flexivel direto exatamente com esse total. Entao montei a melhor composicao com itens oficiais:",
    describeQuoteCandidate(best, targetHours),
    flexBest && consecutiveBest && flexBest.totalPrice !== consecutiveBest.totalPrice
      ? [
          "",
          "Comparacao usada:",
          `- Pacote/saldo flexivel: ${summarizePackageItems(flexBest.items)} = ${formatBrazilianCurrency(flexBest.totalPrice)}.`,
          `- Uso consecutivo por dia: ${summarizePackageItems(consecutiveBest.items)} = ${formatBrazilianCurrency(consecutiveBest.totalPrice)}.`
        ].join("\n")
      : "",
    "",
    "*Observacao*",
    "Simulacao informativa: disponibilidade, reserva e condicoes finais precisam ser confirmadas por um atendente."
  ];

  return appendPostQuoteMenu(lines.filter(Boolean).join("\n"));
};

const shouldReplaceHourlyQuoteAnswer = (
  answer = "",
  quoteData: CurrentQuoteData,
  knowledge = ""
): boolean => {
  if (!quoteData.occurrenceCount || !quoteData.durationHours) return false;
  if (!isQuoteAnswer(answer)) return false;

  const targetHours = quoteData.occurrenceCount * quoteData.durationHours;
  const options = extractOfficialHourlyPackageOptions(knowledge);
  if (!targetHours || !options.length) return false;

  return true;
};

const extractIncludedItemsFromKnowledge = (knowledge = ""): string[] => {
  const structureMatch = knowledge.match(
    /(?:estrutura inclusa|o valor da contratacao inclui|o valor da contratação inclui|inclui:)([\s\S]*?)(?:\n\s*(?:\d+\.\s+|#{1,6}\s+|===)|$)/i
  );
  const source = structureMatch?.[1] || "";
  if (!source.trim()) return [];

  const stopWords = /\b(usos indicados|valores oficiais|observacoes|observações|pacotes|planos|educacao|educação|corporativo|rh e selecao|rh e seleção)\b/i;
  const items: string[] = [];

  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (stopWords.test(trimmed)) break;

    const bullet = trimmed.match(/^[-*•]\s*(.+?)\s*[.;:]?$/);
    if (!bullet?.[1]) continue;

    const item = bullet[1].trim();
    if (!item || stopWords.test(item)) continue;
    items.push(item);
  }

  return Array.from(new Set(items));
};

const buildKnowledgeWithFullIncludedSource = async (knowledge = ""): Promise<string> => {
  const currentItems = extractIncludedItemsFromKnowledge(knowledge);
  if (currentItems.length >= 8) return knowledge;

  const articles = await KnowledgeBaseArticle.findAll({
    where: { active: true },
    attributes: ["title", "content"]
  });

  const fullKnowledge = articles
    .map(article => [`# ${article.title}`, article.content].filter(Boolean).join("\n"))
    .join("\n\n");

  return [knowledge, fullKnowledge].filter(Boolean).join("\n\n");
};

const appendIncludedSectionIfNeeded = ({
  answer,
  knowledge,
  activeHistory,
  message
}: {
  answer: string;
  knowledge: string;
  activeHistory: string;
  message: string;
}): string => {
  if (!isQuoteAnswer(answer)) return answer;
  if (isIncludedItemsQuestion(message)) return answer;

  const includedItems = extractIncludedItemsFromKnowledge(knowledge);
  if (!includedItems.length) return answer;

  if (answerHasIncludedSection(answer)) {
    const strippedAnswer = stripIncludedSection(answer);
    const answerIncludedItems = extractIncludedItemsFromAnswer(answer);
    if (historyHasIncludedSection(activeHistory) && answerIncludedItems.length >= includedItems.length) {
      return strippedAnswer;
    }

    return [
      strippedAnswer.trim(),
      "",
      "*Incluso:*",
      ...includedItems.map(item => `- ${item}`)
    ].join("\n");
  }

  if (historyHasIncludedSection(activeHistory)) return answer;

  return [
    answer.trim(),
    "",
    "*Incluso:*",
    ...includedItems.map(item => `- ${item}`)
  ].join("\n");
};

const answerHasCommercialIncludedSection = (answer = ""): boolean =>
  /\bincluso\b|\binclui\b/i.test(normalizeText(answer));

const pluralizePt = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;

const formatCommercialLine = (line: any): string => {
  const count = Number(line.count || 0);
  const unitPrice = Number(line.unitPrice || 0);
  const total = Number(line.total || 0);
  const countText = count > 1 ? ` x ${count}` : "";
  const mathText = count > 1
    ? `${formatMoney(unitPrice)} x ${count} = ${formatMoney(total)}`
    : formatMoney(total);

  return `- ${line.name}${countText}: ${mathText}`;
};

const formatCommercialLineForProposal = (line: any): string => {
  const count = Number(line.count || 0);
  const unitPrice = Number(line.unitPrice || 0);
  const total = Number(line.total || 0);

  if (count > 1) {
    return `${line.name} x ${count}\nCalculo: ${formatMoney(unitPrice)} x ${count} = ${formatMoney(total)}`;
  }

  return `${line.name}\nCalculo: ${formatMoney(total)}`;
};

const formatCommercialCompositionLines = (lines: any[] = []): string => {
  const items: string[] = [];

  lines.forEach((line: any) => {
    const count = Math.max(1, Number(line.count || 1));
    const unitPrice = Number(line.unitPrice || line.total || 0);
    const total = Number(line.total || 0);
    const itemValue = count > 1 && unitPrice ? unitPrice : total;

    for (let index = 0; index < count; index += 1) {
      items.push([
        String(line.name || "").replace(/\s+de\s+(\d+h)\b/i, " $1"),
        formatMoney(itemValue)
      ].join("\n"));
    }
  });

  return items.join("\n+\n");
};

const buildBestValueExplanation = (
  recommended: any,
  requestedHours: number,
  exactText = "necessidade"
): string => {
  const covered = Number(recommended?.coveredQuantity || requestedHours || 0);
  const overage = Number(recommended?.overage || 0);

  if (overage > 0) {
    return `Ela cobre as ${requestedHours}h solicitadas e deixa ${overage}h de saldo. Mesmo com essa margem, foi a melhor opcao encontrada na tabela para cobrir 100% da ${exactText}.`;
  }

  if (covered === requestedHours) {
    return `Ela cobre exatamente as ${requestedHours}h solicitadas, sem empurrar pacote maior nem deixar horas faltando.`;
  }

  return `Ela foi escolhida porque cobre 100% da ${exactText} usando os valores cadastrados.`;
};

const buildShortOverageNote = (recommended: any, requestedHours: number): string => {
  const overage = Number(recommended?.overage || 0);
  const covered = Number(recommended?.coveredQuantity || 0);
  if (!overage) return "";

  return `Esse pacote cobre as ${requestedHours}h solicitadas e ainda deixa ${overage}h de saldo.`;
};

const buildCommercialQuoteAnswer = ({
  quoteData,
  quoteResult,
  activeHistory,
  message
}: {
  quoteData: CurrentQuoteData;
  quoteResult: any;
  activeHistory: string;
  message: string;
}): string | null => {
  const recommended = quoteResult?.recommended;
  if (!recommended?.lines?.length) return null;

  const totalHours = quoteData.occurrenceCount && quoteData.durationHours
    ? quoteData.occurrenceCount * quoteData.durationHours
    : quoteResult.requestedQuantity;
  const peopleLine = quoteData.participantCount
    ? `👥 Pessoas: ${quoteData.participantCount}`
    : "";
  const occurrenceText = quoteData.occurrenceCount && quoteData.durationHours
    ? `${pluralizePt(quoteData.occurrenceCount, "dia/encontro", "dias/encontros")} de ${quoteData.durationHours}h`
    : `${quoteResult.requestedQuantity} unidade(s)`;
  const lineText = formatCommercialCompositionLines(recommended.lines);
  const overageNote = buildShortOverageNote(recommended, Number(totalHours || 0));
  const totalLine = `Total estimado: ${formatMoney(Number(recommended.total))}`;

  const scenarioLines = [
    peopleLine,
    `📅 Uso: ${occurrenceText}`,
    `⏱️ Total: ${totalHours}h`
  ].filter(Boolean).join("\n");

  const baseAnswer = [
    "📌 Orçamento estimado",
    scenarioLines,
    ["Melhor opção encontrada:", "", lineText].join("\n"),
    totalLine,
    overageNote,
    "Simulação informativa: este orçamento precisa ser validado por um atendente, assim como disponibilidade, reserva e condições finais."
  ].filter(Boolean).join("\n\n");

  return appendPostQuoteMenu(baseAnswer);
};

const buildCommercialQuoteDecision = async ({
  ticket,
  aiSetting,
  message,
  quoteData,
  activeHistory,
  knowledgeIds,
  reason
}: {
  ticket: Ticket;
  aiSetting: AiSetting;
  message: string;
  quoteData: CurrentQuoteData;
  activeHistory: string;
  knowledgeIds?: number[];
  reason: string;
}): Promise<AiDecision | null> => {
  if (!quoteData.occurrenceCount || !quoteData.durationHours) return null;

  const quoteResult = await CalculateCommercialQuoteService({
    aiSettingId: aiSetting.id,
    ticketId: ticket.id,
    contactId: ticket.contactId || undefined,
    pricingDimension: "hours",
    participantCount: quoteData.participantCount || undefined,
    occurrenceCount: quoteData.occurrenceCount,
    durationPerOccurrence: quoteData.durationHours,
    includeAlternatives: false
  });

  if (quoteResult.status === "capacity_exceeded") {
    const capacityLimit = quoteResult.service?.capacityMax || null;
    if (capacityLimit) {
      const adjustedQuoteData: CurrentQuoteData = {
        ...quoteData,
        participantCount: capacityLimit
      };
      const adjustedQuoteResult = await CalculateCommercialQuoteService({
        aiSettingId: aiSetting.id,
        ticketId: ticket.id,
        contactId: ticket.contactId || undefined,
        pricingDimension: "hours",
        participantCount: capacityLimit,
        occurrenceCount: quoteData.occurrenceCount,
        durationPerOccurrence: quoteData.durationHours,
        includeAlternatives: false
      });
      const adjustedAnswer = adjustedQuoteResult.ok
        ? buildCommercialQuoteAnswer({
            quoteData: adjustedQuoteData,
            quoteResult: adjustedQuoteResult,
            activeHistory,
            message
          })
        : null;

      if (adjustedAnswer) {
        return {
          intencao: "consulta_valor",
          confianca: "alta",
          mensagemInterpretada: message,
          contexto: quoteResult.validationMessage || `Quantidade informada excede a capacidade maxima de ${capacityLimit}.`,
          baseEncontrada: true,
          respostaSegura: true,
          acao: "responder_com_base",
          motivo: "Calculador comercial ajustou automaticamente a simulacao para o limite de capacidade cadastrado.",
          resposta: [
            `A capacidade informada da Salinha Meier e de ate ${capacityLimit} pessoas.`,
            quoteData.participantCount
              ? `Como voce pediu para ${quoteData.participantCount} pessoas, montei a estimativa considerando o limite de ${capacityLimit} pessoas.`
              : `Montei a estimativa considerando o limite de ${capacityLimit} pessoas.`,
            adjustedAnswer
          ].join("\n\n"),
          knowledgeIds,
          operationalStatePatch: {
            lastQuote: {
              people: capacityLimit,
              meetingCount: adjustedQuoteData.occurrenceCount || null,
              hoursPerMeeting: adjustedQuoteData.durationHours || null,
              totalHours: adjustedQuoteData.occurrenceCount && adjustedQuoteData.durationHours
                ? adjustedQuoteData.occurrenceCount * adjustedQuoteData.durationHours
                : adjustedQuoteResult.requestedQuantity || null,
              recommendedOption: adjustedQuoteResult.recommended?.lines?.map((line: any) => line.name).join(" + ") || null,
              total: adjustedQuoteResult.recommended?.total ? Number(adjustedQuoteResult.recommended.total) : null
            },
            lastOfferType: "post_quote_menu",
            awaitingConfirmationFor: "post_quote_menu",
            lastQuestionKey: null,
            lastQuestionText: "Como deseja prosseguir?",
            quoteRevisionMode: null
          }
        };
      }
    }

    return {
      intencao: "consulta_valor",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: quoteResult.validationMessage || "Quantidade informada excede a capacidade cadastrada.",
      baseEncontrada: true,
      respostaSegura: true,
      acao: "pedir_confirmacao",
      motivo: "Calculador comercial bloqueou orcamento por capacidade.",
      resposta: [
        quoteResult.validationMessage || "A quantidade informada passa da capacidade cadastrada.",
        "Posso refazer a simulacao considerando o limite permitido?"
      ].join("\n\n"),
      knowledgeIds
    };
  }

  if (!quoteResult.ok) return null;

  const resposta = buildCommercialQuoteAnswer({
    quoteData,
    quoteResult,
    activeHistory,
    message
  });
  if (!resposta) return null;

  return {
    intencao: "consulta_valor",
    confianca: "alta",
    mensagemInterpretada: message,
    contexto: "Orcamento calculado por regras comerciais estruturadas.",
    baseEncontrada: true,
    respostaSegura: true,
    acao: "responder_com_base",
    motivo: reason,
    resposta,
    knowledgeIds,
    operationalStatePatch: {
      lastQuote: {
        people: quoteData.participantCount || null,
        meetingCount: quoteData.occurrenceCount || null,
        hoursPerMeeting: quoteData.durationHours || null,
        totalHours: quoteData.occurrenceCount && quoteData.durationHours
          ? quoteData.occurrenceCount * quoteData.durationHours
          : quoteResult.requestedQuantity || null,
        recommendedOption: quoteResult.recommended?.lines?.map((line: any) => line.name).join(" + ") || null,
        total: quoteResult.recommended?.total ? Number(quoteResult.recommended.total) : null
      },
      lastOfferType: "post_quote_menu",
      awaitingConfirmationFor: "post_quote_menu",
      lastQuestionKey: null,
      lastQuestionText: "Como deseja prosseguir?",
      quoteRevisionMode: null
    }
  };
};

const buildTotalHoursCommercialQuoteDecision = async ({
  ticket,
  aiSetting,
  message,
  totalHours,
  activeHistory,
  knowledgeIds,
  reason
}: {
  ticket: Ticket;
  aiSetting: AiSetting;
  message: string;
  totalHours: number;
  activeHistory: string;
  knowledgeIds?: number[];
  reason: string;
}): Promise<AiDecision | null> => {
  if (!totalHours || totalHours <= 0) return null;

  const participantCount = getParticipantCountFromContext(await BuildAiTicketContextTextService(ticket.id)) || undefined;
  const quoteResult = await CalculateCommercialQuoteService({
    aiSettingId: aiSetting.id,
    ticketId: ticket.id,
    contactId: ticket.contactId || undefined,
    pricingDimension: "hours",
    participantCount,
    quantity: totalHours,
    includeAlternatives: true
  });

  if (!quoteResult.ok || !quoteResult.recommended?.lines?.length) return null;

  const recommended = quoteResult.recommended;
  const lineText = formatCommercialCompositionLines(recommended.lines);
  const overageNote = buildShortOverageNote(recommended, totalHours);
  const specificCompositionRequested = /(?:\+|\bmais\b|\bjunto\b|\bsomando\b)/.test(normalizeText(message)) &&
    /\b(pacote|pacotes|plano|planos|bloco|blocos)\b/.test(normalizeText(message));
  const exactRequestedAlternative = specificCompositionRequested
    ? quoteResult.alternatives?.find((candidate: any) =>
        Number(candidate?.coveredQuantity) === totalHours &&
        Number(candidate?.overage || 0) === 0 &&
        Number(candidate?.total) > Number(recommended.total)
      )
    : null;
  const comparisonNote = exactRequestedAlternative
    ? [
        `A composicao que voce pediu tambem fecha ${totalHours}h: ${formatMoney(Number(exactRequestedAlternative.total))}.`,
        `Pela tabela, a opcao recomendada fica melhor: ${formatMoney(Number(recommended.total))}.`
      ].join("\n")
    : "";

  const correctionIntro = /\b(nao ha|to falando|estou falando|tou falando|tô falando)\b/i.test(normalizeText(message))
    ? "Você tem razão, vou considerar como total de horas, não como horas por encontro."
    : "Entendi, você quer simular pelo total de horas/pacotes.";

  const scenarioLines = [
    participantCount ? `👥 Pessoas: ${participantCount}` : "",
    "📅 Uso: total de horas informado",
    `⏱️ Total: ${totalHours}h`
  ].filter(Boolean).join("\n");

  const baseAnswer = [
    "📌 Orçamento estimado",
    correctionIntro,
    scenarioLines,
    comparisonNote,
    ["Melhor opção encontrada:", "", lineText].join("\n"),
    `Total estimado: ${formatMoney(Number(recommended.total))}`,
    overageNote,
    "Simulação informativa: este orçamento precisa ser validado por um atendente, assim como disponibilidade, reserva e condições finais."
  ].filter(Boolean).join("\n\n");
  const resposta = appendPostQuoteMenu(baseAnswer);

  return {
    intencao: "consulta_valor",
    confianca: "alta",
    mensagemInterpretada: message,
    contexto: "Cliente pediu orcamento por total de horas ou composicao de pacotes, nao por duracao de cada encontro.",
    baseEncontrada: true,
    respostaSegura: true,
    acao: "responder_com_base",
    motivo: reason,
    resposta,
    knowledgeIds,
    operationalStatePatch: {
      lastQuote: {
        people: participantCount || null,
        meetingCount: null,
        hoursPerMeeting: null,
        totalHours,
        recommendedOption: recommended.lines?.map((line: any) => line.name).join(" + ") || null,
        total: recommended.total ? Number(recommended.total) : null
      },
      lastOfferType: "post_quote_menu",
      awaitingConfirmationFor: "post_quote_menu",
      lastQuestionKey: null,
      lastQuestionText: "Como deseja prosseguir?",
      quoteRevisionMode: null
    }
  };
};

const buildIncludedItemsAnswerFromKnowledge = (knowledge = ""): string | null => {
  const includedItems = extractIncludedItemsFromKnowledge(knowledge);
  if (!includedItems.length) return null;

  return [
    "O que está incluso é o mesmo para qualquer opção/pacote:",
    "",
    "*Incluso:*",
    ...includedItems.map(item => `- ${item}`)
  ].join("\n");
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
  aiSetting,
  structuredContext,
  directedKnowledgeBaseQuery
}: {
  message: string;
  history: string;
  knowledge: string;
  ticket: Ticket;
  aiSetting: AiSetting;
  structuredContext?: string;
  directedKnowledgeBaseQuery?: string;
}): string => {
  const packageComparisonHint = buildHourlyPackageComparisonHint(structuredContext || "", knowledge);

  return [
  "Escreva a resposta final para o cliente em portugues do Brasil.",
  "Use linguagem natural, educada, objetiva e humana.",
  "Prefira respostas curtas, em estilo WhatsApp. Evite textos longos: normalmente use 2 a 6 linhas, salvo se o cliente pedir detalhes.",
  "Pode usar emojis com moderacao para deixar a conversa mais amigavel, no maximo 1 ou 2 por resposta. Use emojis simples como 🙂, ✅, 💰, 📌 ou 👍 quando fizer sentido.",
  "Para orcamentos, seja enxuto: informe o contexto em 1 linha, mostre a melhor opcao recomendada e finalize com uma pergunta simples. Nao liste opcoes empatadas ou mais caras se elas nao trazem vantagem real para o cliente.",
  "Em orcamentos, mostre a conta de forma transparente e nomeie o item da tabela antes da multiplicacao. Exemplos: 'pacote de 3h x 2 = R$ 210 x 2 = R$ 420', 'bloco de 2h x 3 = R$ 140 x 3 = R$ 420', 'turno de 5h x 2 = R$ 300 x 2 = R$ 600'. Evite escrever apenas '2 x 3h'.",
  "Nunca transforme o total solicitado em nome de pacote. Se a base nao listar pacote direto de 12h, 13h, 14h ou outro total, diga que e uma composicao e mostre os itens oficiais usados. Exemplo: 12h pode ser pacote 10h + bloco 2h, nao 'pacote de 12h'.",
  "Quando nao existir pacote/plano exato para o total solicitado, a resposta precisa explicar a composicao do orcamento: demanda real, itens oficiais usados, valores unitarios, soma, total final e saldo quando houver. Nao entregue apenas um total seco.",
  "Antes de comparar valores por tempo, calcule explicitamente a demanda real: horas por ocorrencia x quantidade de ocorrencias = total de horas. Exemplo: 3 horas em 3 dias diferentes = 3 x 3h = 9h no total.",
  "Em orcamento comum, mostre somente valores de tabela/brutos. Nao informe nem aplique descontos automaticamente.",
  "A IA nao deve calcular, prometer ou detalhar desconto. Se o cliente perguntar por desconto, promocao, negociacao, condicao melhor ou valor com desconto, encaminhe para atendente validar.",
  "Todo orcamento, cotacao ou simulacao precisa terminar com um aviso curto: 'Simulacao informativa: disponibilidade, reserva e condicoes finais precisam ser confirmadas por um atendente.'",
  "Quando o cliente perguntar 'o que eu tenho direito?', 'o que entra?', 'o que inclui?', 'o que esta incluso?' ou equivalente apos um orcamento, responda sobre itens inclusos/estrutura/beneficios do plano escolhido, nao repita o orcamento inteiro.",
  "No primeiro orcamento util da conversa, se a base tiver informacoes de inclusos, adicione um rodape 'Incluso:' com todos os itens inclusos cadastrados, em bullets curtos. Nao resuma para apenas alguns itens e nunca envie apenas 1 item se houver lista completa na base.",
  "Considere como conversa atual apenas o ciclo depois do ultimo encerramento/menu. Inclusos enviados em ciclos anteriores do mesmo ticket nao contam como ja enviados para o novo orcamento.",
  "Se o cliente pedir para recalcular, comparar, mudar quantidade, mudar horas, mudar dias ou usar outros valores na mesma conversa, nao repita o rodape de inclusos. Foque apenas na nova conta e no novo total.",
  "Nao use Markdown com dois asteriscos (**texto**). Se precisar destacar algo para WhatsApp, use no maximo asterisco simples (*texto*) ou deixe sem destaque.",
  "Nao explique todas as regras internas, descontos e modalidades de uma vez. Mostre so o que ajuda a decisao do cliente naquele momento.",
  "Nao comece toda resposta com 'Ola', 'Oi' ou apresentacao. Cumprimente/apresente-se apenas no primeiro contato ou quando fizer sentido. Em continuacao de conversa, responda direto ao ponto com tom cordial.",
  "O atendimento pode ser de qualquer ramo: vendas, suporte, clinica, escola, loja, oficina, servicos, delivery, imobiliaria, financeiro, cobranca, agendamento, promocao ou relacionamento.",
  "Adapte a resposta ao tipo de atendimento configurado, a mensagem do cliente e a base encontrada.",
  "Antes de recomendar um orcamento, compare internamente todas as opcoes cadastradas que possam atender ao pedido: plano direto, pacote direto, composicao de pacotes menores, bloco minimo, alternativa maior com saldo e opcao recorrente quando aplicavel.",
  "A recomendacao principal deve ser a opcao de menor valor final que cubra 100% da necessidade e respeite as regras da base. Se uma opcao maior for mais barata que a composicao mais proxima, ela pode ser recomendada, mas explique o saldo de forma curta.",
  "Nao espere o cliente pedir uma alternativa para considerar pacotes cadastrados. O cliente informa a necessidade; a comparacao das opcoes disponiveis e trabalho da IA.",
  "Se a base tiver valores conflitantes entre prompt, historico e conhecimento interno, use o valor oficial mais recente encontrado nas INFORMACOES INTERNAS ENCONTRADAS. Nao reaproveite valor antigo de mensagem anterior.",
  "Use somente as INFORMACOES INTERNAS ENCONTRADAS.",
  "Responda somente assuntos relacionados ao atendimento configurado e a base encontrada. Se o cliente perguntar curiosidade geral, roupa, esporte, produto externo, politica, celebridade, futebol ou qualquer tema fora do escopo, diga de forma educada que nao consegue ajudar com esse assunto por ali, que o foco e o atendimento da empresa/servico, e redirecione para valores, estrutura, reserva, suporte ou duvidas relacionadas. Nao responda com conhecimento geral e nao repita orcamento antigo.",
  "Nao copie a base literalmente quando puder explicar melhor. Reescreva de forma clara, humana e especifica para a pergunta do cliente.",
  "Responda usando somente o CONTEXTO AUTORIZADO DA BASE abaixo e resultados de ferramentas executadas pelo backend.",
  "Se a informacao solicitada nao estiver no CONTEXTO AUTORIZADO DA BASE, nao invente, nao complete por conhecimento geral e diga que precisa confirmar com a equipe.",
  "Para fatos da Salinha como pix, cartao, reserva, desconto, professor, mensalista, endereco, capacidade, tabela, valores, precos, itens inclusos e ar-condicionado, a resposta precisa estar explicitamente sustentada pelo contexto autorizado.",
  "Nao invente valores, prazos, links, telefones, regras, procedimentos ou nomes que nao estejam na base.",
  "Se o cliente pedir para simular usando um valor que nao existe na base, nao aceite o valor inventado. Diga que nao consegue simular fora da tabela cadastrada e informe o valor oficial mais proximo da base.",
  "Quando a base de conhecimento trouxer valores oficiais, eles tem prioridade sobre qualquer valor citado anteriormente no historico ou pela propria IA. Nao reutilize valor antigo se ele conflitar com a base encontrada.",
  "Se o cliente pedir explicacao de diferenca entre modalidades, explique o funcionamento antes de orcar: o que pode ser usado no mesmo dia, o que funciona como saldo, o que exige horas consecutivas e quando deve encaminhar para humano.",
  "Quando houver mais de uma composicao viavel na base, recomende uma opcao principal. Compare outras opcoes somente se o cliente pedir comparacao/diferenca, se houver duvida real entre modalidades, ou se a alternativa for mais barata/mais adequada. Nao mostre composicao empatada ou mais cara quando ja existe pacote direto que cobre exatamente a necessidade.",
  "Para dias/encontros diferentes, compare o cenario inteiro: opcoes consecutivas por encontro/dia versus pacotes flexiveis pelo total de horas.",
  "Se existir pacote flexivel direto que cobre exatamente o total solicitado em dias/encontros diferentes, recomende somente esse pacote. Nao liste opcoes consecutivas equivalentes, composicoes por soma, opcoes empatadas ou opcoes mais caras, salvo se o cliente pedir comparacao ou perguntar a diferenca. Exemplo: 3 dias de 5h = 15h; recomende pacote de 15h e nao mencione turno de 5h x 3 nem 10h + 5h.",
  "Diaria de 10h x quantidade de dias so deve aparecer se o cliente pedir mais horas consecutivas em cada dia; nao use diaria como comparacao principal quando existir pacote flexivel direto exato.",
  "Nunca trate diaria como saldo flexivel. Diaria e uso consecutivo no mesmo dia; pacote de horas e saldo flexivel para dias/horarios diferentes conforme disponibilidade.",
  "Nunca misture diaria/turno com pacotes flexiveis na mesma composicao. Se comparar modalidades, apresente linhas separadas: uso consecutivo por dia/encontro versus pacote/saldo flexivel.",
  "Se o cliente aceitou calcular no limite de capacidade, use esse limite nos proximos recalculos ate que ele informe outra quantidade valida dentro da capacidade.",
  "Nao confunda turno com diaria: turno de 5h e diaria de 10h podem ter valores diferentes na base; use exatamente os valores oficiais encontrados.",
  "Se a base trouxer uma matriz de simulacao, tabela de cenarios ou exemplos oficiais de calculo, use essa matriz como referencia principal antes de calcular por conta propria.",
  "Nao ofereca pacote menor do que a necessidade do cliente. A opcao recomendada precisa cobrir 100% das horas/itens solicitados.",
  "Nao ofereca pacote muito acima da necessidade como opcao principal. Pacote maior so entra como principal quando a sobra for de ate 2h ou quando for mais barato/empatado em relacao a composicao que cobre a necessidade com menos sobra. Acima de 2h excedentes, so mencione se o cliente pedir saldo, recorrencia, pacote maior ou uso futuro.",
  "Se o pacote for muito maior que a necessidade, responda com a melhor opcao avulsa/minima e, no maximo, diga curto que existem pacotes caso ele pretenda usar mais horas futuramente.",
  "Ao comparar pacotes de horas, use todos os pacotes cadastrados na base, como 2h, 3h, 5h, 10h, 15h e 20h quando existirem. Prefira o menor pacote direto que cubra a necessidade antes de compor varios blocos ou oferecer pacote maior.",
  "Quando existir uma matriz por total de horas flexiveis na base, consulte essa matriz antes de responder. Ela deve guiar combinacoes como 6h, 7h, 8h, 9h, 12h, 13h, 14h, 15h, 18h e 19h.",
  "Quando o total solicitado passar de 20h, nao reduza para 15h ou 20h se isso nao cobrir a necessidade. Consulte linhas como 21h a 25h na matriz e componha pacote 20h + menor pacote/bloco necessario.",
  "Quando der numero impar de horas, procure primeiro pacote direto de 3h, 5h ou 15h antes de subir para pacote maior. Se o pacote maior for mais barato e cobrir tudo, recomende o pacote maior explicando o saldo.",
  "A opcao principal de orcamento precisa cobrir 100% do que o cliente pediu e ficar proxima da necessidade real. Nao ofereca como principal uma opcao que cubra menos horas/itens nem uma opcao muito acima do pedido.",
  "Para pacotes maiores, use como criterio: so oferecer como principal se a sobra for pequena, ate 2h, ou se o pacote maior for mais barato/empatado do que a composicao exata/proxima. Fora disso, mencione pacote maior apenas se o cliente pedir saldo, recorrencia, pacote ou uso futuro.",
  "Quando o pacote maior nao for a melhor opcao, nao liste varias opcoes acima do pedido. Mostre a opcao recomendada e, no maximo, uma alternativa proxima ou economicamente justificada. Alternativa empatada sem beneficio pratico deve ser omitida.",
  "Se a base tiver pacote ou valor direto de 3h, nunca responda que nao existe pacote de 3 horas. Para 1 encontro de 3h, use o valor direto de 3h; para 2 encontros de 3h, compare 'pacote/periodo de 3h x 2 = R$ 210 x 2 = R$ 420' antes de oferecer pacote de 10h.",
  "Se o cliente pedir 6h e existir valor/pacote direto de 3h, prefira apresentar 'pacote/periodo de 3h x 2 = total correspondente'. Nao priorize 3 blocos de 2h quando 2 pacotes/periodos de 3h forem uma composicao cadastrada e equivalente.",
  "Se o total de horas nao fechar exatamente em um pacote, explique de forma simples: pacote pode deixar saldo para uso futuro; avulso pode compor blocos minimos; se faltar hora solta nao cadastrada, nao invente valor por hora e diga que o complemento exato precisa ser confirmado pela equipe.",
  "Nunca apresente como opcao viavel uma composicao que cubra menos horas do que o cliente pediu. Se o cliente pediu 9h, uma conta que cobre 8h ou 6h nao esta completa; diga que falta cobertura ou prefira pacote/plano que cubra o total.",
  "Se a base tiver bloco minimo, plano avulso minimo ou duracao minima, e o cliente pedir menos tempo que esse minimo, nao venda a hora menor isolada. Explique que o minimo cadastrado se aplica e calcule pelo menor bloco/plano permitido.",
  "Quando o uso for em dias/encontros separados, aplique o minimo por ocorrencia. Exemplo: se o menor avulso e bloco de 2h por R$ 140 e o cliente quer 2 encontros de 1h, calcule 2 blocos x R$ 140 = R$ 280; o cliente usa ate 2h em cada encontro. Nao diga que isso nao cobre tudo.",
  "Se o cliente corrigir a IA, como 'voce entendeu errado' ou 'sao dois encontros de 3 horas', aceite a correcao, peca desculpa brevemente e recalcule usando o dado corrigido. Nao repita o orcamento anterior.",
  "Pode explicar opcoes, sugerir proximos passos, listar possiveis causas, orientar uma triagem inicial, informar promocoes ou conduzir uma venda somente quando isso estiver sustentado pela base.",
  "Nao diga que consultou a base de conhecimento, banco de dados, RAG ou prompt.",
  "Nao escreva titulos como 'Base de Conhecimento', 'Manual', 'Artigo encontrado' ou 'Documento interno'. Esses blocos sao internos e nunca podem aparecer para o cliente.",
  "Nao cole o bloco interno da base na resposta. Extraia apenas a orientacao util e responda como atendente.",
  "Nao retorne JSON, markdown tecnico, tags internas ou explicacoes do sistema.",
  `Mensagem atual do cliente, que deve guiar a resposta: ${message}`,
  directedKnowledgeBaseQuery
    ? `Pergunta direcionada usada para consultar a base: ${directedKnowledgeBaseQuery}`
    : "",
  "Responda a mensagem atual, nao a pergunta anterior. Se o historico falar de outro assunto, use apenas para entender contexto, mas nao para escolher o tema da resposta.",
  "A mensagem atual tem prioridade sobre respostas anteriores. Se ela responder uma pergunta que a IA acabou de fazer, trate como continuidade e avance a conversa.",
  "Se o cliente escolher uma opcao textual como 'por hora', 'mensal', 'pacote', '10 horas' ou informar uma quantidade como '3 horas', use essa informacao para responder. Nao pergunte novamente a mesma coisa.",
  "Se a ultima pergunta da IA foi sobre quantidade de pessoas/participantes e o cliente respondeu apenas um numero, trate esse numero como quantidade de pessoas. Nao liste valores ainda; pergunte duracao e se sera em um unico encontro/dia ou em mais de um encontro.",
  "Para orcamento de sala, evento, servico por tempo, agenda ou uso recorrente, nao basta saber quantidade de pessoas. Antes de listar valores, colete separadamente: primeiro quantidade de ocorrencias/unidades do contexto, como aulas, reunioes, cursos, sessoes, consultas, encontros ou dias; depois duracao de cada ocorrencia, salvo se esses dados ja estiverem claros na mensagem atual ou no contexto estruturado.",
  "Uso recorrente/mensalista so deve ser tratado como recorrente quando o cliente pretende manter uma rotina semanal por no minimo 3 meses. Nao transforme isso em pergunta obrigatoria quando ja houver dados para orcar. Se o cliente sinalizar uso semanal/mensal, informe de forma curta que existem condicoes especiais para uso semanal por 3 meses ou mais; pergunte por quantos meses apenas se for necessario comparar mensalista.",
  "Quando enviar um orcamento para varios encontros/aulas, pode incluir uma observacao curta depois do valor: 'Para uso semanal por 3 meses ou mais, tambem existem condicoes especiais em planos mensalistas.' Nao envie essa frase como pergunta separada.",
  "Se o cliente informar 1 ou 2 meses, isso nao atende ao minimo de 3 meses para recorrente/mensalista. Nesse caso, nao ofereca mensalista nem pacote maior por saldo futuro; trate como datas/encontros especificos e use a matriz de horas/pacotes.",
  "Exemplo obrigatorio: 3 aulas, encontros ou dias de 5h = 15h no total. Mesmo se o cliente disser que sera por 2 meses, a recomendacao principal e pacote de 15h = R$ 900. Nao oferecer pacote 20h, porque fica acima da necessidade.",
  "Quando faltarem quantidade de dias/encontros e horas, nao pergunte tudo junto. Pergunte primeiro: unico dia/encontro ou mais de um; se for mais de um, quantos ao todo. Depois pergunte quantas horas tera cada dia/encontro.",
  "Se a ultima pergunta da IA pediu duracao, horas, quantidade de ocorrencias, encontros, aulas, reunioes, cursos, sessoes, consultas ou dias, e a mensagem atual trouxe esses dados, nao faca a mesma pergunta novamente. Use os dados atuais para calcular, responder, ou pedir apenas outro dado que ainda falte.",
  "Interprete respostas naturais e variadas do cliente como resposta a pergunta pendente. Exemplos: 'serao 4 dias para 6 horas cada', 'umas 6h por dia', 'de manha e tarde', '16 pessoas', 'recorrente' ou 'so um dia' podem responder a pergunta anterior mesmo sem repetir as mesmas palavras.",
  "Se a resposta trouxer duracao e quantidade de dias/encontros separados, como '3 horas em 3 dias diferentes', trate como 3 ocorrencias de 3h cada, totalizando 9h. Nao trate como 3h totais nem como diaria de um unico dia.",
  "Se a pergunta anterior pediu duracao e quantidade de ocorrencias/unidades, interprete respostas abreviadas como '3 de 4 horas', 'três de quatro horas', '3 aulas de 4 horas', 'três reuniões de quatro horas', '3 x 4h' ou 'três por quatro horas' como 3 ocorrencias da unidade em contexto, com 4 horas cada.",
  "Entenda sinonimos de uso em um dia: 'unico dia', 'so um dia', 'um dia apenas' significam 1 ocorrencia/dia. Se o cliente disser 'dia inteiro', 'o dia todo' ou 'diaria', trate como diaria quando a base tiver diaria cadastrada.",
  "Se o cliente disser apenas 'unico dia' e ainda nao informou horas nem dia inteiro, nao liste todas as opcoes. Pergunte curto: 'Nesse unico dia seria diaria/dia inteiro ou algumas horas?'.",
  "Se a mensagem estiver ambigua, com erro de digitacao que permita mais de uma leitura, ou se voce nao tiver certeza do dado informado, nao chute. Faca uma pergunta curta de confirmacao antes de calcular ou orientar.",
  "Para confirmar ambiguidade, seja especifico. Exemplo: 'So para confirmar: seriam 2 encontros de 3 horas cada?' ou 'Voce quis dizer 3 encontros de 4 horas cada?'.",
  "Nunca faca a mesma pergunta duas vezes seguidas se o cliente respondeu com um dado concreto. Se ainda faltar algo, reconheca o dado recebido e peca apenas o dado restante.",
  "Se o cliente pedir outro orcamento, outra cotacao, outro valor ou quantidade diferente sem informar os novos numeros/dados, nao reutilize nem invente dados do historico. Peca os novos dados de forma objetiva.",
  "Se o cliente trouxer novos dados para alterar um orcamento anterior, recalcule com os novos dados. Nao repita o orcamento antigo e nao trate a mudanca como contradicao; diga de forma natural que esta ajustando a simulacao.",
  "Em recalculo de orcamento na mesma conversa, nao repita inclusos/estrutura ja explicados antes, a menos que o cliente pergunte especificamente o que inclui.",
  "Se o cliente alterar apenas um dado, como quantidade de pessoas, itens, dias ou horas, aproveite os demais dados ja coletados no Estado vivo. Nao se apresente de novo e nao reinicie a qualificacao; no maximo confirme de forma curta se os demais dados continuam iguais.",
  "Se a base informar capacidade maxima, limite, disponibilidade, regra de elegibilidade ou restricao, compare com os dados atuais do cliente. Se o dado do cliente exceder o limite, avise claramente e nao passe orcamento como se fosse viavel.",
  "Se o estado vivo indicar que a resposta anterior foi rejeitada, a solução não funcionou, houve objeção ou o cliente mudou de cenário, não repita o mesmo caminho nem encerre. Reconheça o ponto do cliente e ofereça o próximo caminho sustentado pela base.",
  "Se a pergunta pedir calculo simples e a base trouxer o numero necessario, calcule o resultado e mostre a conta de forma curta. Exemplo: diaria de R$ 300 por 10 dias = R$ 3.000.",
  "Mesmo que a base antiga mencione desconto, nao calcule desconto nem mostre percentuais. Desconto/condicao especial exige atendimento humano.",
  "Se a base trouxer plano avulso de 2 horas por R$ 140 e o cliente pedir valor por hora, explique que o plano avulso cadastrado e de 2 horas por R$ 140. Se pedir 3h, 5h, 10h, 15h ou 20h e a base tiver pacote direto para essa quantidade, use o pacote direto; se nao houver pacote ou complemento cadastrado, nao invente valor por hora.",
  "Se o cliente pedir 1h, apenas 1 hora ou duracao menor que o bloco minimo cadastrado, calcule usando o bloco minimo da base. Para varias ocorrencias separadas, multiplique o bloco minimo pela quantidade de ocorrencias.",
  "Para comparacao de orcamento, mostre o total de horas primeiro e depois no maximo 2 opcoes realmente uteis: a recomendada e uma alternativa so se for mais barata, mais adequada ao uso, ou se o cliente pediu comparacao. Menor pacote direto exato vence composicoes empatadas. Pacote maior com saldo so quando sobrar ate 2h ou for financeiramente melhor/empatado. Mostre a soma com o item da tabela: pacote/bloco/turno/diaria x quantidade = valor unitario x quantidade = total.",
  "Para necessidades pequenas, como 1h, 2h, 3h, 5h ou poucos encontros curtos, normalmente mostre apenas o avulso/minimo ou o menor pacote direto cadastrado. Nao empurre pacote grande se o cliente nao demonstrou uso futuro.",
  "Turno/diaria consecutiva so deve ser comparado quando as horas forem no mesmo dia/periodo. Para dias, encontros, aulas ou reunioes diferentes, priorize regras de pacote nao consecutivo ou blocos por ocorrencia conforme a base.",
  "Se a pergunta atual for complemento da resposta anterior, use o historico recente para entender a continuidade. Exemplo: depois de informar diaria, 'e para 10 dias?' pede calculo com a diaria anterior.",
  "Se a pergunta for diferente da anterior, responda o novo assunto usando a base encontrada; nao repita resposta antiga.",
  "Se o cliente mudar de assunto, responda primeiro o novo assunto. Depois, se necessario, conecte com o que ja vinha sendo tratado.",
  ticket.lastAiMessage
    ? `Ultima resposta enviada pela IA, para evitar repeticao literal:\n${ticket.lastAiMessage}`
    : "",
  "Se sua resposta ficaria igual ou muito parecida com a ultima resposta da IA, gere uma resposta diferente e mais especifica para a mensagem atual.",
  "Se a base nao tiver informacao suficiente para responder, diga que vai encaminhar para um atendente.",
  `Estado do atendimento atual:\n${buildTicketStateText(ticket)}`,
  structuredContext ? `Estado vivo da conversa e memoria curta:\n${structuredContext}` : "",
  packageComparisonHint,
  "Quando responder uma duvida com seguranca, finalize com uma pergunta natural de checagem ou continuidade, curta e amigavel, sem repetir sempre a mesma frase.",
  "Nao inclua [FECHAR TICKET] na resposta de uma duvida recem respondida. O fechamento deve acontecer somente se o cliente confirmar depois que nao precisa de mais nada, ou pedir explicitamente para fechar.",
  aiSetting.name ? `Nome da IA, se precisar se apresentar: ${aiSetting.name}.` : "",
  aiSetting.companyName ? `Empresa ou servico: ${aiSetting.companyName}.` : "",
  `Historico recente:\n${history || "Sem historico."}`,
  knowledge,
  "Resposta final ao cliente:"
  ].filter(Boolean).join("\n\n");
};

const generateAnswerFromKnowledge = async ({
  aiSetting,
  ticket,
  message,
  contactName,
  history,
  knowledge,
  structuredContext,
  directedKnowledgeBaseQuery
}: {
  aiSetting: AiSetting;
  ticket: Ticket;
  message: string;
  contactName?: string;
  history: string;
  knowledge: string;
  structuredContext?: string;
  directedKnowledgeBaseQuery?: string;
}): Promise<string | null> => {
  if (!knowledge) return null;

  const activeHistory = getActiveConversationHistory(history);
  const includedKnowledge = await buildKnowledgeWithFullIncludedSource(knowledge);

  if (isIncludedItemsQuestion(message)) {
    const includedAnswer = buildIncludedItemsAnswerFromKnowledge(includedKnowledge);
    if (includedAnswer) return includedAnswer;
  }

  const directPackageAnswer = buildDirectHourlyPackageQuestionAnswer(message, includedKnowledge);
  if (directPackageAnswer) return directPackageAnswer;

  const answerPrompt = buildAnswerPrompt({
    message,
    history: activeHistory,
    knowledge,
    ticket,
    aiSetting,
    structuredContext,
    directedKnowledgeBaseQuery
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
        contextMessageCount: activeHistory.split("\n").filter(Boolean).length
      }
    });

    const cleaned = cleanCustomerAiAnswer(answer || "");
    const packageCorrectionContext = [
      message,
      activeHistory,
      structuredContext || "",
      includedKnowledge
    ].join("\n");
    const currentQuoteData = getCurrentQuoteDataFromContext(structuredContext || "");
    const correctedQuoteAnswer = shouldCorrectExact15hQuote(cleaned, packageCorrectionContext, currentQuoteData)
      ? buildCorrected15hQuoteAnswer(packageCorrectionContext, currentQuoteData)
      : cleaned;
    const professionalQuoteAnswer = shouldReplaceHourlyQuoteAnswer(correctedQuoteAnswer, currentQuoteData, includedKnowledge)
      ? buildProfessionalHourlyQuoteAnswer(currentQuoteData, includedKnowledge)
      : null;
    const correctedAnswer = professionalQuoteAnswer || correctedQuoteAnswer;
    const withoutRepeatedIncluded =
      historyHasIncludedSection(activeHistory) && !isIncludedItemsQuestion(message)
        ? stripIncludedSection(correctedAnswer)
        : correctedAnswer;
    const withIncludedFallback = appendIncludedSectionIfNeeded({
      answer: withoutRepeatedIncluded,
      knowledge: includedKnowledge,
      activeHistory,
      message
    });

    return stripRepeatedGreeting(withIncludedFallback, ticket, activeHistory, contactName) || null;
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
  articles,
  structuredContext,
  directedKnowledgeBaseQuery
}: {
  decision: AiDecision;
  aiSetting: AiSetting;
  ticket: Ticket;
  message: string;
  contactName?: string;
  history: string;
  knowledge: string;
  articles: KnowledgeFragment[];
  structuredContext?: string;
  directedKnowledgeBaseQuery?: string;
}): Promise<AiDecision> => {
  let generatedAnswer: string | null = null;
  const finalKnowledgeQuery = directedKnowledgeBaseQuery || BuildKnowledgeBaseQueryService({
    userMessage: message,
    detectedIntent: decision.intencao,
    history,
    structuredContext
  }).directedKnowledgeBaseQuery;

  try {
    generatedAnswer = await generateAnswerFromKnowledge({
      aiSetting,
      ticket,
      message,
      contactName,
      history,
      knowledge,
      structuredContext,
      directedKnowledgeBaseQuery: finalKnowledgeQuery
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
        userMessage: message,
        detectedIntent: decision.intencao,
        directedKnowledgeBaseQuery: finalKnowledgeQuery,
        action: "responder_com_base",
        retrievedChunks: articles.map(article => ({
          chunkId: article.chunkId || null,
          articleId: article.articleId || article.id,
          section: article.section || article.title,
          title: article.title,
          score: article.rank,
          contentPreview: article.fragment.slice(0, 200)
        })),
        grounded: articles.length > 0,
        usedOldFlow: false,
        finalAnswer: generatedAnswer.slice(0, 500)
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

const isBusinessCloseRequest = (message: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  return (
    /\b(fechar|finalizar|seguir|prosseguir|continuar|avancar|avancar)\b.{0,80}\b(negocio|reserva|agendamento|contrato|contratacao|contratacao|compra|pedido|pacote|plano|orcamento|orcamento|proposta)\b/.test(normalized) ||
    /\b(quero|queria|gostaria|vamos|bora|preciso|desejo)\b.{0,80}\b(fechar|finalizar|reservar|contratar|agendar)\b/.test(normalized)
  );
};

const isCriticalKnowledgeQuestion = (message = ""): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(pix|cartao|cartão|debito|débito|credito|crédito|reserva|reservar|desconto|professor|mensalista|endereco|endereço|onde|capacidade|cabe|pessoas|tabela|valores|precos|preços|incluso|inclui|ar condicionado|ar-condicionado|ar)\b/.test(normalized);
};

const shouldAnswerCurrentKnowledgeQuestionFirst = (intent?: string | null): boolean =>
  [
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
    "request_discount_rules",
    "out_of_scope",
    "inappropriate_message"
  ].includes(intent || "");

const buildCurrentKnowledgeQuestionDecision = (
  message: string,
  intent: string,
  articles: KnowledgeFragment[]
): AiDecision => ({
  intencao: intent || "pergunta_sobre_produto_ou_servico",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Pergunta atual identificada como assunto da base; responder esse assunto antes de qualquer fluxo pendente.",
  baseEncontrada: articles.length > 0,
  respostaSegura: articles.length > 0,
  acao: articles.length ? "responder_com_base" : "sem_resposta_segura",
  motivo: "RAG prioritario para a mensagem atual, com query direcionada e chunks recuperados antes da resposta.",
  resposta: articles.length
    ? undefined
    : "Nao encontrei essa informacao confirmada aqui. Posso encaminhar para a equipe verificar?",
  knowledgeIds: articles.map(article => article.id)
});

const isResponseRejectedRequest = (message: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  return (
    /\b(caro|cara|muito caro|ta caro|esta caro|pesado|fora do orcamento|nao cabe|nao da|nao consigo pagar|sem condicao|valor alto|preco alto)\b/.test(normalized) ||
    /\b(nenhuma|nenhum|nao gostei|nao me agradou|nao agradou|nao atende|nao serve|nao encaixa|nao gostei das opcoes)\b/.test(normalized) ||
    /\b(nao funcionou|nao resolveu|nao ajudou|continua com problema|continua igual|nao era isso|nao e isso|nao entendi|confuso|deu erro|falhou)\b/.test(normalized)
  );
};

const isShortQuoteRejection = (message: string, ticket: Ticket): boolean => {
  if (!isQuoteAnswer(ticket.lastAiMessage || "")) return false;

  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /^(nao|n|nao quero|n quero|nenhum|nenhuma|nao gostei|nao me agradou|nao serve)$/.test(normalized);
};

const buildShortQuoteRejectionDecision = (message: string): AiDecision => ({
  intencao: "cliente_nao_satisfeito",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente recusou a opcao apresentada no orcamento anterior.",
  baseEncontrada: false,
  respostaSegura: true,
  acao: "pedir_mais_informacoes",
  motivo: "Recusa curta apos orcamento; nao repetir a mesma proposta.",
  resposta: [
    "Tudo bem, sem problema.",
    "Posso ajustar a simulacao se voce quiser mudar quantidade de pessoas, dias/encontros ou horas.",
    "Se a ideia for reduzir custo, tambem posso recalcular com um formato menor."
  ].join("\n\n")
});

const isPriceObjection = (message: string): boolean => {
  const normalized = normalizeText(message);
  return /\b(caro|cara|muito caro|ta caro|esta caro|pesado|fora do orcamento|nao cabe|nao da|nao consigo pagar|valor alto|preco alto)\b/.test(normalized);
};

const buildPriceObjectionDecision = (message: string): AiDecision => ({
  intencao: "cliente_nao_satisfeito",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente achou o valor caro ou fora do orçamento.",
  baseEncontrada: true,
  respostaSegura: true,
  acao: "pedir_mais_informacoes",
  motivo: "Objeção de preço; contornar sem repetir a mesma proposta.",
  resposta: [
    "Entendo. O valor pode pesar dependendo do formato.",
    "Posso refazer a simulacao com outro cenario de uso, usando os valores cadastrados, se voce quiser comparar uma alternativa."
  ].join("\n\n")
});

const buildContextualPriceObjectionDecision = (message: string, history = ""): AiDecision => {
  const normalizedHistory = normalizeText(history);
  const priceObjectionCount = (
    normalizedHistory.match(/\b(caro|cara|muito caro|ta caro|esta caro|pesado|fora do orcamento|valor alto|preco alto)\b/g) || []
  ).length;

  if (priceObjectionCount <= 1) return buildPriceObjectionDecision(message);

  return {
    intencao: "cliente_nao_satisfeito",
    confianca: "alta",
    mensagemInterpretada: message,
    contexto: "Cliente repetiu objecao de preco; responder com alternativas objetivas.",
    baseEncontrada: true,
    respostaSegura: true,
    acao: "pedir_mais_informacoes",
    motivo: "Evitar repetir a mesma resposta quando a objecao de preco ja apareceu no historico.",
    resposta: [
      "Entendi. Para nao ficar repetindo a mesma proposta, posso ajustar a simulacao com outro cenario de uso.",
      "Se quiser recalcular, me diga o que voce quer mudar: quantidade de dias, horas ou formato de uso."
    ].join("\n\n")
  };
};

const isAskingForSmallerPackage = (message: string): boolean => {
  const normalized = normalizeText(message);
  return /\b(pacote|plano|opcao|valor|orcamento).{0,80}\b(menor|menos horas|mais barato|abaixo|reduzir)\b/.test(normalized) ||
    /\b(menor|menos horas|mais barato|abaixo|reduzir).{0,80}\b(pacote|plano|opcao|valor|orcamento)\b/.test(normalized);
};

const isDiscountQuestion = (message: string): boolean => {
  const normalized = normalizeText(message);
  return /\b(desconto|cupom|promocao|promo|condicao melhor|melhor valor|negociar|abatimento)\b/.test(normalized);
};

const buildDiscountAnswerDecision = (message: string): AiDecision => ({
  intencao: "promocao",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente perguntou sobre desconto apos ou durante simulacao comercial.",
  baseEncontrada: true,
  respostaSegura: true,
  acao: "responder_com_base",
  motivo: "Desconto/cupom nao deve ser calculado nem acionar handoff automatico; responder com tabela oficial.",
  resposta: [
    "Eu nao tenho cupom ou desconto cadastrado para aplicar por aqui.",
    "A simulacao que eu passo usa somente os valores oficiais da tabela.",
    "Posso refazer a simulacao com outro formato de uso, dentro dos valores cadastrados."
  ].join("\n\n")
});

const shouldAutoQuoteFromCurrentMessage = (message: string, ticket: Ticket): boolean => {
  if (isIncludedItemsQuestion(message)) return false;
  if (isDiscountQuestion(message)) return false;
  if (isAddressQuestion(message)) return false;
  if (isCapacityInfoQuestion(message) && !hasDurationOrOccurrenceDetail(message)) return false;
  if (isIdentityQuestion(message)) return false;
  if (isLoopingComplaint(message)) return false;
  if (isUnknownColorOrVisualQuestion(message)) return false;
  if (isPriceObjection(message)) return false;

  return (
    asksForValueOrSimulation(message) ||
    hasDurationOrOccurrenceDetail(message) ||
    changesParticipantCount(message) ||
    isHourQuestion(ticket.lastAiMessage || "")
  );
};

const buildSmallerPackageDecision = (message: string, quoteData: CurrentQuoteData): AiDecision => {
  const targetHours = quoteData.occurrenceCount && quoteData.durationHours
    ? quoteData.occurrenceCount * quoteData.durationHours
    : null;

  return {
    intencao: "consulta_valor",
    confianca: "alta",
    mensagemInterpretada: message,
    contexto: "Cliente perguntou por pacote/opcao menor apos um orcamento.",
    baseEncontrada: false,
    respostaSegura: true,
    acao: "pedir_mais_informacoes",
    motivo: "Nao oferecer pacote menor que a necessidade sem o cliente reduzir o escopo.",
    resposta: [
      targetHours
        ? `Para cobrir as ${targetHours}h informadas, eu nao devo indicar uma opcao com menos horas, porque ela deixaria parte da necessidade descoberta.`
        : "Eu posso verificar uma opcao menor, mas preciso garantir que ela cubra a necessidade real.",
      "Se voce quiser reduzir o valor, me diga qual ajuste faz sentido: diminuir a quantidade de dias/encontros, reduzir as horas de cada encontro ou simular outro formato."
    ].join("\n\n")
  };
};

const buildResponseRejectedDecision = (
  message: string,
  articles: KnowledgeFragment[]
): AiDecision => ({
  intencao: "cliente_nao_satisfeito",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente rejeitou a resposta anterior, indicou que a solucao nao funcionou, achou caro ou mudou o caminho esperado.",
  baseEncontrada: articles.length > 0,
  respostaSegura: true,
  acao: "responder_com_base",
  motivo: "Rejeicao/insatisfacao detectada; usar a base e o estado vivo para responder com empatia e ajustar o caminho.",
  knowledgeIds: articles.map(article => article.id)
});

const isOperationalHandoffRequest = (message: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  return (
    isBusinessCloseRequest(message) ||
    /\b(quero|queria|gostaria|posso|pode|vamos|bora|preciso|desejo|vou).{0,80}\b(reservar|reserva|agendar|agenda|fechar|finalizar|contratar|contratacao|pagar|pagamento|sinal|disponibilidade)\b/.test(normalized) ||
    /\b(seguir|prosseguir|continuar|avancar|avançar).{0,80}\b(com|para|pra).{0,40}\b(reserva|agendamento|contratacao|contratação|pagamento)\b/.test(normalized) ||
    /\b(reservar|agendar|fechar|contratar|pagar|disponibilidade)\b/.test(normalized)
  );
};

const isExplicitCloseRequest = (message: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;
  if (isBusinessCloseRequest(message)) return false;

  if (/\b(erro|problema|falha|nao consigo|n consigo|dificuldade)\s+(ao|para|pra|de)?\s*(fechar|finalizar|encerrar|concluir)\b/.test(normalized)) {
    return false;
  }

  const startsWithCloseVerb = /^(encerrar|encerra|finalizar|finaliza|fechar|fecha|concluir|conclui)\b/.test(normalized);
  const hasLikelyAttendanceWord = /\bat\w{4,14}\b/.test(normalized);
  if (startsWithCloseVerb && hasLikelyAttendanceWord) return true;

  return /^(encerrar|encerra|concluir|conclui|pode encerrar|pode finalizar|pode fechar|pode concluir|quero encerrar|quero concluir|encerra atendimento|encerrar atendimento|finaliza atendimento|finalizar atendimento|fecha atendimento|fechar atendimento|pode finalizar atendimento|pode fechar atendimento|quero finalizar atendimento|quero fechar atendimento)$/.test(normalized);
};

const isAmbiguousExitRequest = (message: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;
  if (isBusinessCloseRequest(message) || isExplicitCloseRequest(message)) return false;

  return /^(sair|sai|quero sair|queria sair|pode sair|vou sair|preciso sair|deixa eu sair|sair do atendimento|sair da conversa)$/.test(normalized);
};

const isUnofficialPriceSimulationRequest = (message: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s$,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  const asksSimulation =
    /\b(simula|simular|simulacao|faz|faca|calcula|calcular|orcamento|orca|cotacao|cota)\b/.test(normalized) ||
    /\b(como se fosse|custando|por apenas|por so|por somente|por)\b/.test(normalized);
  const mentionsCustomPrice =
    /r\$\s*\d/.test(normalized) ||
    /\b\d+(?:,\d{1,2})?\s*(?:reais|real)\b/.test(normalized);

  return asksSimulation && mentionsCustomPrice;
};

const buildUnofficialPriceSimulationDecision = (message: string): AiDecision => ({
  intencao: "simulacao_valor_inventado",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente pediu simulacao com valor diferente da tabela oficial.",
  baseEncontrada: true,
  respostaSegura: true,
  acao: "responder_com_base",
  motivo: "Guardrail local: nao usar valor inventado pelo cliente em simulacao comercial.",
  resposta: [
    "Entendi o que voce tentou simular, mas eu nao posso montar orcamento com valor fora da tabela cadastrada.",
    "Para te passar uma estimativa correta, preciso usar somente os valores oficiais.",
    "Posso recalcular com os valores reais ou comparar outra quantidade de horas?"
  ].join("\n\n")
});

const isExitConfirmationQuestion = (lastAiMessage = ""): boolean => {
  const normalized = normalizeText(lastAiMessage);
  return /\b(quer|deseja|confirma).{0,40}\b(encerrar|finalizar).{0,40}\b(atendimento|conversa)\b/.test(normalized) ||
    /\bse quiser encerrar\b.{0,80}\bresponda\b/.test(normalized);
};

const isAffirmativeExitConfirmation = (message: string, ticket: Ticket): boolean => {
  if (!isExitConfirmationQuestion(ticket.lastAiMessage || "")) return false;

  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return isAffirmativeShortAnswer(normalized) || /^(pode encerrar|pode finalizar|encerra|finaliza|isso|isso mesmo)$/.test(normalized);
};

const isNegativeExitConfirmation = (message: string, ticket: Ticket): boolean => {
  if (!isExitConfirmationQuestion(ticket.lastAiMessage || "")) return false;

  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /^(nao|n|nao quero|n quero|continuar|quero continuar|ainda nao|não|não quero)$/.test(normalized);
};

const shouldPreferKnowledgeFallback = (
  decision: AiDecision,
  message: string,
  articles: KnowledgeFragment[]
): boolean => {
  if (!articles.length) return false;
  if (isExplicitHumanRequest(message)) return false;
  if (decision.acao === "encaminhar_atendente" && isOperationalHandoffRequest(message)) return false;
  if (decision.acao === "encerrar_atendimento" || decision.acao === "nao_responder") return false;
  if (decision.acao === "pedir_confirmacao" && decision.perguntaConfirmacao && decision.opcoes?.length) return false;

  return (
    decision.acao === "sem_resposta_segura" ||
    decision.acao === "encaminhar_atendente" ||
    (decision.acao === "responder_com_base" && (!decision.respostaSegura || !decision.resposta))
  );
};

const responsePromisesImmediateHandoff = (value = ""): boolean => {
  const normalized = normalizeText(value);
  const promisesHandoff =
    /\b(vou|irei|vamos).{0,40}\b(encaminhar|transferir|passar).{0,80}\b(atendente|humano|equipe|pessoa|suporte)\b/.test(normalized) ||
    /\b(encaminharei|transferirei).{0,80}\b(atendente|humano|equipe|pessoa|suporte)\b/.test(normalized);

  const onlyOffersHandoff =
    /\b(posso|podemos|consigo).{0,40}\b(encaminhar|transferir|passar).{0,80}\b(atendente|humano|equipe|pessoa|suporte)\b/.test(normalized);

  return promisesHandoff && !onlyOffersHandoff;
};

const alignActionWithPromisedHandoff = (decision: AiDecision): AiDecision => {
  if (decision.acao === "encaminhar_atendente" || decision.acao === "encerrar_atendimento" || decision.acao === "nao_responder") {
    return decision;
  }
  if (!responsePromisesImmediateHandoff(decision.resposta || "")) return decision;

  return {
    ...decision,
    acao: "encaminhar_atendente",
    respostaSegura: false,
    motivo: [
      decision.motivo,
      "Correcao local: resposta prometeu encaminhamento imediato; executar handoff real."
    ].filter(Boolean).join(" | ")
  };
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
  if (isBusinessCloseRequest(message)) return false;

  const explicitClose =
    /\b(pode encerrar|pode sim encerrar|ja pode encerrar|quero encerrar|finaliza o atendimento|fechar atendimento|encerra o atendimento|encerrar atendimento|pode finalizar atendimento|pode fechar atendimento|quero finalizar atendimento|quero fechar atendimento)\b/.test(normalized) ||
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

  return false;

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

const isAffirmativeAnswerToProceedQuestion = (message: string, ticket: Ticket): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const last = normalizeText(ticket.lastAiMessage || "");

  if (!isAffirmativeShortAnswer(normalized) && !/^(quero|quero seguir|pode seguir|vamos seguir|bora|fechado|pode ser)$/.test(normalized)) {
    return false;
  }

  return /\b(gostaria|quer|queria|pode).{0,80}\b(seguir|fechar|reservar|dar continuidade|continuar).{0,80}\b(opcao|orçamento|orcamento|reserva|essa)\b/.test(last) ||
    /\bseguir com essa opcao\b/.test(last);
};

const lastAiOfferedHumanHandoff = (ticket: Ticket): boolean => {
  const last = normalizeText(ticket.lastAiMessage || "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    /\b(encaminhar|transferir|chamar|falar|avaliar|verificar)\b.{0,80}\b(atendente|humano|pessoa|equipe)\b/.test(last) ||
    /\b(atendente|humano|pessoa|equipe)\b.{0,80}\b(encaminhar|transferir|chamar|falar|avaliar|verificar)\b/.test(last)
  );
};

const isAffirmativeAnswerToHumanHandoffOffer = (message: string, ticket: Ticket): boolean => {
  if (!lastAiOfferedHumanHandoff(ticket)) return false;

  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return isAffirmativeShortAnswer(normalized) ||
    /^(quero|quero sim|pode|pode ser|pode sim|vamos|bora|ok|isso|isso mesmo|sim quero|faz|fazer|manda|mande)$/.test(normalized);
};

const buildAcceptedHumanHandoffDecision = (message: string): AiDecision => ({
  intencao: "pedido_atendente",
  confianca: "alta",
  mensagemInterpretada: message,
  contexto: "Cliente aceitou a oferta anterior de encaminhamento humano.",
  baseEncontrada: false,
  respostaSegura: false,
  acao: "encaminhar_atendente",
  motivo: "Resposta curta interpretada como aceite da oferta anterior de falar com atendente.",
  resposta: "Perfeito, vou encaminhar para a equipe continuar com voce."
});

const lastAiAskedForNewQuoteScenario = (ticket: Ticket): boolean => {
  const last = normalizeText(ticket.lastAiMessage || "");

  return /\b(refazer|recalcular|ajustar|fazer|montar)\b.{0,80}\b(simulacao|orcamento|cotacao|cenario)\b/.test(last) ||
    /\b(novo|nova|outro|outra|diferente)\b.{0,80}\b(simulacao|orcamento|cotacao|cenario)\b/.test(last) ||
    /\bme envie\b.{0,100}\b(novos dados|novo cenario|dados que voce quer simular)\b/.test(last);
};

const isAffirmativeAnswerToNewQuoteScenario = (message: string, ticket: Ticket): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!lastAiAskedForNewQuoteScenario(ticket)) return false;

  return isAffirmativeShortAnswer(normalized) ||
    /^(quero|quero sim|quero fazer|vamos|vamos fazer|bora|pode|pode ser|faz|fazer|sim pode|sim quero)$/.test(normalized);
};

const lastAiAskedSamePeopleForNewQuote = (ticket: Ticket): boolean => {
  const last = normalizeText(ticket.lastAiMessage || "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(novo|nova|refazer|recalcular|simulacao|orcamento|cenario)\b/.test(last) &&
    /\b(mesma|mesmo|manter|mantemos|continua)\b.{0,80}\b(quantidade|pessoas|participantes)\b/.test(last);
};

const lastAiAskedQuoteRevisionScope = (ticket: Ticket): boolean => {
  const last = normalizeText(ticket.lastAiMessage || "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /\b(quer|voce quer|o que|qual dado|qual ponto|me diga)\b.{0,120}\b(mudar|alterar|ajustar|trocar)\b.{0,120}\b(pessoas|dias|horas)\b/.test(last) ||
    /\b(pessoas|dias|horas)\b.{0,80}\b(orcamento|simulacao|cenario)\b/.test(last);
};

const getQuoteRevisionField = (message = ""): "participant_count" | "occurrences" | "duration" | "reset" | null => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/\b(do zero|zerar|recomecar|recomeçar|novo cenario|novo cenário|tudo|todos os dados)\b/.test(normalized)) return "reset";
  if (/\b(pessoas|participantes|alunos|clientes|convidados|quantidade)\b/.test(normalized)) return "participant_count";
  if (/\b(dias|dia|encontros|encontro|aulas|aula|reunioes|reuniao|quantos)\b/.test(normalized)) return "occurrences";
  if (/\b(horas|hora|duracao|duração|tempo)\b/.test(normalized)) return "duration";

  return null;
};

const buildQuoteRevisionScopeDecision = (
  message: string,
  structuredContext = ""
): AiDecision => {
  const currentQuoteData = getCurrentQuoteDataFromContext(structuredContext);
  const hasPreviousQuote = currentQuoteData.participantCount !== null ||
    currentQuoteData.occurrenceCount !== null ||
    currentQuoteData.durationHours !== null;
  const summaryParts = [
    currentQuoteData.participantCount ? `${currentQuoteData.participantCount} pessoas` : "",
    currentQuoteData.occurrenceCount && currentQuoteData.durationHours
      ? `${currentQuoteData.occurrenceCount} dias/encontros de ${currentQuoteData.durationHours}h`
      : ""
  ].filter(Boolean);

  return {
    intencao: "consulta_valor",
    confianca: "alta",
    mensagemInterpretada: message,
    contexto: "Cliente quer revisar/refazer orcamento; iniciar revisao sem repetir resposta generica.",
    baseEncontrada: false,
    respostaSegura: true,
    acao: "pedir_mais_informacoes",
    motivo: "Revisao de orcamento deve perguntar o campo a alterar e bloquear loop de resposta generica.",
    resposta: hasPreviousQuote
      ? [
          summaryParts.length
            ? `Claro. No orcamento anterior considerei ${summaryParts.join(", ")}.`
            : "Claro. Vamos ajustar o orcamento anterior.",
          "O que voce quer mudar: pessoas, dias ou horas?"
        ].join("\n\n")
      : [
          "Claro, vamos montar um novo orcamento.",
          "Para quantas pessoas seria?"
        ].join("\n\n")
  };
};

const buildQuoteRevisionFieldQuestionDecision = (
  message: string,
  field: "participant_count" | "occurrences" | "duration" | "reset"
): AiDecision => {
  const responses = {
    participant_count: "Perfeito. Para quantas pessoas devo recalcular?",
    occurrences: "Perfeito. Quantos dias/encontros serao ao todo agora?",
    duration: "Perfeito. Quantas horas tera cada dia/encontro agora?",
    reset: "Perfeito, vamos refazer do zero. Para quantas pessoas seria?"
  };

  return {
    intencao: "consulta_valor",
    confianca: "alta",
    mensagemInterpretada: message,
    contexto: "Cliente escolheu qual dado quer alterar na revisao do orcamento.",
    baseEncontrada: false,
    respostaSegura: true,
    acao: "pedir_mais_informacoes",
    motivo: "Resposta curta interpretada pela pergunta anterior sobre revisao de orcamento.",
    resposta: responses[field]
  };
};

const buildNewQuoteDetailsRequestDecision = (
  message: string,
  structuredContext = ""
): AiDecision => {
  const currentQuoteData = getCurrentQuoteDataFromContext(structuredContext);
  const hasQuoteContext = currentQuoteData.participantCount !== null ||
    currentQuoteData.occurrenceCount !== null ||
    currentQuoteData.durationHours !== null;

  if (!hasQuoteContext) {
    return {
      intencao: "consulta_valor",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente pediu orcamento/valor sem dados suficientes.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Coleta objetiva de dados para calculadora oficial.",
      resposta: "Para quantas pessoas?",
      operationalStatePatch: {
        lastQuestionKey: "people",
        lastQuestionText: "Para quantas pessoas?"
      }
    };
  }

  return buildQuoteRevisionScopeDecision(message, structuredContext);
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
  pendingOptions,
  structuredContext
}: {
  message: string;
  history: string;
  knowledge: string;
  aiSetting: AiSetting;
  ticket: Ticket;
  queue: Queue | null;
  pendingOptions: AiDecisionOption[];
  structuredContext: string;
}): string => {
  const pendingQuestion = pendingOptions.length
    ? `Existe uma pergunta pendente da IA. Opcoes: ${JSON.stringify(pendingOptions)}. Interprete a resposta do cliente considerando essas opcoes.`
    : "Nao existe pergunta pendente da IA.";

  return [
    "Voce e uma camada de decisao de atendimento com IA para qualquer ramo de negocio. Nao responda em texto livre fora do JSON.",
    "O atendimento pode ser de vendas, suporte, comercial, clinica, escola, oficina, loja, servicos, delivery, imobiliaria, financeiro, cobranca, agendamento, promocao ou relacionamento.",
    "Nao limite sua interpretacao a suporte tecnico. Identifique a intencao conforme a configuracao, o historico do ticket atual, a ultima mensagem da IA e a base de conhecimento.",
    "Nao assuma que o atendimento e de suporte tecnico, comercial, clinica, escola, loja ou qualquer ramo especifico sem isso estar configurado ou na base.",
    "Regra central: nao travar a conversa; trave somente decisoes criticas.",
    "Decisoes criticas incluem preco, desconto, cupom, reserva, disponibilidade, capacidade, encerramento, transferencia, escopo e tentativa de burla. Para elas, use base, ferramenta, backend ou confirmacao segura.",
    "Nao transforme exemplos de frase em regras literais. Eles indicam intencao semantica. Interprete sinonimos, respostas indiretas, erros de digitacao e mudancas de decisao pelo contexto recente.",
    "Evite fluxo com cara de formulario: se os dados ja existem, avance. Se faltar algo, faca uma pergunta curta e especifica. Se o cliente mudou de assunto, responda o novo contexto sem repetir a pergunta anterior.",
    `Nome da IA: ${aiSetting.name || "Assistente Virtual"}.`,
    aiSetting.companyName ? `Empresa ou servico: ${aiSetting.companyName}.` : "",
    aiSetting.serviceType ? `Tipo de atendimento: ${aiSetting.serviceType}.` : "",
    aiSetting.behaviorPrompt ? `Comportamento configurado:\n${aiSetting.behaviorPrompt}` : "",
    aiSetting.systemPrompt ? `Instrucoes adicionais:\n${aiSetting.systemPrompt}` : "",
    "Analise contexto, erros de digitacao, abreviacoes, historico recente, estado atual do ticket e a base de conhecimento.",
    "Use somente o historico mostrado deste ticket atual. Nunca suponha mensagens de atendimentos anteriores do mesmo contato.",
    "Diferencie CLIENTE, IA, ATENDENTE HUMANO e SISTEMA. Mensagens de SISTEMA/URA servem como estado, nao como pedido do cliente.",
    "Use a memoria curta estruturada como fonte de estado do atendimento. Ela indica dados ja coletados, dados faltantes, pergunta pendente e se a mensagem atual respondeu algo que a IA perguntou.",
    "Trate o Estado vivo da conversa como um briefing humano do atendimento atual, nao como roteiro engessado. A resposta deve acompanhar a mensagem atual do cliente, inclusive quando ele mudar de ideia, rejeitar opcoes ou perguntar outra coisa.",
    "Se a memoria estruturada disser que a mensagem atual respondeu a pergunta pendente, e proibido repetir a mesma pergunta. Reconheca o dado recebido e avance para responder, calcular, transferir, encerrar ou perguntar somente o que ainda falta.",
    "A memoria estruturada e generica: vale para orcamento, pagamento, desconto, fotos, reserva, suporte, encerramento, atendimento humano e qualquer outro contexto.",
    "Se o estado vivo indicar rejeicao da resposta anterior, solucao que nao funcionou, objecao, preco alto, nenhuma opcao agradou ou mudanca de cenario, nao siga o roteiro anterior. Contorne com empatia, entenda o que pesou ou falhou, responda o novo contexto e proponha alternativa possivel pela base.",
    "Se o cliente alterar apenas um dado da simulacao/diagnostico, como quantidade de pessoas, itens, dias, horas, data ou prioridade, aproveite os demais dados ja coletados e nao reinicie a conversa. Se necessario, confirme em uma frase se o restante continua igual.",
    "Se o cliente corrigir a IA com frases como 'voce entendeu errado', 'nao foi isso', 'sao dois encontros de 3 horas' ou equivalente, trate como correcao de dados e use responder_com_base quando houver base para recalcular. Nao encaminhe nem repita a pergunta anterior.",
    "Se a base informar limite, capacidade maxima, disponibilidade, regra de elegibilidade ou restricao, compare com os dados atuais. Se exceder, avise o limite e sugira ajuste ou atendimento humano; nao calcule como se fosse permitido.",
    "Use o estado do atendimento para interpretar respostas curtas. Se a ultima pergunta foi 'Consegui te ajudar?' ou uma checagem de satisfacao e o cliente respondeu 'sim', 'certo', 'obrigado' ou 'deu certo', a intencao e encerramento. Se respondeu 'nao' ou 'nao resolveu', a intencao e encaminhar_atendente.",
    "Se a ultima pergunta foi 'Posso ajudar em algo mais?' e o cliente respondeu 'nao', 'nao obrigado' ou 'era so isso', a intencao e encerramento. Se respondeu 'sim', a intencao e continuar pedindo mais detalhes.",
    "Se a IA ofereceu detalhes de planos, pacotes, produtos, servicos ou alternativas e o cliente respondeu apenas 'nao', 'nao obrigado', 'sem interesse', 'era so isso' ou equivalente, nao repita a mesma oferta. Interprete como recusa daquela oferta. Se a informacao principal ja foi entregue, use encerrar_atendimento; se o cliente demonstrou frustracao, preco alto, duvida nao resolvida ou quer negociar, use encaminhar_atendente.",
    "Se o cliente pedir disponibilidade, reserva, agenda, visita, pagamento, fechamento, negociacao, desconto fora da regra ou quiser seguir/contratar, nao finalize o atendimento automaticamente. Responda brevemente que essa etapa precisa ser confirmada por uma pessoa e use encaminhar_atendente quando houver fila humana/configuracao disponivel.",
    "Se a ultima resposta da IA perguntou se o cliente quer seguir com uma opcao/orcamento e o cliente respondeu 'sim', 'quero', 'quero seguir', 'pode ser' ou equivalente, nao repita o orcamento. Trate como confirmacao para seguir e use encaminhar_atendente.",
    "Se o cliente pedir explicitamente 'falar com atendente', 'humano', 'pessoa', 'quero fechar', 'quero reservar', 'qual disponibilidade', 'pode me chamar no atendimento', use encaminhar_atendente, salvo se existir ferramenta configurada e permitida para executar a acao.",
    "Quando o cliente disser 'quero fechar', 'fechar negocio', 'fechar reserva', 'fechar pacote', 'seguir com a reserva' ou equivalente comercial, isso significa fechar compra/reserva, nao encerrar o ticket.",
    "Se o cliente disser apenas 'sair', 'quero sair', 'vou sair' ou equivalente, isso e um possivel encerramento ambiguo. Use pedir_confirmacao perguntando se ele quer encerrar o atendimento; so encerre depois da confirmacao.",
    "Evite looping: se a resposta que voce pretende enviar for parecida com a ultima resposta da IA, mude de acao. Para negativa curta apos oferta, encerre ou encaminhe; para pergunta nova, responda a pergunta nova; para duvida nao resolvida, encaminhe.",
    "Se a ultima pergunta foi diagnostica, como 'o erro acontece ao finalizar?', respostas como 'sim' ou 'nao' nao significam encerramento; continue o diagnostico.",
    "Se a ultima pergunta foi sobre quantidade de pessoas/participantes e o cliente respondeu apenas um numero, esse numero e a quantidade de pessoas. A proxima etapa e perguntar se sera em um unico dia/encontro ou em mais de um; se for mais de um, quantos ao todo. Nao liste valores ainda.",
    "Antes de enviar orcamento de qualquer servico que dependa de tempo, uso, agenda, ocorrencias, aulas, reunioes, cursos, sessoes, consultas, encontros, dias ou recorrencia, confirme os dados minimos: quantidade de pessoas/unidades quando aplicavel, quantidade de ocorrencias/unidades de agenda e duracao de cada ocorrencia. Se faltarem quantidade de ocorrencias e duracao, pergunte primeiro a quantidade de ocorrencias; depois as horas por ocorrencia.",
    "Uso recorrente/mensalista exige rotina semanal por no minimo 3 meses. Nao transforme isso em pergunta obrigatoria quando ja houver dados para orcar. Se o cliente sinalizar uso semanal/mensal, informe de forma curta que existem condicoes especiais para uso semanal por 3 meses ou mais; pergunte por quantos meses apenas se for necessario comparar mensalista.",
    "Quando enviar um orcamento para varios encontros/aulas, pode incluir uma observacao curta depois do valor: 'Para uso semanal por 3 meses ou mais, tambem existem condicoes especiais em planos mensalistas.' Nao envie essa frase como pergunta separada.",
    "Se o cliente informar 1 ou 2 meses, isso nao atende ao minimo de 3 meses para recorrente/mensalista. Trate como datas/encontros especificos; nao ofereca mensalista nem pacote maior por saldo futuro.",
    "Exemplo obrigatorio: 3 aulas, encontros ou dias de 5h = 15h no total. Mesmo se o cliente disser que sera por 2 meses, recomende pacote de 15h = R$ 900 e nao pacote 20h.",
    "Se a ultima pergunta foi sobre duracao, horas, dias, encontros, aulas, reunioes, cursos, sessoes ou consultas e a mensagem atual respondeu com esses dados, nao repita essa pergunta. Avance para resposta com base ou peca somente o proximo dado realmente ausente.",
    "Sempre avalie se a mensagem atual responde a pergunta pendente de forma indireta, abreviada ou com erro de digitacao. Nao exija que o cliente use as mesmas palavras da pergunta.",
    "Se a pergunta anterior pediu duracao e quantidade de ocorrencias/unidades, respostas abreviadas como '3 de 4 horas', 'três de quatro horas', '3 aulas de 4 horas', 'três reuniões de quatro horas', '3 x 4h' ou 'três por quatro horas' significam 3 ocorrencias da unidade em contexto, com 4 horas cada.",
    "Entenda sinonimos de uso em um dia: 'unico dia', 'so um dia', 'um dia apenas' significam 1 ocorrencia/dia. Se ainda faltar duracao, pergunte se sera diaria/dia inteiro ou algumas horas.",
    "Se o cliente disser 'dia inteiro', 'o dia todo' ou 'diaria', e a base tiver diaria cadastrada, trate como diaria em vez de pedir a mesma informacao novamente.",
    "Se a mensagem atual estiver ambigua, truncada, com erro de digitacao relevante ou permitir mais de uma leitura, nao chute e nao calcule. Use pedir_confirmacao ou pedir_mais_informacoes com uma pergunta curta e especifica.",
    "Quando confirmar ambiguidade, proponha a leitura mais provavel. Exemplo: 'So para confirmar: seriam 2 encontros de 3 horas cada?'",
    "Se for pedir_mais_informacoes depois de uma resposta do cliente, a pergunta nova deve ser diferente da ultima pergunta da IA. Reconheca explicitamente o dado recebido antes de pedir outro dado.",
    "Se a ultima pergunta foi escolher uma opcao e o cliente disse '2' ou o nome da opcao, a intencao e confirmacao_opcao.",
    "REGRA DE ESCOPO: quando a base de conhecimento relevante tiver artigos, considere que o assunto faz parte do escopo do atendimento, mesmo que o nome da empresa, fila ou tipo de atendimento pareca diferente.",
    "A base de conhecimento encontrada tem prioridade sobre qualquer suposicao pelo nome da empresa, nome da fila ou tipo de atendimento.",
    "Se houver artigo relevante na base, nunca diga que o assunto nao parece relacionado ao atendimento antes de avaliar o conteudo do artigo.",
    "A IA nao pode inventar valores, prazos, links, telefones, regras, procedimentos ou nomes que nao estejam na base.",
    "Se o cliente pedir simulacao com valor informado por ele que conflita com a tabela/base, nao use esse valor. Use responder_com_base para explicar que a simulacao so pode usar valores oficiais cadastrados.",
    "Se o cliente perguntar assunto fora do escopo do atendimento e da base, como camisa de time, futebol, politica, celebridade, receita, roupa, curiosidade geral ou produto externo, use sem_resposta_segura com resposta curta e educada: diga que nao consegue ajudar com esse assunto por ali, que o foco e o atendimento da empresa/servico, e redirecione para valores, estrutura, reserva, suporte ou duvidas relacionadas. Nao responda usando conhecimento geral e nao repita orcamento antigo.",
    "Pode responder perguntas sobre quem e a IA, qual seu papel, ou explicar uma resposta anterior usando o perfil configurado e o historico da conversa.",
    "Pode conversar de forma natural e humanizada, mas sem criar informacoes comerciais, tecnicas, promocionais, financeiras, medicas, juridicas ou operacionais fora da base.",
    "Elogios, brincadeiras leves, flertes leves, mensagens invasivas, mensagens sexuais, ofensas e reclamacoes devem ser tratados por diretriz de comportamento, nunca por frase pronta.",
    "Para elogio ou brincadeira leve: acolha com simpatia e humor discreto quando couber, sem prolongar conversa pessoal, e redirecione naturalmente para o atendimento.",
    "Para flerte leve: seja cordial e leve, mas nao alimente romance, nao prolongue assunto pessoal e retome o foco da Salinha Meier.",
    "Para mensagem sexual, invasiva ou constrangedora: nao responda ao conteudo; estabeleca limite educado, sem piada sexual e sem agressividade, e retome o atendimento.",
    "Para ofensa ou grosseria: nao revide, nao ironize, mantenha postura profissional e tente retomar a conversa objetivamente.",
    "Para reclamacao seria sobre atendimento, pagamento, reserva, sala ou experiencia ruim: nao use humor; responda com seriedade, empatia e encaminhe quando necessario.",
    "Nao copie exemplos literalmente e nao use uma frase fixa para esses tratamentos. A resposta deve soar contextual e humana.",
    "Pode vender, orientar, sugerir possiveis causas, explicar promocao, informar preco, conduzir agendamento, acompanhar pedido ou tirar duvidas somente quando houver base suficiente.",
    "Pode fazer calculos simples quando a base trouxer os dados numericos necessarios, como diaria x quantidade de dias, valor unitario x unidades ou soma simples.",
    "Se o cliente perguntar 'o que tenho direito?', 'o que entra?', 'o que inclui?', 'o que esta incluso?' ou equivalente, interprete como pergunta sobre inclusos/estrutura/beneficios do servico ou plano. Use responder_com_base se houver base.",
    "Em orcamentos, a resposta final deve mostrar a composicao da soma nomeando o item da tabela: 'pacote de 3h x 2 = R$ 210 x 2 = R$ 420', 'bloco de 2h x 3 = R$ 140 x 3 = R$ 420'.",
    "Organize orcamentos para leitura em celular: blocos curtos, espaco entre secoes, calculo claro, total destacado e uma explicacao curta do melhor custo-beneficio quando a opcao tiver sido comparada.",
    "Em orcamentos comuns, nao informe desconto. Se o cliente perguntar por desconto, promocao, condicao ou valor com desconto, encaminhe para atendente; nao calcule.",
    "Se o cliente apenas disser que achou caro, pesado ou fora do orcamento, nao ofereca negociacao, desconto ou condicao especial de cara. Ofereca recalcular outro cenario dentro da tabela.",
    "Todo orcamento, cotacao ou simulacao deve avisar que e informativo e precisa ser validado por atendente para disponibilidade, reserva e condicoes finais.",
    "Quando o cliente pedir comparacao, pacote, avulso, completar horas, saldo ou melhor custo, use responder_com_base se a base trouxer valores. Compare apenas opcoes realmente uteis: mais barata, mais adequada ao uso, ou pedida explicitamente pelo cliente. Nao liste composicao empatada ou mais cara se ja houver pacote direto que cobre exatamente a necessidade.",
    "Para servicos por hora, calcule o total de horas e recomende a melhor opcao. Compare blocos avulsos, pacote com saldo, diaria/turno quando forem consecutivos somente quando isso mudar a decisao, reduzir custo ou responder pedido de comparacao. Se a base nao tiver hora solta para complemento, nao invente; explique que o complemento precisa ser confirmado.",
    "Orcamento, cotacao, estimativa e calculo de valor com dados da base sao respostas informativas e podem ser enviados ao cliente. Isso nao e confirmacao de reserva, agenda, pagamento ou contratacao.",
    "So encaminhe para atendente quando o cliente pedir para reservar, fechar, pagar, confirmar agenda, negociar fora das regras, falar com humano, ou quando faltar dado essencial que a base nao permita calcular.",
    "Se o cliente pedir outro orcamento, nova simulacao, quantidade diferente ou comparar cenarios, mas nao informar os novos numeros/dados, use pedir_mais_informacoes. Nao invente quantidade, horas, itens, dias, encontros ou unidades.",
    "Se o cliente informar novos dados para alterar um orcamento anterior, recalcule com os novos dados e diga que esta ajustando a simulacao. Nao fique preso ao primeiro orcamento.",
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
    "Se o cliente pedir para encerrar/finalizar o atendimento, disser que era so isso, nao quer mais nada, tudo certo ou resolveu, use encerrar_atendimento. Se disser apenas que quer fechar reserva/negocio/pacote, use encaminhar_atendente.",
    "Se o cliente disser que nao resolveu ou ainda tem problema, use encaminhar_atendente.",
    "Quando estiver respondendo uma duvida com base, nao encerre no mesmo turno. Responda e pergunte se pode ajudar em algo mais.",
    "So use encerrar_atendimento quando a mensagem atual do cliente indicar encerramento, satisfacao final ou resposta negativa a uma pergunta anterior como 'Posso ajudar em algo mais?'.",
    "Quando decidir encerrar o atendimento, inclua obrigatoriamente [FECHAR TICKET] no final do campo resposta.",
    "Intencoes validas: consulta_valor, interesse_compra, promocao, pedido_atendente, pedido_encerramento, cliente_satisfeito, cliente_nao_satisfeito, pergunta_sobre_produto_ou_servico, agendamento, acompanhamento, reclamacao, diagnostico_inicial, cobranca, financeiro, sem_resposta_segura, confirmacao_opcao.",
    `Ferramentas permitidas para esta IA: ${parseAllowedTools(aiSetting.allowedTools).join(", ") || "nenhuma"}.`,
    "A IA pode pedir ferramenta somente quando ela estiver listada como permitida. O backend valida e executa; nunca confirme ferramenta antes do retorno do backend.",
    "Ferramentas disponiveis: registrarLead, gerarResumoParaAtendente, calcularOrcamento, transferirParaFila, encerrarAtendimento.",
    "Para calcular orcamento estruturado, transferir fila, encerrar, registrar lead ou gerar resumo ao atendente, use acao executar_ferramenta com ferramenta e parametrosFerramenta.",
    "Quando usar calcularOrcamento, envie parametrosFerramenta com commercialServiceId quando souber, pricingDimension, participantCount, occurrenceCount, durationPerOccurrence, quantity, preferredMode e includeAlternatives conforme o contexto. A ferramenta calcula; a IA nao deve inventar valores.",
    "Ferramentas de agenda estao temporariamente desativadas. Se o cliente pedir disponibilidade, reserva ou agendamento, encaminhe para atendente/equipe humana quando houver fila configurada.",
    "Para transferir fila, informe queueId.",
    "Acoes validas: responder_com_base, pedir_confirmacao, pedir_mais_informacoes, encaminhar_atendente, encerrar_atendimento, executar_ferramenta, sem_resposta_segura, nao_responder.",
    "Quando acao for responder_com_base, preencha resposta com uma resposta curta, objetiva e baseada somente na base.",
    "Quando acao for pedir_confirmacao, preencha perguntaConfirmacao e opcoes com numero e valor.",
    "Quando acao for pedir_mais_informacoes, preencha resposta com a pergunta de qualificacao que sera enviada ao cliente.",
    "Nunca use chaves response_type ou response_value. O texto para o cliente deve ficar sempre no campo resposta.",
    "Retorne somente JSON valido, sem markdown, sem saudacao fora do JSON e sem texto antes ou depois do JSON. O primeiro caractere da resposta deve ser { e o ultimo deve ser }.",
    `Configuracao da IA: ${aiSetting.name}`,
    `Fila atual: ${queue?.name || "sem fila"}`,
    `Ticket aiActive: ${ticket.aiActive ? "true" : "false"}`,
    `Estado do atendimento atual:\n${buildTicketStateText(ticket)}`,
    structuredContext ? `Memoria curta estruturada deste ticket:\n${structuredContext}` : "Memoria curta estruturada deste ticket: ainda nao registrada.",
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
  "opcoes": [{"numero":"1","valor":"Plano mensal"}],
  "ferramenta": "registrarLead",
  "parametrosFerramenta": {"queueId": 1, "start": "2026-06-07T14:00:00-03:00", "end": "2026-06-07T15:00:00-03:00"}
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

  if (isAffirmativeExitConfirmation(message, ticket)) {
    return {
      intencao: "pedido_encerramento",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente confirmou que quer encerrar apos pergunta de confirmacao.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "encerrar_atendimento",
      motivo: "Confirmacao positiva de encerramento.",
      resposta: "Perfeito! Vou finalizar seu atendimento. Se precisar novamente, e so chamar. [FECHAR TICKET]"
    };
  }

  if (isNegativeExitConfirmation(message, ticket)) {
    return {
      intencao: "cliente_quer_continuar",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente negou encerramento apos pergunta de confirmacao.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Confirmacao negativa de encerramento.",
      resposta: "Tudo bem, seguimos por aqui. Como posso te ajudar?"
    };
  }

  if (isAmbiguousExitRequest(message)) {
    return {
      intencao: "possivel_pedido_encerramento",
      confianca: "media",
      mensagemInterpretada: message,
      contexto: "Cliente usou termo de saida ambíguo; confirmar antes de encerrar.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_confirmacao",
      motivo: "Termo como 'sair' pode significar encerramento, mas exige confirmacao.",
      perguntaConfirmacao: "Voce quer encerrar o atendimento?",
      opcoes: [
        { numero: "1", valor: "Sim, encerrar atendimento" },
        { numero: "2", valor: "Nao, continuar atendimento" }
      ],
      resposta: "Voce quer encerrar o atendimento? Se sim, responda *sim*. Se quiser continuar, responda *nao*."
    };
  }

  if (isUnofficialPriceSimulationRequest(message)) {
    return buildUnofficialPriceSimulationDecision(message);
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

  if (isHumanHandoffConfirmationComplaint(message)) {
    return buildHumanHandoffConfirmationComplaintDecision(message);
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

  if (isBusinessCloseRequest(message)) {
    await AnalyzeAndUpdateAiTicketContextService({ ticket, message });
    return {
      intencao: "agendamento",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente quer fechar negocio, reserva, compra, pacote ou agendamento; isso nao e pedido para encerrar o atendimento.",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "encaminhar_atendente",
      motivo: "Fechamento comercial ou operacional precisa de confirmacao humana.",
      resposta: "Perfeito, vamos seguir com isso. Vou encaminhar para a equipe confirmar os detalhes finais e dar continuidade."
    };
  }

  const pendingOptions = parseOptions(ticket.lastAiQuestionOptions);
  const history = await getRecentHistory(ticket);
  await AnalyzeAndUpdateAiTicketContextService({ ticket, message });
  let structuredContext = await BuildAiTicketContextTextService(ticket.id);
  const aiContext = await AiTicketContext.findOne({ where: { ticketId: ticket.id } });
  const collectedData = parseObject(aiContext?.collectedData);
  const operationalStateText = normalizeText(aiContext?.operationalState || "");
  const operationalStateObject = parseObject(aiContext?.operationalState);
  const pendingQuoteDataText = normalizeText(`${aiContext?.missingData || ""} ${structuredContext}`)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const activeQuestionBeforeGrounding = normalizeText(getActiveQuestionText(ticket.lastAiMessage || ""))
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const directRevisionFieldBeforeGrounding = getQuoteRevisionField(message);
  const hasPreviousQuoteBeforeGrounding =
    Boolean(operationalStateObject?.lastQuote) ||
    /Quantidade de pessoas\/participantes:|Quantidade de ocorrencias|Duracao\/tempo informado:/i.test(structuredContext);
  const normalizedRevisionMessage = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    hasPreviousQuoteBeforeGrounding &&
    directRevisionFieldBeforeGrounding &&
    hasExplicitNumericDetail(normalizedRevisionMessage)
  ) {
    const currentQuoteData = getCurrentQuoteDataFromContext(structuredContext);
    const scenario = extractQuoteScenarioFromText(message);
    const revisedQuoteData: CurrentQuoteData = {
      participantCount: scenario.participantCount || currentQuoteData.participantCount,
      occurrenceCount: scenario.occurrenceCount || currentQuoteData.occurrenceCount,
      durationHours: scenario.durationHours || currentQuoteData.durationHours
    };

    if (revisedQuoteData.occurrenceCount && revisedQuoteData.durationHours) {
      await UpdateAiTicketContextService({
        ticket,
        source: "customer_message",
        collectedData: {
          ...(scenario.participantCount ? {
            participant_count: {
              label: "Quantidade de pessoas/participantes",
              value: String(scenario.participantCount),
              rawValue: message
            }
          } : {}),
          ...(scenario.occurrenceCount ? {
            occurrences: {
              label: "Quantidade de ocorrencias/unidades de agenda",
              value: String(scenario.occurrenceCount),
              rawValue: message
            }
          } : {}),
          ...(scenario.durationHours ? {
            duration: {
              label: "Duracao/tempo informado",
              value: `${scenario.durationHours}h`,
              rawValue: message
            }
          } : {})
        },
        missingData: []
      });

      const activeArticles = await getActiveKnowledgeFragments();
      const commercialQuoteDecision = await buildCommercialQuoteDecision({
        ticket,
        aiSetting,
        message,
        quoteData: revisedQuoteData,
        activeHistory: getActiveConversationHistory(history),
        knowledgeIds: activeArticles.map(article => article.id),
        reason: "Cliente revisou um dado do orcamento anterior com numero explicito; recalcular usando os demais dados ja coletados."
      });

      if (commercialQuoteDecision) {
        return commercialQuoteDecision;
      }
    }
  }

  if (
    hasPreviousQuoteBeforeGrounding &&
    directRevisionFieldBeforeGrounding &&
    !hasExplicitNumericDetail(normalizedRevisionMessage) &&
    /^(pessoas|participantes|dias|dia|encontros|encontro|aulas|aula|horas|hora|duracao|tempo)$/.test(normalizedRevisionMessage)
  ) {
    return buildQuoteRevisionFieldQuestionDecision(message, directRevisionFieldBeforeGrounding);
  }

  const shouldLetOperationalStateHandleQuoteReply =
    Boolean(activeQuestionBeforeGrounding) &&
    (
      /\b(pessoas|participantes|alunos|clientes|convidados)\b/.test(activeQuestionBeforeGrounding) ||
      /\b(dias|dia|encontros|encontro|aulas|aula)\b/.test(activeQuestionBeforeGrounding) ||
      /\b(horas|hora|duracao|tempo)\b/.test(activeQuestionBeforeGrounding) ||
      /\b(quero reservar|outro orcamento|tirar uma duvida|tenho outra duvida|falar com atendente)\b/.test(activeQuestionBeforeGrounding) ||
      (
        changesParticipantCount(message) &&
        /\b(occurrences|duration|dias|encontros|horas|duracao)\b/.test(pendingQuoteDataText)
      )
    ) &&
    (
      isBareNumericAnswer(message) ||
      hasDurationOrOccurrenceDetail(message) ||
      changesParticipantCount(message)
    );
  const fullBaseGrounding = shouldLetOperationalStateHandleQuoteReply
    ? null
    : await FullBaseGroundingMariService({
        ticket,
        aiSetting,
        message,
        history,
        structuredContext,
        contactName
      });

  if (
    /\bpost_quote_menu\b/.test(operationalStateText) &&
    normalizeText(message).replace(/[^\w\s]/g, " ").trim() === "3"
  ) {
    return {
      intencao: "confirmacao_opcao",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente escolheu a opcao de tirar outra duvida no menu apos orcamento.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Opcao 3 do menu pos-orcamento deve abrir espaco para duvida, nao iniciar novo orcamento.",
      resposta: "Claro. Qual é a dúvida?"
    };
  }

  if (fullBaseGrounding?.needsQuoteCalculation) {
    const scenario = extractQuoteScenarioFromText(message);
    if (scenario.participantCount || scenario.occurrenceCount || scenario.durationHours) {
      await UpdateAiTicketContextService({
        ticket,
        source: "customer_message",
        collectedData: {
          ...(scenario.participantCount ? {
            participant_count: {
              label: "Quantidade de pessoas/participantes",
              value: String(scenario.participantCount),
              rawValue: message
            }
          } : {}),
          ...(scenario.occurrenceCount ? {
            occurrences: {
              label: "Quantidade de ocorrencias/unidades de agenda",
              value: String(scenario.occurrenceCount),
              rawValue: message
            }
          } : {}),
          ...(scenario.durationHours ? {
            duration: {
              label: "Duracao/tempo informado",
              value: `${scenario.durationHours}h`,
              rawValue: message
            }
          } : {})
        },
        missingData: []
      });

      structuredContext = await BuildAiTicketContextTextService(ticket.id);
      if (hasMinimumQuoteData(structuredContext)) {
        const activeArticles = await getActiveKnowledgeFragments();
        const commercialQuoteDecision = await buildCommercialQuoteDecision({
          ticket,
          aiSetting,
          message,
          quoteData: getCurrentQuoteDataFromContext(structuredContext),
          activeHistory: getActiveConversationHistory(history),
          knowledgeIds: activeArticles.map(article => article.id),
          reason: "Full Base Grounding identificou orcamento com dados completos; calculadora oficial chamada antes do semantico generico."
        });

        if (commercialQuoteDecision) {
          return commercialQuoteDecision;
        }
      }
    }

    if (!hasMinimumQuoteData(structuredContext)) {
      return buildNewQuoteDetailsRequestDecision(message, structuredContext);
    }
  }

  if (fullBaseGrounding && !fullBaseGrounding.needsQuoteCalculation) {
    if (fullBaseGrounding.shouldTransfer || fullBaseGrounding.needsHuman) {
      return {
        intencao: fullBaseGrounding.intent,
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: "Full Base Grounding indicou necessidade de atendimento humano.",
        baseEncontrada: fullBaseGrounding.foundInBase,
        respostaSegura: true,
        acao: "encaminhar_atendente",
        motivo: fullBaseGrounding.reasoningSummary || "Resposta baseada na base completa e validada pelo backend.",
        resposta: fullBaseGrounding.customerAnswer
      };
    }

    if (fullBaseGrounding.shouldAnswer && fullBaseGrounding.customerAnswer) {
      return {
        intencao: fullBaseGrounding.intent,
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: "Full Base Grounding respondeu com base completa enviada ao modelo.",
        baseEncontrada: fullBaseGrounding.foundInBase,
        respostaSegura: true,
        acao: "responder_com_base",
        motivo: fullBaseGrounding.reasoningSummary || "Resposta baseada na base completa e validada pelo backend.",
        resposta: fullBaseGrounding.customerAnswer
      };
    }
  }

  const semanticDecision = await AiSemanticDecisionService({
    ticket,
    message,
    aiSetting,
    history,
    structuredContext,
    context: aiContext
  });
  const knowledgeQuery = BuildKnowledgeBaseQueryService({
    userMessage: message,
    detectedIntent: semanticDecision.messageUnderstanding.primaryIntent,
    history,
    structuredContext
  });
  const preflightArticles = await SearchKnowledgeBaseService(knowledgeQuery.directedKnowledgeBaseQuery, {
    ticketId: ticket.id,
    aiSettingId: aiSetting.id,
    userMessage: message,
    detectedIntent: knowledgeQuery.detectedIntent,
    directedKnowledgeBaseQuery: knowledgeQuery.directedKnowledgeBaseQuery,
    entities: knowledgeQuery.entities,
    includeFullBaseFallback: true,
    topK: 5
  });
  if (!preflightArticles.length && isCriticalKnowledgeQuestion(message)) {
    return {
      intencao: semanticDecision.messageUnderstanding.primaryIntent || "pergunta_sobre_produto_ou_servico",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Pergunta factual critica sem trecho recuperado da base autorizada.",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "sem_resposta_segura",
      motivo: "RAG sem retrievedChunks confiaveis; bloqueio contra resposta inventada.",
      resposta: "Não encontrei essa informação confirmada aqui. Posso encaminhar para a equipe verificar?"
    };
  }
  if (isIdentityQuestion(message)) {
    return buildContextualIdentityAnswerDecision(message, aiSetting, getActiveConversationHistory(history));
  }

  if (
    changesParticipantCount(message) &&
    /\b(occurrences|duration|dias|encontros|horas|duracao)\b/.test(pendingQuoteDataText) &&
    !/\b(cabe|cabem|capacidade|lotacao|suporta|comporta)\b/.test(normalizeText(message))
  ) {
    const participantCount = getExplicitNumberFromMessage(message);
    if (participantCount) {
      await UpdateAiTicketContextService({
        ticket,
        source: "customer_message",
        collectedData: {
          participant_count: {
            label: "Quantidade de pessoas/participantes",
            value: String(participantCount),
            rawValue: message
          }
        },
        missingData: ["occurrences", "duration"]
      });
    }

    return {
      intencao: "diagnostico_inicial",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente informou quantidade de pessoas dentro de um orcamento pendente.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Retomar coleta de orcamento antes de responder capacidade generica.",
      resposta: [
        "Perfeito, anotei a quantidade de pessoas.",
        "Quantos dias/encontros serao ao todo?"
      ].join("\n\n")
    };
  }

  if (shouldAnswerCurrentKnowledgeQuestionFirst(knowledgeQuery.detectedIntent)) {
    const currentKnowledgeDecision = buildCurrentKnowledgeQuestionDecision(
      message,
      knowledgeQuery.detectedIntent,
      preflightArticles
    );

    return withGeneratedKnowledgeAnswer({
      decision: currentKnowledgeDecision,
      aiSetting,
      ticket,
      message,
      contactName,
      history,
      knowledge: buildKnowledgeText(preflightArticles),
      articles: preflightArticles,
      structuredContext,
      directedKnowledgeBaseQuery: knowledgeQuery.directedKnowledgeBaseQuery
    });
  }

  const singleOccurrenceFromContext = collectedDataIndicatesSingleOccurrence(collectedData);
  const multipleOccurrencesFromContext = collectedDataIndicatesMultipleOccurrences(collectedData);
  const bareDuration = bareNumericAnswerToValue(message);
  const normalizedLastAiMessage = normalizeText(ticket.lastAiMessage || "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedActiveLastQuestion = normalizeText(getActiveQuestionText(ticket.lastAiMessage || ""))
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (isAffirmativeAnswerToHumanHandoffOffer(message, ticket)) {
    return buildAcceptedHumanHandoffDecision(message);
  }

  if (isAffirmativeCapacityLimitQuoteRequest(message, ticket.lastAiMessage)) {
    const activeArticles = await getActiveKnowledgeFragments();
    const activeKnowledge = await buildKnowledgeWithFullIncludedSource(buildKnowledgeText(activeArticles));
    const capacityLimit = getCapacityLimitFromKnowledge(activeKnowledge);

    if (capacityLimit && !hasMinimumQuoteData(structuredContext)) {
      const recentScenario = [
        structuredContext,
        ...getMostRecentCustomerMessagesFromHistory(history)
      ]
        .map(extractQuoteScenarioFromText)
        .find(scenario => scenario.occurrenceCount && scenario.durationHours);

      if (recentScenario?.occurrenceCount && recentScenario.durationHours) {
        await UpdateAiTicketContextService({
          ticket,
          source: "customer_message",
          collectedData: {
            occurrences: {
              label: "Quantidade de ocorrencias/unidades de agenda",
              value: String(recentScenario.occurrenceCount),
              rawValue: "historico recente"
            },
            duration: {
              label: "Duracao/tempo informado",
              value: `${recentScenario.durationHours}h`,
              rawValue: "historico recente"
            }
          },
          missingData: []
        });

        structuredContext = await BuildAiTicketContextTextService(ticket.id);
      }
    }

    if (capacityLimit && hasMinimumQuoteData(structuredContext)) {
      await UpdateAiTicketContextService({
        ticket,
        source: "customer_message",
        collectedData: {
          participant_count: {
            label: "Quantidade de pessoas/participantes",
            value: String(capacityLimit),
            rawValue: message
          }
        },
        missingData: []
      });

      structuredContext = await BuildAiTicketContextTextService(ticket.id);
      const adjustedQuoteData = getCurrentQuoteDataFromContext(structuredContext);
      const activeHistory = getActiveConversationHistory(history);
      const commercialQuoteDecision = await buildCommercialQuoteDecision({
        ticket,
        aiSetting,
        message,
        quoteData: adjustedQuoteData,
        activeHistory,
        knowledgeIds: activeArticles.map(article => article.id),
        reason: "Cliente confirmou calculo no limite de capacidade; gerar orcamento sem repetir pergunta."
      });

      if (commercialQuoteDecision) {
        return commercialQuoteDecision;
      }
    }
  }

  if (
    isBareNumericAnswer(message) &&
    /\b(pessoas|participantes|participar|alunos|clientes|convidados|equipe)\b/.test(normalizedActiveLastQuestion)
  ) {
    const participantCount = bareNumericAnswerToValue(message);
    await UpdateAiTicketContextService({
      ticket,
      source: "customer_message",
      collectedData: {
        participant_count: {
          label: "Quantidade de pessoas/participantes",
          value: participantCount || message,
          rawValue: message
        }
      },
      missingData: ["occurrences", "duration"]
    });

    return {
      intencao: "diagnostico_inicial",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente respondeu a quantidade de pessoas em resposta a pergunta anterior.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Resposta curta numerica interpretada pelo contexto da pergunta anterior.",
      resposta: [
        "Perfeito, anotei a quantidade de pessoas.",
        "Quantos dias/encontros serao ao todo?"
      ].join("\n\n")
    };
  }

  if (
    changesParticipantCount(message) &&
    /\b(occurrences|duration|dias|encontros|horas|duracao)\b/.test(pendingQuoteDataText) &&
    !/\b(cabe|cabem|capacidade|lotacao|suporta|comporta)\b/.test(normalizeText(message))
  ) {
    const participantCount = getExplicitNumberFromMessage(message);
    if (participantCount) {
      await UpdateAiTicketContextService({
        ticket,
        source: "customer_message",
        collectedData: {
          participant_count: {
            label: "Quantidade de pessoas/participantes",
            value: String(participantCount),
            rawValue: message
          }
        },
        missingData: ["occurrences", "duration"]
      });
    }

    return {
      intencao: "diagnostico_inicial",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente informou quantidade de pessoas dentro de um orcamento pendente.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Retomar coleta de orcamento depois de duvida factual intermediaria.",
      resposta: [
        "Perfeito, anotei a quantidade de pessoas.",
        "Quantos dias/encontros serao ao todo?"
      ].join("\n\n")
    };
  }

  if (
    hasOccurrenceCountDetail(message) &&
    !hasHourDurationDetail(message) &&
    /\b(dias|dia|encontros|encontro|aulas|aula|reunioes|reuniao|sessoes|sessao|consultas|consulta)\b/.test(normalizedActiveLastQuestion) &&
    /\b(horas|hora|duracao|tempo)\b/.test(normalizedActiveLastQuestion)
  ) {
    const occurrenceCount = parseNumberLikeText(message);
    await UpdateAiTicketContextService({
      ticket,
      source: "customer_message",
      collectedData: {
        occurrences: {
          label: "Quantidade de ocorrencias/unidades de agenda",
          value: occurrenceCount ? String(occurrenceCount) : message,
          rawValue: message
        }
      },
      missingData: ["duration"]
    });

    return buildHoursPerOccurrenceQuestionDecision(message);
  }

  if (
    hasHourDurationDetail(message) &&
    isHourQuestion(ticket.lastAiMessage || "")
  ) {
    const scenario = extractQuoteScenarioFromText(message);
    if (scenario.durationHours) {
      await UpdateAiTicketContextService({
        ticket,
        source: "customer_message",
        collectedData: {
          duration: {
            label: "Duracao/tempo informado",
            value: `${scenario.durationHours}h`,
            rawValue: message
          }
        },
        missingData: []
      });
      structuredContext = await BuildAiTicketContextTextService(ticket.id);
    }

    if (hasMinimumQuoteData(structuredContext)) {
      const activeArticles = await getActiveKnowledgeFragments();
      const activeKnowledge = await buildKnowledgeWithFullIncludedSource(buildKnowledgeText(activeArticles));
      const quoteData = getCurrentQuoteDataFromContext(structuredContext);
      const activeCapacityLimit = getCapacityLimitFromKnowledge(activeKnowledge);

      if (
        quoteData.participantCount !== null &&
        activeCapacityLimit !== null &&
        quoteData.participantCount > activeCapacityLimit
      ) {
        return buildCapacityExceededDecision(message, activeArticles, quoteData.participantCount, activeCapacityLimit);
      }

      const commercialQuoteDecision = await buildCommercialQuoteDecision({
        ticket,
        aiSetting,
        message,
        quoteData,
        activeHistory: getActiveConversationHistory(history),
        knowledgeIds: activeArticles.map(article => article.id),
        reason: "Cliente respondeu a pergunta de horas com unidade textual; calcular orcamento imediatamente."
      });

      if (commercialQuoteDecision) {
        return commercialQuoteDecision;
      }
    }
  }

  if (
    isBareNumericAnswer(message) &&
    (
      /\b(horas|hora|duracao|duração|tempo)\b/.test(normalizedActiveLastQuestion) ||
      /\b(horas|hora|duracao|duração|tempo)\b/.test(normalizedLastAiMessage)
    )
  ) {
    const duration = bareNumericAnswerToValue(message);
    await UpdateAiTicketContextService({
      ticket,
      source: "customer_message",
      collectedData: {
        duration: {
          label: "Duracao/tempo informado",
          value: duration ? `${duration}h` : message,
          rawValue: message
        }
      },
      missingData: []
    });
    structuredContext = await BuildAiTicketContextTextService(ticket.id);

    if (hasMinimumQuoteData(structuredContext)) {
      const activeArticles = await getActiveKnowledgeFragments();
      const activeKnowledge = await buildKnowledgeWithFullIncludedSource(buildKnowledgeText(activeArticles));
      const quoteData = getCurrentQuoteDataFromContext(structuredContext);
      const activeCapacityLimit = getCapacityLimitFromKnowledge(activeKnowledge);

      if (
        quoteData.participantCount !== null &&
        activeCapacityLimit !== null &&
        quoteData.participantCount > activeCapacityLimit
      ) {
        return buildCapacityExceededDecision(message, activeArticles, quoteData.participantCount, activeCapacityLimit);
      }

      const activeHistory = getActiveConversationHistory(history);
      const commercialQuoteDecision = await buildCommercialQuoteDecision({
        ticket,
        aiSetting,
        message,
        quoteData,
        activeHistory,
        knowledgeIds: activeArticles.map(article => article.id),
        reason: "Calculador comercial estruturado: resposta numerica a pergunta de horas deve gerar orcamento imediatamente."
      });

      if (commercialQuoteDecision) {
        return commercialQuoteDecision;
      }
    }
  }

  if (
    isBareNumericAnswer(message) &&
    /\b(dias|dia|encontros|encontro|aulas|aula|reunioes|reuniao|sessoes|sessao|consultas|consulta)\b/.test(normalizedActiveLastQuestion) &&
    !/\b(horas|hora|duracao|tempo)\b/.test(normalizedActiveLastQuestion) &&
    !/\b(horas|hora|duracao|tempo)\b/.test(normalizedLastAiMessage)
  ) {
    const occurrenceCount = bareNumericAnswerToValue(message);
    await UpdateAiTicketContextService({
      ticket,
      source: "customer_message",
      collectedData: {
        occurrences: {
          label: "Quantidade de ocorrencias/unidades de agenda",
          value: occurrenceCount || message,
          rawValue: message
        }
      },
      missingData: ["duration"]
    });

    return buildHoursPerOccurrenceQuestionDecision(message);
  }

  if (lastAiAskedQuoteRevisionScope(ticket)) {
    const revisionField = getQuoteRevisionField(message);
    const normalizedRevisionAnswer = normalizeText(message)
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (revisionField) {
      return buildQuoteRevisionFieldQuestionDecision(message, revisionField);
    }

    if (
      isAffirmativeShortAnswer(normalizedRevisionAnswer) ||
      /^(quero|quero sim|pode|pode ser|pode sim|vamos|vamos fazer|bora|isso|isso mesmo|sim quero|fazer|faz)$/i.test(normalizedRevisionAnswer)
    ) {
      return {
        intencao: "consulta_valor",
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: "Cliente aceitou revisar o orcamento, mas ainda nao disse qual dado quer alterar.",
        baseEncontrada: false,
        respostaSegura: true,
        acao: "pedir_mais_informacoes",
        motivo: "Aceite curto apos pergunta de revisao; nao repetir a mesma resposta, pedir campo especifico.",
        resposta: "Perfeito. Quer mudar pessoas, dias ou horas?"
      };
    }
  }

  if (
    lastAiAskedSamePeopleForNewQuote(ticket) &&
    (
      isAffirmativeShortAnswer(normalizeText(message).replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim()) ||
      /^(quero|quero sim|pode|pode ser|pode sim|vamos|vamos fazer|bora|isso|isso mesmo|sim quero)$/i.test(
        normalizeText(message).replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim()
      )
    )
  ) {
    return buildMultipleOccurrencesQuestionDecision(message);
  }

  if (
    lastAiAskedSamePeopleForNewQuote(ticket) &&
    !hasDurationOrOccurrenceDetail(message) &&
    (isBareNumericAnswer(message) || changesParticipantCount(message))
  ) {
    const participantCount = getExplicitNumberFromMessage(message);
    if (participantCount) {
      await UpdateAiTicketContextService({
        ticket,
        source: "customer_message",
        collectedData: {
          participant_count: {
            label: "Quantidade de pessoas/participantes",
            value: String(participantCount),
            rawValue: message
          }
        },
        missingData: ["occurrences", "duration"]
      });
    }

    return buildMultipleOccurrencesQuestionDecision(message);
  }

  if (isAffirmativeAnswerToNewQuoteScenario(message, ticket) || isNewQuoteRequestMissingDetails(message)) {
    return buildNewQuoteDetailsRequestDecision(message, structuredContext);
  }

  if (answersOccurrenceButMissingHours(message, ticket)) {
    return buildHoursPerOccurrenceQuestionDecision(message);
  }

  if (isLikelyParticipantCountAnswer(message, ticket)) {
    if (singleOccurrenceFromContext) {
      return buildSingleOccurrenceHoursQuestionDecision(message);
    }
    if (multipleOccurrencesFromContext) {
      return buildMultipleOccurrencesQuestionDecision(message);
    }

    return {
      intencao: "diagnostico_inicial",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente respondeu a quantidade de pessoas, mas ainda faltam duracao e quantidade de encontros/dias para orcar com seguranca.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Quantidade de pessoas coletada; antes de orcar, coletar quantidade de dias/encontros e depois horas.",
      resposta: [
        "Perfeito, anotei a quantidade de pessoas.",
        "Quantos dias/encontros serao ao todo?"
      ].join("\n\n")
    };
  }

  if (
    bareDuration &&
    isHourQuestion(ticket.lastAiMessage || "") &&
    hasMinimumQuoteData(structuredContext)
  ) {
    const activeArticles = await getActiveKnowledgeFragments();
    const activeKnowledge = await buildKnowledgeWithFullIncludedSource(buildKnowledgeText(activeArticles));
    const quoteData = getCurrentQuoteDataFromContext(structuredContext);
    const activeCapacityLimit = getCapacityLimitFromKnowledge(activeKnowledge);

    if (
      quoteData.participantCount !== null &&
      activeCapacityLimit !== null &&
      quoteData.participantCount > activeCapacityLimit
    ) {
      return buildCapacityExceededDecision(message, activeArticles, quoteData.participantCount, activeCapacityLimit);
    }

    const activeHistory = getActiveConversationHistory(history);
    const commercialQuoteDecision = await buildCommercialQuoteDecision({
      ticket,
      aiSetting,
      message,
      quoteData,
      activeHistory,
      knowledgeIds: activeArticles.map(article => article.id),
      reason: "Calculador comercial estruturado: resposta numerica a pergunta de horas deve gerar orcamento, nao nova pergunta."
    });

    if (commercialQuoteDecision) {
      return commercialQuoteDecision;
    }
  }

  if (isDiscountQuestion(message)) {
    return buildDiscountAnswerDecision(message);
  }

  if (isHumanHandoffConfirmationComplaint(message)) {
    return buildHumanHandoffConfirmationComplaintDecision(message);
  }

  if (isIdentityQuestion(message)) {
    return buildContextualIdentityAnswerDecision(message, aiSetting, getActiveConversationHistory(history));
  }

  const operationalDecision = await EvaluateAiConversationStateService({
    ticket,
    message,
    aiSetting,
    context: aiContext,
    semanticDecision
  });

  if (operationalDecision) {
    logger.info(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        detectedIntent: operationalDecision.detectedIntent,
        responseGoal: operationalDecision.responseGoal,
        previousOfferType: operationalDecision.previousOfferType,
        nextQuestionKey: operationalDecision.nextQuestionKey
      },
      "[AI OPERATIONAL STATE] Decision applied before orchestrator"
    );

    if (operationalDecision.requiresTool && operationalDecision.toolToCall === "calcularOrcamento") {
      structuredContext = await BuildAiTicketContextTextService(ticket.id);
      const activeArticles = await getActiveKnowledgeFragments();
      const activeHistory = getActiveConversationHistory(history);
      const quoteData = getCurrentQuoteDataFromContext(structuredContext);
      const commercialQuoteDecision = await buildCommercialQuoteDecision({
        ticket,
        aiSetting,
        message,
        quoteData,
        activeHistory,
        knowledgeIds: activeArticles.map(article => article.id),
        reason: "Estado operacional: dados de revisao completos; calcular orcamento antes do orquestrador."
      });

      if (commercialQuoteDecision) {
        return commercialQuoteDecision;
      }
    }

    return operationalDecision.aiDecision;
  }

  const requestedTotalHours = extractRequestedTotalHours(message);

  if (requestedTotalHours) {
    await UpdateAiTicketContextService({
      ticket,
      source: "customer_message",
      collectedData: {
        total_requested_hours: {
          label: "Total de horas solicitado",
          value: `${requestedTotalHours}h`,
          rawValue: message
        }
      },
      missingData: []
    });

    const activeArticles = await getActiveKnowledgeFragments();
    const commercialTotalQuoteDecision = await buildTotalHoursCommercialQuoteDecision({
      ticket,
      aiSetting,
      message,
      totalHours: requestedTotalHours,
      activeHistory: getActiveConversationHistory(history),
      knowledgeIds: activeArticles.map(article => article.id),
      reason: "Cliente pediu composicao ou correcao por total de horas; nao interpretar como horas por encontro."
    });

    if (commercialTotalQuoteDecision) {
      return commercialTotalQuoteDecision;
    }
  }

  if (isIdentityQuestion(message)) {
    return buildContextualIdentityAnswerDecision(message, aiSetting, getActiveConversationHistory(history));
  }

  if (isClearlyOutOfScopeMessage(message)) {
    return buildOutOfScopeDecision(message, aiSetting);
  }

  if (isAddressQuestion(message)) {
    return buildAddressAnswerDecision(message);
  }

  if (isCapacityInfoQuestion(message) && !hasDurationOrOccurrenceDetail(message)) {
    return buildCapacityInfoAnswerDecision(message);
  }

  if (isMinimumRentalQuestion(message)) {
    return buildMinimumRentalAnswerDecision(message);
  }

  if (isUnknownColorOrVisualQuestion(message)) {
    return buildUnknownVisualAnswerDecision(message);
  }

  if (
    singleOccurrenceFromContext &&
    bareDuration &&
    isDurationOrOccurrenceQuestion(ticket.lastAiMessage || "") &&
    !hasHourDurationDetail(message)
  ) {
    await UpdateAiTicketContextService({
      ticket,
      source: "customer_message",
      collectedData: {
        duration: {
          label: "Duracao/tempo informado",
          value: `${bareDuration}h`,
          rawValue: message
        }
      },
      missingData: []
    });
    structuredContext = await BuildAiTicketContextTextService(ticket.id);
  }

  if (
    isHourQuestion(ticket.lastAiMessage || "") &&
    hasOccurrenceCountDetail(message) &&
    !hasHourDurationDetail(message)
  ) {
    const occurrenceCount = parseNumberLikeText(message);
    await UpdateAiTicketContextService({
      ticket,
      source: "customer_message",
      collectedData: {
        occurrences: {
          label: "Quantidade de encontros/dias/recorrencia",
          value: occurrenceCount ? String(occurrenceCount) : message,
          rawValue: message
        },
        duration: {
          label: "Duracao/tempo informado",
          value: null,
          rawValue: null
        }
      },
      missingData: ["duracao_por_ocorrencia"]
    });
    structuredContext = await BuildAiTicketContextTextService(ticket.id);
    return buildOccurrenceThenHoursCorrectionDecision(message);
  }

  if (
    bareDuration &&
    isHourQuestion(ticket.lastAiMessage || "") &&
    hasMinimumQuoteData(structuredContext)
  ) {
    const activeArticles = await getActiveKnowledgeFragments();
    const activeKnowledge = await buildKnowledgeWithFullIncludedSource(buildKnowledgeText(activeArticles));
    const quoteData = getCurrentQuoteDataFromContext(structuredContext);
    const activeCapacityLimit = getCapacityLimitFromKnowledge(activeKnowledge);

    if (
      quoteData.participantCount !== null &&
      activeCapacityLimit !== null &&
      quoteData.participantCount > activeCapacityLimit
    ) {
      return buildCapacityExceededDecision(message, activeArticles, quoteData.participantCount, activeCapacityLimit);
    }

    const activeHistory = getActiveConversationHistory(history);
    const commercialQuoteDecision = await buildCommercialQuoteDecision({
      ticket,
      aiSetting,
      message,
      quoteData,
      activeHistory,
      knowledgeIds: activeArticles.map(article => article.id),
      reason: "Calculador comercial estruturado: resposta numerica a pergunta de horas deve gerar orcamento, nao nova pergunta."
    });

    if (commercialQuoteDecision) {
      return commercialQuoteDecision;
    }

    const quoteAnswer = buildProfessionalHourlyQuoteAnswer(quoteData, activeKnowledge);

    if (quoteAnswer) {
      const answerWithIncluded = appendIncludedSectionIfNeeded({
        answer: quoteAnswer,
        knowledge: activeKnowledge,
        activeHistory,
        message
      });

      return {
        intencao: "consulta_valor",
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: "Cliente respondeu a pergunta de horas; dados minimos completos. Orcamento gerado sem repetir pergunta.",
        baseEncontrada: true,
        respostaSegura: true,
        acao: "responder_com_base",
        motivo: "Correcao local: resposta numerica a pergunta de horas deve gerar orcamento, nao nova pergunta.",
        resposta: answerWithIncluded,
        knowledgeIds: activeArticles.map(article => article.id)
      };
    }
  }

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

  if (isAffirmativeAnswerToProceedQuestion(message, ticket)) {
    return {
      intencao: "agendamento",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente confirmou que quer seguir com a opcao/orcamento apresentado pela IA.",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "encaminhar_atendente",
      motivo: "Confirmacao curta apos pergunta de seguir com a opcao deve acionar handoff, nao repetir o orcamento.",
      resposta: "Perfeito, vamos seguir com essa opção. Vou encaminhar para a equipe confirmar disponibilidade e finalizar os detalhes."
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

  if (answersOccurrenceButMissingHours(message, ticket)) {
    return buildHoursPerOccurrenceQuestionDecision(message);
  }

  if (isLikelyParticipantCountAnswer(message, ticket)) {
    if (singleOccurrenceFromContext) {
      return buildSingleOccurrenceHoursQuestionDecision(message);
    }
    if (multipleOccurrencesFromContext) {
      return buildMultipleOccurrencesQuestionDecision(message);
    }

    return {
      intencao: "diagnostico_inicial",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente respondeu a quantidade de pessoas, mas ainda faltam duracao e quantidade de encontros/dias para orcar com seguranca.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Quantidade de pessoas coletada; antes de orcar, coletar quantidade de dias/encontros e depois horas.",
      resposta: [
        "Perfeito, anotei a quantidade de pessoas.",
        "Quantos dias/encontros serao ao todo?"
      ].join("\n\n")
    };
  }

  if (isNewQuoteRequestMissingDetails(message)) {
    return {
      intencao: "consulta_valor",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Cliente quer um novo orcamento ou simulacao, mas nao informou os novos dados numericos.",
      baseEncontrada: false,
      respostaSegura: true,
      acao: "pedir_mais_informacoes",
      motivo: "Novo orcamento sem dados suficientes; nao reutilizar nem inventar dados do historico.",
      resposta: buildNewQuoteDetailsRequestDecision(message, structuredContext).resposta
    };
  }

  if (isDiscountQuestion(message)) {
    return buildDiscountAnswerDecision(message);
  }

  if (isPriceObjection(message)) {
    return buildContextualPriceObjectionDecision(message, getActiveConversationHistory(history));
  }

  if (isShortQuoteRejection(message, ticket)) {
    return buildShortQuoteRejectionDecision(message);
  }

  if (isAskingForSmallerPackage(message) && hasMinimumQuoteData(structuredContext)) {
    return buildSmallerPackageDecision(message, getCurrentQuoteDataFromContext(structuredContext));
  }

  let articles = preflightArticles;

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
      detectedIntent: knowledgeQuery.detectedIntent,
      directedKnowledgeBaseQuery: knowledgeQuery.directedKnowledgeBaseQuery,
      entities: knowledgeQuery.entities,
      knowledgeFound: articles.length,
      retrievedChunks: articles.map(article => ({
        chunkId: article.chunkId || null,
        articleId: article.articleId || article.id,
        section: article.section || article.title,
        title: article.title,
        score: article.rank,
        contentPreview: article.fragment.slice(0, 200),
        source: article.source
      })),
      usedOldFlow: false
    },
    "[AI FLOW] Decision context prepared"
  );

  const participantCount = getParticipantCountFromContext(structuredContext);
  const shouldAutoQuote = shouldAutoQuoteFromCurrentMessage(message, ticket);

  if (!articles.length && hasMinimumQuoteData(structuredContext) && shouldAutoQuote) {
    articles = await getActiveKnowledgeFragments();
  }

  const effectiveKnowledge = buildKnowledgeText(articles);
  const capacityLimit = getCapacityLimitFromKnowledge(effectiveKnowledge);
  const adjustedCapacityCount = getExplicitNumberFromMessage(message) || capacityLimit;

  if (isIncludedItemsQuestion(message)) {
    const includedKnowledge = await buildKnowledgeWithFullIncludedSource(effectiveKnowledge);
    const includedAnswer = buildIncludedItemsAnswerFromKnowledge(includedKnowledge);
    if (includedAnswer) {
      return {
        intencao: "pergunta_sobre_produto_ou_servico",
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: "Cliente perguntou itens inclusos/beneficios.",
        baseEncontrada: true,
        respostaSegura: true,
        acao: "responder_com_base",
        motivo: "Responder inclusos diretamente sem repetir orçamento.",
        resposta: includedAnswer,
        knowledgeIds: articles.map(article => article.id)
      };
    }
  }

  if (
    articles.length > 0 &&
    participantCount !== null &&
    capacityLimit !== null &&
    participantCount > capacityLimit &&
    !isCapacityLimitAdjustmentRequest(message, ticket.lastAiMessage, capacityLimit)
  ) {
    const scenario = extractQuoteScenarioFromText(message);
    if (scenario.occurrenceCount || scenario.durationHours) {
      await UpdateAiTicketContextService({
        ticket,
        source: "customer_message",
        collectedData: {
          ...(scenario.occurrenceCount
            ? {
                occurrences: {
                  label: "Quantidade de ocorrencias/unidades de agenda",
                  value: String(scenario.occurrenceCount),
                  rawValue: message
                }
              }
            : {}),
          ...(scenario.durationHours
            ? {
                duration: {
                  label: "Duracao/tempo informado",
                  value: `${scenario.durationHours}h`,
                  rawValue: message
                }
              }
            : {})
        },
        missingData: []
      });
      structuredContext = await BuildAiTicketContextTextService(ticket.id);
    }

    if (hasMinimumQuoteData(structuredContext) && shouldAutoQuote) {
      const quoteData = getCurrentQuoteDataFromContext(structuredContext);
      const commercialQuoteDecision = await buildCommercialQuoteDecision({
        ticket,
        aiSetting,
        message,
        quoteData,
        activeHistory: getActiveConversationHistory(history),
        knowledgeIds: articles.map(article => article.id),
        reason: "Cliente informou quantidade acima da capacidade; calcular automaticamente no limite cadastrado e avisar a restricao."
      });

      if (commercialQuoteDecision) {
        return commercialQuoteDecision;
      }
    }

    return buildCapacityExceededDecision(message, articles, participantCount, capacityLimit);
  }

  if (
    articles.length > 0 &&
    hasMinimumQuoteData(structuredContext) &&
    shouldAutoQuote &&
    !isExplicitHumanRequest(message) &&
    (capacityLimit === null || participantCount === null || participantCount <= capacityLimit)
  ) {
    const quoteData = getCurrentQuoteDataFromContext(structuredContext);
    const activeHistory = getActiveConversationHistory(history);
    const commercialQuoteDecision = await buildCommercialQuoteDecision({
      ticket,
      aiSetting,
      message,
      quoteData,
      activeHistory,
      knowledgeIds: articles.map(article => article.id),
      reason: "Calculador comercial estruturado: dados minimos ja coletados; nao enviar quarta pergunta generica."
    });

    if (commercialQuoteDecision) {
      return commercialQuoteDecision;
    }

    const completeDataDecision = await withGeneratedKnowledgeAnswer({
      decision: buildCompleteQuoteDataDecision(
        message,
        articles,
        "Correcao local: dados minimos ja coletados; nao enviar quarta pergunta generica."
      ),
      aiSetting,
      ticket,
      message: [
        message,
        "Use os dados ja coletados no Estado vivo para montar o orcamento agora.",
        "Nao pergunte novamente quantos dias/encontros ou quantas horas se esses dados ja estiverem no contexto.",
        "Se houver varios encontros/aulas, inclua a observacao sobre condicoes mensalistas apenas dentro do orcamento."
      ].join("\n"),
      contactName,
      history,
      knowledge: effectiveKnowledge,
      articles,
      structuredContext
    });

    return applyNoToolConfirmationGuardrail(completeDataDecision);
  }

  if (
    articles.length > 0 &&
    isCapacityLimitAdjustmentRequest(message, ticket.lastAiMessage, capacityLimit) &&
    adjustedCapacityCount
  ) {
    await UpdateAiTicketContextService({
      ticket,
      source: "customer_message",
      collectedData: {
        participant_count: {
          label: "Quantidade de pessoas/participantes",
          value: String(adjustedCapacityCount),
          rawValue: message
        }
      }
    });
    structuredContext = await BuildAiTicketContextTextService(ticket.id);

    const adjustedQuoteData = getCurrentQuoteDataFromContext(structuredContext);
    const activeHistory = getActiveConversationHistory(history);
    const commercialQuoteDecision = await buildCommercialQuoteDecision({
      ticket,
      aiSetting,
      message,
      quoteData: adjustedQuoteData,
      activeHistory,
      knowledgeIds: articles.map(article => article.id),
      reason: "Calculador comercial estruturado: cliente ajustou a quantidade para o limite de capacidade."
    });

    if (commercialQuoteDecision) {
      logger.info(
        {
          ticketId: ticket.id,
          aiSettingId: aiSetting.id,
          adjustedCapacityCount,
          knowledgeIds: articles.map(article => article.id)
        },
        "[AI ACTION] Capacity adjustment calculated with commercial engine"
      );

      return commercialQuoteDecision;
    }

    const capacityAdjustedContext = [
      structuredContext,
      "",
      "Ajuste solicitado pelo cliente apos aviso de capacidade:",
      `- Cliente escolheu refazer a orientacao/orcamento considerando ${adjustedCapacityCount} pessoas, dentro do limite informado.`,
      "- Use os demais dados ja informados no historico recente, como duracao e quantidade de encontros/unidades, se estiverem claros.",
      "- Nao encaminhe para atendente apenas por esta mensagem. Responda com a nova simulacao se a base permitir calcular."
    ].join("\n");

    const adjustedDecision = await withGeneratedKnowledgeAnswer({
      decision: {
        intencao: "consulta_valor",
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: `Cliente aceitou ajustar a simulacao para ${adjustedCapacityCount} pessoas apos aviso de capacidade.`,
        baseEncontrada: true,
        respostaSegura: true,
        acao: "responder_com_base",
        motivo: "Correcao local: resposta curta ao aviso de capacidade significa refazer no limite, nao transferir.",
        knowledgeIds: articles.map(article => article.id)
      },
      aiSetting,
      ticket,
      message: `Refaca a orientacao/orcamento considerando ${adjustedCapacityCount} pessoas. A mensagem original do cliente foi: ${message}`,
      contactName,
      history,
      knowledge,
      articles,
      structuredContext: capacityAdjustedContext
    });

    logger.info(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        adjustedCapacityCount,
        knowledgeIds: articles.map(article => article.id)
      },
      "[AI ACTION] Capacity adjustment recalculated instead of handoff"
    );

    return applyNoToolConfirmationGuardrail(adjustedDecision);
  }

  const isCapacitySensitiveMessage =
    asksForValueOrSimulation(message) ||
    hasDurationOrOccurrenceDetail(message) ||
    changesParticipantCount(message);
  const shouldBlockCapacityQuote =
    participantCount !== null &&
    capacityLimit !== null &&
    participantCount > capacityLimit &&
    isCapacitySensitiveMessage &&
    !isExplicitCloseRequest(message) &&
    !isExplicitHumanRequest(message) &&
    !isOperationalHandoffRequest(message);

  if (shouldBlockCapacityQuote) {
    const capacityContext = [
      structuredContext,
      "",
      "Restricao de capacidade detectada:",
      `- Cliente informou ${participantCount} pessoas/participantes.`,
      `- A base informa capacidade/validacao ate ${capacityLimit} pessoas.`,
      `- Se houver duracao e quantidade de encontros/unidades no historico, envie a estimativa agora considerando no maximo ${capacityLimit} pessoas.`,
      `- Avise claramente que para ${participantCount} pessoas o formato excede a capacidade e que a estimativa considera ${capacityLimit} pessoas.`,
      "- Nao apresente o orcamento como viavel para a quantidade acima do limite.",
      "- Nao ofereca transferencia para atendente nessa resposta; direcione o cliente para o calculo considerando o limite permitido."
    ].join("\n");

    const capacityDecision = await withGeneratedKnowledgeAnswer({
      decision: buildCapacityExceededDecision(
        message,
        articles,
        participantCount,
        capacityLimit
      ),
      aiSetting,
      ticket,
      message: `Monte o orcamento considerando a restricao de capacidade: ${participantCount} pessoas excede o limite de ${capacityLimit}. Se duracao e quantidade de encontros estiverem no historico, calcule agora para ${capacityLimit} pessoas e avise que acima disso nao comporta. Nao encaminhe para atendente e nao pergunte o que o cliente prefere.`,
      contactName,
      history,
      knowledge,
      articles,
      structuredContext: capacityContext
    });

    logger.info(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        participantCount,
        capacityLimit,
        knowledgeIds: articles.map(article => article.id)
      },
      "[AI ACTION] Capacity limit guardrail blocked quote"
    );

    return applyNoToolConfirmationGuardrail(capacityDecision);
  }

  if (isResponseRejectedRequest(message) && articles.length > 0) {
    const objectionDecision = await withGeneratedKnowledgeAnswer({
      decision: buildResponseRejectedDecision(message, articles),
      aiSetting,
      ticket,
      message,
      contactName,
      history,
      knowledge,
      articles,
      structuredContext
    });

    logger.info(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        action: objectionDecision.acao,
        responsePreview: objectionDecision.resposta?.slice(0, 240)
      },
      "[AI ACTION] Response rejection handled with live context"
    );

    return applyNoToolConfirmationGuardrail(objectionDecision);
  }

  const prompt = buildDecisionPrompt({
    message,
    history,
    knowledge,
    aiSetting,
    ticket,
    queue,
    pendingOptions,
    structuredContext
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

        return applyNoToolConfirmationGuardrail(fallbackDecision);
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
        articles,
        structuredContext
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

      return applyNoToolConfirmationGuardrail(fallbackDecision);
    }

    return buildQualificationQuestion(
      aiSetting,
      message,
      "A IA nao retornou uma decisao estruturada valida; qualificando antes de encaminhar."
    );
  }

  if (!hasDecisionContract(parsed)) {
    logger.warn(
      {
        ticketId: ticket.id,
        aiSettingId: aiSetting.id,
        rawDecisionPreview: rawDecision?.slice(0, 500) || null,
        parsedKeys: Object.keys(parsed || {}),
        knowledgeFound: articles.length
      },
      "[AI PARSER] Structured decision ignored because it missed the required contract"
    );

    if (articles.length > 0) {
      const fallbackDecision = await withGeneratedKnowledgeAnswer({
        decision: buildKnowledgeFallbackDecision(
          message,
          articles,
          "Fallback local: IA retornou JSON fora do contrato esperado."
        ),
        aiSetting,
        ticket,
        message,
        contactName,
        history,
        knowledge,
        articles,
        structuredContext
      });

      return applyNoToolConfirmationGuardrail(fallbackDecision);
    }

    return buildQualificationQuestion(
      aiSetting,
      message,
      "A IA retornou uma estrutura sem acao valida; qualificando antes de encaminhar."
    );
  }

  const parsedResponse = getParsedTextResponse(parsed);
  const inferredAction =
    parsed.acao ||
    (parsedResponse ? "pedir_mais_informacoes" : "sem_resposta_segura");

  let decision: AiDecision = {
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
    ferramenta: parsed.ferramenta ? String(parsed.ferramenta) : undefined,
    parametrosFerramenta: parsed.parametrosFerramenta && typeof parsed.parametrosFerramenta === "object"
      ? parsed.parametrosFerramenta
      : undefined,
    knowledgeIds: articles.map(article => article.id)
  };

  if (decision.acao === "executar_ferramenta" && !decision.ferramenta) {
    decision.acao = "pedir_mais_informacoes";
    decision.resposta = decision.resposta || "Antes de seguir, preciso confirmar mais alguns dados.";
    decision.motivo = decision.motivo || "Ferramenta nao informada.";
  }

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
      articles,
      structuredContext
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

    return applyNoToolConfirmationGuardrail(fallbackDecision);
  }

  if (
    decision.acao === "pedir_mais_informacoes" &&
    (answersLastDurationOrOccurrenceQuestion(message, ticket) ||
      (changesParticipantCount(message) && asksForValueOrSimulation(message) && hasPriorDurationAndOccurrences(structuredContext)) ||
      isRepeatedMissingInfoQuestion(decision, message, ticket)) &&
    articles.length > 0
  ) {
    const fallbackDecision = await withGeneratedKnowledgeAnswer({
      decision: {
        ...decision,
        acao: "responder_com_base",
        baseEncontrada: true,
        respostaSegura: true,
        motivo: [
          decision.motivo,
          "Correcao local: cliente respondeu a pergunta pendente; nao repetir a mesma pergunta."
        ].filter(Boolean).join(" | "),
        knowledgeIds: articles.map(article => article.id)
      },
      aiSetting,
      ticket,
      message,
      contactName,
      history,
      knowledge,
      articles,
      structuredContext
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
      "[AI ACTION] Pending question answered, repeated missing-info avoided"
    );

    return applyNoToolConfirmationGuardrail(fallbackDecision);
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
        articles,
        structuredContext
      });
      return applyNoToolConfirmationGuardrail(fallbackDecision);
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
      articles,
      structuredContext
    });

    return applyNoToolConfirmationGuardrail(answerDecision);
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

  if (
    decision.acao === "encerrar_atendimento" &&
    decision.baseEncontrada &&
    decision.resposta &&
    isInformationalQuoteAnswer(decision.resposta) &&
    !isExplicitCloseRequest(message)
  ) {
    decision.acao = "responder_com_base";
    decision.respostaSegura = true;
    decision.resposta = decision.resposta.replace(/\s*\[FECHAR TICKET\]\s*/gi, "").trim();
    decision.motivo = [
      decision.motivo,
      "Correcao local: resposta de orcamento nao deve encerrar o atendimento no mesmo turno."
    ].filter(Boolean).join(" | ");
  }

  if (decision.acao === "encerrar_atendimento") {
    if (!decision.resposta) {
      decision.resposta =
        "Que bom que pude ajudar. Vou finalizar seu atendimento. Se precisar novamente, e so chamar. [FECHAR TICKET]";
    } else if (!decision.resposta.includes("[FECHAR TICKET]")) {
      decision.resposta = `${decision.resposta} [FECHAR TICKET]`;
    }
  }

  decision = applyNoToolConfirmationGuardrail(decision);

  if (decision.resposta && decision.acao !== "encerrar_atendimento") {
    decision.resposta = stripRepeatedGreeting(decision.resposta, ticket, history, contactName);
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
