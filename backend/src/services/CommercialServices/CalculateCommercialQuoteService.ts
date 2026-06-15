import { Op } from "sequelize";
import CommercialIncludedItem from "../../models/CommercialIncludedItem";
import CommercialPriceRule from "../../models/CommercialPriceRule";
import CommercialQuoteSimulation from "../../models/CommercialQuoteSimulation";
import CommercialService from "../../models/CommercialService";

type PricingDimension = "hours" | "quantity";
type RuleMode = "flexible" | "consecutive" | "fixed";

interface CalculateQuoteRequest {
  commercialServiceId?: number;
  aiSettingId?: number;
  ticketId?: number;
  contactId?: number;
  pricingDimension?: PricingDimension;
  participantCount?: number;
  quantity?: number;
  occurrenceCount?: number;
  durationPerOccurrence?: number;
  preferredMode?: RuleMode;
  maxUsefulOverage?: number;
  includeAlternatives?: boolean;
}

interface QuoteLine {
  priceRuleId: number;
  name: string;
  code?: string | null;
  ruleType: string;
  mode: RuleMode;
  quantity: number;
  count: number;
  unitPrice: number;
  total: number;
}

interface QuoteCandidate {
  mode: RuleMode;
  title: string;
  requestedQuantity: number;
  coveredQuantity: number;
  overage: number;
  total: number;
  lines: QuoteLine[];
  explanation: string;
}

