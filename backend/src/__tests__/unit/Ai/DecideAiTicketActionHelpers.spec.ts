import { getParticipantCountFromCurrentMessageContext } from "../../../services/AiServices/DecideAiTicketActionService";

describe("DecideAiTicketActionService participant reply helpers", () => {
  it("uses the participant range extracted from the current reply even with a typo", () => {
    expect(getParticipantCountFromCurrentMessageContext({
      participant_count: {
        value: "25",
        rawValue: "15 a 25 oessoas"
      }
    }, "15 a 25 oessoas")).toBe(25);
  });

  it("does not reuse a participant count collected from an older message", () => {
    expect(getParticipantCountFromCurrentMessageContext({
      participant_count: {
        value: "25",
        rawValue: "15 a 25 pessoas"
      }
    }, "quantas horas?")).toBeNull();
  });
});
