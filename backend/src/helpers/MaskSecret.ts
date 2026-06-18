export const maskSecret = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized.length <= 8) return "********";
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
};

export const isMaskedSecret = (value?: string | null): boolean => {
  const normalized = String(value || "").trim();
  return normalized === "********" || normalized.includes("...");
};
