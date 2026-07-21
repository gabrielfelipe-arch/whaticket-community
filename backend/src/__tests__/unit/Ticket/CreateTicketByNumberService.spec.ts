import NormalizeDirectPhoneNumber from "../../../services/TicketServices/NormalizeDirectPhoneNumber";

describe("CreateTicketByNumberService", () => {
  it("normalizes common phone formatting before provider validation", () => {
    expect(NormalizeDirectPhoneNumber("+55 (21) 99999-1234"))
      .toBe("5521999991234");
  });

  it("removes provider jid suffixes from validated numbers", () => {
    expect(NormalizeDirectPhoneNumber("5521999991234@s.whatsapp.net"))
      .toBe("5521999991234");
  });

  it("adds the Brazilian country code when only DDD and phone are informed", () => {
    expect(NormalizeDirectPhoneNumber("(21) 99999-1234", { applyBrazilDefault: true }))
      .toBe("5521999991234");
  });

  it("removes the optional trunk zero before a Brazilian DDD", () => {
    expect(NormalizeDirectPhoneNumber("(021) 99999-1234", { applyBrazilDefault: true }))
      .toBe("5521999991234");
  });

  it("preserves an explicitly informed international country code", () => {
    expect(NormalizeDirectPhoneNumber("+54 9 11 2345-6789", { applyBrazilDefault: true }))
      .toBe("5491123456789");
  });
});
