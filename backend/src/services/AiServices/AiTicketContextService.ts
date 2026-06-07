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
  contradictions?: string[];
  currentObjective?: string | null;
  nextQuestion?: string | null;
  lastAiIntent?: string | null;
  lastAiAction?: string | null;
  lastAiDecisionReason?: string | null;
  lastKnowledgeIds?: number[] | string | null;
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

export const UpdateAiTicketContextService = async ({
  ticket,
  source,
  summary,
  collectedData,
  missingData,
  contradictions,
  currentObjective,
  nextQuestion,
  lastAiIntent,
  lastAiAction,
  lastAiDecisionReason,
  lastKnowledgeIds
}: UpdateAiTicketContextRequest): Promise<AiTicketContext> => {
  const existing = await AiTicketContext.findOne({ where: { ticketId: ticket.id } });
  const now = new Date();

  const mergedCollected: CollectedData = parseJson<CollectedData>(existing?.collectedData, {});
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
    : parseJson<string[]>(existing?.missingData, []);
  const nextContradictions = contradictions
    ? normalizeArray(contradictions)
    : parseJson<string[]>(existing?.contradictions, []);
  const serializedKnowledgeIds = Array.isArray(lastKnowledgeIds)
    ? JSON.stringify(lastKnowledgeIds)
    : lastKnowledgeIds || existing?.lastKnowledgeIds || null;

  const payload = {
    ticketId: ticket.id,
    summary: truncate(summary || existing?.summary || ticket.aiConversationSummary),
    collectedData: stringify(mergedCollected),
    missingData: stringify(nextMissing),
    contradictions: stringify(nextContradictions),
    currentObjective: currentObjective !== undefined ? currentObjective : existing?.currentObjective || null,
    nextQuestion: nextQuestion !== undefined ? nextQuestion : existing?.nextQuestion || null,
    lastSource: source,
    lastAiIntent: lastAiIntent !== undefined ? lastAiIntent : existing?.lastAiIntent || null,
    lastAiAction: lastAiAction !== undefined ? lastAiAction : existing?.lastAiAction || null,
    lastAiDecisionReason: lastAiDecisionReason !== undefined ? lastAiDecisionReason : existing?.lastAiDecisionReason || null,
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

export const BuildAiTicketContextTextService = async (ticketId: number): Promise<string> => {
  const context = await AiTicketContext.findOne({ where: { ticketId } });
  if (!context) return "";

  const collected = parseJson<CollectedData>(context.collectedData, {});
  const missing = parseJson<string[]>(context.missingData, []);
  const contradictions = parseJson<string[]>(context.contradictions, []);
  const collectedLines = Object.entries(collected)
    .map(([key, item]) => `- ${item.label || key}: ${item.value || item.rawValue || "nao informado"}`)
    .join("\n");

  return [
    context.summary ? `Resumo estruturado:\n${context.summary}` : "",
    collectedLines ? `Dados ja coletados:\n${collectedLines}` : "",
    missing.length ? `Dados faltantes:\n${missing.map(item => `- ${item}`).join("\n")}` : "",
    contradictions.length ? `Contradicoes/incertezas:\n${contradictions.map(item => `- ${item}`).join("\n")}` : "",
    context.currentObjective ? `Objetivo atual: ${context.currentObjective}` : "",
    context.nextQuestion ? `Proxima pergunta sugerida: ${context.nextQuestion}` : "",
    context.lastAiAction ? `Ultima acao registrada no contexto: ${context.lastAiAction}` : "",
    context.lastAiDecisionReason ? `Motivo da ultima decisao: ${context.lastAiDecisionReason}` : ""
  ].filter(Boolean).join("\n\n");
};
