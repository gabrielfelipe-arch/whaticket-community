# Conversation Context Analysis

Snapshot: 2026-06-07

This document analyzes how the system handles the current conversation context and
proposes a professional short-term memory strategy per ticket.

## 1. Current Context Flow

Today there are two AI context paths:

- `DecideAiTicketActionService`
- `GenerateAiResponseService`

### Decision Service

`DecideAiTicketActionService` builds an internal JSON decision prompt.

Current behavior:

- Reads recent ticket messages through `getRecentHistory(ticket)`.
- Scope is isolated by `ticketId`.
- If `ticket.aiStartedAt` exists, history is limited to messages created after the AI session started.
- Loads up to 24 recent messages.
- Labels messages as `CLIENTE`, `IA`, `ATENDENTE HUMANO`, or `SISTEMA`.
- Includes ticket state through `buildTicketStateText(ticket)`.
- Includes:
  - last AI action
  - last AI intent
  - last question type
  - expected reply
  - last AI message
  - `aiConversationSummary`
  - recent history
  - relevant knowledge-base fragments

Relevant code:

- `backend/src/services/AiServices/DecideAiTicketActionService.ts`
- `getRecentHistory`
- `buildTicketStateText`
- `buildDecisionPrompt`

### Response Generation Service

`GenerateAiResponseService` sends recent messages to the provider for generic response generation.

Current behavior:

- Loads 8 recent messages by `ticketId`.
- Filters out `system` and `ura`.
- Sends only the last 3 non-system messages.
- Does not include `aiConversationSummary`.
- Does not include structured collected/missing data.

Relevant code:

- `backend/src/services/AiServices/GenerateAiResponseService.ts`
- `getRecentMessages`

## 2. Is The Current History Enough?

Partially.

Strengths:

- Context is scoped by `ticketId`.
- The decision service already receives controlled recent history.
- It already avoids old sessions when `aiStartedAt` is set.
- It tracks last AI action, last message, expected reply, and question attempts.
- It has a simple rolling `aiConversationSummary`.

Gaps:

- `GenerateAiResponseService` only sends the last 3 useful messages, which can be too little for consultative flows.
- The current summary is plain text appended from recent turns, not structured.
- There is no structured memory of collected data.
- There is no explicit list of missing data.
- There is no contradiction tracking.
- Group conversation authors are not represented in the AI prompt.
- Context update logs are minimal and not auditable as first-class events.

## 3. Existing Summary

There is already a simple summary field:

- `Tickets.aiConversationSummary`

Current update behavior:

- Updated in `handleWhatsappEvents.ts`.
- Uses `buildAiConversationSummary(previousSummary, userMessage, aiMessage, action)`.
- Appends:
  - `Cliente: ...`
  - `IA (action): ...`
- Truncates to the last 1200 characters.

This helps continuity, but it is not enough for high-quality consultative memory.

Problems:

- It is not structured.
- It can lose important facts when truncated.
- It cannot distinguish collected vs missing data.
- It cannot represent contradictions.
- It cannot reliably validate tool calls.

## 4. Existing Structured Extraction

There is no dedicated structured extraction table or model for conversation memory.

Existing ticket fields are useful but limited:

- `lastAiQuestionType`
- `lastAiQuestionOptions`
- `lastAiExpectedReply`
- `lastAiIntent`
- `lastAiAction`
- `lastAiDecisionReason`
- `lastAiKnowledgeIds`
- `lastAiAskedMoreHelp`
- `aiConversationSummary`

These fields describe AI state, but not the customer's business context.

Missing:

- `tipoUso`
- `frequencia`
- `duracaoPorUso`
- `usoRecorrente`
- `quantidadePessoas`
- `diaPreferencia`
- `horarioPreferencia`
- `orcamento`
- `planoSugerido`
- `dadosFaltantes`
- `contradicoes`
- `proximaPerguntaRecomendada`
- source message IDs
- confidence per extracted field

## 5. Risks

### Risk: Losing Context

High.

The plain text summary can be truncated and lose facts. The last 3 messages sent
by `GenerateAiResponseService` may miss information from earlier turns.

### Risk: Sending Too Much Context

Medium.

