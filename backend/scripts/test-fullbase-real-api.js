require("dotenv").config();

const sequelize = require("../dist/database").default;
const AiSetting = require("../dist/models/AiSetting").default;
const Ticket = require("../dist/models/Ticket").default;
const FullBaseGroundingMariService = require("../dist/services/AiServices/FullBaseGroundingMariService").default;

const questions = [
  "aceita pix?",
  "passa no cartao?",
  "como reserva?",
  "onde fica?",
  "cabe 25?",
  "tem ar?",
  "tem internet?",
  "tem tv pra apresentacao?",
  "tem desconto?",
  "professor e 1 hora?"
];

const expected = {
  "aceita pix?": /pix|cart[aã]o|d[eé]bito|cr[eé]dito/i,
  "passa no cartao?": /cart[aã]o|d[eé]bito|cr[eé]dito/i,
  "como reserva?": /50|3 dias|reserva/i,
  "onde fica?": /Dias da Cruz|185|sala 215|Imperator|Smart Fit/i,
  "cabe 25?": /20 pessoas|equipe|avaliar|acima/i,
  "tem ar?": /ar-condicionado/i,
  "tem internet?": /internet/i,
  "tem tv pra apresentacao?": /TV/i,
  "tem desconto?": /equipe|atendente|avaliar|verificar/i,
  "professor e 1 hora?": /Professor Particular|1 mes|tercas|quintas|13h|17h30/i
};

const run = async () => {
  await sequelize.authenticate();

  const aiSetting = await AiSetting.findOne({
    where: { active: true },
    order: [["updatedAt", "DESC"]]
  });

  if (!aiSetting) {
    throw new Error("Nenhuma configuracao de IA ativa encontrada.");
  }

  const ticket = await Ticket.findOne({
    order: [["updatedAt", "DESC"]]
  });

  if (!ticket) {
    throw new Error("Nenhum ticket encontrado para registrar o teste real.");
  }

  const history = [
    "Cliente: quero orcamento",
    "Mari: Para quantas pessoas?",
    "Cliente: nao to perguntando isso agora, quero outra informacao"
  ].join("\n");

  const results = [];

  for (const question of questions) {
    const result = await FullBaseGroundingMariService({
      ticket,
      aiSetting,
      message: question,
      history,
      structuredContext: "{}",
      contactName: "Gabriel"
    });

    const answer = result && result.customerAnswer ? result.customerAnswer : "";
    const passed = Boolean(result && result.baseSentToModel && expected[question].test(answer));

    results.push({
      question,
      passed,
      intent: result && result.intent,
      foundInBase: result && result.foundInBase,
      baseSentToModel: result && result.baseSentToModel,
      promptVersion: result && result.promptVersion,
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
