import AiSetting from "../../models/AiSetting";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import GenerateAiResponseService, { AiProviderError } from "./GenerateAiResponseService";
import SearchKnowledgeBaseService, { KnowledgeFragment } from "./SearchKnowledgeBaseService";

export type AiTicketAction =
  | "responder_com_base"
  | "pedir_confirmacao"
  | "pedir_mais_informacoes"
  | "encaminhar_atendente"
  | "encerrar_atendimento"
  | "sem_resposta_segura"
  | "nao_responder";

export interface AiDecisionOption {
  numero: string;
  valor: string;
}

export interface AiDecision {
  intencao: string;
  confianca: "baixa" | "media" | "alta";
  mensagemInterpretada: string;
  contexto: string;
  baseEncontrada: boolean;
  respostaSegura: boolean;
  acao: AiTicketAction;
  motivo: string;
  resposta?: string;
  perguntaConfirmacao?: string;
  opcoes?: AiDecisionOption[];
}

interface Request {
  ticket: Ticket;
  message: string;
  contactName?: string;
  aiSettingId?: number | null;
}

const normalizeText = (value = ""): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const extractJson = (content: string): any | null => {
  try {
    return JSON.parse(content);
  } catch (err) {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch (parseErr) {
      return null;
    }
  }
};

const safeAction = (value: string): AiTicketAction => {
  const actions: AiTicketAction[] = [
    "responder_com_base",
    "pedir_confirmacao",
    "pedir_mais_informacoes",
    "encaminhar_atendente",
    "encerrar_atendimento",
    "sem_resposta_segura",
    "nao_responder"
  ];

  return actions.includes(value as AiTicketAction)
    ? (value as AiTicketAction)
    : "sem_resposta_segura";
};

