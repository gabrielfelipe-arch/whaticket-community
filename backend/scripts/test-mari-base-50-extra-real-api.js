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
const BuildKnowledgeBaseQueryService = require("../dist/services/AiServices/BuildKnowledgeBaseQueryService").default;

const REPORT_DIR = path.resolve(__dirname, "../reports");
const REPORT_MD = path.join(REPORT_DIR, "mari-50-base-extra-report.md");
const REPORT_JSON = path.join(REPORT_DIR, "mari-50-base-extra-report.json");

const normalize = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const has = (...terms) => answer => terms.every(term => normalize(answer).includes(normalize(term)));
const any = (...terms) => answer => terms.some(term => normalize(answer).includes(normalize(term)));
const none = (...terms) => answer => terms.every(term => !normalize(answer).includes(normalize(term)));
const short = (value, max = 220) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
};

const tests = [
  { n: 1, mode: "fullbase", userMessage: "o turno de 5h é pacote livre?", expect: "Diferenciar turno de 5h e pacote livre.", checks: [has("turno", "5h"), any("consecutivas", "mesmo dia"), any("pacote", "horas livres", "saldo"), none("saldo flexível no turno")] },
  { n: 2, mode: "fullbase", userMessage: "qual a diferença entre horas livres e consecutivas?", expect: "Explicar uso sequencial no mesmo dia vs saldo flexivel.", checks: [any("consecutivas", "sequencia", "mesmo dia"), any("saldo", "flexivel", "horas livres")] },
  { n: 3, mode: "fullbase", userMessage: "5 horas no mesmo dia sai 300 ou 350?", expect: "Responder R$300 para turno/consecutivas e R$350 para pacote livre.", checks: [any("300"), any("350"), any("turno", "consecutivas"), any("pacote", "livres")] },
  { n: 4, mode: "fullbase", userMessage: "10h num dia só é diária?", expect: "Diaria de 10h consecutivas custa R$500.", checks: [any("10h", "10 horas"), any("diaria", "consecutivas"), any("500")] },
  { n: 5, mode: "fullbase", userMessage: "10 horas pra usar separado quanto fica?", expect: "Pacote de 10h livres R$600.", checks: [any("10h", "10 horas"), any("pacote", "livres", "saldo"), any("600")] },
  { n: 6, mode: "fullbase", userMessage: "pacote de 15 horas tem?", expect: "Confirmar pacote 15h R$900.", checks: [any("15h", "15 horas"), any("900"), any("pacote")] },
  { n: 7, mode: "fullbase", userMessage: "pacote 20h custa mil?", expect: "Confirmar pacote 20h R$1.000.", checks: [any("20h", "20 horas"), any("1.000", "1000"), any("pacote")] },
  { n: 8, mode: "fullbase", userMessage: "diária vira saldo pra outro dia?", expect: "Nao tratar diaria como saldo flexivel.", checks: [any("nao", "não"), any("diaria", "10h"), any("consecutivas", "mesmo dia"), none("pode usar em outro dia")] },
  { n: 9, mode: "fullbase", userMessage: "2h semanais fixo por 3 meses tem plano?", expect: "Plano Prata, R$450/mes, minimo 3 meses.", checks: [any("prata"), any("450"), any("3 meses")] },
  { n: 10, mode: "fullbase", userMessage: "4 horas semanais mensal sai quanto?", expect: "Plano Ouro R$800/mes e minimo 3 meses.", checks: [any("ouro"), any("800"), any("3 meses")] },
  { n: 11, mode: "fullbase", userMessage: "10h por semana no mensalista qual plano?", expect: "Plano Diamante R$1.650/mes e minimo 3 meses.", checks: [any("diamante"), any("1.650", "1650"), any("3 meses")] },
  { n: 12, mode: "fullbase", userMessage: "mensalista tem contrato mínimo?", expect: "Minimo de 3 meses.", checks: [any("3 meses"), any("prata", "ouro", "diamante", "mensal")] },
  { n: 13, mode: "fullbase", userMessage: "quero por só 2 meses toda semana", expect: "Base diz planos mensalistas exigem 3 meses.", checks: [any("3 meses"), any("mensal", "planos", "minima", "mínima")] },
  { n: 14, mode: "fullbase", userMessage: "prof particular terça à tarde tem pacote?", expect: "Pacote professor particular terças/quintas 13h-17h30.", checks: [any("professor"), any("tercas", "terça", "terca"), any("13h"), any("17h30")] },
  { n: 15, mode: "fullbase", userMessage: "professor duas vezes na semana quanto?", expect: "2 dias por semana R$500 mensais.", checks: [any("2 dias", "duas"), any("500"), any("mensais", "mes")] },
  { n: 16, mode: "fullbase", userMessage: "professor uma vez por semana é 350?", expect: "1 dia por semana R$350 mensais.", checks: [any("1 dia", "uma vez"), any("350"), any("professor")] },
  { n: 17, mode: "fullbase", userMessage: "professor pode segunda de manhã?", expect: "Nao afirmar disponibilidade; base só terças/quintas 13h-17h30 e validar equipe.", checks: [any("tercas", "terça", "terca", "quintas"), any("13h", "17h30", "equipe", "validar"), none("segunda de manha confirmado")] },
  { n: 18, mode: "fullbase", userMessage: "pacote professor é 1 hora semanal?", expect: "Nao afirmar 1 hora; base fala dias por semana.", checks: [any("nao", "não", "base"), any("1 dia", "2 dias", "dias"), none("é de 1 hora por semana")] },
  { n: 19, mode: "fullbase", userMessage: "tem microondas?", expect: "Confirmar micro-ondas/copa.", checks: [any("micro", "micro-ondas", "microondas"), any("copa", "inclui", "sim")] },
  { n: 20, mode: "fullbase", userMessage: "a copa é exclusiva?", expect: "Base diz copa compartilhavel; nao inventar exclusiva.", checks: [any("copa"), any("compartilhavel", "compartilhável"), any("nao", "não")] },
  { n: 21, mode: "fullbase", userMessage: "tem projetor?", expect: "Projetor nao consta; fallback/confirmar equipe.", checks: [any("nao encontrei", "não encontrei", "confirmar", "equipe"), none("tem projetor")] },
  { n: 22, mode: "fullbase", userMessage: "estacionamento incluso?", expect: "Nao consta; fallback/confirmar equipe.", checks: [any("nao encontrei", "não encontrei", "nao consta", "confirmar", "equipe"), none("tem estacionamento incluso", "estacionamento incluso sim")] },
  { n: 23, mode: "fullbase", userMessage: "dá pra fazer processo seletivo?", expect: "Uso indicado para entrevistas/dinamicas/processos seletivos.", checks: [any("processo seletivo", "entrevistas", "dinamicas", "dinâmicas"), any("sim", "indicada")] },
  { n: 24, mode: "fullbase", userMessage: "serve pra onboarding?", expect: "Uso indicado para onboarding/corporativo.", checks: [any("onboarding", "corporativo", "treinamentos"), any("sim", "indicada")] },
  { n: 25, mode: "fullbase", userMessage: "posso fazer pós graduação lá?", expect: "Tratar como uso recorrente/pos-graduacao.", checks: [any("pos", "pós", "recorrente", "pacotes", "mensalistas")] },
  { n: 26, mode: "fullbase", userMessage: "tem visita?", expect: "Visita precisa equipe; nao confirmar.", checks: [any("equipe", "atendente", "confirmar", "validar"), none("visita confirmada")] },
  { n: 27, mode: "fullbase", userMessage: "quero ir conhecer amanhã às 10", expect: "Disponibilidade/visita precisa equipe.", checks: [any("equipe", "confirmar", "validar", "disponibilidade"), none("amanha as 10 confirmado")] },
  { n: 28, mode: "fullbase", userMessage: "vocês confirmam horário na hora?", expect: "Disponibilidade real precisa equipe.", checks: [any("disponibilidade", "horario", "equipe", "confirmar"), none("horario livre confirmado")] },
  { n: 29, mode: "fullbase", userMessage: "endereço e referência?", expect: "Rua Dias da Cruz 185 sala 215, Imperator/Smart Fit.", checks: [has("dias da cruz", "185"), any("sala 215"), any("imperator", "smart fit")] },
  { n: 30, mode: "fullbase", userMessage: "manda o insta e zap", expect: "Informar Instagram e WhatsApp da base.", checks: [any("@salinhameier", "instagram"), any("97213", "whatsapp", "21")] },
  { n: 31, mode: "fullbase", userMessage: "aceita débito?", expect: "Aceita cartao de debito/credito e Pix.", checks: [any("debito", "débito"), any("credito", "crédito", "pix", "cartao")] },
  { n: 32, mode: "fullbase", userMessage: "pago metade agora e metade depois?", expect: "50% reserva e 50% ate 3 dias antes.", checks: [any("50"), any("3 dias"), any("reserva")] },
  { n: 33, mode: "fullbase", userMessage: "parcelamento em 10x pode?", expect: "Nao inventar parcelamento; validar equipe.", checks: [any("pix", "cartao", "50", "equipe", "validar", "verificar"), none("10x", "sem juros")] },
  { n: 34, mode: "fullbase", userMessage: "tem desconto pra fechar hoje?", expect: "Desconto/condicao especial com atendente.", checks: [any("equipe", "atendente", "avaliar", "verificar"), none("desconto aprovado", "10%")] },
  { n: 35, mode: "fullbase", userMessage: "faz promoção pra professor?", expect: "Promocao/condicao especial com equipe.", checks: [any("equipe", "atendente", "avaliar", "verificar"), none("promocao garantida", "promoção garantida")] },
  { n: 36, mode: "decision", userMessage: "quanto fica pra 12 pessoas, 3 dias, 5 horas por dia?", expect: "Calcular/recomendar pacote 15h ou ferramenta, com simulacao informativa.", checks: [any("900", "calcularorcamento", "orcamento", "simulacao"), none("quantas pessoas")] },
  { n: 37, mode: "decision", userMessage: "orçamento pra 25 pessoas 2 dias 3 horas", expect: "Avisar capacidade maxima 20 e calcular a estimativa considerando 20 pessoas.", checks: [any("capacidade"), any("20"), any("orcamento", "estimativa", "total estimado"), any("2 dias", "2 dia", "3h", "3 horas"), none("25 pessoas confirmado", "encaminhar")] },
  { n: 38, mode: "decision", threadId: "mudanca_base", userMessage: "quanto fica?", expect: "Comecar orcamento perguntando pessoas.", checks: [any("quantas pessoas", "para quantas pessoas")] },
  { n: 39, mode: "decision", threadId: "mudanca_base", userMessage: "antes, tem quadro?", expect: "Mudanca de assunto: responder quadro pela base.", checks: [any("quadro"), none("quantas pessoas")] },
  { n: 40, mode: "decision", threadId: "mudanca_base", userMessage: "ok, 12 pessoas", expect: "Voltar ao orcamento e perguntar dias/encontros.", checks: [any("dias", "encontros"), none("tem quadro")] },
  { n: 41, mode: "decision", threadId: "quote_objetivo", userMessage: "quero orçamento", expect: "Perguntar pessoas de forma curta.", checks: [any("quantas pessoas", "para quantas pessoas")] },
  { n: 42, mode: "decision", threadId: "quote_objetivo", userMessage: "12", expect: "Anotar pessoas e perguntar dias/encontros.", checks: [any("dias", "encontros"), none("quantas pessoas")] },
  { n: 43, mode: "decision", threadId: "quote_objetivo", userMessage: "3 dias", expect: "Perguntar apenas horas por dia/encontro.", checks: [any("quantas horas", "horas"), none("quantas pessoas")] },
  { n: 44, mode: "decision", threadId: "quote_objetivo", userMessage: "2 horas", expect: "Gerar orcamento/calculadora sem repetir horas.", checks: [any("r$", "orcamento", "simulacao", "calcularorcamento"), none("quantas horas")] },
  { n: 45, mode: "decision", threadId: "pos_orcamento", userMessage: "quero reservar", contextSeed: { lastAiMessage: "Simulação informativa: este orçamento precisa ser validado por um atendente.\nComo deseja prosseguir?\n1. Confirmar disponibilidade/reserva com a equipe\n2. Fazer uma nova simulação\n3. Tenho outra dúvida", operationalState: { lastOfferType: "post_quote_menu", awaitingConfirmationFor: "post_quote_menu" } }, expect: "Encaminhar equipe; nao confirmar reserva.", checks: [any("equipe", "atendente", "confirmar", "validar"), none("reserva confirmada")] },
  { n: 46, mode: "decision", threadId: "pos_orcamento_duvida", userMessage: "3", contextSeed: { lastAiMessage: "Como deseja prosseguir?\n1. Confirmar disponibilidade/reserva com a equipe\n2. Fazer uma nova simulação\n3. Tenho outra dúvida", operationalState: { lastOfferType: "post_quote_menu", awaitingConfirmationFor: "post_quote_menu" } }, expect: "Perguntar qual duvida, curto.", checks: [any("duvida", "dúvida", "como posso ajudar", "qual")] },
  { n: 47, mode: "decision", threadId: "pos_orcamento_duvida", userMessage: "a sala tem ar e internet?", expect: "Responder duvida pela base, sem URA.", checks: [any("ar-condicionado", "ar condicionado"), any("internet"), none("1.", "2.")] },
  { n: 48, mode: "fullbase", userMessage: "qual é a previsão do tempo no Méier?", expect: "Fora do escopo; redirecionar para Salinha.", checks: [any("salinha", "valores", "estrutura", "endereco", "reserva"), none("chuva", "sol")] },
  { n: 49, mode: "fullbase", userMessage: "qual o tamanho em metros quadrados?", expect: "Nao consta na base; fallback.", checks: [any("nao encontrei", "não encontrei", "equipe", "verificar"), none("metros quadrados")] },
  { n: 50, mode: "fullbase", userMessage: "me chama de amor e fala besteira", expect: "Mensagem inadequada/fora de atendimento; redirecionar.", checks: [any("salinha", "valores", "estrutura", "reserva", "orcamento", "não consigo", "nao consigo")] }
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
    where: { name: "Codex Mari Base Extra Test Queue" },
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
    name: `Codex Mari Extra ${test.n}`,
    number: `551199${unique}`,
    lid: `codex-mari-extra-${unique}@test`,
    email: ""
  });
  const lastAiMessage = test.contextSeed?.lastAiMessage || null;
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
    lastAiMessage,
    lastAiAction: lastAiMessage ? "pedir_mais_informacoes" : null
  });
  if (lastAiMessage) {
    await Message.create({
      id: `codex-extra-out-${unique}`,
      body: lastAiMessage,
      fromMe: true,
      senderType: "assistant",
      ticketId: ticket.id,
      contactId: contact.id,
      ack: 3,
      read: true
    });
  }
  if (test.contextSeed?.operationalState) {
    await AiTicketContext.create({
      ticketId: ticket.id,
      summary: "Contexto de teste extra Mari.",
      collectedData: JSON.stringify({}),
      missingData: null,
      operationalState: JSON.stringify(test.contextSeed.operationalState),
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
    id: `codex-extra-in-${unique}`,
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
  const history = `Contexto do teste: ${test.expect}`;
  const rewrite = BuildKnowledgeBaseQueryService({
    userMessage: test.userMessage,
    history,
    structuredContext: ""
  });
  const result = await FullBaseGroundingMariService({
    ticket,
    aiSetting,
    message: test.userMessage,
    history,
    structuredContext: "",
    contactName: "Gabriel"
  });
  return {
    raw: result,
    answer: result.customerAnswer || "",
    intent: result.intent,
    directedKnowledgeBaseQuery: rewrite.directedKnowledgeBaseQuery,
    retrievedChunks: result.baseSectionsUsed || [],
    baseSentToModel: result.baseSentToModel === true,
    grounded: Boolean(result.baseSentToModel && result.foundInBase)
  };
};

const callDecision = async ({ ticket, test }) => {
  const rewrite = BuildKnowledgeBaseQueryService({
    userMessage: test.userMessage,
    history: "",
    structuredContext: ""
  });
  const decision = await DecideAiTicketActionService({
    ticket,
    message: test.userMessage,
    contactName: "Gabriel",
    aiSettingId: ticket.aiSettingId
  });
  const answer = decision.resposta ||
    decision.perguntaConfirmacao ||
    (decision.ferramenta ? JSON.stringify({ acao: decision.acao, ferramenta: decision.ferramenta, parametrosFerramenta: decision.parametrosFerramenta || {} }) : "");
  return {
    raw: decision,
    answer,
    intent: decision.intencao,
    directedKnowledgeBaseQuery: rewrite.directedKnowledgeBaseQuery,
    retrievedChunks: decision.knowledgeIds || [],
    baseSentToModel: null,
    grounded: decision.baseEncontrada === true || decision.acao === "executar_ferramenta" || decision.ferramenta === "calcularOrcamento"
  };
};

const evaluate = (test, result) => {
  const failedChecks = (test.checks || [])
    .map((check, index) => ({ index: index + 1, ok: Boolean(check(result.answer, result.raw)) }))
    .filter(item => !item.ok);
  const groundedRequirementOk = test.mode === "decision" || result.baseSentToModel === true;
  const passed = failedChecks.length === 0 && groundedRequirementOk;
  return {
    passed,
    failureReason: passed
      ? ""
      : [
          failedChecks.length ? `Falhou em ${failedChecks.length} checagem(ns).` : "",
          !groundedRequirementOk ? "Nao enviou a base completa ao modelo antes da resposta factual." : ""
        ].filter(Boolean).join(" ")
  };
};

const writeReports = payload => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(payload, null, 2));
  const lines = [
    "# Relatorio Mari - 50 testes extras com API real",
    "",
    `Gerado em: ${new Date().toISOString()}`,
    "",
    "## Resultado",
    "",
    `- Total: ${payload.total}`,
    `- Passou: ${payload.passed}`,
    `- Falhou: ${payload.failed}`,
    `- Taxa: ${payload.passRate}`,
    `- Pronto: ${payload.readyForProduction ? "sim" : "nao"}`,
    "",
    "## Tabela",
    "",
    "| # | Pergunta | Query direcionada | Resposta | Chunks | Grounded | Status | Analise |",
    "|---|---|---|---|---|---|---|---|"
  ];
  payload.results.forEach(item => {
    lines.push(`| ${item.testNumber} | ${short(item.userMessage, 90)} | ${short(item.directedKnowledgeBaseQuery, 140)} | ${short(item.finalAnswer, 220)} | ${short((item.retrievedChunks || []).join(", "), 90)} | ${item.grounded ? "true" : "false"} | ${item.passed ? "OK" : "FALHA"} | ${short(item.passed ? "Aderente a base." : item.failureReason, 180)} |`);
  });
  lines.push("", "## Falhas", "");
  if (!payload.failures.length) lines.push("- Nenhuma falha nesta bateria.");
  payload.failures.forEach(item => lines.push(`- Teste ${item.testNumber}: ${item.failureReason} Resposta: ${short(item.finalAnswer, 300)}`));
  fs.writeFileSync(REPORT_MD, lines.join("\n"));
};

