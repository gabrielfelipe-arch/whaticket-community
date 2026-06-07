# Handoff - Alteracoes em URA, Formularios e IA

Data: 2026-06-07
Projeto: `C:\Projeto\whaticket-community`

Este arquivo resume as alteracoes feitas nesta conversa para facilitar a continuidade em outra conta.

## Contexto geral

O trabalho focou em:

- reformular o construtor de formularios de qualificacao;
- corrigir tela branca ao editar campos do formulario;
- integrar melhor formularios com URA;
- melhorar o comportamento da IA apos formulario;
- ajustar o prompt da IA Mari para a Salinha Meier;
- corrigir navegacao da URA com `M`, `V` e `S`;
- corrigir falso erro de duplicidade ao editar opcoes da URA.

## Arquivos principais alterados

- `frontend/src/pages/Settings/index.js`
- `backend/src/handlers/handleWhatsappEvents.ts`
- `backend/src/controllers/CustomAdminController.ts`
- `backend/src/models/QualificationForm.ts`
- `backend/src/models/UraOption.ts`
- `backend/src/services/AiServices/DecideAiTicketActionService.ts`
- `backend/src/services/AiServices/GenerateAiResponseService.ts`
- `backend/src/database/migrations/20260607141000-add-greeting-message-to-qualification-forms.ts`
- `backend/src/database/migrations/20260607143000-add-main-menu-return-to-ura-options.ts`
- `backend/src/database/migrations/20260607023000-create-qualification-forms.ts`
- `backend/src/database/migrations/20260522150300-create-ura-flow.ts`

## Formularios de qualificacao

### UI reformulada

O construtor de formularios em `Settings/index.js` foi reorganizado:

- lista de formularios na lateral;
- configuracao do formulario no topo;
- perguntas do formulario em area central;
- editor da pergunta ao lado;
- botao `Adicionar pergunta` mais visivel;
- estado vazio mais claro para formularios sem perguntas.

### Tipos de pergunta

Foi ajustada a logica visual:

- `Texto livre`, `E-mail`, `Telefone`, `Numero`, `Data`, `Horario` e `Sim ou nao` nao exibem opcoes configuraveis;
- nesses tipos, a pergunta e fixa e a resposta e digitada pelo cliente;
- somente `Escolha unica` e `Multipla escolha` exibem opcoes numeradas estilo URA;
- cada opcao pode aplicar etiquetas;
- a previa do WhatsApp diferencia resposta livre de resposta por opcoes.

### Correcoes de tela branca

Foi corrigido erro de renderizacao causado por leitura de `event.target.value` dentro de atualizacao funcional de estado, por causa de pooling de eventos do React 16.

Tambem foram adicionadas protecoes com `safeArray` para evitar `.map`, `.find` e `.length` sobre valores nulos.

Foi criado `QualificationFormsBoundary` para capturar erro do painel e evitar tela branca total.

### Saudacao antes das perguntas

Foi adicionado campo `greetingMessage` em `QualificationForms`.

Comportamento:

- se o formulario tiver `Mensagem de saudacao antes das perguntas`, a URA envia essa mensagem primeiro;
- depois envia a primeira pergunta do formulario.

Exemplo:

```text
Antes de iniciarmos seu atendimento, precisamos fazer algumas perguntas para entender seu perfil.
```

Arquivos envolvidos:

- `backend/src/models/QualificationForm.ts`
- `backend/src/database/migrations/20260607141000-add-greeting-message-to-qualification-forms.ts`
- `backend/src/controllers/CustomAdminController.ts`
- `backend/src/handlers/handleWhatsappEvents.ts`
- `frontend/src/pages/Settings/index.js`

## URA

### Formulario antes da acao

A URA ja permite selecionar um formulario em uma opcao antes de executar a acao principal, por exemplo:

- transferir para fila;
- iniciar IA;
- encaminhar humano;
- encerrar.

Ao concluir o formulario, as respostas sao salvas em:

- `QualificationFormResponses`
- `QualificationFormAnswers`
- `AiTicketContexts`
- `Tickets.aiConversationSummary`

