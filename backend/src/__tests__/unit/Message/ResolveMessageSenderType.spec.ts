import ResolveMessageSenderType from "../../../helpers/ResolveMessageSenderType";

describe("ResolveMessageSenderType", () => {
  it.each(["ai", "system", "ura"] as const)(
    "preserves an existing automatic sender type when the WhatsApp echo arrives as human (%s)",
    existingSenderType => {
      expect(ResolveMessageSenderType({
        requestedSenderType: "human",
        existingSenderType,
        fromMe: true
      })).toBe(existingSenderType);
    }
  );

  it("keeps a genuine outgoing human message as human", () => {
    expect(ResolveMessageSenderType({
      requestedSenderType: "human",
      existingSenderType: "human",
      fromMe: true
    })).toBe("human");
  });

  it("does not reuse an outgoing sender type for an incoming customer message", () => {
    expect(ResolveMessageSenderType({
      requestedSenderType: "customer",
      existingSenderType: "ai",
      fromMe: false
    })).toBe("customer");
  });

  it("allows an explicit AI classification to replace an earlier generic classification", () => {
    expect(ResolveMessageSenderType({
      requestedSenderType: "ai",
      existingSenderType: "human",
      fromMe: true
    })).toBe("ai");
  });
});
