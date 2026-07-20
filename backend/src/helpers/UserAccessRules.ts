import AppError from "../errors/AppError";
import User from "../models/User";

export const onlyDigits = (value?: string | null): string =>
  String(value || "").replace(/\D/g, "");

export const normalizeCpf = (value?: string | null): string => onlyDigits(value).slice(0, 11);

export const initialPasswordFromCpf = (cpf?: string | null): string => {
  const normalized = normalizeCpf(cpf);
  if (normalized.length < 6) {
    throw new AppError("CPF deve ter pelo menos 6 digitos para gerar a senha inicial.", 400);
  }
  return normalized.slice(0, 6);
};

export const parseWorkHours = (value?: string | null): Array<{ days: number[]; start: string; end: string }> => {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value || "[]") : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(rule => ({
        days: Array.isArray(rule.days) ? rule.days.map(Number).filter((day: number) => day >= 0 && day <= 6) : [],
        start: String(rule.start || ""),
        end: String(rule.end || "")
      }))
      .filter(rule => rule.days.length && /^\d{2}:\d{2}$/.test(rule.start) && /^\d{2}:\d{2}$/.test(rule.end));
  } catch (err) {
    return [];
  }
};

const minutesFromTime = (value: string): number => {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours * 60) + minutes;
};

export const isWithinWorkHours = (workHours?: string | null, now = new Date()): boolean => {
  const rules = parseWorkHours(workHours);
  if (!rules.length) return true;

  const day = now.getDay();
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();

  return rules.some(rule => {
    if (!rule.days.includes(day)) return false;
    const start = minutesFromTime(rule.start);
    const end = minutesFromTime(rule.end);

    if (start <= end) return currentMinutes >= start && currentMinutes <= end;
    return currentMinutes >= start || currentMinutes <= end;
  });
};

export const assertUserCanAccessNow = (user: Pick<User, "workHours">): void => {
  if (!isWithinWorkHours(user.workHours)) {
    throw new AppError("Fora do horario de trabalho configurado para este usuario.", 403);
  }
};
