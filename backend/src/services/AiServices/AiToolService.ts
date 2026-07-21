import AiLead from "../../models/AiLead";
import AiSetting from "../../models/AiSetting";
import AiTicketContext from "../../models/AiTicketContext";
import AiToolExecution from "../../models/AiToolExecution";
import Contact from "../../models/Contact";
import ContactTag from "../../models/ContactTag";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import CalculateCommercialQuoteService, {
  CalculateQuoteRequest
} from "../CommercialServices/CalculateCommercialQuoteService";
import { appendPostQuoteMenu } from "./PostQuoteMenuService";
import { getEffectiveAllowedTools, isGuidedQuoteFlowEnabled } from "./GuidedFlowService";

export type AiToolName =
  | "registrarLead"
  | "gerarResumoParaAtendente"
  | "calcularOrcamento"
  | "transferirParaFila"
  | "encerrarAtendimento";

interface ExecuteAiToolRequest {
  ticket: Ticket;
  aiSetting: AiSetting;
  toolName: AiToolName;
  params?: Record<string, any>;
}

interface AiToolResult {
  ok: boolean;
  customerMessage?: string;
  internalMessage?: string;
  data?: Record<string, any>;
  errorMessage?: string;
}

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
};

const assertToolAllowed = (aiSetting: AiSetting, toolName: AiToolName): void => {
  const allowed = getEffectiveAllowedTools(aiSetting);
  if (!allowed.includes(toolName)) {
    throw new Error(`Ferramenta ${toolName} nao permitida para esta IA.`);
  }

  if (toolName === "calcularOrcamento" && !isGuidedQuoteFlowEnabled(aiSetting)) {
    throw new Error("Fluxo guiado de orcamento nao esta ativo para esta IA.");
  }
};

const getContext = async (ticketId: number): Promise<AiTicketContext | null> =>
  AiTicketContext.findOne({ where: { ticketId } });

const getContactTagIds = async (contactId: number): Promise<number[]> => {
  const rows = await ContactTag.findAll({ where: { contactId } });
  return rows.map(row => row.tagId);
};

const registerLead = async (
  ticket: Ticket,
  aiSetting: AiSetting
): Promise<AiToolResult> => {
  if (!ticket.contactId) {
    return { ok: false, errorMessage: "Ticket sem contato vinculado." };
  }

  const context = await getContext(ticket.id);
  const tagIds = await getContactTagIds(ticket.contactId);
  const payload = {
    ticketId: ticket.id,
    contactId: ticket.contactId,
    whatsappId: ticket.whatsappId || null,
    queueId: ticket.queueId || null,
    aiSettingId: aiSetting.id,
    status: "novo",
    source: "ai",
    summary: context?.summary || ticket.aiConversationSummary || null,
    collectedData: context?.collectedData || null,
    tagIds: JSON.stringify(tagIds)
  };

  const existing = await AiLead.findOne({ where: { ticketId: ticket.id } });
  const lead = existing ? await existing.update(payload) : await AiLead.create(payload as any);

  return {
    ok: true,
    internalMessage: `Lead #${lead.id} registrado/atualizado com dados do atendimento.`,
    data: { leadId: lead.id }
  };
};

const buildAttendantSummary = async (ticket: Ticket): Promise<AiToolResult> => {
  const context = await getContext(ticket.id);
  const contact = ticket.contactId ? await Contact.findByPk(ticket.contactId) : null;
  const collected = parseJson<Record<string, any>>(context?.collectedData, {});
  const collectedLines = Object.entries(collected)
    .map(([key, item]) => `- ${item.label || key}: ${item.value || item.rawValue || "nao informado"}`)
    .join("\n");

  const body = [
    "Resumo para atendimento humano:",
    contact ? `Cliente: ${contact.name || contact.number}` : "",
    context?.summary ? `\nResumo:\n${context.summary}` : "",
    collectedLines ? `\nDados coletados:\n${collectedLines}` : "",
    context?.nextQuestion ? `\nProxima pergunta sugerida: ${context.nextQuestion}` : ""
  ].filter(Boolean).join("\n");

  await CreateMessageService({
    messageData: {
      id: `ai-tool-summary-${ticket.id}-${Date.now()}`,
      ticketId: ticket.id,
      body,
      fromMe: true,
      senderType: "system",
      aiSessionStartedAt: ticket.aiStartedAt,
      read: true,
      mediaType: "chat",
      ack: 1
    }
  });

  return { ok: true, internalMessage: body, data: { summary: body } };
};

