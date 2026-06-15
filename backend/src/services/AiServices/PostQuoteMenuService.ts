export const POST_QUOTE_MENU_TEXT = [
  "Como deseja prosseguir?",
  "",
  "1. Confirmar disponibilidade/reserva com a equipe",
  "2. Fazer uma nova simulação",
  "3. Tenho outra dúvida"
].join("\n");

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const isPostQuoteMenuOption = (message = ""): "1" | "2" | "3" | null => {
  const normalized = normalizeText(message);
  if (/^(1|um|uma)$/.test(normalized)) return "1";
  if (/^(2|dois|duas)$/.test(normalized)) return "2";
  if (/^(3|tres)$/.test(normalized)) return "3";
  if (/\b(confirmar|reservar|seguir|fechar)\b.{0,80}\b(disponibilidade|reserva|equipe|atendente)\b/.test(normalized)) return "1";
  if (/^(confirmar|reservar|quero reservar|falar com atendente|falar com a equipe)$/.test(normalized)) return "1";
  if (/\b(tenho|tirar|fazer)\b.{0,40}\b(outra )?(duvida|pergunta)\b/.test(normalized)) return "3";
  if (/^(outra duvida|tenho outra duvida|tirar duvida|fazer pergunta)$/.test(normalized)) return "3";
  if (/\b(nova|novo|outra|outro|refazer|recalcular)\b.{0,60}\b(simulacao|orcamento|cotacao)\b/.test(normalized)) return "2";
  if (/^(nova simulacao|novo orcamento|refazer|recalcular|fazer nova simulacao)$/.test(normalized)) return "2";
  return null;
};

export const appendPostQuoteMenu = (answer = ""): string => {
  const trimmed = answer.trim();
  if (!trimmed) return POST_QUOTE_MENU_TEXT;

  const withoutOldFollowUp = trimmed
    .replace(/\n{0,2}\s*Quer seguir com essa op[cç][aã]o\?\s*$/i, "")
    .replace(/\n{0,2}\s*Quer seguir com esse or[cç]amento\?\s*$/i, "")
    .trim();

  if (normalizeText(withoutOldFollowUp).includes(normalizeText("Como deseja prosseguir"))) {
    return withoutOldFollowUp;
  }

  return [withoutOldFollowUp, POST_QUOTE_MENU_TEXT].filter(Boolean).join("\n\n");
};

export const postQuoteMenuOptionLabel = (option: "1" | "2" | "3"): string => {
  if (option === "1") return "Confirmar disponibilidade/reserva com a equipe";
  if (option === "2") return "Fazer uma nova simulação";
  return "Tenho outra dúvida";
};
