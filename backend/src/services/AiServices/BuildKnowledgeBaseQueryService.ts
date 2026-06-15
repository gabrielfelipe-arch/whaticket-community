export interface KnowledgeBaseQueryRewrite {
  userMessage: string;
  detectedIntent: string;
  directedKnowledgeBaseQuery: string;
  entities: Record<string, string | number | boolean | null>;
  requiresKnowledgeBaseSearch: boolean;
}

interface Request {
  userMessage: string;
  detectedIntent?: string | null;
  history?: string;
  structuredContext?: string;
}

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasAny = (value: string, patterns: RegExp[]): boolean =>
  patterns.some(pattern => pattern.test(value));

const paymentPatterns = [
  /\bpix\b/,
  /\bcart\s*o\b/,
  /\bcartao\b/,
  /\bdebito\b/,
  /\bd\s*bito\b/,
  /\bcredito\b/,
  /\bcr\s*dito\b/,
  /\bdivide\b/,
  /\bparcel/,
  /\bpagamento\b/,
  /\bpagar\b/,
  /\bpaga\b/
];

const quotePatterns = [
  /\borcamento\b/,
  /\bor\s*amento\b/,
  /\bor.amento\b/,
  /\bcotacao\b/,
  /\bcota\s*ao\b/,
  /\bcota.ao\b/,
  /\bsimulacao\b/,
  /\bsimula\s*ao\b/,
  /\bsimula.ao\b/
];

const availabilityPatterns = [
  /\bhorario\b/,
  /\bhor\s*rio\b/,
  /\bhorarios\b/,
  /\bsabado\b/,
  /\bs\s*bado\b/,
  /\bdomingo\b/,
  /\bdisponibilidade\b/,
  /\bagenda\b/,
  /\bdisponivel\b/,
  /\bdispon\s*vel\b/
];

const discountPatterns = [
  /\bdesconto\b/,
  /\bpromocao\b/,
  /\bpromo\s*ao\b/,
  /\bcondicao\b/,
  /\bcondi\s*ao\b/,
  /\bnegociar\b/,
  /\bnegocia/,
  /\babatimento\b/,
  /\bbarato\b/,
  /\bmais barato\b/,
  /\bmelhorar valor\b/,
  /\bmelhorar o valor\b/,
  /\bvalor melhor\b/
];

const hasQuoteRequest = (normalized: string): boolean =>
  hasAny(normalized, quotePatterns);

const asksForFlexibleHoursPackage = (normalized: string): boolean =>
  hasAny(normalized, [
    /\bhoras livres\b/,
    /\bpacote(?: de horas)?\b/,
    /\bsaldo\b/,
    /\busar\b.{0,40}\b(separado|separada|dias diferentes|horarios diferentes)\b/,
    /\b(separado|separada)\b.{0,40}\b(horas|usar|uso)\b/
  ]);