`DecideAiTicketActionService` sends up to 24 messages plus prompt plus knowledge.
That is controlled, but it can still grow, especially with long messages.

### Risk: Mixing Context Between Tickets

Low in current direct queries.

Most context reads are scoped by `ticketId`, and `aiStartedAt` narrows the AI
session. This is good.

Remaining risks:

- Same contact can have multiple tickets; prompts must keep saying not to use old tickets.
- Group messages do not identify individual speakers clearly enough.
- Stored summaries are reset on some AI start paths, but archiving/cleanup rules should be explicit.

## 6. Proposed Short-Term Memory Per Ticket

Create a dedicated per-ticket memory layer.

Recommended table:

`TicketConversationContexts`

Suggested columns:

- `id`
- `ticketId`
- `summary`
- `collectedData` JSONB
- `missingData` JSONB
- `uncertainData` JSONB
- `contradictions` JSONB
- `recommendedNextQuestion`
- `customerMood`
- `negotiationStatus`
- `lastUpdatedFromMessageId`
- `version`
- `createdAt`
- `updatedAt`

Optional audit table:

`TicketConversationContextLogs`

Suggested columns:

- `id`
- `ticketId`
- `messageId`
- `eventType`
- `field`
- `oldValue` JSONB
- `newValue` JSONB
- `confidence`
- `reason`
- `createdAt`

Suggested event types:

- `context_created`
- `field_extracted`
- `field_updated`
- `field_confirmed`
- `field_contradiction_detected`
- `summary_updated`
- `context_used_in_ai_decision`
- `context_used_in_tool_validation`
- `context_archived`

## 7. Structured Memory Shape

Example `collectedData`:

```json
{
  "customerName": {
    "value": "Douglas",
    "confidence": "media",
    "sourceMessageId": "abc",
    "updatedAt": "2026-06-07T10:00:00.000Z"
  },
  "tipoUso": {
    "value": "aula",
    "confidence": "alta",
    "sourceMessageId": "def",
    "updatedAt": "2026-06-07T10:01:00.000Z"
  },
  "frequencia": {
    "value": "2 vezes por semana",
    "confidence": "alta",
    "sourceMessageId": "def",
    "updatedAt": "2026-06-07T10:01:00.000Z"
  },
  "duracaoPorUso": {
    "value": "2 horas",
    "confidence": "alta",
    "sourceMessageId": "def",
    "updatedAt": "2026-06-07T10:01:00.000Z"
  },
  "usoRecorrente": {
    "value": true,
    "confidence": "alta",
    "sourceMessageId": "def",
    "updatedAt": "2026-06-07T10:01:00.000Z"
  }
}
```

Example `missingData`:

```json
[
  "diaPreferencia",
  "horarioPreferencia",
  "quantidadePessoas"
]
```

Example `contradictions`:

```json
[
  {
    "field": "usoRecorrente",
    "oldValue": false,
    "newValue": true,
    "oldSourceMessageId": "m1",
    "newSourceMessageId": "m8",
    "status": "needs_confirmation"
  }
]
```

## 8. Updating Context

Recommended strategy:

1. On each customer message, extract candidate facts.
2. Merge candidate facts into `TicketConversationContexts`.
3. Detect contradictions before overwriting high-confidence data.
4. Update `missingData`.
5. Update `recommendedNextQuestion`.
6. Log all changes in `TicketConversationContextLogs`.
7. Use the context in the next AI decision prompt.
8. Archive/freeze context when ticket closes.

The first implementation can be deterministic plus AI-assisted:

- Deterministic extraction for obvious values like times, dates, quantities, yes/no, phone, email.
- AI JSON extraction for domain-specific values like service interest, objections, budget, plan fit.

## 9. Prompt Strategy

Every AI decision should receive context in this order:

1. Ticket state
2. Structured conversation summary
3. Collected data
4. Missing data
5. Contradictions needing clarification
6. Last 8-12 relevant messages
7. Relevant knowledge-base fragments
8. Agent rules
9. Tool constraints

Suggested prompt block:

```text
Memoria curta do atendimento atual:
- Resumo: ...
- Dados ja coletados: ...
- Dados faltantes: ...
- Dados incertos: ...
- Contradicoes: ...
- Proxima pergunta recomendada: ...

Regras:
- Nao pergunte novamente dados ja coletados, salvo se houver contradicao.
- Se houver contradicao, esclareca antes de recomendar.
- Se faltarem dados essenciais, pergunte apenas o dado mais importante agora.
- Combine contexto da conversa com a base de conhecimento.
- Nao confirme acoes reais sem ferramenta executada com sucesso.
```

## 10. Avoiding Repeated Questions

Rules:

- Before `pedir_mais_informacoes`, check `collectedData`.
- If the AI asks for `usoRecorrente`, `tipoUso`, `duracao`, etc., record that in `lastAiQuestionType` or the new memory field.
- When the customer answers, mark that missing field as collected.
- Never ask for a field already collected with high confidence.
- If confidence is low, ask confirmation instead of repeating the same broad question.

Example:

Customer says:

```text
Quero uma sala para dar aula 2 vezes por semana, umas 2 horas por dia.
```

Collected:

- `tipoUso = aula`
- `frequencia = 2 vezes por semana`
- `duracaoPorUso = 2 horas`
- `usoRecorrente = true`

Next question should not be:

```text
O uso e pontual ou recorrente?
```

Next question should be:

```text
Perfeito. Para te indicar a melhor opcao, qual dia e horario voce prefere?
```

## 11. Contradictions

If the customer contradicts a previously collected fact:

- Do not overwrite immediately.
- Add an item to `contradictions`.
- Set `recommendedNextQuestion`.
- Ask a clarification question.

Example:

```text
Antes voce mencionou uso avulso, mas agora falou em plano mensal. Para eu te orientar corretamente: voce prefere uma reserva pontual ou esta considerando um plano recorrente?
```

Only after the customer clarifies should the context be updated.

## 12. Group Conversations

Current state:

- `Contacts.isGroup` and `Tickets.isGroup` exist.
- `Messages.senderType` exists.
- Group author identity is not clearly represented in AI context.

Required improvement:

- Store or expose participant identity per message when provider supports it.
- In group tickets, format history with author labels.
- Track `primaryRequester` in context if detectable.
- If multiple people speak, ask clarification before assuming one person's intent.

Suggested group history format:

```text
[CLIENTE: Maria / +5521... - 10:01]
Quero reservar a sala.

[CLIENTE: Joao / +5521... - 10:02]
Mas precisa ser no sabado.
```

Prompt rule:

```text
Em grupo, nao assuma que todas as mensagens sao da mesma pessoa. Se houver ambiguidade, pergunte a quem a solicitacao se refere.
```

## 13. Context + Knowledge Base

The base is fixed institutional knowledge. The context is customer-specific.

Use both:

- Knowledge says what is available, rules, prices, constraints.
- Context says what this customer wants.

Decision rule:

- If context maps to a known category, search using enriched terms from collected data.
- If no direct hit exists, ask one qualifying question to map the request to a category.
- Do not invent facts outside the base.

Example:

Collected context:

- `tipoUso = aula`
- `frequencia = recorrente`
- `duracaoPorUso = 2 horas`

RAG query can be enriched:

```text
aula recorrente 2 horas plano mensal mensalista pacote horas
```

## 14. Context + Tools

Tools must validate against structured context before executing real actions.

Example scheduling requirements:

- customer name
- phone
- service
- date
- time
- duration
- explicit confirmation
- active calendar/integration

If any required field is missing:

- Do not execute the tool.
- Ask for the missing field.

Important rule:

The context does not prove that an action happened. It only records what the customer requested.

The AI cannot say:

```text
Esta marcado.
```

unless the scheduling tool returns success.

Without tool success:

```text
Vou encaminhar para a equipe confirmar a disponibilidade e finalizar o agendamento.
```

## 15. Logging

Use `TicketConversationContextLogs` for auditability.

Minimum log events:

- context created
- data extracted
- data changed
- contradiction found
- summary updated
- context used in decision
- context used in tool validation
- context archived on close

Do not log secrets.

Avoid logging full message bodies when not required. Prefer message IDs and small previews.

## 16. Recommended Implementation Phases

### Phase 1: Strengthen Existing Context

