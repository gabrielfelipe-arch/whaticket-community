import CalculateCommercialQuoteService from "../../../services/CommercialServices/CalculateCommercialQuoteService";
import { UpdateAiTicketContextService } from "../../../services/AiServices/AiTicketContextService";
import { buildCommercialQuoteDecision } from "../../../services/AiServices/DecideAiTicketActionService";

jest.mock("../../../services/CommercialServices/CalculateCommercialQuoteService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../../services/AiServices/AiTicketContextService", () => ({
  AnalyzeAndUpdateAiTicketContextService: jest.fn(),
  BuildAiTicketContextTextService: jest.fn(),
  UpdateAiTicketContextService: jest.fn()
}));

describe("guided commercial quote duration adjustment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("caps an impossible daily duration and returns the quote without handoff", async () => {
    (CalculateCommercialQuoteService as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: "duration_exceeded",
        service: {
          id: 1,
          name: "Salinha Meier",
          capacityMax: 20,
          maxDurationPerOccurrence: 10
        },
        alternatives: [],
        includedItems: []
      })
      .mockResolvedValueOnce({
        ok: true,
        status: "success",
        service: {
          id: 1,
          name: "Salinha Meier",
          capacityMax: 20,
          maxDurationPerOccurrence: 10
        },
        requestedQuantity: 10,
        recommended: {
          total: 600,
          coveredQuantity: 10,
          overage: 0,
          lines: [{
            name: "Pacote flexivel 10h",
            count: 1,
            unitPrice: 600,
            total: 600
          }]
        },
        alternatives: [],
        includedItems: []
      });

    const decision = await buildCommercialQuoteDecision({
      ticket: { id: 99, contactId: 10 } as any,
      aiSetting: { id: 1 } as any,
      message: "30 horas",
      quoteData: {
        participantCount: 10,
        occurrenceCount: 1,
        durationHours: 30
      },
      activeHistory: "",
      knowledgeIds: [1],
      reason: "teste"
    });

    expect(CalculateCommercialQuoteService).toHaveBeenNthCalledWith(2, expect.objectContaining({
      occurrenceCount: 1,
      durationPerOccurrence: 10
    }));
    expect(UpdateAiTicketContextService).toHaveBeenCalledWith(expect.objectContaining({
      source: "commercial_quote_limit",
      collectedData: expect.objectContaining({
        duration: expect.objectContaining({ value: "10h" })
      })
    }));
    expect(decision?.acao).toBe("responder_com_base");
    expect(decision?.resposta).toContain("30h por dia/encontro");
    expect(decision?.resposta).toContain("considerando 10h por dia/encontro");
    expect(decision?.operationalStatePatch?.lastQuote).toEqual(expect.objectContaining({
      hoursPerMeeting: 10,
      totalHours: 10
    }));
  });
});