const getDetectedIntent = (normalized: string, fallback?: string | null): string => {
  if (hasAny(normalized, [/\b(calcinha|sexual|sexo|nude|pelada|pelado)\b/])) {
    return "inappropriate_message";
  }
  if (hasAny(normalized, [/\b(placar|jogo|futebol|flamengo|vasco|botafogo|fluminense|dolar|euro|moeda|cambio)\b/])) {
    return "out_of_scope";
  }
  if (/^\d{1,3}$/.test(normalized)) {
    return "provide_quote_data";
  }
  if (
    hasAny(normalized, [/\b(reserva|reservar|sinal|segurar a data|segurar data|restante)\b/]) ||
    /\bpagar\b.{0,40}\bantes\b/.test(normalized) ||
    /\bpago\b.{0,40}\b(restante|antes)\b/.test(normalized) ||
    /\bpagar\b.{0,40}\bsinal\b/.test(normalized) ||
    /\bconfirmar\b.{0,60}\bautomatico\b/.test(normalized) ||
    /\bnao pode confirmar\b/.test(normalized)
  ) {
    return "request_reservation_rules";
  }
  if (hasAny(normalized, paymentPatterns)) {
    return "request_payment_info";
  }
  if (
    hasAny(normalized, discountPatterns) ||
    /\b(fica|faz|consegue|tem|rola|da pra).{0,40}\b(barato|valor melhor|melhorar(?: o)? valor)\b/.test(normalized) ||
    /\b(fechar|fecho|contratar|reservar).{0,40}\b(varios|varias|muitos|muitas)\b.{0,40}\b(dias|encontros|horarios)\b/.test(normalized)
  ) {
    return "request_discount_rules";
  }
  if (
    hasAny(normalized, [/\b(professor|particular)\b/]) ||
    /\bprofessor\b.{0,40}\b(dia|dias|valor|quanto|pacote)\b/.test(normalized)
  ) {
    return "request_teacher_package";
  }
  if (asksForFlexibleHoursPackage(normalized)) {
    return "request_packages";
  }
  if (/\bquanto\s+(fica|sai|custa)\b/.test(normalized)) {
    return "request_custom_quote";
  }
  if (
    hasAny(normalized, [/\b(onde|endereco|localizacao|fica|rua|referencia)\b/]) ||
    /\bqual endereco\b/.test(normalized) ||
    /\bperto\b.{0,40}\b(ponto|onde|qual)\b/.test(normalized)
  ) {
    return "request_location";
  }
  if (
    hasQuoteRequest(normalized) ||
    /\b(simula|simular|orcar|orcaria)\b/.test(normalized) ||
    /\b(mudar|alterar|trocar|ajustar)\b.{0,80}\b(pessoas|oessoas|dias|encontros|horas|orcamento|cotacao|simulacao)\b/.test(normalized)
  ) {
    return "request_custom_quote";
  }
  if (hasAny(normalized, availabilityPatterns)) {
    return "request_availability";
  }
  if (/\b(validar|confirmar)\b.{0,80}\b(atendente|equipe|disponibilidade|horario)\b/.test(normalized)) {
    return "request_availability";
  }
  if (hasAny(normalized, [/\b(cabe|cabem|capacidade|pessoas|oessoas|participantes|suporta|comporta|lotacao|lotacao maxima|lotacao maxima|maxima|maximo|25|vinte e cinco|mais de 20|passar de 20|acima de 20)\b/])) {
    return "request_capacity";
  }
  if (hasAny(normalized, [/\b(ar|ar-condicionado|ar condicionado|estrutura|incluso|inclusos|inclui|itens|quadro|banheiro|recepcao|agua gelada)\b/])) {
    return "request_included_structure";
  }
  if (hasAny(normalized, [/\b(internet|wifi|wi-fi)\b/])) {
    return "request_included_structure";
  }
  if (hasAny(normalized, [/\b(tv|televisao|apresentacao|apresenta\s*ao|apresenta.ao|slide|slides)\b/])) {
    return "request_included_structure";
  }
  if (hasAny(normalized, [/\b(cafe|copa|cafeteira|micro-ondas|microondas|filtro)\b/])) {
    return "request_included_structure";
  }
  if (hasAny(normalized, [/\b(prata|ouro|diamante|mensal|mensalista|plano mensal|planos mensalistas)\b/])) {
    return "request_monthly_plans";
  }
  if (asksForFlexibleHoursPackage(normalized) || hasAny(normalized, [/\b(pacote|pacotes|pacote de horas|horas livres|quais pacotes)\b/])) {
    return "request_packages";
  }
  if (hasAny(normalized, [/\b(tabela|valor|valores|preco|precos|quanto custa|quanto sai|manda os valores|manda valores|diaria|turno)\b/])) {
    return "request_price_table";
  }

  return fallback || "knowledge_base_question";
};