- Include `aiConversationSummary` in `GenerateAiResponseService`.
- Increase useful recent message count from 3 to a controlled 8-10.
- Improve `buildAiConversationSummary` to structured bullet summary instead of append-only text.
- Add explicit prompt rules to avoid repeated questions.
- Add group-context prompt safeguards.

### Phase 2: Add Structured Memory Table

- Create `TicketConversationContexts`.
- Add service:
  - `GetTicketConversationContextService`
  - `UpdateTicketConversationContextService`
  - `BuildConversationContextPromptService`
- Store `collectedData`, `missingData`, `uncertainData`, `contradictions`.

### Phase 3: Add Context Logs

- Create `TicketConversationContextLogs`.
- Log extraction, update, contradiction, and usage events.

### Phase 4: Integrate With RAG

- Enrich knowledge-base search terms using collected data.
- Store which context fields influenced RAG.

### Phase 5: Integrate With Tools

- Add tool precondition validators.
- Prevent tool execution when required context fields are missing.
- Record tool validation outcome in context logs.

## 17. Required Tests

### Unit Tests

1. AI does not ask again for a field already collected.
2. AI uses information already provided in the conversation.
3. AI identifies missing data and asks only for the most important missing field.
4. AI detects contradiction and asks for clarification.
5. AI does not mix context from another ticket.
6. AI does not mix context from another group.
7. AI uses structured summary in the decision prompt.
8. AI keeps continuity after multiple turns.
9. AI does not confirm a real action based only on context.
10. AI combines context plus knowledge-base data for recommendation.
11. Group context includes author identity when available.
12. Context is archived or cleared when ticket closes.
13. Context update logs are created.
14. Tool validation blocks execution when required fields are missing.

### Integration Tests

1. Customer says usage type, frequency, and duration in one message.
   - Expected: memory stores all fields.
   - Expected: AI asks only date/time or next missing field.

2. Customer first says avulso, later says mensal.
   - Expected: contradiction stored.
   - Expected: AI asks confirmation.

3. Two tickets for same contact.
   - Expected: each ticket has isolated memory.

4. Group chat with multiple participants.
   - Expected: memory does not merge speakers blindly.

5. Customer asks to schedule without date.
   - Expected: tool does not execute.
   - Expected: AI asks date.

6. Customer asks to schedule with all data and confirms.
   - Expected: tool executes only if integration is available.
   - Expected: AI confirms only after tool success.

7. Knowledge base has plans and context has usage details.
   - Expected: recommendation uses both sources.

8. Ticket closes.
   - Expected: context is archived/frozen and not reused by a new ticket.

## 18. Acceptance Criteria

1. There is a clear strategy for current conversation context.
2. Context is isolated by ticket.
3. AI receives recent history in a controlled way.
4. A structured summary exists and is used in prompts.
5. Collected data and missing data are represented explicitly.
6. AI avoids repeated questions.
7. AI clarifies contradictions.
8. Context works in one-to-one conversations.
9. Context works in group conversations.
10. Context is combined with knowledge-base results.
11. Context validates tool calls before execution.
12. Logs allow auditing how context influenced responses.
13. Context is not confused with fixed knowledge-base content.
14. Context does not authorize real-world actions without tool success.
15. Context is archived or reset on close/reopen according to explicit rules.

## 19. Current Gap Summary

Already present:

- Ticket-scoped recent history.
- AI session scoping through `aiStartedAt`.
- Last AI action/question state.
- Basic rolling text summary.
- AI interaction logs.
- RAG metadata logs.

Missing:

- Structured memory per ticket.
- Collected/missing/uncertain data.
- Contradiction model.
- Context audit logs.
- Group participant-aware context.
- Tool precondition validation based on context.
- Structured summary generation.
- Context-enriched RAG query generation.

## 20. Immediate Next Code Changes

Suggested next implementation slice:

1. Add `TicketConversationContexts` migration/model.
2. Add `TicketConversationContextLogs` migration/model.
3. Add a service that builds a compact context prompt from:
   - current ticket state
   - structured memory
   - recent messages
   - knowledge fragments
4. Use that prompt in `DecideAiTicketActionService`.
5. Replace append-only `aiConversationSummary` with structured updates.
6. Add tests for repeated questions, contradictions, isolation, and tool blocking.

