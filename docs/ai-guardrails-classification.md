# Classificacao das travas da IA

## Objetivo

Deixar a IA livre para conversar, mas controlada para executar decisoes comerciais e operacionais criticas.

Regra central:

- Nao travar a conversa.
- Travar somente decisoes criticas.
- Exemplos de frases devem ser tratados como exemplos semanticos, nao como comandos literais.

## 1. Travas comerciais obrigatorias

Estas travas devem permanecer. Sempre que possivel, devem migrar do prompt para validacao de backend, ferramenta ou servico estruturado.

### Preco e orcamento

- A IA pode explicar e apresentar simulacoes somente com valores cadastrados.
- A IA nao deve inventar pacote, preco, taxa, saldo, diaria, bloco minimo ou composicao.
- O calculo deve ser feito por matriz, ferramenta ou servico de orcamento quando existir.
- O prompt pode orientar a apresentacao, mas a fonte de verdade deve ser backend/base.

### Desconto

- Desconto nao deve ser informado automaticamente.
- So deve aparecer quando o cliente perguntar explicitamente por desconto, promocao, condicao ou equivalente.
- Percentuais, cupons e regras promocionais devem vir da base ou backend.
- Se o cliente pedir algo fora da regra, a IA deve encaminhar ou pedir validacao humana.

### Cupom

- A IA nao pode criar cupom nem validar cupom inexistente.
- Validacao de cupom deve ser backend/ferramenta.
- Se nao houver ferramenta, responder que precisa ser conferido pela equipe.

### Reserva e disponibilidade

- A IA nao deve confirmar agenda, reserva ou disponibilidade sem ferramenta/retorno do backend.
- Pode dizer que a simulacao e informativa.
- Pode encaminhar para atendente ou ferramenta de agenda quando configurado.

### Capacidade

- Limite de capacidade deve ser regra de backend/base.
- A IA deve avisar quando a quantidade excede o limite.
- Pode calcular uma simulacao ajustada ao limite somente se isso estiver claro para o cliente.
- Nao deve apresentar como viavel uma quantidade acima da capacidade.

### Encerramento

- Encerramento de ticket deve ser acao controlada.
- Pedido literal de encerrar/finalizar atendimento pode acionar encerramento.
- Termos ambiguos como "sair" devem pedir confirmacao antes.
- "Fechar negocio", "fechar reserva" ou "quero fechar" e fechamento comercial, nao encerramento do atendimento.

### Transferencia

- A IA nao deve dizer que transferiu se a transferencia nao foi executada.
- Transferencia deve usar ferramenta/backend/fila configurada.
- Quando nao houver ferramenta, a resposta deve dizer que vai solicitar apoio ou que precisa de um atendente, sem afirmar que a acao ja ocorreu.

### Escopo

- A IA deve responder dentro do escopo configurado e da base.
- Fora do escopo deve ser contornado com educacao, sem transferencia imediata.
- Primeiro redirecionar para o assunto do atendimento; transferir apenas se o cliente pedir humano ou insistir em algo que exige pessoa.

### Tentativa de burla

- Valores inventados pelo cliente, pedidos para ignorar tabela, forcar desconto, simular regra inexistente ou burlar limite devem ser bloqueados.
- A resposta deve ser natural e curta, explicando que so pode usar as regras cadastradas.
- Se houver interesse real por excecao comercial, encaminhar para validacao humana.

## 2. Travas conversacionais excessivas

Estas travas devem ser reduzidas ou substituidas por interpretacao semantica.

### Regras baseadas em frases exatas

- Evitar depender de frases literais como "3 aulas de 4 horas", "unico dia", "bota pra 20".
- A IA deve interpretar equivalencias: aulas, encontros, reunioes, cursos, sessoes, dias, ocorrencias.
- Frases curtas devem ser entendidas pelo historico recente e pela ultima pergunta da IA.

### Respostas fixas demais

- Evitar sempre responder com o mesmo texto para objecao, fora de contexto, desconto, inclusos ou duvida.
- O tom deve variar naturalmente conforme a mensagem do cliente.
- A resposta deve reconhecer o que o cliente acabou de dizer antes de conduzir o proximo passo.

### Exemplos repetidos

- Exemplos devem orientar casos de teste, nao virar roteiro de conversa.
- Quando muitos exemplos entram no prompt principal, a IA fica presa ao exemplo e perde fluidez.
- Exemplos detalhados devem ficar preferencialmente em matriz/base/testes, nao no prompt de conversa.

### Instrucoes duplicadas

- Regras repetidas em prompt geral, prompt de decisao e prompt da base aumentam conflito.
- A decisao ideal e manter:
  - backend/ferramentas para regras criticas;
  - prompt de decisao para escolher acao;
  - prompt de resposta para tom, clareza e apresentacao.

### Fluxos que parecem formulario

- A IA nao deve perguntar uma etapa extra se ja tem dados suficientes.
- Se faltar dado, deve fazer uma pergunta curta e especifica.
- Se o cliente mudar de assunto ou mudar um parametro, deve aproveitar o que ja sabe e confirmar apenas o que ficou incerto.

### Respostas padrao sempre iguais

- O prompt deve evitar respostas "modelo" quando o cliente demonstra frustracao, duvida ou objecao.
- Para assuntos fora do contexto, a IA deve contornar e redirecionar, nao encerrar nem transferir automaticamente.
- Para orcamentos revisados, nao repetir tudo do primeiro orcamento se o cliente so mudou um parametro.