const calculateQuote = async (
  ticket: Ticket,
  aiSetting: AiSetting,
  params: Record<string, any>
): Promise<AiToolResult> => {
  const quoteRequest: CalculateQuoteRequest = {
    commercialServiceId: params.commercialServiceId ? Number(params.commercialServiceId) : undefined,
    aiSettingId: aiSetting.id,
    ticketId: ticket.id,
    contactId: ticket.contactId || undefined,
    pricingDimension: params.pricingDimension || "hours",
    participantCount: params.participantCount ? Number(params.participantCount) : undefined,
    quantity: params.quantity ? Number(params.quantity) : undefined,
    occurrenceCount: params.occurrenceCount ? Number(params.occurrenceCount) : undefined,
    durationPerOccurrence: params.durationPerOccurrence ? Number(params.durationPerOccurrence) : undefined,
    preferredMode: params.preferredMode,
    maxUsefulOverage: params.maxUsefulOverage ? Number(params.maxUsefulOverage) : undefined,
    includeAlternatives: Boolean(params.includeAlternatives)
  };
  const originalParticipantCount = quoteRequest.participantCount;
  const originalDuration = quoteRequest.durationPerOccurrence;
  const adjustmentMessages: string[] = [];
  let capacityAdjusted = false;
  let durationAdjusted = false;
  let result = await CalculateCommercialQuoteService(quoteRequest);

  for (let attempt = 0; attempt < 2 && !result.ok; attempt += 1) {
    if (result.status === "capacity_exceeded" && !capacityAdjusted) {
      const capacityLimit = result.service?.capacityMax || null;
      if (!capacityLimit) break;
      capacityAdjusted = true;
      quoteRequest.participantCount = capacityLimit;
      adjustmentMessages.push(
        `A capacidade é de até ${capacityLimit} pessoas. ` +
        `Vou seguir com o orçamento considerando esse limite.`
      );
      result = await CalculateCommercialQuoteService(quoteRequest);
      continue;
    }

    if (result.status === "duration_exceeded" && !durationAdjusted) {
      const durationLimit = result.service?.maxDurationPerOccurrence || null;
      if (!durationLimit) break;
      durationAdjusted = true;
      quoteRequest.durationPerOccurrence = durationLimit;
      adjustmentMessages.push(
        `O limite é de ${durationLimit}h por dia/encontro. ` +
        `Como você informou ${originalDuration}h, vou calcular considerando ${durationLimit}h por dia/encontro.`
      );
      result = await CalculateCommercialQuoteService(quoteRequest);
      continue;
    }

    break;
  }

  if (!result.ok) {
    return {
      ok: false,
      errorMessage: result.validationMessage || "Nao foi possivel calcular o orcamento.",
      data: result as any
    };
  }

  const recommended = result.recommended;
  const lines = recommended?.lines
    .map(line => `- ${line.name} x ${line.count}: R$ ${line.unitPrice.toFixed(2).replace(".", ",")} x ${line.count} = R$ ${line.total.toFixed(2).replace(".", ",")}`)
    .join("\n");
  const included = result.includedItems.length
    ? `\n\nIncluso:\n${result.includedItems.map(item => `- ${item}`).join("\n")}`
    : "";

  const customerMessage = [
    ...adjustmentMessages,
    "📌 Orçamento estimado",
    "",
    `⏱️ Total: ${result.requestedQuantity}h`,
    "",
    "Melhor opção encontrada:",
    "",
    lines,
    recommended ? `Total estimado: R$ ${recommended.total.toFixed(2).replace(".", ",")}` : "",
    included,
    "Simulação informativa: este orçamento precisa ser validado por um atendente, assim como disponibilidade, reserva e condições finais."
  ].filter(Boolean).join("\n");

  return {
    ok: true,
    customerMessage: appendPostQuoteMenu(customerMessage),
    data: {
      ...result,
      adjustments: {
        participantCount: capacityAdjusted
          ? { requested: originalParticipantCount, used: quoteRequest.participantCount }
          : null,
        durationPerOccurrence: durationAdjusted
          ? { requested: originalDuration, used: quoteRequest.durationPerOccurrence }
          : null
      }
    } as any
  };
};