const extractEntities = (normalized: string): Record<string, string | number | boolean | null> => {
  const entities: Record<string, string | number | boolean | null> = {};
  const numberMatch = normalized.match(/\b\d{1,3}\b/);

  if (numberMatch) entities.quantity = Number(numberMatch[0]);
  if (/\bpix\b/.test(normalized)) entities.paymentMethod = "pix";
  if (/\bcart\s*o\b|\bcartao\b/.test(normalized)) entities.paymentMethod = "cartao";
  if (/\bdebito\b|\bd\s*bito\b/.test(normalized)) entities.paymentMethod = "debito";
  if (/\bcredito\b|\bcr\s*dito\b/.test(normalized)) entities.paymentMethod = "credito";
  if (/\bdivide|parcel/.test(normalized)) entities.paymentCondition = "parcelamento/divisao";
  if (/\bar\b|ar-condicionado|ar condicionado/.test(normalized)) entities.topic = "estrutura_ar_condicionado";
  if (
    hasAny(normalized, discountPatterns) ||
    /\b(fechar|fecho|contratar|reservar).{0,40}\b(varios|varias|muitos|muitas)\b.{0,40}\b(dias|encontros|horarios)\b/.test(normalized)
  ) entities.topic = "desconto_condicao_especial";
  if (/\bprofessor|particular/.test(normalized)) entities.topic = "pacote_professor_particular";
  if (/\breserva|reservar|sinal/.test(normalized)) entities.topic = "reserva";
  if (/\btabela|valor|valores|preco|precos|diaria|turno/.test(normalized)) entities.topic = "precos";
  if (/\bmensal|mensalista|prata|ouro|diamante/.test(normalized)) entities.topic = "planos_mensalistas";
  if (/\bonde|endereco|localizacao|fica/.test(normalized)) entities.topic = "endereco";
  if (/\bcabe|cabem|capacidade|pessoas|oessoas|participantes|suporta|comporta|lotacao|mais de 20|passar de 20|acima de 20/.test(normalized)) entities.topic = "capacidade";
  if (hasAny(normalized, availabilityPatterns)) entities.topic = "disponibilidade";
  if (hasQuoteRequest(normalized)) entities.topic = "orcamento_personalizado";

  const participantMatch = normalized.match(/\b(\d{1,3})\s*(pessoas?|participantes?)\b/);
  const occurrenceMatch = normalized.match(/\b(\d{1,3})\s*(encontros?|dias?|aulas?)\b/);
  const durationMatch = normalized.match(/\b(\d{1,3})\s*(horas?|h)\b/);

  if (participantMatch) entities.participantCount = Number(participantMatch[1]);
  if (occurrenceMatch) entities.occurrenceCount = Number(occurrenceMatch[1]);
  if (durationMatch) entities.durationPerOccurrence = Number(durationMatch[1]);

  return entities;
};

const hasParticipantCount = (normalized: string): boolean =>
  /\b\d{1,3}\s*(pessoas?|participantes?)\b/.test(normalized);

const hasOccurrenceCount = (normalized: string): boolean =>
  /\b\d{1,3}\s*(encontros?|dias?|aulas?)\b/.test(normalized);

const hasDuration = (normalized: string): boolean =>
  /\b\d{1,3}\s*(horas?|h)\b/.test(normalized);

