import KnowledgeBaseArticle from "../../../models/KnowledgeBaseArticle";
import GenerateAiResponseService from "../../../services/AiServices/GenerateAiResponseService";
import FullBaseGroundingMariService from "../../../services/AiServices/FullBaseGroundingMariService";

jest.mock("../../../models/KnowledgeBaseArticle", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock("../../../services/AiServices/GenerateAiResponseService", () => ({
  __esModule: true,
  default: jest.fn()
}));

const aiSetting = {
  id: 1,
  model: "gpt-test",
  behaviorPrompt: "Mari",
  systemPrompt: "Atendimento da Salinha Meier"
} as any;

const ticket = {
  id: 10,
  contactId: 20
} as any;

const baseArticle = {
  id: 1,
  title: "Base oficial Salinha Meier",
  tags: "salinha, meier",
  updatedAt: new Date("2026-06-14T12:00:00.000Z"),
  content: [
    "Endereco: Rua Dias da Cruz, 185, sala 215, Meier, Rio de Janeiro - RJ, proximo ao Imperator e a Smart Fit.",
    "Estrutura: ar-condicionado, internet, TV para reproducao de conteudo, quadro branco, recepcao, banheiro e copa compartilhavel com cafeteira, micro-ondas e filtro com agua gelada.",
    "A capacidade maxima da sala e de ate 20 pessoas. Para grupos acima de 20 pessoas, encaminhar para a equipe avaliar.",
    "Formas de pagamento: Pix, cartao de debito e cartao de credito.",
    "Para reservar uma data, e necessario pagar 50% do valor do orcamento. Os 50% restantes devem ser pagos ate 3 dias antes da data.",
    "Sobre descontos ou condicoes especiais, encaminhar para a equipe avaliar.",
    "O Pacote Professor Particular tem contratacao minima de 1 mes e esta disponivel as tercas e quintas, das 13h as 17h30."
  ].join("\n")
};

const wrongModelAnswer = JSON.stringify({
  intent: "tabela_de_precos",
  userAsked: "mensagem atual",
  foundInBase: true,
  baseSectionsUsed: ["secao errada"],
  shouldAnswer: true,
  needsHuman: false,
  needsQuoteCalculation: false,
  shouldTransfer: false,
  customerAnswer: "A Salinha Meier fica na Rua Dias da Cruz, 185, sala 215.",
  reasoningSummary: "Resposta propositalmente desalinhada para testar guardrail."
});

const makeCases = (): Array<{
  message: string;
  mustContain: RegExp;
  mustNotContain?: RegExp;
}> => {
  const payment = [
    "aceita pix?",
    "passa no cartao?",
    "tem debito?",
    "aceita credito?",
    "divide no cartao?",
    "da pra pagar com pix?",
    "cartao tambem?",
    "posso pagar no credito?",
    "tem como parcelar?",
    "qual forma de pagamento?",
    "como paga?",
    "pode ser no debito?",
    "pix ou cartao?",
    "voces aceitam cartao?",
    "o pagamento e por onde?"
  ].map(message => ({ message, mustContain: /pix|cartao|debito|credito/i, mustNotContain: /Rua Dias da Cruz/i }));

  const reservation = [
    "como reserva?",
    "pra reservar faz como?",
    "tem que pagar sinal?",
    "qual regra pra segurar data?",
    "reserva com quanto?",
    "paga 50 pra reservar?",
    "como confirma a reserva?",
    "qual o processo de reserva?",
    "preciso pagar antes?",
    "quando pago o restante?"
  ].map(message => ({ message, mustContain: /50|3 dias|reserva/i }));

  const location = [
    "onde fica?",
    "qual endereco?",
    "fica aonde?",
    "me manda a localizacao",
    "perto de qual ponto?",
    "tem referencia?",
    "e no Meier?",
    "qual rua?",
    "como chego ai?",
    "fica perto do Imperator?"
  ].map(message => ({ message, mustContain: /Dias da Cruz|185|sala 215|Imperator|Smart Fit/i }));

  const capacity = [
    "cabe 15?",
    "cabe 20 pessoas?",
    "quantas pessoas cabem?",
    "qual a capacidade?",
    "suporta 18 participantes?",
    "20 pessoas da?",
    "a sala comporta quantos?",
    "da pra 12 pessoas?",
    "lotacao maxima?",
    "grupo de 19 cabe?"
  ].map(message => ({ message, mustContain: /20 pessoas|ate 20|capacidade/i }));

  const overCapacity = [
    "cabe 25?",
    "25 pessoas da?",
    "grupo de 30 cabe?",
    "tem como 22 participantes?",
    "somos vinte e cinco",
    "preciso pra 28 pessoas",
    "cabe mais de 20?",
    "e se passar de 20?",
    "24 pessoas funciona?",
    "32 pessoas pode?"
  ].map(message => ({ message, mustContain: /20 pessoas|equipe|avaliar|acima/i }));

  const structure = [
    ["tem ar?", /ar-condicionado/i],
    ["a sala tem internet?", /internet/i],
    ["tem wifi?", /internet|wifi/i],
    ["tem tv pra apresentacao?", /TV/i],
    ["tem copa?", /copa/i],
    ["tem cafe?", /cafeteira|copa/i],
    ["tem microondas?", /micro-ondas/i],
    ["tem filtro?", /filtro|agua gelada/i],
    ["tem quadro?", /quadro/i],
    ["tem banheiro?", /banheiro/i],
    ["tem recepcao?", /recepcao/i],
    ["o que esta incluso?", /ar-condicionado|internet|TV|quadro/i],
    ["inclui ar e tv?", /ar-condicionado|TV/i],
    ["tem agua gelada?", /agua gelada|filtro/i],
    ["da pra passar slide?", /TV/i],
    ["tem estrutura pra aula?", /ar-condicionado|internet|TV|quadro/i],
    ["tem ar condicionado mesmo?", /ar-condicionado/i],
    ["a internet ta inclusa?", /internet/i],
    ["tem copa compartilhada?", /copa/i],
    ["quais itens inclusos?", /ar-condicionado|internet|TV|quadro/i]
  ].map(([message, mustContain]) => ({ message: String(message), mustContain: mustContain as RegExp }));

  const discount = [
    "tem desconto?",
    "faz desconto?",
    "consegue melhorar valor?",
    "tem promocao?",
    "da pra negociar?",
    "rola abatimento?",
    "tem condicao especial?",
    "fica mais barato?",
    "consegue desconto de 10%?",
    "tem valor melhor?"
  ].map(message => ({ message, mustContain: /equipe|atendente|avaliar|verificar/i, mustNotContain: /10%|desconto de/i }));

  const teacher = [
    "professor e 1 hora?",
    "como funciona professor particular?",
    "pacote professor tem quais horarios?",
    "professor pode usar 1h por semana?",
    "tem pacote pra professor?",
    "professor particular e por dia?",
    "qual valor do professor particular?",
    "professor tem minimo?",
    "quais dias professor pode?",
    "professor e terca e quinta?"
  ].map(message => ({ message, mustContain: /Professor Particular|1 mes|tercas|quintas|13h|17h30/i }));

  const outOfScope = [
    "qual foi o placar do jogo?",
    "quem ganhou o flamengo?",
    "me manda uma piada",
    "qual a cotacao do dolar?",
    "me ajuda com futebol?"
  ].map(message => ({ message, mustContain: /Salinha Meier|valores|estrutura|capacidade|endereco|orcamento/i }));

  return [
    ...payment,
    ...reservation,
    ...location,
    ...capacity,
    ...overCapacity,
    ...structure,
    ...discount,
    ...teacher,
    ...outOfScope
  ];
};

describe("FullBaseGroundingMariService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (KnowledgeBaseArticle.findAll as jest.Mock).mockResolvedValue([baseArticle]);
    (GenerateAiResponseService as jest.Mock).mockResolvedValue(wrongModelAnswer);
  });

  it.each(makeCases().map(item => [item.message, item.mustContain, item.mustNotContain]))(
    "keeps answer grounded and aligned for %s",
    async (message, mustContain, mustNotContain) => {
      const result = await FullBaseGroundingMariService({
        ticket,
        aiSetting,
        message,
        history: [
          "Cliente: quero orcamento",
          "Mari: Para quantas pessoas?",
          "Cliente: nao to perguntando isso agora"
        ].join("\n"),
        structuredContext: "{}",
        contactName: "Gabriel"
      });

      expect(result).not.toBeNull();
      expect(result?.baseSentToModel).toBe(true);
      expect(result?.promptVersion).toBe("full-base-grounding-mari-v2");
      expect(result?.customerAnswer).toMatch(mustContain);
      if (mustNotContain) {
        expect(result?.customerAnswer).not.toMatch(mustNotContain);
      }
    }
  );
});
