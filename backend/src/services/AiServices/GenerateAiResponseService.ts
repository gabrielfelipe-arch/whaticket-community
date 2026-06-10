import axios from "axios";
import AiSetting from "../../models/AiSetting";
import Message from "../../models/Message";
import AiInteractionLog from "../../models/AiInteractionLog";
import { logger } from "../../utils/logger";
import SearchKnowledgeBaseService from "./SearchKnowledgeBaseService";
import AiProviderFactory from "./providers/AiProviderFactory";

export class AiProviderError extends Error {
  public provider: string;
  public status?: number;
  public code?: string;
  public details?: any;

  constructor({
    provider,
    status,
    code,
    message,
    details
  }: {
    provider: string;
    status?: number;
    code?: string;
    message: string;
    details?: any;
  }) {
    super(message);
    this.name = "AiProviderError";
    this.provider = provider;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface Request {
  aiSettingId?: number | null;
  message: string;
  contactName?: string;
  ticketId?: number | null;
  systemPromptOverride?: string;
  skipKnowledgeSearch?: boolean;
  jsonMode?: boolean;
  includeRecentMessages?: boolean;
  logMetadata?: {
    intent?: string;
    action?: string;
    decisionReason?: string;
    knowledgeIds?: number[];
    knowledgeTitles?: string[];
    knowledgeScores?: number[];
    contextMessageCount?: number;
  };
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile"
};

const getConfiguredModel = (provider: string, model?: string): string => {
  if (!model) return DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;

  if (
    provider === "gemini" &&
    (
      model.startsWith("gpt-") ||
      model.startsWith("llama") ||
      model.startsWith("deepseek")
    )
  ) {
    return DEFAULT_MODELS.gemini;
  }

  if (
    provider === "openai" &&
    (
      model.startsWith("gemini-") ||
      model.startsWith("llama") ||
      model.startsWith("deepseek")
    )
  ) {
    return DEFAULT_MODELS.openai;
  }

  if (
    provider === "groq" &&
    (
      model.startsWith("gpt-") ||
      model.startsWith("gemini-") ||
      model.startsWith("deepseek")
    )
  ) {
    return DEFAULT_MODELS.groq;
  }

  if (
    provider === "deepseek" &&
    (
      model.startsWith("llama") ||
      model.startsWith("gpt-") ||
      model.startsWith("gemini-") ||
      model.includes("versatile") ||
      model.includes("instant")
    )
  ) {
    return DEFAULT_MODELS.deepseek;
  }

  return model;
};

const getProviderTemperature = (provider: string, value: number | string, jsonMode?: boolean): number => {
  const parsed = Number(value || 0.2);
  const fallback = Number.isNaN(parsed) ? 0.2 : parsed;
  const stableFallback = jsonMode ? Math.min(fallback, 0.3) : Math.min(fallback, 0.7);

  if (provider === "groq") {
    return Math.min(Math.max(stableFallback, 0), 1);
  }

  return Math.min(Math.max(stableFallback, 0), 2);
};

const getProviderMaxTokens = (provider: string, value: number | string): number => {
  const parsed = Number(value || 800);
  const fallback = Number.isNaN(parsed) || parsed <= 0 ? 800 : parsed;
  return Math.min(fallback, 2000);
};

const estimateTokens = (text = ""): number => Math.ceil(text.length / 4);

const truncateByApproxTokens = (text: string, maxTokens: number): string => {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
};

const getRecentMessages = async (ticketId?: number | null): Promise<Array<{ role: string; content: string }>> => {
  if (!ticketId) return [];

  const messages = await Message.findAll({
    where: { ticketId },
    order: [["createdAt", "DESC"]],
    limit: 8
  });

  return messages
    .reverse()
    .filter(message => !["system", "ura"].includes(String(message.senderType || "")))
    .slice(-3)
    .map(message => ({
      role: message.senderType === "human" || message.fromMe ? "assistant" : "user",
      content: message.body || ""
    }))
    .filter(message => message.content.trim());
};

const buildKnowledgeContext = async (
  message: string,
  skipKnowledgeSearch?: boolean
): Promise<string> => {
  if (skipKnowledgeSearch) return "";

  const fragments = await SearchKnowledgeBaseService(message);
  return fragments
    .map(fragment => [
      `Titulo: ${fragment.title}`,
      fragment.tags ? `Palavras chave: ${fragment.tags}` : "",
      fragment.fragment
    ].filter(Boolean).join("\n"))
    .join("\n\n");
};

const createAiLog = async ({
  aiSettingId,
  ticketId,
  provider,
  model,
  promptTokens,
  completionTokens,
  status,
  errorMessage,
  userMessage,
  aiResponse,
  metadata
}: {
  aiSettingId: number;
  ticketId?: number | null;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  status: string;
  errorMessage?: string;
  userMessage?: string;
  aiResponse?: string | null;
  metadata?: Request["logMetadata"];
}) => {
  await AiInteractionLog.create({
    aiSettingId,
    ticketId: ticketId || null,
    provider,
    modelUsed: model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    status,
    errorMessage: errorMessage || null,
    userMessage: userMessage || null,
    aiResponse: aiResponse || null,
    intent: metadata?.intent || null,
    action: metadata?.action || null,
    decisionReason: metadata?.decisionReason || null,
    knowledgeIds: metadata?.knowledgeIds?.length ? JSON.stringify(metadata.knowledgeIds) : null,
    knowledgeTitles: metadata?.knowledgeTitles?.length ? JSON.stringify(metadata.knowledgeTitles) : null,
    knowledgeScores: metadata?.knowledgeScores?.length ? JSON.stringify(metadata.knowledgeScores) : null,
    contextMessageCount: metadata?.contextMessageCount ?? null
  });
};

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const isRetryableAiError = (error: any): boolean => {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  const retryableCodes = [
    "ECONNABORTED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EAI_AGAIN",
    "ERR_NETWORK"
  ];

  if (retryableCodes.includes(String(error.code || ""))) return true;
  if (!status) return true;

  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
};

const runWithAiRetries = async <T>(
  operation: () => Promise<T>,
  context: {
    aiSettingId: number;
    provider: string;
    model: string;
  }
): Promise<T> => {
  const maxAttempts = 3;
  const delays = [800, 1800];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const retryable = isRetryableAiError(error);
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      logger.warn(
        {
          aiSettingId: context.aiSettingId,
          provider: context.provider,
          model: context.model,
          attempt,
          nextAttempt: attempt + 1,
          status,
          code: axios.isAxiosError(error) ? error.code : undefined,
          message: error instanceof Error ? error.message : String(error)
        },
        "Retrying AI provider request after transient error"
      );

      await sleep(delays[attempt - 1] || 2500);
    }
  }