const buildDirectedQuery = (
  intent: string,
  normalized: string,
  entities: Record<string, string | number | boolean | null>
): string => {
  switch (intent) {
    case "inappropriate_message":
      return "Politica de resposta para mensagens inadequadas, ofensivas, sexuais ou fora do escopo no atendimento da Salinha Meier.";
    case "out_of_scope":
      return "Politica de resposta para perguntas fora do contexto da Salinha Meier e como redirecionar para valores, estrutura, endereco, reserva ou orcamento.";
    case "request_included_structure":
      if (/\binternet|wifi|wi-fi/.test(normalized)) {
        return "A estrutura da Salinha Meier inclui internet?";
      }
      if (/\btv|televisao|apresentacao|apresenta\s*ao|apresenta.ao|slide|slides/.test(normalized)) {
        return "A estrutura da Salinha Meier inclui TV para reproducao de conteudo?";
      }
      if (/\bquadro\b/.test(normalized)) {
        return "A estrutura da Salinha Meier inclui quadro branco?";
      }
      if (/\bbanheiro\b/.test(normalized)) {
        return "A estrutura da Salinha Meier inclui banheiro?";
      }
      if (/\brecepcao\b/.test(normalized)) {
        return "A estrutura da Salinha Meier inclui recepcao?";
      }
      if (/\bagua gelada|filtro/.test(normalized)) {
        return "A estrutura da Salinha Meier inclui filtro com agua gelada?";
      }
      if (/\bcafe|copa|cafeteira|micro-ondas|microondas|filtro/.test(normalized)) {
        return "A estrutura da Salinha Meier inclui copa, cafeteira, micro-ondas ou filtro?";
      }
      return "A estrutura da Salinha Meier inclui ar-condicionado?";
    case "request_capacity":
      if (entities.quantity && Number(entities.quantity) <= 20) {
        return "Qual e a capacidade maxima de pessoas da Salinha Meier?";
      }
      return "Qual e a capacidade maxima de pessoas da Salinha Meier e o que fazer quando o grupo passa de 20 pessoas?";
    case "request_location":
      if (/\bperto|referencia|referencias/.test(normalized)) {
        return "Quais sao as referencias de localizacao da Salinha Meier?";
      }
      return "Qual e o endereco da Salinha Meier e quais sao as referencias de localizacao?";
    case "request_discount_rules":
      if (/\bbarato|negocia|negociacao|negocia\s*ao|negocia.ao|melhorar(?: o)? valor|varios dias/.test(normalized)) {
        return "Qual e a regra da Salinha Meier sobre negociacao de valores?";
      }
      return "Qual e a regra da Salinha Meier sobre descontos, promocoes, negociacao e condicoes especiais?";
    case "request_availability":
      return "Qual e a regra da Salinha Meier sobre disponibilidade de agenda e confirmacao de horario?";
    case "request_price_table":
      if (/\bquanto custa|quanto|custa/.test(normalized)) {
        return "Quais sao os valores oficiais da Salinha Meier e quando e necessario montar orcamento personalizado?";
      }
      return "Qual e a tabela oficial de precos da Salinha Meier, incluindo uso pontual, pacotes, mensalistas e Pacote Professor Particular?";
    case "request_packages":
      return "Quais pacotes de horas livres e planos a Salinha Meier oferece?";
    case "request_monthly_plans":
      if (/\bprata\b/.test(normalized)) {
        return "Como funciona o Plano Prata da Salinha Meier?";
      }
      return "Quais sao os planos mensalistas da Salinha Meier e qual e a contratacao minima?";
    case "request_teacher_package":
      if (/\b1 hora|uma hora|hora por semana/.test(normalized)) {
        return "O Pacote Professor Particular da Salinha Meier e informado na base como 1 hora por semana ou como 1 dia/2 dias por semana?";
      }
      return "Como funciona o Pacote Professor Particular da Salinha Meier e quais informacoes oficiais existem sobre dias, horarios e valores?";
    case "request_reservation_rules":
      return "Qual e a regra oficial para reservar uma data na Salinha Meier e como funciona o pagamento de 50%?";
    case "request_custom_quote":
      if (!hasParticipantCount(normalized) || !hasOccurrenceCount(normalized) || !hasDuration(normalized)) {
        return "Quais dados sao obrigatorios para orcamento personalizado da Salinha Meier?";
      }
      return `Quais regras de orcamento personalizado da Salinha Meier se aplicam para ${normalized}?`;
    case "provide_quote_data":
      return "Quais dados ainda faltam para continuar o orcamento personalizado da Salinha Meier?";
    case "request_payment_info":
      if (entities.paymentCondition === "parcelamento/divisao") {
        return "Quais sao as formas de pagamento aceitas pela Salinha Meier e qual e a regra de reserva/pagamento?";
      }
      return "Quais formas de pagamento sao aceitas pela Salinha Meier?";
    default:
      return normalized;
  }
};

const BuildKnowledgeBaseQueryService = ({
  userMessage,
  detectedIntent,
  history,
  structuredContext
}: Request): KnowledgeBaseQueryRewrite => {
  const normalizedMessage = normalizeText(userMessage);
  const intent = getDetectedIntent(normalizedMessage, detectedIntent);
  const entities = extractEntities(normalizedMessage);
  const directedKnowledgeBaseQuery = buildDirectedQuery(intent, normalizedMessage, entities);

  return {
    userMessage,
    detectedIntent: intent,
    directedKnowledgeBaseQuery,
    entities,
    requiresKnowledgeBaseSearch: true
  };
};

export default BuildKnowledgeBaseQueryService;