interface CalculateQuoteResult {
  ok: boolean;
  status: "success" | "missing_data" | "capacity_exceeded" | "not_found";
  service?: {
    id: number;
    name: string;
    capacityMax: number | null;
  };
  requestedQuantity?: number;
  recommended?: QuoteCandidate;
  alternatives: QuoteCandidate[];
  includedItems: string[];
  validationMessage?: string;
}

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const formatMoney = (value: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const getRuleMode = (rule: CommercialPriceRule): RuleMode => {
  if (rule.mode === "consecutive") return "consecutive";
  if (rule.mode === "flexible") return "flexible";
  return rule.ruleType === "consecutive_hours" || rule.ruleType === "daily_rate"
    ? "consecutive"
    : rule.ruleType === "flexible_hours" || rule.ruleType === "package"
      ? "flexible"
      : "fixed";
};

const getRuleQuantity = (rule: CommercialPriceRule): number =>
  toNumber(rule.quantity || rule.quantityMax || rule.quantityMin || 1);

const getRulePrice = (rule: CommercialPriceRule): number => {
  const total = toNumber(rule.totalPrice);
  if (total > 0) return total;
  return toNumber(rule.unitPrice) * getRuleQuantity(rule);
};

const buildLine = (rule: CommercialPriceRule, count: number): QuoteLine => {
  const quantity = getRuleQuantity(rule);
  const unitPrice = getRulePrice(rule);
  return {
    priceRuleId: rule.id,
    name: rule.name,
    code: rule.code,
    ruleType: rule.ruleType,
    mode: getRuleMode(rule),
    quantity,
    count,
    unitPrice,
    total: roundMoney(unitPrice * count)
  };
};

const describeCandidate = (candidate: QuoteCandidate): string => {
  const parts = candidate.lines
    .map(line => `${line.name} x ${line.count} = ${formatMoney(line.unitPrice)} x ${line.count} = ${formatMoney(line.total)}`)
    .join(" + ");
  const saldo = candidate.overage > 0 ? ` Sobra ${candidate.overage} unidade(s) como saldo/margem.` : "";
  return `${parts}. Total: ${formatMoney(candidate.total)}.${saldo}`.trim();
};

const compareCandidates = (a: QuoteCandidate, b: QuoteCandidate): number => {
  if (a.total !== b.total) return a.total - b.total;
  if (a.overage !== b.overage) return a.overage - b.overage;
  if (a.lines.length !== b.lines.length) return a.lines.length - b.lines.length;
  return a.coveredQuantity - b.coveredQuantity;
};

const buildCandidatesForRules = (
  rules: CommercialPriceRule[],
  requestedQuantity: number,
  mode: RuleMode,
  maxUsefulOverage: number
): QuoteCandidate[] => {
  const usableRules = rules
    .filter(rule => getRuleMode(rule) === mode)
    .map(rule => ({ rule, quantity: getRuleQuantity(rule), price: getRulePrice(rule) }))
    .filter(item => item.quantity > 0 && item.price > 0)
    .sort((a, b) => a.quantity - b.quantity || a.price - b.price);

  if (!usableRules.length || requestedQuantity <= 0) return [];

  const maxRuleQuantity = Math.max(...usableRules.map(item => item.quantity));
  const limit = Math.ceil(requestedQuantity + Math.max(maxUsefulOverage, maxRuleQuantity));
  const bestByQuantity = new Map<number, { total: number; lines: QuoteLine[] }>();
  bestByQuantity.set(0, { total: 0, lines: [] });

  for (let quantity = 0; quantity <= limit; quantity += 1) {
    const current = bestByQuantity.get(quantity);
    if (!current) continue;

    usableRules.forEach(({ rule, quantity: ruleQuantity, price }) => {
      const nextQuantity = quantity + ruleQuantity;
      if (nextQuantity > limit) return;
      const existing = bestByQuantity.get(nextQuantity);
      const nextTotal = roundMoney(current.total + price);
      if (existing && existing.total <= nextTotal) return;

      const existingLineIndex = current.lines.findIndex(line => line.priceRuleId === rule.id);
      const lines = current.lines.map(line => ({ ...line }));
      if (existingLineIndex >= 0) {
        const line = lines[existingLineIndex];
        line.count += 1;
        line.total = roundMoney(line.total + price);
      } else {
        lines.push(buildLine(rule, 1));
      }
      bestByQuantity.set(nextQuantity, { total: nextTotal, lines });
    });
  }

  const allCandidates = Array.from(bestByQuantity.entries())
    .filter(([coveredQuantity]) => coveredQuantity >= requestedQuantity)
    .map(([coveredQuantity, data]) => ({
      mode,
      title: mode === "consecutive" ? "Uso consecutivo" : "Pacote flexível",
      requestedQuantity,
      coveredQuantity,
      overage: coveredQuantity - requestedQuantity,
      total: roundMoney(data.total),
      lines: data.lines.sort((a, b) => b.quantity - a.quantity),
      explanation: ""
    }));

  if (!allCandidates.length) return [];

  const bestWithinOverage = allCandidates
    .filter(candidate => candidate.overage <= maxUsefulOverage)
    .sort(compareCandidates)[0];
  const cheapest = allCandidates.sort(compareCandidates)[0];
  const maxAcceptedTotal = bestWithinOverage ? bestWithinOverage.total : cheapest.total;

  return allCandidates
    .filter(candidate => candidate.overage <= maxUsefulOverage || candidate.total <= maxAcceptedTotal)
    .sort(compareCandidates)
    .slice(0, 3)
    .map(candidate => ({
      ...candidate,
      explanation: describeCandidate(candidate)
    }));
};

const multiplyCandidate = (
  candidate: QuoteCandidate,
  occurrenceCount: number,
  requestedQuantity: number
): QuoteCandidate => {
  const lines = candidate.lines.map(line => ({
    ...line,
    count: line.count * occurrenceCount,
    total: roundMoney(line.total * occurrenceCount)
  }));
  const multiplied = {
    ...candidate,
    requestedQuantity,
    coveredQuantity: candidate.coveredQuantity * occurrenceCount,
    overage: candidate.coveredQuantity * occurrenceCount - requestedQuantity,
    total: roundMoney(candidate.total * occurrenceCount),
    lines
  };
  return { ...multiplied, explanation: describeCandidate(multiplied) };
};

const getRequestedQuantity = (request: CalculateQuoteRequest): number => {
  if (request.pricingDimension === "quantity") return toNumber(request.quantity);
  if (request.occurrenceCount && request.durationPerOccurrence) {
    return toNumber(request.occurrenceCount) * toNumber(request.durationPerOccurrence);
  }
  return toNumber(request.quantity);
};

const findCommercialService = async (request: CalculateQuoteRequest): Promise<CommercialService | null> => {
  if (request.commercialServiceId) {
    return CommercialService.findByPk(request.commercialServiceId);
  }

  if (request.aiSettingId) {
    return CommercialService.findOne({
      where: { aiSettingId: request.aiSettingId, active: true },
      order: [["id", "ASC"]]
    });
  }

  return CommercialService.findOne({ where: { active: true }, order: [["id", "ASC"]] });
};

const CalculateCommercialQuoteService = async (
  request: CalculateQuoteRequest
): Promise<CalculateQuoteResult> => {
  const service = await findCommercialService(request);
  if (!service) {
    return { ok: false, status: "not_found", alternatives: [], includedItems: [], validationMessage: "Serviço comercial não encontrado." };
  }

  const requestedQuantity = getRequestedQuantity(request);
  if (!requestedQuantity) {
    return { ok: false, status: "missing_data", alternatives: [], includedItems: [], validationMessage: "Quantidade insuficiente para calcular." };
  }

  const capacityMax = service.capacityMax ? Number(service.capacityMax) : null;
  if (capacityMax && request.participantCount && request.participantCount > capacityMax) {
    return {
      ok: false,
      status: "capacity_exceeded",
      service: { id: service.id, name: service.name, capacityMax },
      requestedQuantity,
      alternatives: [],
      includedItems: [],
      validationMessage: `Capacidade máxima: ${capacityMax}. Quantidade informada: ${request.participantCount}.`
    };
  }

  const [rules, includedItems] = await Promise.all([
    CommercialPriceRule.findAll({
      where: {
        commercialServiceId: service.id,
        active: true,
        ruleType: { [Op.in]: ["flexible_hours", "consecutive_hours", "package", "daily_rate", "fixed"] }
      },
      order: [["sortOrder", "ASC"], ["quantity", "ASC"], ["totalPrice", "ASC"]]
    }),
    CommercialIncludedItem.findAll({
      where: { commercialServiceId: service.id, active: true },
      order: [["sortOrder", "ASC"], ["id", "ASC"]]
    })
  ]);

  const maxUsefulOverage = request.maxUsefulOverage ?? 2;
  const flexCandidates = request.preferredMode === "consecutive"
    ? []
    : buildCandidatesForRules(rules, requestedQuantity, "flexible", maxUsefulOverage);

  let consecutiveCandidates: QuoteCandidate[] = [];
  if (request.preferredMode !== "flexible" && request.durationPerOccurrence) {
    const perOccurrence = buildCandidatesForRules(
      rules,
      toNumber(request.durationPerOccurrence),
      "consecutive",
      maxUsefulOverage
    );
    consecutiveCandidates = perOccurrence.map(candidate =>
      multiplyCandidate(candidate, Math.max(1, toNumber(request.occurrenceCount || 1)), requestedQuantity)
    );
  }

  const allCandidates = [...flexCandidates, ...consecutiveCandidates].sort(compareCandidates);
  const recommended = allCandidates[0];
  const alternatives = request.includeAlternatives
    ? allCandidates.slice(1, 3)
    : allCandidates
        .filter(candidate => recommended && candidate.mode !== recommended.mode && candidate.total < recommended.total)
        .slice(0, 1);

  const result: CalculateQuoteResult = {
    ok: Boolean(recommended),
    status: recommended ? "success" : "not_found",
    service: { id: service.id, name: service.name, capacityMax },
    requestedQuantity,
    recommended,
    alternatives,
    includedItems: includedItems.map(item => item.label),
    validationMessage: recommended ? undefined : "Nenhuma regra de preço cadastrada cobre essa necessidade."
  };

  if (request.ticketId || request.contactId || request.aiSettingId) {
    await CommercialQuoteSimulation.create({
      ticketId: request.ticketId || null,
      contactId: request.contactId || null,
      aiSettingId: request.aiSettingId || service.aiSettingId || null,
      commercialServiceId: service.id,
      status: result.status,
      input: JSON.stringify(request),
      result: JSON.stringify(result)
    } as any);
  }

  return result;
};

export default CalculateCommercialQuoteService;
