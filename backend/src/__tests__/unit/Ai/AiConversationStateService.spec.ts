import AiTicketContext from "../../../models/AiTicketContext";
import {
  ApplyAiResponseAntiLoopService,
  EvaluateAiConversationStateService
} from "../../../services/AiServices/AiConversationStateService";
import { UpdateAiTicketContextService } from "../../../services/AiServices/AiTicketContextService";

jest.mock("../../../models/AiTicketContext", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock("../../../services/AiServices/AiTicketContextService", () => ({
  UpdateAiTicketContextService: jest.fn()
}));

const ticket = (overrides: Record<string, any> = {}): any => ({
  id: 1,
  lastAiMessage: null,
  lastAiAction: null,
  lastAiIntent: null,
  ...overrides
});

const aiSetting = (overrides: Record<string, any> = {}): any => ({
  id: 1,
  name: "Mari",
  companyName: "Salinha Meier",
  useGuidedFlow: true,
  guidedFlowKey: "room_rental_people_days_hours",
  ...overrides
});

const context = (state: Record<string, any> = {}, overrides: Record<string, any> = {}): any => ({
  ticketId: 1,
  operationalState: JSON.stringify(state),
  collectedData: "{}",
  missingData: "[]",
  ...overrides
});

describe("AiConversationStateService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (UpdateAiTicketContextService as jest.Mock).mockResolvedValue({});
    (AiTicketContext.findOne as jest.Mock).mockResolvedValue(null);
  });

  it.each(["quero", "vamos recalcular", "quero fazer"])(
    "starts quote revision when customer accepts previous quote revision offer with %s",
    async message => {
      const decision = await EvaluateAiConversationStateService({
        ticket: ticket(),
        aiSetting: aiSetting(),
        message,
        context: context({
          lastOfferType: "quote_revision",
          awaitingConfirmationFor: "quote_revision",
          lastQuote: {
            people: 20,
            meetingCount: 3,
            hoursPerMeeting: 5,
            totalHours: 15,
            total: 900
          }
        })
      });

      expect(decision?.detectedIntent).toBe("revisar_orcamento");
      expect(decision?.acceptedPreviousOffer).toBe(true);
      expect(decision?.nextQuestionKey).toBe("quote_revision_scope");
      expect(decision?.aiDecision.resposta).toContain("pessoas, dias ou horas");
    }
  );

  it("asks people when customer accepts quote revision without lastQuote", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "sim",
      context: context({
        lastOfferType: "quote_revision",
        awaitingConfirmationFor: "quote_revision"
      })
    });

    expect(decision?.nextQuestionKey).toBe("people");
    expect(decision?.aiDecision.resposta).toContain("Para quantas pessoas");
  });

  it("routes affirmative answer to human transfer when previous offer was human transfer", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "quero",
      context: context({
        lastOfferType: "human_transfer",
        awaitingConfirmationFor: "human_transfer"
      })
    });

    expect(decision?.aiDecision.acao).toBe("encaminhar_atendente");
    expect(decision?.toolToCall).toBe("transferirParaFila");
  });

  it("routes post quote option 1 to the team without confirming reservation", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "1",
      context: context({
        lastOfferType: "post_quote_menu",
        awaitingConfirmationFor: "post_quote_menu"
      })
    });

    expect(decision?.detectedIntent).toBe("confirmar_reserva_com_equipe");
    expect(decision?.aiDecision.acao).toBe("encaminhar_atendente");
    expect(decision?.aiDecision.resposta).toContain("validar disponibilidade");
    expect(decision?.aiDecision.resposta).not.toContain("reserva confirmada");
  });

  it("routes post quote option 2 to a new simulation", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "2",
      context: context({
        lastOfferType: "post_quote_menu",
        awaitingConfirmationFor: "post_quote_menu",
        lastQuote: { people: 10, totalHours: 15, total: 900 }
      })
    });

    expect(decision?.detectedIntent).toBe("nova_simulacao");
    expect(decision?.aiDecision.acao).toBe("pedir_mais_informacoes");
    expect(decision?.nextQuestionKey).toBe("people");
  });

  it("routes post quote option 3 to free question collection", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "3",
      context: context({
        lastOfferType: "post_quote_menu",
        awaitingConfirmationFor: "post_quote_menu"
      })
    });

    expect(decision?.detectedIntent).toBe("outra_duvida");
    expect(decision?.aiDecision.acao).toBe("pedir_mais_informacoes");
    expect(decision?.aiDecision.resposta).toContain("Qual e a sua duvida");
  });

  it("routes affirmative answer to close ticket when previous offer was close ticket", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "pode",
      context: context({
        lastOfferType: "close_ticket",
        awaitingConfirmationFor: "close_ticket"
      })
    });

    expect(decision?.aiDecision.acao).toBe("encerrar_atendimento");
    expect(decision?.aiDecision.resposta).toContain("[FECHAR TICKET]");
  });

  it("saves meetingCount when last question asked for days or meetings", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "3",
      context: context({
        lastQuestionKey: "meetingCount",
        lastQuote: { people: 10 }
      })
    });

    expect(decision?.answeredField).toBe("meetingCount");
    expect(decision?.nextState.lastQuote?.meetingCount).toBe(3);
    expect(decision?.collectedDataPatch?.occurrences.value).toBe("3");
  });

  it("saves hoursPerMeeting when last question asked for hours", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "4",
      context: context({
        lastQuestionKey: "hoursPerMeeting",
        lastQuote: { people: 10, meetingCount: 3 }
      })
    });

    expect(decision?.answeredField).toBe("hoursPerMeeting");
    expect(decision?.nextState.lastQuote?.hoursPerMeeting).toBe(4);
    expect(decision?.requiresTool).toBe(true);
    expect(decision?.toolToCall).toBe("calcularOrcamento");
  });

  it.each(["quem e voce?", "e voce faz o que?", "voce e robo?"])(
    "answers identity or role question as in-context: %s",
    async message => {
      const decision = await EvaluateAiConversationStateService({
        ticket: ticket(),
        aiSetting: aiSetting(),
        message,
        context: context()
      });

      expect(decision?.detectedIntent).toBe("identidade_ou_funcao_ia");
      expect(decision?.aiDecision.resposta).toContain("Sou a Mari");
      expect(decision?.aiDecision.resposta).toContain("valores");
    }
  );

  it("does not force fixed operational text when customer reports loop", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "voce esta em looping",
      context: context({
        lastQuote: { people: 20, meetingCount: 3, hoursPerMeeting: 5 }
      })
    });

    expect(decision).toBeNull();
  });

  it("uses the upper bound when customer answers participant count as a range", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "de 10 a 15 pessoas",
      context: context({
        lastQuestionKey: "people",
        lastQuote: {}
      })
    });

    expect(decision?.answeredField).toBe("people");
    expect(decision?.nextState.lastQuote?.people).toBe(15);
    expect(decision?.collectedDataPatch?.participant_count.value).toBe("15");
    expect(decision?.nextQuestionKey).toBe("meetingCount");
  });

  it("does not accept ranged hours as exact duration for quote calculation", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "de 3 a 4 horas",
      context: context({
        lastQuestionKey: "hoursPerMeeting",
        lastQuote: { people: 10, meetingCount: 2 }
      })
    });

    expect(decision).toBeNull();
  });

  it.each(["Aceita cartao?", "Pix?", "Qual endereco da sala?", "Tem projetor?"])(
    "does not keep post quote menu active for clear knowledge question: %s",
    async message => {
      const decision = await EvaluateAiConversationStateService({
        ticket: ticket(),
        aiSetting: aiSetting(),
        message,
        context: context({
          lastOfferType: "post_quote_menu",
          awaitingConfirmationFor: "post_quote_menu",
          lastQuote: { people: 5, meetingCount: 6, hoursPerMeeting: 3, total: 1000 }
        })
      });

      expect(decision).toBeNull();
    }
  );

  it.each(["Tem mas oq?", "E tem quadri verde?"])(
    "does not treat structure question as quote data while quote revision is pending: %s",
    async message => {
      const decision = await EvaluateAiConversationStateService({
        ticket: ticket(),
        aiSetting: aiSetting(),
        message,
        context: context({
          lastQuestionKey: "people",
          quoteRevisionMode: "awaiting_scope",
          lastQuote: { people: 2, meetingCount: 3, hoursPerMeeting: 2, total: 420 }
        })
      });

      expect(decision).toBeNull();
    }
  );

  it("does not answer with fixed operational text when customer makes a light personal comment while quote exists", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "Vc e simpatica?",
      context: context({
        lastQuestionKey: "people",
        quoteRevisionMode: "awaiting_scope",
        lastQuote: { people: 2, meetingCount: 3, hoursPerMeeting: 2, total: 420 }
      })
    });

    expect(decision).toBeNull();
  });

  it("updates people and requests quote calculation when last quote has enough data", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "agora sao 10 pessoas",
      context: context({
        lastQuote: {
          people: 20,
          meetingCount: 3,
          hoursPerMeeting: 5
        }
      })
    });

    expect(decision?.answeredField).toBe("people");
    expect(decision?.nextState.lastQuote?.people).toBe(10);
    expect(decision?.requiresTool).toBe(true);
  });

  it("updates meetingCount and requests quote calculation when customer changes days", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "muda para 4 dias",
      context: context({
        lastQuote: {
          people: 20,
          meetingCount: 3,
          hoursPerMeeting: 5
        }
      })
    });

    expect(decision?.answeredField).toBe("meetingCount");
    expect(decision?.nextState.lastQuote?.meetingCount).toBe(4);
    expect(decision?.requiresTool).toBe(true);
  });

  it("blocks repeated response and advances route", async () => {
    const previous = "Entendo. Posso refazer a simulacao com outro formato de uso dentro da tabela, se voce quiser comparar um cenario diferente.";
    (AiTicketContext.findOne as jest.Mock).mockResolvedValue(context({
      lastAssistantMessage: previous,
      lastQuote: {
        people: 20,
        meetingCount: 3,
        hoursPerMeeting: 5
      }
    }));

    const result = await ApplyAiResponseAntiLoopService(
      ticket({ lastAiMessage: previous }),
      {
        intencao: "expressando_objecao",
        confianca: "alta",
        mensagemInterpretada: "quero mudar horas",
        contexto: "",
        baseEncontrada: true,
        respostaSegura: true,
        acao: "responder_com_base",
        motivo: "teste",
        resposta: previous
      },
      previous
    );

    expect(result.response).toContain("Quantas horas");
    expect(result.decision.acao).toBe("pedir_mais_informacoes");
    expect(UpdateAiTicketContextService).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "anti_loop",
        operationalState: expect.objectContaining({
          repeatedResponseCount: 1,
          lastQuestionKey: "hoursPerMeeting"
        })
      })
    );
  });

  it("does not replace repeated factual payment answer with quote revision prompt", async () => {
    const previous = "A Salinha Meier aceita Pix, cartao de debito e cartao de credito.";
    (AiTicketContext.findOne as jest.Mock).mockResolvedValue(context({
      lastAssistantMessage: previous,
      lastAssistantAction: "responder_com_base",
      lastResponseGoal: "Full Base Grounding respondeu com base completa enviada ao modelo.",
      lastOfferType: "post_quote_menu",
      awaitingConfirmationFor: "post_quote_menu",
      lastQuote: {
        people: 5,
        meetingCount: 6,
        hoursPerMeeting: 3
      }
    }));

    const decision = {
      intencao: "request_payment_info",
      confianca: "alta",
      mensagemInterpretada: "Aceita Pix?",
      contexto: "Full Base Grounding respondeu com base completa enviada ao modelo.",
      baseEncontrada: true,
      respostaSegura: true,
      acao: "responder_com_base",
      motivo: "teste",
      resposta: previous
    } as any;

    const result = await ApplyAiResponseAntiLoopService(
      ticket({ lastAiMessage: previous, lastAiAction: "responder_com_base" }),
      decision,
      previous
    );

    expect(result.response).toBe(previous);
    expect(result.decision.acao).toBe("responder_com_base");
    expect(result.response).not.toContain("Me passa os novos dados");
    expect(UpdateAiTicketContextService).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "anti_loop",
        operationalState: expect.objectContaining({
          lastOfferType: null,
          awaitingConfirmationFor: null,
          lastQuestionKey: null
        })
      })
    );
  });

  it("uses semantic decision to answer previous quote instead of forcing pending quote revision", async () => {
    const decision = await EvaluateAiConversationStateService({
      ticket: ticket(),
      aiSetting: aiSetting(),
      message: "nao quero mudar, qual valor deu?",
      context: context({
        lastOfferType: "quote_revision",
        awaitingConfirmationFor: "quote_revision",
        lastQuote: {
          people: 20,
          meetingCount: 3,
          hoursPerMeeting: 5,
          total: 900
        }
      }),
      semanticDecision: {
        conversationUnderstanding: {
          conversationMode: "commercial",
          customerMood: "neutral",
          topicStatus: "new_topic",
          shouldContinueSelling: true,
          shouldSlowDown: false,
          shouldApologizeOrRecover: false
        },
        messageUnderstanding: {
          primaryIntent: "pergunta_sobre_orcamento_anterior",
          secondaryIntent: "recusa_do_fluxo_pendente",
          intentGroup: "commercial",
          isNewIntent: true,
          isReplyToPendingFlow: false,
          isQuestion: true,
          isCorrection: false,
          isRefusal: true,
          isAcceptance: false,
          confidence: 0.9
        },
        businessContext: {
          businessType: "Salinha Meier",
          capability: "quote",
          targetEntityType: "room",
          targetEntityName: null
        },
        contextUse: {
          usesLastQuestion: false,
          usesLastOffer: true,
          usesLastQuote: true,
          usesCatalog: false,
          usesKnowledgeBase: false,
          shouldSuspendPendingFlow: true,
          shouldResumePendingFlowAfterAnswer: true
        },
        dataExtraction: {
          updatedFields: {},
          filters: {},
          requestedInfo: "last_quote_total"
        },
        nextAction: {
          type: "answer_question",
          tool: null,
          requiresBackendValidation: false,
          shouldAskClarification: false,
          nextQuestionKey: null
        },
        responsePlan: {
          goal: "responder_valor_anterior_e_retornar_ao_contexto",
          style: "short_natural_whatsapp",
          mustNotRepeatLastAnswer: true,
          shouldEndWithQuestion: true
        }
      }
    });

    expect(decision?.detectedIntent).toBe("pergunta_sobre_orcamento_anterior");
    expect(decision?.aiDecision.resposta).toContain("R$ 900,00");
    expect(decision?.acceptedPreviousOffer).toBe(false);
  });
});
