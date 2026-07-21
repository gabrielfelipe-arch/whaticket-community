import AiSetting from "../../models/AiSetting";

export const ROOM_RENTAL_GUIDED_FLOW_KEY = "room_rental_people_days_hours";

export const GUIDED_FLOWS = [
  {
    key: ROOM_RENTAL_GUIDED_FLOW_KEY,
    label: "Aluguel de sala comercial - pessoas, dias e horas",
    requiredTool: "calcularOrcamento"
  }
];

export const isGuidedQuoteFlowEnabled = (aiSetting?: AiSetting | null): boolean =>
  Boolean(
    aiSetting &&
      (aiSetting as any).useGuidedFlow === true &&
      (aiSetting as any).guidedFlowKey === ROOM_RENTAL_GUIDED_FLOW_KEY
  );

const parseAllowedTools = (value: string | null | undefined): string[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(item => String(item)).filter(Boolean) : [];
  } catch (err) {
    return [];
  }
};

export const getEffectiveAllowedTools = (aiSetting?: AiSetting | null): string[] => {
  const tools = parseAllowedTools(aiSetting?.allowedTools);

  if (!isGuidedQuoteFlowEnabled(aiSetting)) {
    return tools.filter(tool => tool !== "calcularOrcamento");
  }

  return tools.includes("calcularOrcamento") ? tools : [...tools, "calcularOrcamento"];
};
