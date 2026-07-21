const LEADING_DIRECTION_MARKS = /^[\u200e\u200f\ufeff]+/;

export const prepareWhatsAppText = (body?: string | null): string =>
  String(body || "")
    .replace(LEADING_DIRECTION_MARKS, "")
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, "*$1*");

export default prepareWhatsAppText;