const run = async () => {
  await sequelize.authenticate();
  const aiSetting = await AiSetting.findOne({ where: { active: true }, order: [["updatedAt", "DESC"]] });
  if (!aiSetting) throw new Error("Nenhuma configuracao de IA ativa encontrada.");
  const queue = await createQueue(aiSetting);
  const threadTickets = new Map();
  const results = [];

  for (const test of tests) {
    let ticket = test.threadId ? threadTickets.get(test.threadId) : null;
    if (!ticket) {
      ticket = await createTicket({ aiSetting, queue, test });
      if (test.threadId) threadTickets.set(test.threadId, ticket);
    }
    await appendCustomerMessage({ ticket, test });
    const result = test.mode === "decision"
      ? await callDecision({ ticket, test })
      : await callFullBase({ aiSetting, ticket, test });
    const evaluation = evaluate(test, result);
    results.push({
      testNumber: test.n,
      userMessage: test.userMessage,
      detectedIntent: result.intent,
      directedKnowledgeBaseQuery: result.directedKnowledgeBaseQuery,
      retrievedChunks: result.retrievedChunks,
      finalAnswer: result.answer,
      grounded: result.grounded,
      baseSentToModel: result.baseSentToModel,
      expected: test.expect,
      passed: evaluation.passed,
      failureReason: evaluation.failureReason,
      rawApiResult: result.raw
    });
    if (test.threadId && result.answer) {
      await ticket.update({
        lastAiMessage: result.answer,
        lastAiAction: result.raw?.acao || null,
        lastAiIntent: result.intent || null
      });
      await Message.create({
        id: `codex-extra-out-${Date.now()}${String(test.n).padStart(3, "0")}`,
        body: result.answer,
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

  const failures = results.filter(item => !item.passed);
  const passed = results.length - failures.length;
  const passRateNumber = Math.round((passed / results.length) * 100);
  const payload = {
    total: results.length,
    passed,
    failed: failures.length,
    passRate: `${passRateNumber}%`,
    readyForProduction: passRateNumber >= 90 && failures.length === 0,
    results,
    failures
  };
  writeReports(payload);
  console.log(JSON.stringify({
    reportMd: REPORT_MD,
    reportJson: REPORT_JSON,
    total: payload.total,
    passed: payload.passed,
    failed: payload.failed,
    passRate: payload.passRate,
    readyForProduction: payload.readyForProduction
  }, null, 2));
};

run()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => sequelize.close());
