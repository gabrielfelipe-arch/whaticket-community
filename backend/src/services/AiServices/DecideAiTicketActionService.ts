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
      `Para eu te orientar melhor${service} e encontrar a opcao mais adequada da ${company}, me diga um pouco mais sobre o que voce precisa.`,
      "Qual atividade ou objetivo voce pretende realizar, e esse uso seria pontual ou recorrente?"
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
    /\b(outro|outra|novo|nova|diferente|diferentes|refazer|recalcular|simular).{0,60}\b(orcamento|cotacao|valor|preco|proposta)\b/.test(normalized);

  const asksDifferentQuantity =
    /\b(quantidade|quantidades|pessoas|itens|unidades|encontros|horas|dias|opcoes|opcao|planos|pacotes).{0,60}\b(diferente|diferentes|outra|outras|outro|outros|nova|novo)\b/.test(normalized) ||
    /\b(diferente|diferentes|outra|outras|outro|outros|nova|novo).{0,60}\b(quantidade|quantidades|pessoas|itens|unidades|encontros|horas|dias|opcoes|opcao|planos|pacotes)\b/.test(normalized);

  return asksAnotherQuote || asksDifferentQuantity;
};

const isParticipantCountQuestion = (value = ""): boolean => {
  const normalized = normalizeText(getActiveQuestionText(value));
  return /\b(quantas|quantos|qtd|quantidade|numero).{0,80}\b(pessoas|participantes|alunos|clientes|convidados|candidatos|equipe)\b/.test(normalized);
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
  if (!isDurationOrOccurrenceQuestion(ticket.lastAiMessage || "")) return false;
  if (isHourQuestion(ticket.lastAiMessage || "")) return false;
  if (hasHourDurationDetail(message)) return false;

  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
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
  if (!isParticipantCountQuestion(ticket.lastAiMessage || "")) return false;
  if (hasDurationOrOccurrenceDetail(message)) return false;

  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;
  if (/\b(apenas|so|só|somente|unico|único)\b/.test(normalized)) return false;

  return (
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
  if (!/\b(refazer|ajustar|considerando|ate)\b/.test(last)) return false;
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
  const normalized = normalizeText(message);
  return /\b(o\s+que\s+(?:eu\s+)?tenho\s+direito|o\s+que\s+entra|o\s+que\s+inclui|o\s+que\s+esta\s+incluso|o\s+que\s+ta\s+incluso|incluso|inclusos|incluido|inclui|tem\s+direito)\b/.test(normalized);
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

const historyHasIncludedSection = (history = ""): boolean =>
  /\b(?:incluso|inclusos|inclui)\s*:/i.test(normalizeText(getActiveConversationHistory(history)));

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
        /^(?:sala|internet|wi|wifi|ar|tv|quadro|recepcao|banheiro|copa|cafeteira|micro|filtro|agua|estrutura)\b/.test(normalizedTrimmed);

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
  structuredContext
}: {
  message: string;
  history: string;
  knowledge: string;
  ticket: Ticket;
  aiSetting: AiSetting;
  structuredContext?: string;
}): string => [
  "Escreva a resposta final para o cliente em portugues do Brasil.",
  "Use linguagem natural, educada, objetiva e humana.",
  "Prefira respostas curtas, em estilo WhatsApp. Evite textos longos: normalmente use 2 a 6 linhas, salvo se o cliente pedir detalhes.",
  "Pode usar emojis com moderacao para deixar a conversa mais amigavel, no maximo 1 ou 2 por resposta. Use emojis simples como 🙂, ✅, 💰, 📌 ou 👍 quando fizer sentido.",
  "Para orcamentos, seja enxuto: informe o contexto em 1 linha, liste as principais opcoes/valores em bullets curtos e finalize com uma pergunta simples.",
  "Em orcamentos, mostre a conta de forma transparente quando houver composicao: exemplo '3 blocos x R$ 140 = R$ 420'. O cliente precisa entender o valor individual e o total.",
  "Antes de comparar valores por tempo, calcule explicitamente a demanda real: horas por ocorrencia x quantidade de ocorrencias = total de horas. Exemplo: 3 horas em 3 dias diferentes = 3 x 3h = 9h no total.",
  "Se a base trouxer descontos aplicaveis por quantidade de pessoas, itens, encontros, dias, recorrencia ou outro criterio, considere esses descontos no total final e mostre a conta de forma curta.",
  "Quando o cliente perguntar 'o que eu tenho direito?', 'o que entra?', 'o que inclui?', 'o que esta incluso?' ou equivalente apos um orcamento, responda sobre itens inclusos/estrutura/beneficios do plano escolhido, nao repita o orcamento inteiro.",
  "No primeiro orcamento util da conversa, se a base tiver informacoes de inclusos, adicione um rodape 'Incluso:' com todos os itens inclusos cadastrados, em bullets curtos. Nao resuma para apenas alguns itens.",
  "Considere como conversa atual apenas o ciclo depois do ultimo encerramento/menu. Inclusos enviados em ciclos anteriores do mesmo ticket nao contam como ja enviados para o novo orcamento.",
  "Se o cliente pedir para recalcular, comparar, mudar quantidade, mudar horas, mudar dias ou usar outros valores na mesma conversa, nao repita o rodape de inclusos. Foque apenas na nova conta e no novo total.",
  "Nao use Markdown com dois asteriscos (**texto**). Se precisar destacar algo para WhatsApp, use no maximo asterisco simples (*texto*) ou deixe sem destaque.",
  "Nao explique todas as regras internas, descontos e modalidades de uma vez. Mostre so o que ajuda a decisao do cliente naquele momento.",
  "Nao comece toda resposta com 'Ola', 'Oi' ou apresentacao. Cumprimente/apresente-se apenas no primeiro contato ou quando fizer sentido. Em continuacao de conversa, responda direto ao ponto com tom cordial.",
  "O atendimento pode ser de qualquer ramo: vendas, suporte, clinica, escola, loja, oficina, servicos, delivery, imobiliaria, financeiro, cobranca, agendamento, promocao ou relacionamento.",
  "Adapte a resposta ao tipo de atendimento configurado, a mensagem do cliente e a base encontrada.",
  "Use somente as INFORMACOES INTERNAS ENCONTRADAS.",
  "Nao copie a base literalmente quando puder explicar melhor. Reescreva de forma clara, humana e especifica para a pergunta do cliente.",
  "Nao invente valores, prazos, links, telefones, regras, procedimentos ou nomes que nao estejam na base.",
  "Quando a base de conhecimento trouxer valores oficiais, eles tem prioridade sobre qualquer valor citado anteriormente no historico ou pela propria IA. Nao reutilize valor antigo se ele conflitar com a base encontrada.",
  "Se o cliente pedir explicacao de diferenca entre modalidades, explique o funcionamento antes de orcar: o que pode ser usado no mesmo dia, o que funciona como saldo, o que exige horas consecutivas e quando deve encaminhar para humano.",
  "Quando houver mais de uma composicao viavel na base, compare as opcoes em vez de recomendar uma so. Exemplo: avulso em blocos de 2h, turno/diaria consecutiva, pacote de horas nao consecutivas e eventual saldo/complemento permitido pela base.",
  "Se a base trouxer uma matriz de simulacao, tabela de cenarios ou exemplos oficiais de calculo, use essa matriz como referencia principal antes de calcular por conta propria.",
  "Se o total de horas nao fechar exatamente em um pacote, explique de forma simples: pacote pode deixar saldo para uso futuro; avulso pode compor blocos de 2h; se faltar hora solta nao cadastrada, nao invente valor por hora e diga que o complemento exato precisa ser confirmado pela equipe.",
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
  "A mensagem atual tem prioridade sobre respostas anteriores. Se ela responder uma pergunta que a IA acabou de fazer, trate como continuidade e avance a conversa.",
  "Se o cliente escolher uma opcao textual como 'por hora', 'mensal', 'pacote', '10 horas' ou informar uma quantidade como '3 horas', use essa informacao para responder. Nao pergunte novamente a mesma coisa.",
  "Se a ultima pergunta da IA foi sobre quantidade de pessoas/participantes e o cliente respondeu apenas um numero, trate esse numero como quantidade de pessoas. Nao liste valores ainda; pergunte duracao e se sera em um unico encontro/dia ou em mais de um encontro.",
  "Para orcamento de sala, evento, servico por tempo, agenda ou uso recorrente, nao basta saber quantidade de pessoas. Antes de listar valores, colete separadamente: primeiro quantidade de ocorrencias/unidades do contexto, como aulas, reunioes, cursos, sessoes, consultas, encontros ou dias; depois duracao de cada ocorrencia, salvo se esses dados ja estiverem claros na mensagem atual ou no contexto estruturado.",
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
  "Quando houver desconto cadastrado na base e ele se aplicar aos dados atuais, calcule primeiro o valor bruto, depois o desconto e o total com desconto. Nao ignore desconto aplicavel.",
  "Se a base trouxer plano avulso de 2 horas por R$ 140 e o cliente pedir valor por hora, explique que o plano avulso cadastrado e de 2 horas por R$ 140. Se pedir 3 horas e nao houver preco de hora adicional, informe o valor cadastrado e diga que o valor exato para 3 horas precisa ser confirmado por atendente.",
  "Se o cliente pedir 1h, apenas 1 hora ou duracao menor que o bloco minimo cadastrado, calcule usando o bloco minimo da base. Para varias ocorrencias separadas, multiplique o bloco minimo pela quantidade de ocorrencias e aplique descontos cabiveis depois do valor bruto.",
  "Para comparacao de orcamento, mostre o total de horas primeiro e depois no maximo 2 ou 3 opcoes: avulso por blocos, pacote com saldo quando fizer sentido, e diaria/turno quando forem consecutivos no mesmo dia. Deixe claro o que cobre tudo e o que deixa saldo ou exige complemento. Mostre a soma: quantidade x valor unitario = total.",
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
  "Quando responder uma duvida com seguranca, finalize com uma pergunta natural de checagem ou continuidade, curta e amigavel, sem repetir sempre a mesma frase.",
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
  knowledge,
  structuredContext
}: {
  aiSetting: AiSetting;
  ticket: Ticket;
  message: string;
  contactName?: string;
  history: string;
  knowledge: string;
  structuredContext?: string;
}): Promise<string | null> => {
  if (!knowledge) return null;

  const activeHistory = getActiveConversationHistory(history);
  const answerPrompt = buildAnswerPrompt({
    message,
    history: activeHistory,
    knowledge,
    ticket,
    aiSetting,
    structuredContext
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
    const withoutRepeatedIncluded =
      historyHasIncludedSection(activeHistory) && !isIncludedItemsQuestion(message)
        ? stripIncludedSection(cleaned)
        : cleaned;

    return stripRepeatedGreeting(withoutRepeatedIncluded, ticket, activeHistory, contactName) || null;
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
  structuredContext
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
}): Promise<AiDecision> => {
  let generatedAnswer: string | null = null;

  try {
    generatedAnswer = await generateAnswerFromKnowledge({
      aiSetting,
      ticket,
      message,
      contactName,
      history,
      knowledge,
      structuredContext
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

const isBusinessCloseRequest = (message: string): boolean => {
  const normalized = normalizeText(message)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  return (
    /\b(fechar|finalizar|seguir|prosseguir|continuar|avancar|avanÃ§ar)\b.{0,80}\b(negocio|reserva|agendamento|contrato|contratacao|contrataÃ§Ã£o|compra|pedido|pacote|plano|orcamento|orÃ§amento|proposta)\b/.test(normalized) ||
    /\b(quero|queria|gostaria|vamos|bora|preciso|desejo)\b.{0,80}\b(fechar|finalizar|reservar|contratar|agendar)\b/.test(normalized)
  );
};

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
    "Evite looping: se a resposta que voce pretende enviar for parecida com a ultima resposta da IA, mude de acao. Para negativa curta apos oferta, encerre ou encaminhe; para pergunta nova, responda a pergunta nova; para duvida nao resolvida, encaminhe.",
    "Se a ultima pergunta foi diagnostica, como 'o erro acontece ao finalizar?', respostas como 'sim' ou 'nao' nao significam encerramento; continue o diagnostico.",
    "Se a ultima pergunta foi sobre quantidade de pessoas/participantes e o cliente respondeu apenas um numero, esse numero e a quantidade de pessoas. A proxima etapa e perguntar se sera em um unico dia/encontro ou em mais de um; se for mais de um, quantos ao todo. Nao liste valores ainda.",
    "Antes de enviar orcamento de qualquer servico que dependa de tempo, uso, agenda, ocorrencias, aulas, reunioes, cursos, sessoes, consultas, encontros, dias ou recorrencia, confirme os dados minimos: quantidade de pessoas/unidades quando aplicavel, quantidade de ocorrencias/unidades de agenda e duracao de cada ocorrencia. Se faltarem quantidade de ocorrencias e duracao, pergunte primeiro a quantidade de ocorrencias; depois as horas por ocorrencia.",
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
    "Pode responder perguntas sobre quem e a IA, qual seu papel, ou explicar uma resposta anterior usando o perfil configurado e o historico da conversa.",
    "Pode conversar de forma natural e humanizada, mas sem criar informacoes comerciais, tecnicas, promocionais, financeiras, medicas, juridicas ou operacionais fora da base.",
    "Pode vender, orientar, sugerir possiveis causas, explicar promocao, informar preco, conduzir agendamento, acompanhar pedido ou tirar duvidas somente quando houver base suficiente.",
    "Pode fazer calculos simples quando a base trouxer os dados numericos necessarios, como diaria x quantidade de dias, valor unitario x unidades ou soma simples.",
    "Se o cliente perguntar 'o que tenho direito?', 'o que entra?', 'o que inclui?', 'o que esta incluso?' ou equivalente, interprete como pergunta sobre inclusos/estrutura/beneficios do servico ou plano. Use responder_com_base se houver base.",
    "Em orcamentos, a resposta final deve mostrar a composicao da soma quando houver valor unitario: quantidade x valor unitario = total.",
    "Quando o cliente pedir comparacao, pacote, avulso, completar horas, saldo ou melhor custo, use responder_com_base se a base trouxer valores. Compare composicoes validas em vez de prender em uma unica opcao.",
    "Para servicos por hora, calcule o total de horas e compare: blocos avulsos, pacote com saldo, diaria/turno quando forem consecutivos. Se a base nao tiver hora solta para complemento, nao invente; explique que o complemento precisa ser confirmado.",
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
    "Ferramentas disponiveis: registrarLead, gerarResumoParaAtendente, transferirParaFila, encerrarAtendimento, consultarAgenda, criarAgendamento.",
    "Para transferir fila, encerrar, consultar agenda, criar agenda, registrar lead ou gerar resumo ao atendente, use acao executar_ferramenta com ferramenta e parametrosFerramenta.",
    "Para consultar/criar agenda, parametrosFerramenta deve conter start e end em ISO 8601. Para transferir fila, informe queueId.",
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
  const singleOccurrenceFromContext = collectedDataIndicatesSingleOccurrence(collectedData);
  const multipleOccurrencesFromContext = collectedDataIndicatesMultipleOccurrences(collectedData);
  const bareDuration = bareNumericAnswerToValue(message);

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
      motivo: "Quantidade de pessoas coletada; antes de orcar, coletar duracao e recorrencia/encontros.",
      resposta: [
        "Perfeito, anotei a quantidade de pessoas.",
        "Sera em um unico dia/encontro ou em mais de um? Se for mais de um, quantos dias/encontros serao ao todo?"
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
      resposta: [
        "Claro, consigo sim.",
        "Para fazer um novo orcamento, me envie os novos dados que voce quer simular, como quantidade, duracao, itens, dias ou recorrencia."
      ].join("\n\n")
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

  const participantCount = getParticipantCountFromContext(structuredContext);
  const capacityLimit = getCapacityLimitFromKnowledge(knowledge);
  const adjustedCapacityCount = getExplicitNumberFromMessage(message) || capacityLimit;

  if (
    articles.length > 0 &&
    isCapacityLimitAdjustmentRequest(message, ticket.lastAiMessage, capacityLimit) &&
    adjustedCapacityCount
  ) {
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