### Navegacao com M/V/S

Foi analisada e reaproveitada a logica existente:

- `M` volta ao menu principal;
- `V` volta ao menu anterior, quando existe menu anterior;
- `S` encerra atendimento.

Funcoes existentes usadas:

- `getSubmenuNavigationFooter`
- `appendSubmenuNavigationFooter`
- `getUraNavigationCommand`

Antes havia sido criado um comportamento para enviar o menu principal automaticamente apos uma mensagem. Isso foi ajustado.

Agora, em opcao da URA com acao `Enviar mensagem`, existe o switch:

```text
Mostrar comandos de navegacao
```

Quando marcado:

- adiciona `M - Menu principal`;
- adiciona `S - Encerrar atendimento`;
- adiciona `V - Voltar` somente quando existir menu anterior.

Importante:

- nao envia o menu principal automaticamente;
- apenas adiciona comandos de navegacao no rodape da mensagem;
- os comandos tambem funcionam quando a opcao esta no menu principal.

Campo usado:

```text
UraOptions.showMainMenuAfterMessage
```

Apesar do nome antigo, agora ele representa "mostrar comandos de navegacao apos mensagem".

### Edicao de opcao da URA

Foi corrigido o falso erro:

```text
Ja existe uma opcao com esse numero neste menu/submenu.
```

Agora, ao editar uma opcao, se a validacao encontrar a propria opcao editada, permite salvar/sobrescrever.

Arquivo:

- `backend/src/controllers/CustomAdminController.ts`

Trecho corrigido:

```ts
if (duplicatedOption && Number(duplicatedOption.id) !== Number(data.id)) {
  throw new AppError("Ja existe uma opcao com esse numero neste menu/submenu.", 400);
}
```

## IA Mari - Salinha Meier

### Diagnostico feito no atendimento Douglas Cazaroti

Contato analisado:

- `Douglas Cazaroti`
- contato id `1572`
- ticket mais recente analisado: `19`

Problemas encontrados:

1. O formulario terminou e salvou contexto corretamente.
2. A IA ficou ativa, mas nao enviava mensagem automaticamente.
3. O cliente precisava mandar uma nova mensagem para a IA responder.
4. O prompt tinha conflitos:
   - cadastro dizia IA `Doug`;
   - prompt dizia `Voce e Mari`;
   - prompt tambem mencionava `RocketService`;
   - empresa configurada era `Salinha Meier`.
5. A base de conhecimento `Salinha` foi encontrada, mas o provedor retornou JSON fora do contrato:

```json
{"mensagem":"Desculpe, nao posso ajudar com isso..."}
```

e depois:

```json
{"status":"error","message":"A solicitacao nao pode ser processada..."}
```

### Prompt ajustado no banco

Foi atualizado `AiSettings` id `1`:

- `name = Mari`
- `companyName = Salinha Meier`
- `serviceType = Vendas, orcamentos, duvidas e orientacao comercial sobre aluguel da sala`
- `behaviorPrompt` reescrito sem conflitos com Doug/RocketService
- `systemPrompt = null`

O prompt novo orienta:

- Mari e assistente comercial da Salinha Meier;
- usar contexto do formulario e historico do ticket;
- consultar base antes de falar sobre planos, valores, estrutura, endereco, regras, horarios ou indicacoes;
- nao perguntar novamente o que o cliente ja respondeu;
- pedir apenas dado faltante;
- nao inventar valores, disponibilidade ou condicoes;
- encaminhar humano para fechamento, negociacao, reserva ou disponibilidade final.

Foi confirmada no banco ausencia de `Doug` e `RocketService` no prompt.

### IA se apresenta apos formulario

Foi alterado `handleWhatsappEvents.ts`.

Quando o formulario termina e a acao da URA e `START_AI`:

- ativa a IA;
- salva contexto;
- envia automaticamente uma mensagem da Mari;
- a mensagem usa o resumo do formulario;
- registra estado de IA como `saudacao_pos_formulario`;
- marca proxima resposta esperada como texto livre.

Exemplo de comportamento esperado:

```text
Ola, Douglas! Sou a Mari, assistente da Salinha Meier.

Ja recebi suas respostas:
- Escolha a opcao que mais combina com a sua necessidade: Meu curso/treinamento acontece em mais de 1 encontro
- Voce ja realizou esse tipo de encontro antes?: Sim, ja realizei, mas nunca aluguei uma sala

Com isso em mente, vou te ajudar a encontrar a melhor opcao. Para eu te orientar melhor, voce ja sabe quantas pessoas vao participar?
```

### JSON invalido da IA

Foi corrigido buraco em `DecideAiTicketActionService.ts`.

Antes:

- se o provedor retornasse JSON parseavel, mas fora do contrato, o sistema podia aceitar a resposta.

Agora:

- existe `hasDecisionContract`;
- se o JSON nao tiver campos de decisao esperados, ele e rejeitado;
- se houver base encontrada, usa fallback com base;
- se nao houver base, qualifica antes de encaminhar.

Campos esperados no contrato:

- `acao`
- `intencao`
- `resposta`
- `perguntaConfirmacao`
- `ferramenta`
- `baseEncontrada`
- `respostaSegura`

### Truncamento do prompt interno

Foi ajustado `GenerateAiResponseService.ts`.

Antes, chamadas internas de decisao com `skipKnowledgeSearch = true` truncavam a mensagem/prompt em cerca de `1800` tokens.

Agora aumentou para `6000` tokens:

```ts
const userMessage = truncateByApproxTokens(message, isInternalAiEnginePrompt ? 6000 : 700);
```

Motivo:

- preservar mensagem atual;
- preservar contexto estruturado;
- preservar base encontrada;
- preservar formato JSON esperado.

## Banco de dados

Novas colunas/migracoes:

### `QualificationForms.greetingMessage`

Migration:

```text
backend/src/database/migrations/20260607141000-add-greeting-message-to-qualification-forms.ts
```

Confirmado no banco:

```text
QualificationForms.greetingMessage | text
```

### `UraOptions.showMainMenuAfterMessage`

Migration:

```text
backend/src/database/migrations/20260607143000-add-main-menu-return-to-ura-options.ts
```

Confirmado no banco:

```text
UraOptions.showMainMenuAfterMessage | boolean
```

Observacao: o nome tecnico ficou antigo, mas o significado atual e "mostrar comandos de navegacao depois da mensagem".

## Validacoes realizadas

Comandos usados:

```powershell
docker compose exec -T backend npm run build
```

Resultado: passou.

```powershell
docker cp frontend\src\pages\Settings\index.js whaticket-community-backend-1:/tmp/Settings-index.js
docker exec whaticket-community-backend-1 node -e "const fs=require('fs');const parser=require('@babel/parser');const code=fs.readFileSync('/tmp/Settings-index.js','utf8');parser.parse(code,{sourceType:'module',plugins:['jsx','optionalChaining','nullishCoalescingOperator','classProperties']});console.log('Settings index JSX parse OK');"
```

Resultado: `Settings index JSX parse OK`.

```powershell
docker compose up -d --build backend frontend
```

Resultado: backend/frontend buildaram e subiram.

```powershell
docker compose ps backend frontend
```

Resultado esperado:

- backend em `0.0.0.0:8080->3000`
- frontend em `0.0.0.0:3000->80`

## URLs locais

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`

## Pontos de atencao futuros

1. O campo `showMainMenuAfterMessage` deveria ser renomeado no futuro para algo como `showNavigationCommandsAfterMessage`, mas nao foi renomeado agora para evitar migracao extra e quebra.

2. A apresentacao automatica da Mari apos formulario e deterministica, nao gerada pelo modelo. Isso foi proposital para evitar custo, latencia e risco de resposta ruim no momento de transicao.

3. A base de conhecimento da Salinha existe em `KnowledgeBaseArticles`, id `1`, titulo `Salinha`.

4. O prompt antigo da IA foi substituido diretamente no banco, nao em migration.

5. O sistema ainda usa muitos textos sem acento em partes do codigo; algumas mensagens novas seguem esse padrao para consistencia tecnica.