const transferToQueue = async (
  ticket: Ticket,
  aiSetting: AiSetting,
  params: Record<string, any>
): Promise<AiToolResult> => {
  const queueId = Number(params.queueId || params.filaId || params.targetQueueId);
  const allowedIds = parseJson<number[]>(aiSetting.allowedTransferQueueIds, []).map(Number);

  if (!queueId || !allowedIds.includes(queueId)) {
    return { ok: false, errorMessage: "Fila nao permitida ou nao informada." };
  }

  const queue = await Queue.findByPk(queueId);
  if (!queue) return { ok: false, errorMessage: "Fila destino nao encontrada." };

  await UpdateTicketService({
    ticketId: ticket.id,
    ticketData: {
      queueId,
      aiActive: false,
      aiHandled: true,
      aiFinishedAt: new Date(),
      aiSettingId: null
    }
  });

  return {
    ok: true,
    customerMessage: params.message || `Vou encaminhar seu atendimento para a fila ${queue.name}.`,
    internalMessage: `Ticket transferido para ${queue.name}.`,
    data: { queueId }
  };
};

const closeTicket = async (
  ticket: Ticket,
  params: Record<string, any>
): Promise<AiToolResult> => {
  const closingReasonId = Number(params.closingReasonId || ticket.aiAutoCloseReasonId || ticket.closingReasonId);
  if (!closingReasonId) {
    return { ok: false, errorMessage: "Motivo de encerramento nao informado." };
  }

  await UpdateTicketService({
    ticketId: ticket.id,
    ticketData: {
      status: "closed",
      categoryId: ticket.categoryId,
      closingReasonId,
      closingNote: params.note || "Atendimento encerrado por ferramenta da IA.",
      aiActive: false,
      aiHandled: true,
      aiFinishedAt: new Date(),
      aiSettingId: ticket.aiSettingId
    }
  });

  return {
    ok: true,
    customerMessage: params.message || "Vou finalizar seu atendimento. Se precisar novamente, e so chamar.",
    internalMessage: "Ticket encerrado por ferramenta da IA."
  };
};

export const ExecuteAiToolService = async ({
  ticket,
  aiSetting,
  toolName,
  params = {}
}: ExecuteAiToolRequest): Promise<AiToolResult> => {
  const input = JSON.stringify(params || {});
  try {
    assertToolAllowed(aiSetting, toolName);

    const result =
      toolName === "registrarLead" ? await registerLead(ticket, aiSetting) :
      toolName === "gerarResumoParaAtendente" ? await buildAttendantSummary(ticket) :
      toolName === "calcularOrcamento" ? await calculateQuote(ticket, aiSetting, params) :
      toolName === "transferirParaFila" ? await transferToQueue(ticket, aiSetting, params) :
      toolName === "encerrarAtendimento" ? await closeTicket(ticket, params) :
      { ok: false, errorMessage: "Ferramenta desconhecida." };

    await AiToolExecution.create({
      ticketId: ticket.id,
      aiSettingId: aiSetting.id,
      toolName,
      status: result.ok ? "success" : "blocked",
      input,
      output: JSON.stringify(result.data || {}),
      errorMessage: result.errorMessage || null,
      executedAt: new Date()
    } as any);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await AiToolExecution.create({
      ticketId: ticket.id,
      aiSettingId: aiSetting.id,
      toolName,
      status: "error",
      input,
      output: null,
      errorMessage,
      executedAt: new Date()
    } as any);
    return { ok: false, errorMessage };
  }
};

export default ExecuteAiToolService;
