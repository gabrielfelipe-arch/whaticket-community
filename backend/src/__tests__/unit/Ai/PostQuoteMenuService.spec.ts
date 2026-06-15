import {
  POST_QUOTE_MENU_TEXT,
  appendPostQuoteMenu,
  isPostQuoteMenuOption
} from "../../../services/AiServices/PostQuoteMenuService";

describe("PostQuoteMenuService", () => {
  it("keeps only the approved post quote menu options", () => {
    expect(POST_QUOTE_MENU_TEXT).toContain("1. Confirmar disponibilidade/reserva com a equipe");
    expect(POST_QUOTE_MENU_TEXT).toContain("2. Fazer uma nova simulação");
    expect(POST_QUOTE_MENU_TEXT).toContain("3. Tenho outra dúvida");
    expect(POST_QUOTE_MENU_TEXT).not.toContain("desconto");
    expect(POST_QUOTE_MENU_TEXT).not.toContain("pagamento");
  });

  it.each([
    ["1", "1"],
    ["quero confirmar disponibilidade", "1"],
    ["fazer nova simulação", "2"],
    ["tenho outra dúvida", "3"]
  ])("detects menu option from %s", (message, expected) => {
    expect(isPostQuoteMenuOption(message)).toBe(expected);
  });

  it("replaces the old follow-up question with the new menu", () => {
    const response = appendPostQuoteMenu("Total estimado: R$ 900\n\nQuer seguir com essa opcao?");

    expect(response).toContain("Total estimado: R$ 900");
    expect(response).toContain("Como deseja prosseguir?");
    expect(response).not.toContain("Quer seguir com essa opcao?");
  });
});
