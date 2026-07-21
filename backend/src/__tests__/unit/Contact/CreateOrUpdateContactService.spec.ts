import { isTechnicalContactName } from "../../../services/ContactServices/CreateOrUpdateContactService";

describe("CreateOrUpdateContactService contact names", () => {
  it("recognizes a number-only placeholder with formatting", () => {
    expect(isTechnicalContactName("+55 (21) 99999-1234", "5521999991234"))
      .toBe(true);
  });

  it("recognizes an empty placeholder", () => {
    expect(isTechnicalContactName("", "5521999991234")).toBe(true);
  });

  it("preserves a manually registered contact name", () => {
    expect(isTechnicalContactName("Maria da Silva", "5521999991234"))
      .toBe(false);
  });
});
