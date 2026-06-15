require("dotenv").config();

const fs = require("fs");
const path = require("path");

const sequelize = require("../dist/database").default;
const AiSetting = require("../dist/models/AiSetting").default;
const AiTicketContext = require("../dist/models/AiTicketContext").default;
const Contact = require("../dist/models/Contact").default;
const Message = require("../dist/models/Message").default;
const Queue = require("../dist/models/Queue").default;
const Ticket = require("../dist/models/Ticket").default;
const DecideAiTicketActionService = require("../dist/services/AiServices/DecideAiTicketActionService").default;
const FullBaseGroundingMariService = require("../dist/services/AiServices/FullBaseGroundingMariService").default;

const REPORT_DIR = path.resolve(__dirname, "../reports");
const REPORT_MD = path.join(REPORT_DIR, "mari-50-api-report.md");
const REPORT_JSON = path.join(REPORT_DIR, "mari-50-api-report.json");

const normalize = value =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const includesAll = (...terms) => answer =>
  terms.every(term => normalize(answer).includes(normalize(term)));

const includesAny = (...terms) => answer =>
  terms.some(term => normalize(answer).includes(normalize(term)));

const notIncludesAny = (...terms) => answer =>
  terms.every(term => !normalize(answer).includes(normalize(term)));

const hasRegex = regex => answer => regex.test(answer || "");

const truncate = (value, max = 900) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
};

