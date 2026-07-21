import prepareWhatsAppText from "../../../helpers/PrepareWhatsAppText";

describe("prepareWhatsAppText", () => {
  it("moves a bold closing mark from the middle to the end of a word", () => {
    expect(prepareWhatsAppText("Ola, me chamo *Gabrie*l."))
      .toBe("Ola, me chamo *Gabriel*.");
  });

  it("preserves valid WhatsApp bold markup", () => {
    expect(prepareWhatsAppText("*Gabriel Martins:*\noi"))
      .toBe("*Gabriel Martins:*\noi");
  });

  it("does not mistake a previous closing mark for a new opening mark", () => {
    expect(prepareWhatsAppText("*Atendente* e *Gabrie*l"))
      .toBe("*Atendente* e *Gabriel*");
  });

  it("converts Markdown bold markup to WhatsApp markup", () => {
    expect(prepareWhatsAppText("Ola, **Gabriel**"))
      .toBe("Ola, *Gabriel*");
  });

  it("removes a leading direction mark without changing valid formatting", () => {
    expect(prepareWhatsAppText("\u200e*Gabriel*"))
      .toBe("*Gabriel*");
  });
});