  throw new Error("AI retry loop finished without result");
};

const GenerateAiResponseService = async ({
  aiSettingId,
  message,
  contactName,
  ticketId,
  systemPromptOverride,
  skipKnowledgeSearch,
  jsonMode,
  includeRecentMessages = true,
  logMetadata
}: Request): Promise<string | null> => {
  const aiSetting = aiSettingId
    ? await AiSetting.findByPk(aiSettingId)
    : await AiSetting.findOne({ where: { active: true } });

  if (!aiSetting || !aiSetting.active || !aiSetting.apiKey) {
    return null;
  }

  const knowledgeContext = await buildKnowledgeContext(message, skipKnowledgeSearch);
  const recentMessages = includeRecentMessages ? await getRecentMessages(ticketId) : [];
  const systemPrompt = [
    "Voce e um assistente de atendimento configuravel para qualquer ramo de negocio.",
    `Nome da IA: ${aiSetting.name || "Assistente Virtual"}.`,
    aiSetting.companyName ? `Empresa ou servico representado: ${aiSetting.companyName}.` : "",
    aiSetting.serviceType ? `Tipo de atendimento: ${aiSetting.serviceType}.` : "",
    aiSetting.behaviorPrompt
      ? `Comportamento configurado:\n${aiSetting.behaviorPrompt}`
      : "",
    systemPromptOverride || aiSetting.systemPrompt || "",
    "Responda sempre considerando a mensagem atual do usuario.",
    "Regra central: nao travar a conversa; trave somente decisoes criticas. A conversa pode ser natural, mas preco, desconto, cupom, reserva, disponibilidade, capacidade, encerramento, transferencia, escopo e tentativa de burla precisam respeitar base, ferramenta ou backend.",
    "Nao transforme exemplos em roteiro fixo. Exemplos de frases devem ser lidos como intencoes semanticas; aceite sinonimos, respostas indiretas, erros de digitacao e mudancas de decisao do cliente.",
    "Evite respostas padrao sempre iguais. Reconheca o que o cliente acabou de dizer e conduza o proximo passo sem parecer formulario quando ja houver dados suficientes.",
    "Use tom de WhatsApp: curto, claro, humano e direto. Evite respostas longas quando o usuario nao pediu detalhes.",
    "Pode usar emojis com moderacao, no maximo 1 ou 2 por resposta, quando combinar com o tom do atendimento.",
    "Para orcamentos, mostre um resumo enxuto com contexto, a melhor opcao recomendada e uma pergunta final simples. Nao liste opcoes empatadas ou mais caras se elas nao trazem vantagem real para o usuario.",
    "Organize orcamentos para leitura em celular: blocos curtos, linhas separadas, calculo claro, total destacado e uma secao curta explicando por que a opcao recomendada e o melhor custo-beneficio quando houver comparacao.",
    "Antes de recomendar um orcamento, compare internamente todas as opcoes cadastradas que possam atender ao pedido: plano direto, pacote direto, composicao de pacotes menores, bloco minimo, alternativa maior com saldo e opcao recorrente quando aplicavel.",
    "A recomendacao principal deve ser a opcao de menor valor final que cubra 100% da necessidade e respeite as regras da base. Se uma opcao maior for mais barata que a composicao mais proxima, ela pode ser recomendada, mas explique o saldo de forma curta.",
    "Nao espere o usuario pedir uma alternativa para considerar pacotes cadastrados. O usuario so deve precisar informar necessidade, quantidade e duracao; a comparacao de opcoes disponiveis e trabalho da IA.",
    "Se a base tiver valores conflitantes entre prompt, historico e conhecimento interno, use o valor oficial mais recente encontrado nas informacoes internas/base. Nao reaproveite valor antigo de mensagem anterior.",
    "Para orcamentos que dependem de tempo/agenda, colete separadamente quantidade de dias/encontros/ocorrencias e horas por dia/encontro. Se faltarem os dois dados, pergunte primeiro quantos dias/encontros serao; depois pergunte quantas horas tera cada dia/encontro.",
    "No primeiro orcamento util, se houver itens inclusos cadastrados na base, liste todos os itens inclusos existentes em bullets curtos. Nao resuma para apenas alguns e nunca envie apenas 1 item se houver lista completa na base. Em recalculos na mesma conversa, nao repita os inclusos.",
    "Quando houver composicao de valores, mostre a conta nomeando o item da tabela: 'pacote de 3h x 2 = R$ 210 x 2 = R$ 420', 'bloco de 2h x 3 = R$ 140 x 3 = R$ 420', 'turno de 5h x 2 = R$ 300 x 2 = R$ 600'. Evite escrever apenas '2 x 3h'.",
    "Nunca transforme o total solicitado em nome de pacote. Se a base nao listar pacote direto de 12h, 13h, 14h ou outro total, diga que e uma composicao e mostre os itens oficiais usados. Exemplo: 12h pode ser pacote 10h + bloco 2h, nao 'pacote de 12h'.",
    "Quando nao existir pacote/plano exato para o total solicitado, a resposta precisa explicar a composicao do orcamento: demanda real, itens oficiais usados, valores unitarios, soma, total final e saldo quando houver. Nao entregue apenas um total seco.",
    "Antes de comparar valores por tempo, calcule a demanda real: horas por ocorrencia x quantidade de ocorrencias = total de horas. Exemplo: 3 horas em 3 dias diferentes = 3 x 3h = 9h no total.",
    "Em orcamento comum, mostre somente valores de tabela/brutos. Nao informe nem aplique descontos automaticamente.",
    "A IA nao deve calcular, prometer ou detalhar desconto. Se o usuario perguntar por desconto, promocao, negociacao, condicao melhor ou valor com desconto, diga que isso precisa ser validado por atendente e nao recalcule.",
    "Quando o usuario apenas disser que achou caro, nao ofereca negociacao, desconto ou condicao especial de cara. Primeiro responda com naturalidade e ofereca recalcular outro cenario dentro da tabela.",
    "Todo orcamento, cotacao ou simulacao precisa terminar com um aviso curto: 'Simulacao informativa: disponibilidade, reserva e condicoes finais precisam ser confirmadas por um atendente.'",
    "Se as informacoes internas trouxerem uma matriz de simulacao, tabela de cenarios ou exemplos oficiais de calculo, use essa matriz como referencia principal antes de calcular por conta propria.",
    "Nunca apresente como opcao viavel uma composicao que cubra menos horas do que o cliente pediu. Se o cliente pediu 9h, uma conta que cobre 8h ou 6h nao esta completa; diga que falta cobertura ou prefira pacote/plano que cubra o total.",
    "Se a base tiver bloco minimo, plano avulso minimo ou duracao minima, e o usuario pedir menos tempo que esse minimo, nao venda a hora menor isolada. Calcule pelo menor bloco/plano permitido.",
    "Quando o uso for em dias/encontros separados, aplique o minimo por ocorrencia. Exemplo: se o menor avulso e bloco de 2h por R$ 140 e o usuario quer 2 encontros de 1h, calcule 2 blocos x R$ 140 = R$ 280; ele usa ate 2h em cada encontro. Nao diga que isso nao cobre tudo.",
    "Nao ofereca pacote menor do que a necessidade do usuario. A opcao recomendada precisa cobrir 100% das horas/itens solicitados.",
    "Nao ofereca pacote muito acima da necessidade como opcao principal. Pacote maior so entra como principal quando a sobra for de ate 2h ou quando for mais barato/empatado em relacao a composicao que cobre a necessidade com menos sobra. Acima de 2h excedentes, so mencione se o usuario pedir saldo, recorrencia, pacote maior ou uso futuro.",
    "Ao comparar pacotes de horas, use todos os pacotes cadastrados na base, como 2h, 3h, 5h, 10h, 15h e 20h quando existirem. Prefira o menor pacote direto que cubra a necessidade antes de compor varios blocos ou oferecer pacote maior.",
    "Para dias/encontros diferentes, compare o cenario inteiro internamente: opcoes consecutivas por encontro/dia versus pacotes flexiveis pelo total de horas. Na resposta, mostre somente a recomendacao principal salvo pedido de comparacao.",
    "Se existir pacote flexivel direto que cobre exatamente o total solicitado em dias/encontros diferentes, recomende somente esse pacote. Nao liste opcoes consecutivas equivalentes, composicoes por soma, opcoes empatadas ou opcoes mais caras, salvo se o usuario pedir comparacao ou perguntar a diferenca. Exemplo: 3 dias de 5h = 15h; recomende pacote de 15h e nao mencione turno de 5h x 3 nem 10h + 5h.",
    "Diaria de 10h x quantidade de dias so deve aparecer se o usuario pedir mais horas consecutivas em cada dia; nao use diaria como comparacao principal quando existir pacote flexivel direto exato.",
    "Nunca trate diaria como saldo flexivel. Diaria e uso consecutivo no mesmo dia; pacote de horas e saldo flexivel para dias/horarios diferentes conforme disponibilidade.",
    "Nunca misture diaria/turno com pacotes flexiveis na mesma composicao. Se comparar modalidades, apresente linhas separadas: uso consecutivo por dia/encontro versus pacote/saldo flexivel.",
    "Se o cliente aceitou calcular no limite de capacidade, use esse limite nos proximos recalculos ate que ele informe outra quantidade valida dentro da capacidade.",
    "Nao confunda turno com diaria: turno de 5h e diaria de 10h podem ter valores diferentes na base; use exatamente os valores oficiais encontrados.",
    "Quando existir uma matriz por total de horas flexiveis na base, consulte essa matriz antes de responder. Ela deve guiar combinacoes como 6h, 7h, 8h, 9h, 12h, 13h, 14h, 15h, 18h e 19h.",
    "Quando o total solicitado passar de 20h, nao reduza para 15h ou 20h se isso nao cobrir a necessidade. Consulte linhas como 21h a 25h na matriz e componha pacote 20h + menor pacote/bloco necessario.",
    "Quando der numero impar de horas, procure primeiro pacote direto de 3h, 5h ou 15h antes de subir para pacote maior. Se o pacote maior for mais barato e cobrir tudo, recomende o pacote maior explicando o saldo.",
    "Uso recorrente/mensalista exige rotina semanal por no minimo 3 meses. Se o usuario informar 1 ou 2 meses, nao trate como mensalista/recorrente: calcule como datas/encontros especificos pela matriz de horas/pacotes.",
    "Nao transforme o minimo de 3 meses em pergunta obrigatoria quando ja houver dados para orcar. Se o usuario sinalizar uso semanal/mensal, informe de forma curta que existem condicoes especiais para uso semanal por 3 meses ou mais; pergunte por quantos meses apenas se for necessario comparar mensalista.",
    "Quando enviar um orcamento para varios encontros/aulas, pode incluir uma observacao curta depois do valor: 'Para uso semanal por 3 meses ou mais, tambem existem condicoes especiais em planos mensalistas.' Nao envie essa frase como pergunta separada.",
    "Exemplo obrigatorio: 3 aulas, encontros ou dias de 5h = 15h no total. Mesmo se o usuario disser que sera por 2 meses, recomende pacote de 15h = R$ 900 e nao pacote 20h.",
    "A opcao principal de orcamento precisa cobrir 100% do que o usuario pediu e ficar proxima da necessidade real. Nao ofereca como principal uma opcao que cubra menos horas/itens nem uma opcao muito acima do pedido.",
    "Para pacotes maiores, use como criterio: so oferecer como principal se a sobra for pequena, ate 2h, ou se o pacote maior for mais barato/empatado do que a composicao exata/proxima. Fora disso, mencione pacote maior apenas se o usuario pedir saldo, recorrencia, pacote ou uso futuro.",
    "Quando o pacote maior nao for a melhor opcao, nao liste varias opcoes acima do pedido. Mostre a opcao recomendada e, no maximo, uma alternativa proxima ou economicamente justificada. Alternativa empatada sem beneficio pratico deve ser omitida.",
    "Se a base tiver pacote ou valor direto de 3h, nunca responda que nao existe pacote de 3 horas. Para 1 encontro de 3h, use o valor direto de 3h; para 2 encontros de 3h, compare 'pacote/periodo de 3h x 2 = R$ 210 x 2 = R$ 420' antes de oferecer pacote de 10h.",
    "Se o cliente pedir 6h e existir valor/pacote direto de 3h, prefira apresentar 'pacote/periodo de 3h x 2 = total correspondente'. Nao priorize 3 blocos de 2h quando 2 pacotes/periodos de 3h forem uma composicao cadastrada e equivalente.",
    "Para necessidades pequenas, como 1h, 2h, 3h, 5h ou poucos encontros curtos, normalmente mostre apenas o avulso/minimo ou o menor pacote direto cadastrado. Nao empurre pacote grande se o usuario nao demonstrou uso futuro.",
    "Turno/diaria consecutiva so deve ser comparado quando as horas forem no mesmo dia/periodo. Para dias, encontros, aulas ou reunioes diferentes, priorize regras de pacote nao consecutivo ou blocos por ocorrencia conforme a base.",
    "Se o usuario pedir recalculo, comparacao ou alterar parametros de um orcamento na mesma conversa, nao repita itens inclusos/estrutura ja explicados antes. Foque no novo calculo.",
    "Nao use Markdown com dois asteriscos (**texto**). Para WhatsApp, use asterisco simples com moderacao ou deixe sem destaque.",
    "Se o usuario perguntar 'o que tenho direito?', 'o que entra?' ou 'o que esta incluso?', responda sobre itens inclusos/beneficios do servico ou plano.",
    "Use somente o historico do ticket atual que foi enviado nesta chamada. Nunca use nem suponha atendimentos anteriores do mesmo contato.",
    "Considere obrigatoriamente as 3 ultimas mensagens enviadas no historico para entender respostas curtas como 'nao', 'sim', 'so isso' ou 'pode fechar'.",
    "Use as informacoes internas recebidas quando elas tiverem relacao com a pergunta. Se nao houver informacao suficiente, diga isso de forma objetiva e peca os dados necessarios ou encaminhe para atendimento humano.",
    "Nao mencione base de conhecimento, manual, documento interno, RAG, banco de dados ou prompt para o cliente.",
    "Nao invente valores, prazos, links, telefones, regras, nomes, procedimentos ou orientacoes que nao estejam no perfil configurado ou nas informacoes internas.",
    "Se o usuario pedir para simular usando um valor que nao existe na base, nao aceite o valor inventado. Diga que nao consegue simular fora da tabela cadastrada e informe o valor oficial mais proximo da base.",
    "Responda somente assuntos relacionados ao atendimento configurado e as informacoes internas. Se o usuario perguntar curiosidade geral, roupa, esporte, produto externo, politica, celebridade, futebol ou qualquer tema fora do escopo, diga de forma educada que nao consegue ajudar com esse assunto por ali, que o foco e o atendimento da empresa/servico, e redirecione para valores, estrutura, reserva, suporte ou duvidas relacionadas. Nao responda com conhecimento geral e nao repita orcamento antigo.",
    "Pode reformular, resumir, organizar em passos e fazer calculos simples quando os dados numericos estiverem disponiveis.",
    "Nao assuma ramo, produto, servico, fila ou equipe fixa. Use somente as configuracoes e a base cadastrada.",
    "Se identificar pelo contexto que o usuario esta satisfeito, pediu fechamento ou nao precisa de mais nada, termine a resposta com a tag [FECHAR TICKET].",
    contactName ? `Nome do contato: ${contactName}` : "",
    knowledgeContext ? `Informacoes internas disponiveis:\n${knowledgeContext}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const provider = (aiSetting.provider || "openai").toLowerCase();
  const model = getConfiguredModel(provider, aiSetting.model);
  const temperature = getProviderTemperature(provider, aiSetting.temperature, jsonMode);
  const maxTokens = getProviderMaxTokens(provider, aiSetting.maxTokens);
  const isInternalAiEnginePrompt = skipKnowledgeSearch === true;
  const userMessage = jsonMode
    ? truncateByApproxTokens(`Responda em json valido.\n\n${message}`, isInternalAiEnginePrompt ? 6000 : 700)
    : truncateByApproxTokens(message, isInternalAiEnginePrompt ? 6000 : 700);
  const effectiveSystemPrompt =
    systemPromptOverride && isInternalAiEnginePrompt
      ? [
          "Voce e um motor interno de decisao de atendimento. Siga estritamente as instrucoes abaixo.",
          `Nome da IA: ${aiSetting.name || "Assistente Virtual"}.`,
          aiSetting.companyName ? `Empresa ou servico representado: ${aiSetting.companyName}.` : "",
          aiSetting.serviceType ? `Tipo de atendimento: ${aiSetting.serviceType}.` : "",
          systemPromptOverride
        ].filter(Boolean).join("\n\n")
      : systemPrompt;
  const safeSystemPrompt = truncateByApproxTokens(effectiveSystemPrompt, isInternalAiEnginePrompt ? 6000 : 1400);
  const promptTokensEstimate =
    estimateTokens(safeSystemPrompt) +
    estimateTokens(userMessage) +
    recentMessages.reduce((total, item) => total + estimateTokens(item.content), 0);

  if (!["openai", "deepseek", "gemini", "groq"].includes(provider)) {
    logger.warn(`AI provider not supported yet: ${provider}`);
    return null;
  }

  try {
    const providerClient = AiProviderFactory.create(provider);
    const result = await runWithAiRetries(
      () => providerClient.sendMessage({
        provider,
        model,
        apiKey: aiSetting.apiKey,
        baseUrl: (aiSetting as any).baseUrl || null,
        systemPrompt: safeSystemPrompt,
        messages: [
          ...recentMessages.map(item => ({
            role: item.role as "user" | "assistant",
            content: truncateByApproxTokens(item.content, 220)
          })),
          {
            role: "user" as const,
            content: userMessage
          }
        ],
        temperature,
        maxTokens,
        jsonMode
      }),
      { aiSettingId: aiSetting.id, provider, model }
    );

    await createAiLog({
      aiSettingId: aiSetting.id,
      ticketId,
      provider,
      model,
      promptTokens: Number(result.inputTokens || promptTokensEstimate),
      completionTokens: Number(result.outputTokens || estimateTokens(result.text || "")),
      status: "success",
      userMessage: truncateByApproxTokens(message, 700),
      aiResponse: truncateByApproxTokens(result.text || "", 1000),
      metadata: {
        ...logMetadata,
        contextMessageCount: logMetadata?.contextMessageCount ?? recentMessages.length
      }
    });
    return result.text;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const providerMessage =
        (error.response?.data as any)?.error?.message ||
        (error.response?.data as any)?.message ||
        error.message;

      logger.error(
        {
          aiSettingId: aiSetting.id,
          provider,
          model,
          status: error.response?.status,
          data: error.response?.data,
          code: error.code,
          message: error.message
        },
        "Error generating AI response"
      );
      await createAiLog({
        aiSettingId: aiSetting.id,
        ticketId,
        provider,
        model,
        promptTokens: promptTokensEstimate,
        completionTokens: 0,
        status: "error",
        errorMessage: providerMessage,
        userMessage: truncateByApproxTokens(message, 700),
        aiResponse: null,
        metadata: {
          ...logMetadata,
          contextMessageCount: logMetadata?.contextMessageCount ?? recentMessages.length
        }
      }).catch(() => {});

      throw new AiProviderError({
        provider,
        status: error.response?.status,
        code: (error.response?.data as any)?.error?.code || error.code,
        message: providerMessage,
        details: error.response?.data
      });
    } else {
      logger.error(error, "Error generating AI response");
    }
    return null;
  }
};

export default GenerateAiResponseService;