const tests = [
  {
    n: 1,
    userMessage: "aceita pix?",
    contextBefore: "Cliente iniciou com pergunta curta sobre pagamento.",
    mode: "fullbase",
    expectedAnswer: "Informar que aceita Pix e, se couber, cartao de debito/credito.",
    shouldNotMention: ["boleto", "dinheiro", "parcelamento confirmado"],
    checks: [includesAny("pix"), notIncludesAny("boleto", "dinheiro")]
  },
  {
    n: 2,
    userMessage: "passa no cartao?",
    contextBefore: "Cliente perguntou informalmente sobre cartao.",
    mode: "fullbase",
    expectedAnswer: "Informar cartao de debito e credito.",
    shouldNotMention: ["parcelamos", "sem juros"],
    checks: [includesAny("cartao"), includesAny("debito", "credito"), notIncludesAny("sem juros", "parcelamos")]
  },
  {
    n: 3,
    userMessage: "divide no cartao?",
    contextBefore: "Cliente perguntou sobre dividir/parcelar; a base so confirma formas e regra de reserva.",
    mode: "fullbase",
    expectedAnswer: "Nao inventar parcelamento; responder formas confirmadas e regra dos 50% ou encaminhar validacao.",
    shouldNotMention: ["parcelamos", "sem juros", "nao e possivel dividir"],
    checks: [
      includesAny("cartao", "pix", "50"),
      notIncludesAny("parcelamos", "sem juros", "nao e possivel dividir", "nao pode dividir")
    ]
  },
  {
    n: 4,
    userMessage: "como reserva?",
    contextBefore: "Cliente mudou de pagamento para reserva.",
    mode: "fullbase",
    expectedAnswer: "Explicar 50% para reservar e restante ate 3 dias antes.",
    shouldNotMention: ["reserva confirmada", "agenda garantida"],
    checks: [includesAny("50"), includesAny("3 dias", "tres dias"), notIncludesAny("reserva confirmada", "agenda garantida")]
  },
  {
    n: 5,
    userMessage: "tem que pagar sinal?",
    contextBefore: "Cliente usa termo informal para reserva.",
    mode: "fullbase",
    expectedAnswer: "Associar sinal a 50% do orcamento.",
    shouldNotMention: ["100% antecipado"],
    checks: [includesAny("50"), includesAny("reserva", "orcamento"), notIncludesAny("100%")]
  },
  {
    n: 6,
    userMessage: "quando pago o restante?",
    contextBefore: "Mari ja tinha informado que existe pagamento inicial de reserva.",
    history: "Cliente: como reserva?\nMari: Para reservar, e necessario pagar 50% do valor.",
    mode: "fullbase",
    expectedAnswer: "Informar que os 50% restantes sao ate 3 dias antes da data.",
    shouldNotMention: ["no dia do evento", "depois do evento"],
    checks: [includesAny("3 dias"), includesAny("50", "restante"), notIncludesAny("depois do evento")]
  },
  {
    n: 7,
    userMessage: "a reserva confirma automatico?",
    contextBefore: "Cliente pergunta se pagamento ja garante tudo automaticamente.",
    mode: "fullbase",
    expectedAnswer: "Nao confirmar; dizer que disponibilidade/reserva/pagamento precisam validacao da equipe.",
    shouldNotMention: ["automaticamente confirmada", "ja fica reservado"],
    checks: [includesAny("equipe", "validada", "confirmacao", "verificada"), notIncludesAny("automaticamente confirmada", "ja fica reservado")]
  },
  {
    n: 8,
    userMessage: "posso confirmar disponibilidade agora?",
    contextBefore: "Cliente quer disponibilidade em tempo real.",
    mode: "fullbase",
    expectedAnswer: "Nao inventar disponibilidade; encaminhar/validar com equipe.",
    shouldNotMention: ["esta disponivel", "horario livre"],
    checks: [includesAny("equipe", "atendente", "validar", "confirmar"), notIncludesAny("esta disponivel", "horario livre")]
  },
  {
    n: 9,
    userMessage: "onde fica?",
    contextBefore: "Cliente estava falando de valores, mudou para endereco.",
    history: "Cliente: manda os valores\nMari: Posso te passar a tabela.\nCliente: mudando de assunto",
    mode: "fullbase",
    expectedAnswer: "Rua Dias da Cruz, 185, sala 215, Meier, RJ, com referencias.",
    shouldNotMention: ["Copacabana"],
    checks: [includesAll("dias da cruz", "185"), includesAny("sala 215", "meier"), notIncludesAny("copacabana")]
  },
  {
    n: 10,
    userMessage: "tem referencia perto?",
    contextBefore: "Cliente quer ponto de referencia.",
    mode: "fullbase",
    expectedAnswer: "Citar Imperator e/ou Smart Fit.",
    shouldNotMention: ["metro na porta"],
    checks: [includesAny("imperator", "smart fit"), notIncludesAny("metro na porta")]
  },
  {
    n: 11,
    userMessage: "qual contato de voces?",
    contextBefore: "Pergunta de contato oficial.",
    mode: "fullbase",
    expectedAnswer: "Responder apenas contato confirmado na base, ou fallback seguro se nao houver.",
    shouldNotMention: ["telefone inventado", "21 99999"],
    checks: [answer => includesAny("nao encontrei", "encaminhar", "instagram", "whatsapp", "contato")(answer)]
  },
  {
    n: 12,
    userMessage: "tem instagram?",
    contextBefore: "Cliente pede rede social.",
    mode: "fullbase",
    expectedAnswer: "Responder Instagram confirmado na base ou fallback seguro.",
    shouldNotMention: ["@salinhameier_oficial_inventado"],
    checks: [answer => includesAny("instagram", "nao encontrei", "encaminhar")(answer), notIncludesAny("@salinhameier_oficial_inventado")]
  },
  {
    n: 13,
    userMessage: "tem ar?",
    contextBefore: "Pergunta curta e ambigua de estrutura.",
    mode: "fullbase",
    expectedAnswer: "Dizer que a sala tem ar-condicionado.",
    shouldNotMention: ["ventilador apenas"],
    checks: [includesAny("ar-condicionado", "ar condicionado"), notIncludesAny("ventilador apenas")]
  },
  {
    n: 14,
    userMessage: "tem wifi?",
    contextBefore: "Cliente pergunta estrutura.",
    mode: "fullbase",
    expectedAnswer: "Confirmar internet/wifi se constar na base.",
    shouldNotMention: ["senha"],
    checks: [includesAny("internet", "wifi", "wi-fi"), notIncludesAny("senha")]
  },
  {
    n: 15,
    userMessage: "da pra passar slide na tv?",
    contextBefore: "Cliente pergunta apresentacao.",
    mode: "fullbase",
    expectedAnswer: "Confirmar TV para reproducao de conteudo.",
    shouldNotMention: ["projetor"],
    checks: [includesAny("tv"), notIncludesAny("projetor")]
  },
  {
    n: 16,
    userMessage: "tem quadro?",
    contextBefore: "Pergunta simples de estrutura.",
    mode: "fullbase",
    expectedAnswer: "Confirmar quadro branco.",
    shouldNotMention: ["lousa digital"],
    checks: [includesAny("quadro"), notIncludesAny("lousa digital")]
  },
  {
    n: 17,
    userMessage: "tem banheiro?",
    contextBefore: "Pergunta simples de estrutura.",
    mode: "fullbase",
    expectedAnswer: "Confirmar banheiro.",
    shouldNotMention: ["chuveiro"],
    checks: [includesAny("banheiro"), notIncludesAny("chuveiro")]
  },
  {
    n: 18,
    userMessage: "tem cafe?",
    contextBefore: "Cliente pergunta item da copa.",
    mode: "fullbase",
    expectedAnswer: "Citar copa/cafeteira se confirmado.",
    shouldNotMention: ["coffee break incluso"],
    checks: [includesAny("cafe", "cafeteira", "copa"), notIncludesAny("coffee break")]
  },
  {
    n: 19,
    userMessage: "tem agua gelada?",
    contextBefore: "Cliente pergunta item especifico.",
    mode: "fullbase",
    expectedAnswer: "Citar filtro com agua gelada.",
    shouldNotMention: ["garrafa individual gratis"],
    checks: [includesAny("agua gelada", "filtro"), notIncludesAny("garrafa individual")]
  },
  {
    n: 20,
    userMessage: "o que esta incluso?",
    contextBefore: "Pergunta aberta de estrutura.",
    mode: "fullbase",
    expectedAnswer: "Listar estrutura inclusa da base.",
    shouldNotMention: ["estacionamento incluso"],
    checks: [includesAny("ar-condicionado", "ar condicionado"), includesAny("internet"), includesAny("tv"), notIncludesAny("estacionamento incluso")]
  },
  {
    n: 21,
    userMessage: "cabe 10 pessoas?",
    contextBefore: "Cliente quer saber capacidade para grupo abaixo do limite.",
    mode: "fullbase",
    expectedAnswer: "Informar capacidade ate 20 pessoas.",
    shouldNotMention: ["nao cabe 10"],
    checks: [includesAny("20"), includesAny("pessoas", "capacidade"), notIncludesAny("nao cabe 10")]
  },
  {
    n: 22,
    userMessage: "cabe 25?",
    contextBefore: "Cliente pergunta grupo acima do limite.",
    mode: "fullbase",
    expectedAnswer: "Informar maximo de 20 e encaminhar avaliacao para acima disso.",
    shouldNotMention: ["cabe 25 sim", "capacidade 25"],
    checks: [includesAny("20"), includesAny("equipe", "avaliar", "atendente", "acima"), notIncludesAny("cabe 25 sim", "capacidade 25")]
  },
  {
    n: 23,
    userMessage: "qual a lotacao maxima?",
    contextBefore: "Pergunta formal de capacidade.",
    mode: "fullbase",
    expectedAnswer: "Capacidade maxima ate 20 pessoas.",
    shouldNotMention: ["30 pessoas"],
    checks: [includesAny("20"), includesAny("pessoas", "capacidade"), notIncludesAny("30 pessoas")]
  },
  {
    n: 24,
    userMessage: "manda os valores",
    contextBefore: "Cliente pede tabela em linguagem curta.",
    mode: "fullbase",
    expectedAnswer: "Trazer tabela oficial de valores/pacotes.",
    shouldNotMention: ["valor sob consulta apenas"],
    checks: [includesAny("r$", "valor", "tabela", "preco", "pacote"), notIncludesAny("sob consulta apenas")]
  },
  {
    n: 25,
    userMessage: "quanto e 2 horas?",
    contextBefore: "Cliente pede preco especifico pontual.",
    mode: "fullbase",
    expectedAnswer: "Responder valor de 2 horas se existir; se nao existir, fallback seguro.",
    shouldNotMention: ["chutei", "aproximadamente"],
    checks: [answer => includesAny("r$", "nao encontrei", "encaminhar")(answer), notIncludesAny("aproximadamente", "chutei")]
  },
  {
    n: 26,
    userMessage: "3 horas sai quanto?",
    contextBefore: "Cliente usa frase informal para preco especifico.",
    mode: "fullbase",
    expectedAnswer: "Responder valor de 3 horas ou fallback seguro.",
    shouldNotMention: ["aproximadamente"],
    checks: [answer => includesAny("r$", "nao encontrei", "encaminhar")(answer), notIncludesAny("aproximadamente")]
  },
  {
    n: 27,
    userMessage: "qual valor da diaria?",
    contextBefore: "Cliente pergunta diaria.",
    mode: "fullbase",
    expectedAnswer: "Responder diaria se constar na tabela.",
    shouldNotMention: ["pernoite"],
    checks: [answer => includesAny("r$", "diaria", "nao encontrei", "encaminhar")(answer), notIncludesAny("pernoite")]
  },
  {
    n: 28,
    userMessage: "tem pacote de horas?",
    contextBefore: "Cliente pergunta pacotes.",
    mode: "fullbase",
    expectedAnswer: "Responder sobre pacotes de horas.",
    shouldNotMention: ["assinatura anual obrigatoria"],
    checks: [includesAny("pacote", "horas"), notIncludesAny("assinatura anual")]
  },
  {
    n: 29,
    userMessage: "pacote 10h existe?",
    contextBefore: "Cliente pergunta pacote especifico.",
    mode: "fullbase",
    expectedAnswer: "Confirmar pacote se existir ou fallback seguro.",
    shouldNotMention: ["inventar pacote 10h"],
    checks: [answer => includesAny("10", "nao encontrei", "encaminhar", "pacote")(answer)]
  },
  {
    n: 30,
    userMessage: "tem mensalista?",
    contextBefore: "Cliente pergunta planos mensais.",
    mode: "fullbase",
    expectedAnswer: "Citar mensalista/planos da base.",
    shouldNotMention: ["sem fidelidade se a base exigir 3 meses"],
    checks: [includesAny("mensal", "mensalista", "prata", "ouro", "diamante"), includesAny("3 meses", "prata", "ouro", "diamante")]
  },
  {
    n: 31,
    userMessage: "plano prata como funciona?",
    contextBefore: "Cliente pergunta plano especifico.",
    mode: "fullbase",
    expectedAnswer: "Responder Plano Prata com regra oficial.",
    shouldNotMention: ["plano gratis"],
    checks: [includesAny("prata"), includesAny("mensal", "3 meses"), notIncludesAny("gratis")]
  },
  {
    n: 32,
    userMessage: "tem plano ouro?",
    contextBefore: "Cliente pergunta outro plano mensal.",
    mode: "fullbase",
    expectedAnswer: "Responder Plano Ouro se existir.",
    shouldNotMention: ["premium ilimitado"],
    checks: [includesAny("ouro"), includesAny("mensais", "mensal", "mensalista"), notIncludesAny("ilimitado")]
  },
  {
    n: 33,
    userMessage: "professor e 1 hora?",
    contextBefore: "Cliente pergunta pacote professor com duvida curta.",
    mode: "fullbase",
    expectedAnswer: "Explicar Pacote Professor Particular, minimo 1 mes, dias/horarios/valores oficiais.",
    shouldNotMention: ["avulso de 1 hora confirmado"],
    checks: [includesAny("professor"), includesAny("1 mes", "tercas", "quintas", "13h", "17h30"), notIncludesAny("avulso de 1 hora confirmado")]
  },
  {
    n: 34,
    userMessage: "professor particular tem quais horarios?",
    contextBefore: "Cliente pergunta horarios do pacote professor.",
    mode: "fullbase",
    expectedAnswer: "Tercas e quintas, das 13h as 17h30.",
    shouldNotMention: ["segunda", "sabado"],
    checks: [includesAny("tercas", "quintas"), includesAny("13h", "17h30"), notIncludesAny("segunda", "sabado")]
  },
  {
    n: 35,
    userMessage: "pacote professor pode avulso?",
    contextBefore: "Cliente pergunta se professor e avulso.",
    mode: "fullbase",
    expectedAnswer: "Dizer que base fala em contratacao minima de 1 mes/opcoes oficiais; nao inventar avulso.",
    shouldNotMention: ["pode avulso sim"],
    checks: [includesAny("professor"), includesAny("1 mes", "minima", "base informa"), notIncludesAny("pode avulso sim")]
  },
  {
    n: 36,
    userMessage: "tem desconto?",
    contextBefore: "Cliente pede desconto.",
    mode: "fullbase",
    expectedAnswer: "Nao calcular desconto; encaminhar avaliacao da equipe.",
    shouldNotMention: ["10%", "5%", "desconto aprovado"],
    checks: [includesAny("equipe", "atendente", "avaliar", "verificar"), notIncludesAny("10%", "5%", "desconto aprovado")]
  },
  {
    n: 37,
    userMessage: "consegue melhorar o valor?",
    contextBefore: "Cliente negocia valor depois de ver tabela.",
    history: "Cliente: manda os valores\nMari: Enviei a tabela oficial.\nCliente: achei alto",
    mode: "fullbase",
    expectedAnswer: "Tratar como desconto/condicao especial e encaminhar avaliacao.",
    shouldNotMention: ["ja baixei", "cupom"],
    checks: [includesAny("equipe", "atendente", "avaliar", "verificar"), notIncludesAny("ja baixei", "cupom")]
  },
  {
    n: 38,
    userMessage: "e se eu fechar varios dias?",
    contextBefore: "Cliente pergunta condicao especial por volume.",
    mode: "fullbase",
    expectedAnswer: "Encaminhar para equipe avaliar condicao especial; nao prometer desconto.",
    shouldNotMention: ["desconto garantido"],
    checks: [includesAny("equipe", "avaliar", "condicao", "atendente"), notIncludesAny("desconto garantido")]
  },
  {
    n: 39,
    userMessage: "qual a cor das cadeiras?",
    contextBefore: "Pergunta factual provavelmente nao confirmada na base.",
    mode: "fullbase",
    expectedAnswer: "Fallback seguro se a base nao confirma.",
    shouldNotMention: ["azul", "preta", "branca"],
    checks: [includesAny("nao encontrei", "encaminhar"), notIncludesAny("azul", "preta", "branca")]
  },
  {
    n: 40,
    userMessage: "quero orcamento pra 15 pessoas, 2 dias, 3 horas por dia",
    contextBefore: "Cliente traz todos os dados de orcamento.",
    mode: "decision",
    expectedAnswer: "Fluxo deve usar calculadora oficial ou retornar acao de ferramenta, nao calcular livre.",
    shouldNotMention: ["valor inventado manualmente"],
    checks: [answer => includesAny("r$", "orcamento", "simulacao", "calcularorcamento")(answer)]
  },
  {
    n: 41,
    userMessage: "quanto fica?",
    contextBefore: "Sem dados suficientes para orcamento.",
    mode: "decision",
    threadId: "quote_collection",
    expectedAnswer: "Pergunta objetiva: Para quantas pessoas?",
    shouldNotMention: ["varias perguntas longas"],
    checks: [includesAny("quantas pessoas", "para quantas pessoas")]
  },
  {
    n: 42,
    userMessage: "12 pessoas",
    contextBefore: "Mari perguntou: Para quantas pessoas?",
    mode: "decision",
    threadId: "quote_collection",
    lastAiMessage: "Para quantas pessoas?",
    operationalState: { lastQuestionKey: "people" },
    expectedAnswer: "Avancar para dias/encontros, nao repetir pessoas.",
    shouldNotMention: ["Para quantas pessoas?"],
    checks: [includesAny("quantos dias", "dias/encontros", "encontros"), notIncludesAny("para quantas pessoas?")]
  },
  {
    n: 43,
    userMessage: "3 dias",
    contextBefore: "Ja tem 12 pessoas; Mari perguntou quantidade de dias/encontros.",
    mode: "decision",
    threadId: "quote_collection",
    lastAiMessage: "Quantos dias/encontros?",
    collectedData: {
      participant_count: { label: "Quantidade de pessoas/participantes", value: "12", rawValue: "12 pessoas" }
    },
    operationalState: { lastQuestionKey: "meetingCount" },
    expectedAnswer: "Avancar para horas por dia/encontro.",
    shouldNotMention: ["Para quantas pessoas?"],
    checks: [includesAny("quantas horas", "horas por dia", "horas por encontro"), notIncludesAny("para quantas pessoas")]
  },
  {
    n: 44,
    userMessage: "2 horas",
    contextBefore: "Ja tem pessoas e dias; Mari perguntou horas.",
    mode: "decision",
    threadId: "quote_collection",
    lastAiMessage: "Quantas horas por dia/encontro?",
    collectedData: {
      participant_count: { label: "Quantidade de pessoas/participantes", value: "12", rawValue: "12 pessoas" },
      occurrences: { label: "Quantidade de ocorrencias/unidades de agenda", value: "3", rawValue: "3 dias" }
    },
    operationalState: { lastQuestionKey: "hoursPerMeeting" },
    expectedAnswer: "Gerar orcamento/calculadora sem repetir perguntas.",
    shouldNotMention: ["Quantas horas por dia/encontro?"],
    checks: [answer => includesAny("r$", "orcamento", "simulacao", "calcularorcamento")(answer), notIncludesAny("quantas horas por dia/encontro?")]
  },
  {
    n: 45,
    userMessage: "1",
    contextBefore: "Depois do orcamento, menu perguntou se queria fechar/reservar.",
    mode: "decision",
    lastAiMessage: "1. Quero reservar/fechar agora\n2. Quero outro orcamento\n3. Quero tirar uma duvida\n4. Falar com atendente",
    operationalState: { lastOfferType: "post_quote_menu", awaitingConfirmationFor: "post_quote_menu" },
    expectedAnswer: "Nao confirmar reserva; encaminhar equipe.",
    shouldNotMention: ["reserva confirmada", "esta reservado"],
    checks: [includesAny("equipe", "atendente", "confirmar", "validar"), notIncludesAny("reserva confirmada", "esta reservado")]
  },
  {
    n: 46,
    userMessage: "2",
    contextBefore: "Depois do orcamento, menu perguntou se queria outro orcamento.",
    mode: "decision",
    lastAiMessage: "1. Quero reservar/fechar agora\n2. Quero outro orcamento\n3. Quero tirar uma duvida\n4. Falar com atendente",
    operationalState: { lastOfferType: "post_quote_menu", awaitingConfirmationFor: "post_quote_menu" },
    expectedAnswer: "Iniciar novo orcamento com pergunta curta sobre pessoas.",
    shouldNotMention: ["refazer sem dados"],
    checks: [includesAny("quantas pessoas", "para quantas pessoas")]
  },
  {
    n: 47,
    userMessage: "antes disso, tem ar?",
    contextBefore: "Cliente estava no fluxo de orcamento/menu, mas mudou de assunto.",
    mode: "fullbase",
    history: "Mari: 1. Quero reservar/fechar agora\n2. Quero outro orcamento\n3. Quero tirar uma duvida\nCliente: antes disso",
    expectedAnswer: "Responder a pergunta atual sobre ar-condicionado pela base.",
    shouldNotMention: ["orçamento", "quantas pessoas"],
    checks: [includesAny("ar-condicionado", "ar condicionado"), notIncludesAny("quantas pessoas")]
  },
  {
    n: 48,
    userMessage: "nao, quero saber onde fica",
    contextBefore: "Cliente corrige a rota apos pergunta de orcamento.",
    mode: "fullbase",
    history: "Mari: Para quantas pessoas?\nCliente: nao, outra duvida",
    expectedAnswer: "Responder endereco pela base, sem insistir no orcamento.",
    shouldNotMention: ["Para quantas pessoas?"],
    checks: [includesAll("dias da cruz", "185"), notIncludesAny("para quantas pessoas")]
  },
  {
    n: 49,
    userMessage: "qual a cotacao do dolar hoje?",
    contextBefore: "Pergunta fora do escopo, mas palavra cotacao poderia confundir com orcamento.",
    mode: "fullbase",
    expectedAnswer: "Nao tratar como orcamento da sala; limitar ao escopo Salinha Meier.",
    shouldNotMention: ["Para quantas pessoas?", "dolar hoje e"],
    checks: [includesAny("salinha", "valores", "estrutura", "reserva", "orcamento"), notIncludesAny("para quantas pessoas", "dolar hoje")]
  },
  {
    n: 50,
    userMessage: "voce usa calcinha?",
    contextBefore: "Mensagem inadequada.",
    mode: "fullbase",
    expectedAnswer: "Redirecionar profissionalmente para assuntos da Salinha Meier.",
    shouldNotMention: ["responder flerte"],
    checks: [includesAny("salinha", "valores", "estrutura", "capacidade", "reserva", "orcamento")]
  }
];

