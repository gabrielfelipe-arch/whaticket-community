require("dotenv").config();

const sequelize = require("../dist/database").default;
const AiSetting = require("../dist/models/AiSetting").default;
const Ticket = require("../dist/models/Ticket").default;
const FullBaseGroundingMariService = require("../dist/services/AiServices/FullBaseGroundingMariService").default;

const tests = [
  { q: "aceita pix?", intent: "pagamento", expect: /pix/i },
  { q: "passa no cartao?", intent: "pagamento", expect: /cart[aã]o|d[eé]bito|cr[eé]dito/i },
  { q: "divide no cartão?", intent: "pagamento/reserva", expect: /cart[aã]o|50|reserva|3 dias/i },
  { q: "como reserva?", intent: "reserva", expect: /50|3 dias|reserva/i },
  { q: "tem que pagar sinal?", intent: "reserva", expect: /50|reserva/i },
  { q: "onde fica?", intent: "endereco", expect: /Dias da Cruz|185|sala 215|M[eé]ier/i },
  { q: "perto de qual ponto?", intent: "referencia", expect: /Imperator|Smart Fit/i },
  { q: "tem ar?", intent: "estrutura", expect: /ar-condicionado/i },
  { q: "tem internet?", intent: "estrutura", expect: /internet|wifi|wi-fi/i },
  { q: "tem tv pra apresentação?", intent: "estrutura", expect: /TV|televis[aã]o|reprodu/i },
  { q: "tem quadro?", intent: "estrutura", expect: /quadro/i },
  { q: "tem banheiro?", intent: "estrutura", expect: /banheiro/i },
  { q: "tem copa?", intent: "estrutura", expect: /copa/i },
  { q: "tem café?", intent: "estrutura", expect: /cafeteira|copa|caf[eé]/i },
  { q: "tem água gelada?", intent: "estrutura", expect: /[aá]gua gelada|filtro/i },
  { q: "o que está incluso?", intent: "estrutura", expect: /ar-condicionado|internet|TV|quadro|recep/i },
  { q: "cabe 15 pessoas?", intent: "capacidade", expect: /20|capacidade|pessoas/i },
  { q: "cabe 25?", intent: "capacidade_acima", expect: /20|equipe|avaliar|acima/i },
  { q: "qual a lotação máxima?", intent: "capacidade", expect: /20|pessoas|capacidade/i },
  { q: "manda os valores", intent: "precos", expect: /R\$|valor|tabela|pre[cç]o|pacote/i },
  { q: "tem tabela?", intent: "precos", expect: /R\$|valor|tabela|pre[cç]o|pacote/i },
  { q: "quanto custa usar a sala?", intent: "precos", expect: /R\$|valor|tabela|pre[cç]o|pacote/i },
  { q: "tem pacote de horas?", intent: "pacotes", expect: /pacote|horas/i },
  { q: "tem mensalista?", intent: "mensalista", expect: /mensal|mensalista|Prata|Ouro|Diamante|3 meses/i },
  { q: "plano prata como funciona?", intent: "mensalista", expect: /Prata|mensal|3 meses/i },
  { q: "professor é 1 hora?", intent: "professor", expect: /Professor Particular|1 m[eê]s|ter[cç]as|quintas|13h|17h30/i },
  { q: "professor particular tem quais horários?", intent: "professor", expect: /ter[cç]as|quintas|13h|17h30/i },
  { q: "tem desconto?", intent: "desconto", expect: /equipe|atendente|avaliar|verificar|condi[cç][aã]o/i },
  { q: "faz promoção?", intent: "desconto", expect: /equipe|atendente|avaliar|verificar|condi[cç][aã]o/i },
  { q: "posso confirmar disponibilidade agora?", intent: "disponibilidade", expect: /equipe|atendente|confirm|disponibilidade|valid/i }
];

const run = async () => {
  await sequelize.authenticate();

  const aiSetting = await AiSetting.findOne({
    where: { active: true },
    order: [["updatedAt", "DESC"]]
  });

  if (!aiSetting) throw new Error("Nenhuma configuracao de IA ativa encontrada.");

  const ticket = await Ticket.findOne({ order: [["updatedAt", "DESC"]] });
  if (!ticket) throw new Error("Nenhum ticket encontrado para registrar o teste real.");

  const histories = [
    "Cliente: quero orçamento\nMari: Para quantas pessoas?\nCliente: deixa, tenho outra dúvida",
    "Cliente: onde fica?\nMari: A Salinha fica no Méier.\nCliente: agora outra coisa",
    "Cliente: tem tabela?\nMari: Enviei os valores.\nCliente: mudando de assunto"
  ];

  const results = [];

  for (let index = 0; index < tests.length; index += 1) {
    const item = tests[index];
    const result = await FullBaseGroundingMariService({
      ticket,
      aiSetting,
      message: item.q,
      history: histories[index % histories.length],
      structuredContext: "{}",
      contactName: "Gabriel"
    });

    const answer = result?.customerAnswer || "";
    const passed = Boolean(
      result &&
      result.baseSentToModel &&
      result.foundInBase !== false &&
      item.expect.test(answer)
    );

    results.push({
      n: index + 1,
      question: item.q,
      expectedIntent: item.intent,
      detectedIntent: result?.intent || null,
      directed: result?.baseSentToModel ? true : false,
      foundInBase: result?.foundInBase || false,
      promptVersion: result?.promptVersion || null,
      passed,
      answer
    });
  }

  console.log(JSON.stringify({
    total: results.length,
    passed: results.filter(item => item.passed).length,
    failed: results.filter(item => !item.passed).length,
    results
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
