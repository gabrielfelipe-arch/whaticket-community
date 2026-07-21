import CommercialIncludedItem from "../../../models/CommercialIncludedItem";
import CommercialPriceRule from "../../../models/CommercialPriceRule";
import CommercialQuoteSimulation from "../../../models/CommercialQuoteSimulation";
import CommercialService from "../../../models/CommercialService";
import CalculateCommercialQuoteService from "../../../services/CommercialServices/CalculateCommercialQuoteService";

jest.mock("../../../models/CommercialIncludedItem", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));
jest.mock("../../../models/CommercialPriceRule", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));
jest.mock("../../../models/CommercialQuoteSimulation", () => ({
  __esModule: true,
  default: { create: jest.fn() }
}));
jest.mock("../../../models/CommercialService", () => ({
  __esModule: true,
  default: { findByPk: jest.fn(), findOne: jest.fn() }
}));

const service = (maxDurationPerOccurrence: number | null) => ({
  id: 1,
  aiSettingId: 1,
  name: "Salinha Meier",
  capacityMax: 20,
  maxDurationPerOccurrence
});

const flexibleTenHourRule = {
  id: 1,
  name: "Pacote flexivel de 10h",
  code: "FLEX_10H",
  ruleType: "flexible_hours",
  mode: "flexible",
  quantity: 10,
  quantityMin: null,
  quantityMax: null,
  unitPrice: null,
  totalPrice: 600
};

describe("CalculateCommercialQuoteService duration limit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (CommercialIncludedItem.findAll as jest.Mock).mockResolvedValue([]);
    (CommercialPriceRule.findAll as jest.Mock).mockResolvedValue([flexibleTenHourRule]);
    (CommercialQuoteSimulation.create as jest.Mock).mockResolvedValue({});
  });

  it("rejects a duration above the configured limit for one occurrence", async () => {
    (CommercialService.findOne as jest.Mock).mockResolvedValue(service(10));

    const result = await CalculateCommercialQuoteService({
      aiSettingId: 1,
      pricingDimension: "hours",
      participantCount: 10,
      occurrenceCount: 1,
      durationPerOccurrence: 30
    });

    expect(result.status).toBe("duration_exceeded");
    expect(result.service?.maxDurationPerOccurrence).toBe(10);
    expect(CommercialPriceRule.findAll).not.toHaveBeenCalled();
  });

  it("allows totals above ten hours when each occurrence stays within the limit", async () => {
    (CommercialService.findOne as jest.Mock).mockResolvedValue(service(10));

    const result = await CalculateCommercialQuoteService({
      aiSettingId: 1,
      pricingDimension: "hours",
      participantCount: 10,
      occurrenceCount: 3,
      durationPerOccurrence: 10
    });

    expect(result.status).toBe("success");
    expect(result.requestedQuantity).toBe(30);
  });

  it("allows a total-hours request above the limit when no per-occurrence duration is supplied", async () => {
    (CommercialService.findOne as jest.Mock).mockResolvedValue(service(10));

    const result = await CalculateCommercialQuoteService({
      aiSettingId: 1,
      pricingDimension: "quantity",
      participantCount: 10,
      quantity: 30
    });

    expect(result.status).toBe("success");
    expect(result.requestedQuantity).toBe(30);
  });

  it("validates per-occurrence duration even when the caller uses quantity pricing", async () => {
    (CommercialService.findOne as jest.Mock).mockResolvedValue(service(10));

    const result = await CalculateCommercialQuoteService({
      aiSettingId: 1,
      pricingDimension: "quantity",
      participantCount: 10,
      quantity: 30,
      occurrenceCount: 1,
      durationPerOccurrence: 30
    });

    expect(result.status).toBe("duration_exceeded");
  });

  it("preserves the previous behavior when the limit is disabled", async () => {
    (CommercialService.findOne as jest.Mock).mockResolvedValue(service(null));

    const result = await CalculateCommercialQuoteService({
      aiSettingId: 1,
      pricingDimension: "hours",
      participantCount: 10,
      occurrenceCount: 1,
      durationPerOccurrence: 30
    });

    expect(result.status).toBe("success");
    expect(result.requestedQuantity).toBe(30);
  });
});
