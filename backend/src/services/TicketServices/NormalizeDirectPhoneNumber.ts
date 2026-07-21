interface Options {
  applyBrazilDefault?: boolean;
}

const NormalizeDirectPhoneNumber = (
  value: unknown,
  { applyBrazilDefault = false }: Options = {}
): string => {
  const rawValue = String(value || "").trim();
  const digits = rawValue.replace(/\D/g, "");
  const brazilianDigits =
    applyBrazilDefault &&
    !rawValue.startsWith("+") &&
    digits.startsWith("0") &&
    (digits.length === 11 || digits.length === 12)
      ? digits.slice(1)
      : digits;

  if (
    applyBrazilDefault &&
    !rawValue.startsWith("+") &&
    (brazilianDigits.length === 10 || brazilianDigits.length === 11)
  ) {
    return `55${brazilianDigits}`;
  }

  return brazilianDigits;
};

export default NormalizeDirectPhoneNumber;
