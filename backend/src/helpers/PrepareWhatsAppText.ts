const LEADING_DIRECTION_MARKS = /^[\u200e\u200f\ufeff]+/;
const BOLD_MARK_CLOSED_INSIDE_WORD =
  /(^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])\*([^*\r\n]+)\*([0-9A-Za-zÀ-ÖØ-öø-ÿ]+)/g;

export const prepareWhatsAppText = (body?: string | null): string =>
  String(body || "")
    .replace(LEADING_DIRECTION_MARKS, "")
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, "*$1*")
    .replace(BOLD_MARK_CLOSED_INSIDE_WORD, "$1*$2$3*");

export default prepareWhatsAppText;