## Diretriz de arquitetura

1. Backend valida decisoes criticas: preco, desconto, cupom, reserva, disponibilidade, capacidade, encerramento, transferencia, escopo e burla.
2. Orquestrador semantico interpreta a mensagem atual pelo contexto.
3. Prompt de decisao escolhe a acao, sem depender de frases exatas.
4. Prompt de resposta cuida de clareza, tom humano, organizacao e tamanho.
5. Base de conhecimento guarda regras comerciais e dados oficiais.
6. Testes e simulacoes cobrem exemplos, em vez de colocar todos os exemplos no prompt principal.

## Recomendacao pratica

- Manter as travas comerciais obrigatorias.
- Reduzir instrucoes conversacionais literais gradualmente.
- Converter exemplos de frase em intencoes semanticas.
- Nao remover validacoes deterministicas sem ter teste cobrindo.
- Priorizar migracao de preco, desconto, capacidade, disponibilidade, transferencia e encerramento para backend/ferramentas.

## 3. Memoria operacional da conversa

Além da memoria de dados coletados, a IA precisa guardar o que ela acabou de perguntar, oferecer ou sugerir. Essa memoria operacional deve ser consultada antes do orquestrador semantico responder a mensagem isolada do cliente.

Campos recomendados:

- `lastAssistantMessage`
- `lastAssistantAction`
- `lastQuestionKey`
- `lastQuestionText`
- `lastOfferType`
- `lastSuggestedNextStep`
- `awaitingCustomerReply`
- `awaitingConfirmationFor`
- `conversationStage`
- `collectedData`
- `missingData`
- `lastQuote`
- `quoteRevisionNumber`
- `lastToolCalled`
- `lastHumanHandoffOffer`
- `lastCloseOffer`
- `lastOutOfScopeResponse`

No projeto atual, parte disso ja existe em:

- `Tickets.lastAiMessage`
- `Tickets.lastAiAction`
- `Tickets.lastAiQuestionType`
- `Tickets.lastAiQuestionOptions`
- `Tickets.lastAiIntent`
- `Tickets.lastAiDecisionReason`
- `AiTicketContexts.collectedData`
- `AiTicketContexts.missingData`
- `AiTicketContexts.currentObjective`
- `AiTicketContexts.nextQuestion`

Evolucao recomendada:

- Curto prazo: usar os campos atuais do ticket e `AiTicketContext` para interpretar respostas curtas antes do orquestrador livre.
- Medio prazo: criar uma estrutura consolidada `operationalState` dentro de `AiTicketContexts` ou uma tabela `AiConversationStates`.
- Longo prazo: toda decisao da IA deve primeiro gerar um objeto operacional de decisao.

Objeto de decisao recomendado:

```json
{
  "detectedIntent": "...",
  "isReplyToPreviousQuestion": true,
  "answeredField": "...",
  "acceptedPreviousOffer": false,
  "previousOfferType": "...",
  "requiresTool": false,
  "toolToCall": "...",
  "shouldAskClarification": false,
  "nextQuestionKey": "...",
  "responseGoal": "..."
}
```

Regras de interpretacao imediata:

- Se a IA ofereceu encaminhamento humano e o cliente respondeu afirmativamente, aceitar o encaminhamento e nao recalcular orcamento.
- Se a IA ofereceu refazer orcamento e o cliente respondeu afirmativamente, iniciar coleta dos novos dados e nao transferir.
- Se a IA perguntou quantidade de pessoas e o cliente respondeu numero, salvar como `people`.
- Se a IA perguntou dias/encontros e o cliente respondeu numero, salvar como `meetingCount`.
- Se a IA perguntou horas por encontro e o cliente respondeu numero, salvar como `hoursPerMeeting`.
- Se o cliente critica a conducao, como "voce nao perguntou", "ja falei" ou "nao foi isso", reconhecer e pedir confirmacao curta quando houver ambiguidade; nao executar acao critica automaticamente.
- Perguntas sobre a propria IA, como nome, papel ou se e robo, sao dentro do contexto.
- Flertes ou perguntas pessoais inadequadas devem ser contornados com leveza e retorno ao foco.

Testes obrigatorios:

- IA oferece atendente; cliente responde "Quero"; esperado: encaminhar humano.
- IA oferece refazer simulacao; cliente responde "Quero"; esperado: coletar novos dados.
- IA pergunta pessoas; cliente responde "3"; esperado: salvar `people = 3`.
- IA pergunta dias/encontros; cliente responde "3"; esperado: salvar `meetingCount = 3`.
- Cliente pergunta "qual seu nome?"; esperado: responder nome da IA e voltar ao foco.
- Cliente pergunta "voce e bonita?"; esperado: contornar com leveza.
- Cliente diz "voce nao perguntou se eu queria falar com atendente?"; esperado: reconhecer e perguntar se deseja encaminhamento, sem transferir automaticamente.
- Cliente diz "ja falei"; esperado: revisar dados coletados e pedir apenas o que falta.
- Cliente diz "nao foi isso"; esperado: pedir correcao curta, sem repetir resposta anterior.
- Cliente diz "ok" apos orcamento; esperado: nao encerrar automaticamente.
