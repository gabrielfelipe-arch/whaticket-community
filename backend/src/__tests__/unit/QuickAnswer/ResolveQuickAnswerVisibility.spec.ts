import AppError from "../../../errors/AppError";
import ResolveQuickAnswerVisibility from "../../../services/QuickAnswerService/ResolveQuickAnswerVisibility";

describe("ResolveQuickAnswerVisibility", () => {
  it("blocks publishing when the user has no global publishing permission", () => {
    expect(() => ResolveQuickAnswerVisibility({
      requestedGlobal: true,
      canPublishGlobal: false
    })).toThrow(AppError);
  });

  it("allows publishing when the profile grants global publishing", () => {
    expect(ResolveQuickAnswerVisibility({
      requestedGlobal: "true",
      canPublishGlobal: true
    })).toBe(true);
  });

  it("preserves an existing public answer when visibility is not submitted", () => {
    expect(ResolveQuickAnswerVisibility({
      currentGlobal: true,
      canPublishGlobal: false
    })).toBe(true);
  });

  it("blocks unpublishing when the permission was revoked", () => {
    expect(() => ResolveQuickAnswerVisibility({
      requestedGlobal: false,
      currentGlobal: true,
      canPublishGlobal: false
    })).toThrow(AppError);
  });
});