const parseOptions = (value: string | null | undefined): AiDecisionOption[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const getRecentHistory = async (ticketId: number): Promise<string> => {
  const messages = await Message.findAll({
    where: { ticketId },
    order: [["createdAt", "DESC"]],
    limit: 3
  });

  return messages
    .reverse()
    .map(message => `${message.fromMe ? "IA/Sistema" : "Cliente"}: ${message.body || ""}`)
    .join("\n");
};

const buildKnowledgeText = (fragments: KnowledgeFragment[]): string =>
  fragments
    .map((fragment, index) => [
      `#${index + 1} ${fragment.title}`,
      fragment.tags ? `Tags: ${fragment.tags}` : "",
      fragment.fragment
    ].filter(Boolean).join("\n"))
    .join("\n\n");

const historyHasRecentAiAnswer = (history: string): boolean => {
  const lines = history
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const relevantAiLines = lines.filter(line =>
    line.startsWith("IA/Sistema:") &&
    !/menu|opcao|opção|ola como posso ajudar|seja bem-vindo/i.test(line)
  );

  return relevantAiLines.length > 0;
};

const lastAiAskedToFinish = (history: string): boolean => {
  const lines = history
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
  const lastAiLine = [...lines].reverse().find(line => line.startsWith("IA/Sistema:")) || "";

  return /posso finalizar|pode finalizar|finalizar seu atendimento|posso encerrar|pode encerrar/i.test(lastAiLine);
};

const buildDecisionPrompt = ({
  message,
  history,
  knowledge,
  aiSetting,
  ticket,
  queue,
  pendingOptions
}: {
  message: string;
  history: string;
  knowledge: string;
  aiSetting: AiSetting;
  ticket: Ticket;
  queue: Queue | null;
  pendingOptions: AiDecisionOption[];
}): string => {
  const pendingQuestion = pendingOptions.length
    ? `Existe uma pergunta pendente da IA. Opcoes: ${JSON.stringify(pendingOptions)}. Interprete a resposta do cliente considerando essas opcoes.`
    : "Nao existe pergunta pendente da IA.";

  return [
    "Voce e uma camada de decisao de atendimento com IA para qualquer ramo de negocio. Nao responda em texto livre fora do JSON.",
    "Nao assuma que o atendimento e de suporte tecnico, comercial, clinica, escola, loja ou qualquer ramo especifico sem isso estar configurado ou na base.",
    `Nome da IA: ${aiSetting.name || "Assistente Virtual"}.`,
    aiSetting.companyName ? `Empresa ou servico: ${aiSetting.companyName}.` : "",
    aiSetting.serviceType ? `Tipo de atendimento: ${aiSetting.serviceType}.` : "",
    aiSetting.behaviorPrompt ? `Comportamento configurado:\n${aiSetting.behaviorPrompt}` : "",
    aiSetting.systemPrompt ? `Instrucoes adicionais:\n${aiSetting.systemPrompt}` : "",
    "Analise contexto, erros de digitacao, abreviacoes, historico recente e a base de conhecimento.",
    "A IA nao pode inventar valores, prazos, links, telefones, regras, procedimentos ou nomes que nao estejam na base.",
    "Pode responder perguntas sobre quem e a IA, qual seu papel, ou explicar uma resposta anterior usando o perfil configurado e o historico da conversa.",
    "Pode conversar de forma natural e humanizada, mas sem criar informacoes comerciais, tecnicas ou operacionais fora da base.",
    "Se nao houver base segura, use acao encaminhar_atendente ou sem_resposta_segura.",
    "Se houver varias possibilidades na base e a pergunta estiver ambigua, use pedir_confirmacao.",
    "Se o cliente pedir atendente/humano/pessoa ou rejeitar robo/IA, use encaminhar_atendente.",
    "Use encerrar_atendimento somente quando o contexto mostrar que o cliente ja recebeu a informacao/solucao que queria e indicou claramente que nao precisa de mais nada.",
    "Nao encerre apenas por uma palavra isolada como obrigado, ok, sim ou valeu se o contexto ainda nao indicar resolucao.",
    "Se o cliente agradecer depois de uma resposta util da IA e o historico indicar que a duvida foi atendida, pode encerrar_atendimento.",
    "Se o cliente pedir para fechar/finalizar, disser que era so isso, nao quer mais nada, tudo certo, resolveu ou pode fechar, use encerrar_atendimento.",
    "Se o cliente disser que nao resolveu ou ainda tem problema, use encaminhar_atendente.",
    "Quando decidir encerrar o atendimento, inclua obrigatoriamente [FECHAR TICKET] no final do campo resposta.",
    "Intencoes validas: consulta_valor, pedido_atendente, pedido_encerramento, cliente_satisfeito, cliente_nao_satisfeito, pergunta_sobre_produto_ou_servico, agendamento, acompanhamento, reclamacao, sem_resposta_segura, confirmacao_opcao.",
    "Acoes validas: responder_com_base, pedir_confirmacao, pedir_mais_informacoes, encaminhar_atendente, encerrar_atendimento, sem_resposta_segura, nao_responder.",
    "Quando acao for responder_com_base, preencha resposta com uma resposta curta, objetiva e baseada somente na base.",
    "Quando acao for pedir_confirmacao, preencha perguntaConfirmacao e opcoes com numero e valor.",
    "Retorne somente JSON valido, sem markdown.",
    `Configuracao da IA: ${aiSetting.name}`,
    `Fila atual: ${queue?.name || "sem fila"}`,
    `Ticket aiActive: ${ticket.aiActive ? "true" : "false"}`,
    pendingQuestion,
    `Historico recente:\n${history || "Sem historico."}`,
    `Base de conhecimento relevante:\n${knowledge || "Nenhum artigo encontrado."}`,
    `Mensagem atual do cliente: ${message}`,
    `Formato esperado:
{
  "intencao": "pergunta_sobre_produto_ou_servico",
  "confianca": "alta",
  "mensagemInterpretada": "Qual o valor do plano?",
  "contexto": "Cliente quer uma informacao sobre produto, servico, agendamento, status, valor ou regra cadastrada",
  "baseEncontrada": true,
  "respostaSegura": true,
  "acao": "responder_com_base",
  "motivo": "Existe informacao suficiente na base",
  "resposta": "Resposta ao cliente, quando aplicavel",
  "perguntaConfirmacao": "Pergunta de confirmacao, quando aplicavel",
  "opcoes": [{"numero":"1","valor":"Plano mensal"}]
}`
  ].join("\n\n");
};

const DecideAiTicketActionService = async ({
  ticket,
  message,
  contactName,
  aiSettingId
}: Request): Promise<AiDecision> => {
  const aiSetting = aiSettingId
    ? await AiSetting.findByPk(aiSettingId)
    : await AiSetting.findOne({ where: { active: true } });

  if (!aiSetting || !aiSetting.active) {
    return {
      intencao: "sem_configuracao",
      confianca: "baixa",
      mensagemInterpretada: message,
      contexto: "Configuracao de IA ausente ou inativa",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "nao_responder",
      motivo: "IA sem configuracao ativa"
    };
  }

  const queue = ticket.queueId ? await Queue.findByPk(ticket.queueId) : null;
  const configuredAiQueueId = aiSetting.aiQueueId || ticket.aiQueueId;
  const isInAiQueue = configuredAiQueueId
    ? Number(ticket.queueId) === Number(configuredAiQueueId)
    : !!queue?.useAI || Number(queue?.aiSettingId) === Number(aiSetting.id);

  if (
    !ticket.aiActive ||
    !isInAiQueue ||
    ticket.userId ||
    ticket.status === "closed" ||
    ticket.aiHumanHandoffAt
  ) {
    return {
      intencao: "fora_da_ia",
      confianca: "alta",
      mensagemInterpretada: message,
      contexto: "Ticket nao esta elegivel para resposta automatica",
      baseEncontrada: false,
      respostaSegura: false,
      acao: "nao_responder",
      motivo: "Ticket saiu da fila da IA, foi assumido, encaminhado ou encerrado"
    };
  }

  const pendingOptions = parseOptions(ticket.lastAiQuestionOptions);
  const history = await getRecentHistory(ticket.id);
  const articles = await SearchKnowledgeBaseService(
    pendingOptions.length
      ? `${message} ${pendingOptions.map(option => option.valor).join(" ")}`
      : message
  );
  const knowledge = buildKnowledgeText(articles);

  const prompt = buildDecisionPrompt({
    message,
    history,
    knowledge,
    aiSetting,
    ticket,
    queue,
    pendingOptions
  });

  let rawDecision: string | null = null;
  try {
    rawDecision = await GenerateAiResponseService({
      aiSettingId: aiSetting.id,
      message: prompt,
      contactName,
      ticketId: ticket.id,
      skipKnowledgeSearch: true
    });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return {
        intencao: "erro_api_ia",
        confianca: "alta",
        mensagemInterpretada: message,
        contexto: `Falha ao chamar o provedor de IA ${error.provider}`,
        baseEncontrada: articles.length > 0,
        respostaSegura: false,
        acao: "encaminhar_atendente",
        motivo: `Servico de IA indisponivel: ${error.message}`
      };
    }

    throw error;
  }

  const parsed = rawDecision ? extractJson(rawDecision) : null;
  if (!parsed) {
    return {
      intencao: "sem_resposta_segura",
      confianca: "baixa",
      mensagemInterpretada: message,
      contexto: "A IA nao retornou uma decisao estruturada valida",
      baseEncontrada: articles.length > 0,
      respostaSegura: false,
      acao: "sem_resposta_segura",
      motivo: "Falha ao interpretar decisao da IA"
    };
  }

  const decision: AiDecision = {
    intencao: String(parsed.intencao || "pergunta_sobre_produto_ou_servico"),
    confianca: ["baixa", "media", "alta"].includes(parsed.confianca)
      ? parsed.confianca
      : "media",
    mensagemInterpretada: String(parsed.mensagemInterpretada || message),
    contexto: String(parsed.contexto || ""),
    baseEncontrada: parsed.baseEncontrada === true || articles.length > 0,
    respostaSegura: parsed.respostaSegura === true,
    acao: safeAction(String(parsed.acao || "sem_resposta_segura")),
    motivo: String(parsed.motivo || ""),
    resposta: parsed.resposta ? String(parsed.resposta) : undefined,
    perguntaConfirmacao: parsed.perguntaConfirmacao
      ? String(parsed.perguntaConfirmacao)
      : undefined,
    opcoes: Array.isArray(parsed.opcoes) ? parsed.opcoes : undefined
  };

  if (decision.acao === "responder_com_base" && (!decision.respostaSegura || !decision.resposta)) {
    decision.acao = "sem_resposta_segura";
    decision.motivo = decision.motivo || "Resposta sem base segura";
  }

  if (decision.acao === "pedir_confirmacao" && (!decision.perguntaConfirmacao || !decision.opcoes?.length)) {
    decision.acao = "pedir_mais_informacoes";
    decision.motivo = decision.motivo || "Confirmacao sem opcoes suficientes";
  }

  if (!decision.baseEncontrada && decision.acao === "responder_com_base") {
    decision.acao = "sem_resposta_segura";
    decision.respostaSegura = false;
    decision.motivo = "Nao foi encontrada base suficiente para responder";
  }

  if (decision.acao === "encerrar_atendimento") {
    if (!decision.resposta) {
      decision.resposta =
        "Que bom que pude ajudar. Vou finalizar seu atendimento. Se precisar novamente, e so chamar. [FECHAR TICKET]";
    } else if (!decision.resposta.includes("[FECHAR TICKET]")) {
      decision.resposta = `${decision.resposta} [FECHAR TICKET]`;
    }
  }

  return decision;
};

export default DecideAiTicketActionService;