const createQueue = async aiSetting => {
  if (aiSetting.aiQueueId) {
    const configuredQueue = await Queue.findByPk(aiSetting.aiQueueId);
    if (configuredQueue) {
      await configuredQueue.update({ useAI: true, aiSettingId: aiSetting.id });
      return configuredQueue;
    }
  }

  const [queue] = await Queue.findOrCreate({
    where: { name: "Codex Mari API Test Queue" },
    defaults: {
      color: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`,
      useAI: true,
      aiSettingId: aiSetting.id
    }
  });

  await queue.update({ useAI: true, aiSettingId: aiSetting.id });
  return queue;
};

const createTicket = async ({ aiSetting, queue, test }) => {
  const unique = `${Date.now()}${String(test.n).padStart(3, "0")}`;
  const contact = await Contact.create({
    name: `Codex Mari Test ${test.n}`,
    number: `550000${unique}`,
    lid: `codex-mari-${unique}@test`,
    email: ""
  });

  const ticket = await Ticket.create({
    status: "pending",
    unreadMessages: 0,
    lastMessage: test.userMessage,
    isGroup: false,
    contactId: contact.id,
    queueId: queue.id,
    aiActive: true,
    aiHandled: false,
    aiSettingId: aiSetting.id,
    aiQueueId: queue.id,
    aiStartedAt: new Date(),
    lastAiMessage: test.lastAiMessage || null,
    lastAiAction: test.lastAiMessage ? "pedir_mais_informacoes" : null
  });

  if (test.lastAiMessage) {
    await Message.create({
      id: `codex-out-${unique}`,
      body: test.lastAiMessage,
      fromMe: true,
      senderType: "assistant",
      ticketId: ticket.id,
      contactId: contact.id,
      ack: 3,
      read: true
    });
  }

  if (test.userMessage) {
    await Message.create({
      id: `codex-in-${unique}`,
      body: test.userMessage,
      fromMe: false,
      senderType: "contact",
      ticketId: ticket.id,
      contactId: contact.id,
      ack: 0,
      read: false
    });
  }

  if (test.collectedData || test.operationalState) {
    const now = new Date().toISOString();
    const collectedData = {};
    Object.entries(test.collectedData || {}).forEach(([key, item]) => {
      collectedData[key] = {
        label: item.label,
        value: item.value,
        rawValue: item.rawValue || item.value,
        source: "test_context",
        updatedAt: now
      };
    });

    await AiTicketContext.create({
      ticketId: ticket.id,
      summary: test.contextBefore,
      collectedData: JSON.stringify(collectedData),
      missingData: null,
      operationalState: JSON.stringify(test.operationalState || {}),
      currentObjective: null,
      nextQuestion: null,
      lastSource: "test_context",
      lastUpdatedAt: new Date()
    });
  }

  return ticket;
};

const appendCustomerMessage = async ({ ticket, test }) => {
  const unique = `${Date.now()}${String(test.n).padStart(3, "0")}`;
  await ticket.update({ lastMessage: test.userMessage });
  await Message.create({
    id: `codex-thread-in-${unique}`,
    body: test.userMessage,
    fromMe: false,
    senderType: "contact",
    ticketId: ticket.id,
    contactId: ticket.contactId,
    ack: 0,
    read: false
  });
  await ticket.reload();
};

const callFullBase = async ({ aiSetting, ticket, test }) => {
  const result = await FullBaseGroundingMariService({
    ticket,
    aiSetting,
    message: test.userMessage,
    history: test.history || test.contextBefore || "",
    structuredContext: JSON.stringify({
      contextBefore: test.contextBefore,
      collectedData: test.collectedData || null,
      operationalState: test.operationalState || null
    }),
    contactName: "Gabriel"
  });

  return {
    endpointOrService: "FullBaseGroundingMariService (etapa obrigatoria chamada antes da resposta factual)",
    rawApiResult: result,
    customerAnswer: result && result.customerAnswer ? result.customerAnswer : "",
    detectedIntent: result && result.intent ? result.intent : null,
    baseSentToModel: result && result.baseSentToModel === true,
    baseVersion: result && result.baseVersion ? result.baseVersion : null,
    promptVersion: result && result.promptVersion ? result.promptVersion : null,
    foundInBase: result && result.foundInBase === true,
    baseSectionsUsed: result && Array.isArray(result.baseSectionsUsed) ? result.baseSectionsUsed : [],
    needsHuman: result && result.needsHuman === true,
    needsQuoteCalculation: result && result.needsQuoteCalculation === true,
    usedOldFlow: false,
    grounded: Boolean(result && result.baseSentToModel && result.foundInBase)
  };
};

const callDecision = async ({ ticket, test }) => {
  const decision = await DecideAiTicketActionService({
    ticket,
    message: test.userMessage,
    contactName: "Gabriel",
    aiSettingId: ticket.aiSettingId
  });

  const customerAnswer = decision.resposta ||
    decision.perguntaConfirmacao ||
    (decision.ferramenta ? JSON.stringify({
      acao: decision.acao,
      ferramenta: decision.ferramenta,
      parametrosFerramenta: decision.parametrosFerramenta || {}
    }) : "");
  return {
    endpointOrService: "DecideAiTicketActionService (fluxo real do atendimento)",
    rawApiResult: decision,
    customerAnswer,
    detectedIntent: decision.intencao || null,
    baseSentToModel: null,
    baseVersion: null,
    promptVersion: null,
    foundInBase: decision.baseEncontrada === true,
    baseSectionsUsed: decision.knowledgeIds || [],
    needsHuman: decision.acao === "encaminhar_atendente",
    needsQuoteCalculation: decision.acao === "executar_ferramenta" || decision.ferramenta === "calcularOrcamento",
    usedOldFlow: decision.contexto ? !/Full Base Grounding/i.test(decision.contexto) : true,
    grounded: decision.baseEncontrada === true || decision.acao === "executar_ferramenta"
  };
};

const evaluate = (test, result) => {
  const checks = test.checks || [];
  const failedChecks = checks
    .map((check, index) => ({ index: index + 1, ok: Boolean(check(result.customerAnswer, result.rawApiResult)) }))
    .filter(item => !item.ok);

  const isSafeFallback = includesAny("nao encontrei", "não encontrei")(result.customerAnswer);
  const baseRequirementOk =
    test.mode === "decision" ||
    (result.baseSentToModel === true &&
      result.promptVersion &&
      result.baseVersion &&
      (result.baseSectionsUsed.length > 0 || isSafeFallback));

  const passed = failedChecks.length === 0 && baseRequirementOk;
  const failureReason = passed
    ? ""
    : [
        failedChecks.length ? `Falhou em ${failedChecks.length} checagem(ns) de conteudo.` : "",
        !baseRequirementOk ? "Nao registrou pergunta direcionada/base/chunks antes da resposta factual." : ""
      ].filter(Boolean).join(" ");

  return { passed, failureReason };
};

const suggestionFor = (test, result, failureReason) => {
  if (!failureReason) return "Sem correcao necessaria.";
  if (test.n === 3) return "Ajustar guardrail de pagamento para nao declarar que nao divide se a base nao confirma parcelamento; responder formas aceitas + regra dos 50% ou validar com equipe.";
  if ([11, 12].includes(test.n)) return "Mapear perguntas de contato/Instagram no query rewriting e responder somente se a base tiver esses dados.";
  if ([25, 26, 27, 29].includes(test.n)) return "Criar respostas deterministicas para precos especificos da tabela, ou fallback seguro quando a tabela nao tiver aquele item.";
  if (test.mode === "decision") return "Revisar fluxo operacional de orcamento/menu para perguntas curtas, sem repetir dado ja coletado, e com chamada da calculadora.";
  return "Ajustar prompt/guardrail local para manter resposta curta e estritamente baseada no trecho da base.";
};

const writeReports = payload => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(payload, null, 2));

  const lines = [];
  lines.push("# Relatorio Mari - 50 testes reais API");
  lines.push("");
  lines.push(`Gerado em: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Auditoria inicial");
  lines.push("");
  lines.push(`- Servico factual: FullBaseGroundingMariService`);
  lines.push(`- Servico fluxo real: DecideAiTicketActionService`);
  lines.push(`- Prompt ativo: ${payload.audit.promptVersion || "n/a"}`);
  lines.push(`- Base enviada ao modelo nos casos factuais: ${payload.audit.factBaseSentCount}/${payload.audit.factTotal}`);
  lines.push(`- Fluxo antigo detectado nos casos de decisao: ${payload.audit.oldFlowDecisionCount}/${payload.audit.decisionTotal}`);
  lines.push(`- Ambiente: ${payload.audit.environment}`);
  lines.push("");
  lines.push("## Resultado");
  lines.push("");
  lines.push(`- Total: ${payload.total}`);
  lines.push(`- Passou: ${payload.passed}`);
  lines.push(`- Falhou: ${payload.failed}`);
  lines.push(`- Taxa: ${payload.passRate}`);
  lines.push(`- Pronto para producao: ${payload.readyForProduction ? "sim" : "nao"}`);
  lines.push("");
  lines.push("## Tabela");
  lines.push("");
  lines.push("| # | Pergunta | Resposta ao cliente | Intencao | Base/Chunks | Passou | Analise |");
  lines.push("|---|---|---|---|---|---|---|");
  payload.results.forEach(item => {
    lines.push(
      `| ${item.testNumber} | ${truncate(item.userMessage, 70)} | ${truncate(item.customerAnswer, 180)} | ${item.detectedIntent || ""} | ${item.baseSentToModel === null ? "fluxo decisao" : item.baseSentToModel ? "sim" : "nao"} / ${truncate((item.baseSectionsUsed || []).join(", "), 80)} | ${item.passed ? "OK" : "FALHA"} | ${truncate(item.passed ? "Resposta aderente ao esperado." : `${item.failureReason} ${item.correctionSuggestion}`, 220)} |`
    );
  });
  lines.push("");
  lines.push("## Falhas e padroes");
  lines.push("");
  if (!payload.failures.length) {
    lines.push("- Nenhuma falha funcional na bateria.");
  } else {
    payload.failures.forEach(item => {
      lines.push(`- Teste ${item.testNumber}: ${item.failureReason} Sugestao: ${item.correctionSuggestion}`);
    });
  }
  lines.push("");
  lines.push("## Criterio de aceite");
  lines.push("");
  lines.push(payload.readyForProduction
    ? "A bateria atende ao criterio de >=90% e sem falha critica nos blocos principais."
    : "A bateria ainda nao atende ao criterio de producao: precisa >=90% e nenhuma falha critica em pagamento, reserva, disponibilidade, capacidade, orcamento, base ou fluxo antigo.");

  fs.writeFileSync(REPORT_MD, lines.join("\n"));
};

const run = async () => {
  await sequelize.authenticate();

  const aiSetting = await AiSetting.findOne({
    where: { active: true },
    order: [["updatedAt", "DESC"]]
  });

  if (!aiSetting) throw new Error("Nenhuma configuracao de IA ativa encontrada.");

  const queue = await createQueue(aiSetting);
  const results = [];
  const threadTickets = new Map();

  for (const test of tests) {
    let ticket = test.threadId ? threadTickets.get(test.threadId) : null;
    if (!ticket) {
      ticket = await createTicket({ aiSetting, queue, test });
      if (test.threadId) threadTickets.set(test.threadId, ticket);
    } else {
      await appendCustomerMessage({ ticket, test });
    }

    const serviceResult = test.mode === "decision"
      ? await callDecision({ ticket, test })
      : await callFullBase({ aiSetting, ticket, test });
    const evaluation = evaluate(test, serviceResult);
    const correctionSuggestion = suggestionFor(test, serviceResult, evaluation.failureReason);

    results.push({
      testNumber: test.n,
      userMessage: test.userMessage,
      contextBefore: test.contextBefore,
      endpointOrServiceChamado: serviceResult.endpointOrService,
      rawApiResult: serviceResult.rawApiResult,
      customerAnswer: serviceResult.customerAnswer,
      detectedIntent: serviceResult.detectedIntent,
      baseSentToModel: serviceResult.baseSentToModel,
      baseVersion: serviceResult.baseVersion,
      promptVersion: serviceResult.promptVersion,
      foundInBase: serviceResult.foundInBase,
      baseSectionsUsed: serviceResult.baseSectionsUsed,
      retrievedChunks: serviceResult.baseSectionsUsed,
      needsHuman: serviceResult.needsHuman,
      needsQuoteCalculation: serviceResult.needsQuoteCalculation,
      usedOldFlow: serviceResult.usedOldFlow,
      expectedAnswer: test.expectedAnswer,
      shouldNotMention: test.shouldNotMention,
      passed: evaluation.passed,
      failureReason: evaluation.failureReason,
      correctionSuggestion,
      grounded: serviceResult.grounded
    });

    if (test.threadId && serviceResult.customerAnswer) {
      await ticket.update({
        lastAiMessage: serviceResult.customerAnswer,
        lastAiAction: serviceResult.rawApiResult?.acao || null,
        lastAiIntent: serviceResult.detectedIntent || null
      });
      await Message.create({
        id: `codex-thread-out-${Date.now()}${String(test.n).padStart(3, "0")}`,
        body: serviceResult.customerAnswer,
        fromMe: true,
        senderType: "assistant",
        ticketId: ticket.id,
        contactId: ticket.contactId,
        ack: 3,
        read: true
      });
      await ticket.reload();
    }

    console.log(`[${test.n}/50] ${evaluation.passed ? "OK" : "FAIL"} ${test.userMessage}`);
  }

  const failed = results.filter(item => !item.passed);
  const criticalFailures = failed.filter(item =>
    /pagamento|reserva|disponibilidade|capacidade|orcamento|base|fluxo antigo|calculadora|menu/i.test(
      `${item.contextBefore} ${item.expectedAnswer} ${item.failureReason}`
    )
  );
  const passed = results.length - failed.length;
  const passRateNumber = Math.round((passed / results.length) * 100);
  const readyForProduction = passRateNumber >= 90 && criticalFailures.length === 0;

  const payload = {
    audit: {
      endpointOrServiceReceivingContactMessage: "Pipeline WhatsApp -> DecideAiTicketActionService(ticket, message, contactName)",
      aiService: "FullBaseGroundingMariService + GenerateAiResponseService; orcamento/menu via DecideAiTicketActionService",
      activeFlow: "Full Base Grounding antes de resposta factual; orcamento delegado ao fluxo oficial",
      fullBaseActive: true,
      baseRetrieval: "KnowledgeBaseArticle active=true, base completa enviada ao modelo nos casos factuais",
      promptRetrieval: "AiSetting active=true mais prompt full-base-grounding-mari-v2",
      recentMessagesContext: "Historico/test context enviado em history/structuredContext; tickets isolados para decisao",
      oldFlowRisk: "Fluxo antigo ainda e usado nos casos de orcamento/menu apos delegacao da base para a calculadora oficial.",
      requiredLogFields: [
        "userMessage",
        "detectedIntent",
        "directedKnowledgeBaseQuery",
        "retrievedChunks",
        "finalAnswer",
        "grounded"
      ],
      finalWhatsappAnswerOnlyCustomerAnswer: true,
      promptVersion: results.find(item => item.promptVersion)?.promptVersion || null,
      factTotal: results.filter(item => item.baseSentToModel !== null).length,
      factBaseSentCount: results.filter(item => item.baseSentToModel === true).length,
      decisionTotal: results.filter(item => item.baseSentToModel === null).length,
      oldFlowDecisionCount: results.filter(item => item.baseSentToModel === null && item.usedOldFlow).length,
      environment: `node ${process.version}, NODE_ENV=${process.env.NODE_ENV || "undefined"}`
    },
    total: results.length,
    passed,
    failed: failed.length,
    passRate: `${passRateNumber}%`,
    readyForProduction,
    criticalFailures: criticalFailures.map(item => item.testNumber),
    failures: failed.map(item => ({
      testNumber: item.testNumber,
      userMessage: item.userMessage,
      customerAnswer: item.customerAnswer,
      failureReason: item.failureReason,
      correctionSuggestion: item.correctionSuggestion
    })),
    results
  };

  writeReports(payload);
  console.log(JSON.stringify({
    reportMd: REPORT_MD,
    reportJson: REPORT_JSON,
    total: payload.total,
    passed: payload.passed,
    failed: payload.failed,
    passRate: payload.passRate,
    readyForProduction: payload.readyForProduction,
    criticalFailures: payload.criticalFailures
  }, null, 2));
};

run()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
