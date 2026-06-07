# Conversation Context Analysis

Snapshot: 2026-06-07

This document analyzes how the system handles current conversation context and
what still needs to be strengthened for a professional short-term memory strategy
per ticket.

## 1. Current Database Reality

The database currently has 40 public tables. The full table-by-table map is in
`docs/database-map.md`.

For AI conversation context, the key tables are:

- `Tickets`: central workflow state, AI/URA state, last AI action/question, rolling text summary.
- `Messages`: ticket-scoped chronological conversation history.
- `AiTicketContexts`: structured short-term memory per ticket.
- `AiInteractionLogs`: AI decision/call audit and RAG metadata.
- `KnowledgeBaseArticles`: fixed institutional knowledge used by RAG.
- `QualificationFormAnswers`: structured intake answers that can be included in AI context.
- `AiToolExecutions`: proof of tool execution, block, or error.
- `AiLeads`: lead snapshot generated from ticket context.

## 2. Current Context Flow

There are now three important AI context paths:

- `DecideAiTicketActionService`
- `GenerateAiResponseService`
- `AiTicketContextService`

### Decision Service

`DecideAiTicketActionService` builds an internal JSON decision prompt.

Current behavior:

- Reads recent ticket messages through `getRecentHistory(ticket)`.
- Scope is isolated by `ticketId`.
- If `ticket.aiStartedAt` exists, history is limited to messages created after the AI session started.
- Loads up to 24 recent messages.
- Labels messages as `CLIENTE`, `IA`, `ATENDENTE HUMANO`, or `SISTEMA`.
- Includes ticket state through `buildTicketStateText(ticket)`.
- Loads structured memory through `BuildAiTicketContextTextService(ticket.id)`.
- Includes:
  - last AI action
  - last AI intent
  - last question type
  - expected reply
  - last AI message
  - `aiConversationSummary`
  - `AiTicketContexts` structured memory
  - recent history
  - relevant knowledge-base fragments

Relevant code:

- `backend/src/services/AiServices/DecideAiTicketActionService.ts`
- `getRecentHistory`
- `buildTicketStateText`
- `BuildAiTicketContextTextService`
- `buildDecisionPrompt`

### Structured Context Service

`AiTicketContextService` is the current short-term memory layer.

Current behavior:

- Stores one `AiTicketContexts` row per ticket.
- Merges collected data by field key.
- Stores collected data, missing data, and contradictions as JSON strings in `TEXT` columns.
- Builds a compact prompt block with:
  - summary
  - collected data
  - missing data
  - contradictions/incertezas
  - current objective
  - next suggested question
  - last AI action/reason
- Receives structured answers from qualification forms when `includeInAiContext = true`.

Relevant code:

- `backend/src/services/AiServices/AiTicketContextService.ts`
- `backend/src/models/AiTicketContext.ts`
- `backend/src/database/migrations/20260607033000-create-ai-ticket-contexts.ts`
- `backend/src/handlers/handleWhatsappEvents.ts`

### Response Generation Service

`GenerateAiResponseService` sends recent messages to the provider for generic
response generation.

Current behavior:

- Loads 8 recent messages by `ticketId`.
- Filters out `system` and `ura`.
- Sends only the last 3 non-system messages.
- Does not include `AiTicketContexts`.
- Does not include structured collected/missing data.

Relevant code:

- `backend/src/services/AiServices/GenerateAiResponseService.ts`
- `getRecentMessages`

## 3. Is The Current History Enough?

Partially.

Strengths:

- Context is scoped by `ticketId`.
- The decision service receives controlled recent history.
- It avoids old AI sessions when `aiStartedAt` is set.
- It tracks last AI action, last message, expected reply, and question attempts.
- It has a simple rolling `aiConversationSummary`.
- It now has structured per-ticket memory in `AiTicketContexts`.
- Qualification forms can feed collected data into the memory layer.

Gaps:

- `GenerateAiResponseService` still does not use `AiTicketContexts`.
- The old `Tickets.aiConversationSummary` is still append-only/truncated text.
- `AiTicketContexts` uses `TEXT` JSON instead of validated/queryable `JSONB`.
- There is no dedicated field-level context audit log.
- Contradictions are string items, not structured records.
- Group conversation authors are not represented in the AI prompt.
- Tool preconditions are not yet fully validated against structured context.

## 4. Existing Summary And Memory

There are now two memory layers:

### Rolling Text Summary

- Field: `Tickets.aiConversationSummary`
- Updated in `handleWhatsappEvents.ts`.
- Uses `buildAiConversationSummary(previousSummary, userMessage, aiMessage, action)`.
- Appends recent turns and truncates to the last 1200 characters.

This helps continuity, but it is not enough by itself.

### Structured Ticket Memory

- Table: `AiTicketContexts`
- Model: `AiTicketContext`
- Service: `AiTicketContextService`

Important fields:

- `ticketId`
- `summary`
- `collectedData`
- `missingData`
- `contradictions`
- `currentObjective`
- `nextQuestion`
- `lastSource`
- `lastAiIntent`
- `lastAiAction`
- `lastAiDecisionReason`
- `lastKnowledgeIds`
- `lastUpdatedAt`

This is the correct foundation for consultative memory, but it still needs
stronger typing, logging, contradiction handling, and broader prompt integration.

## 5. Existing Structured Extraction

Structured extraction currently exists mainly through qualification forms:

- `QualificationForms`
- `QualificationFormQuestions`
- `QualificationFormResponses`
- `QualificationFormAnswers`

When an answer has `includeInAiContext = true`, `handleWhatsappEvents.ts` merges
it into `AiTicketContexts.collectedData`.

Missing for free-text conversations:

- robust extraction from ordinary customer messages
- confidence per extracted field
- source message IDs
- structured missing-data computation
- structured contradiction detection
- automatic next-question selection

## 6. Risks

### Risk: Losing Context

Medium.

The risk is lower than before because `AiTicketContexts` exists, but the rolling
summary can still lose facts when truncated, and free-text extraction is not yet
complete.

### Risk: Sending Too Much Context

Medium.

`DecideAiTicketActionService` sends up to 24 messages plus ticket state,
structured context, prompt rules, and knowledge fragments. This is controlled,
but long tickets can still create large prompts.

### Risk: Mixing Context Between Tickets

Low in current direct queries.

Most context reads are scoped by `ticketId`, and `aiStartedAt` narrows the AI
session.

Remaining risks:

- Same contact can have multiple tickets; prompts must keep using current ticket context only.
- Group messages do not identify individual speakers clearly enough.
- Stored context reset/archive behavior on ticket close/reopen should be explicit.

### Risk: Treating Context As Action Proof

Medium.

`AiToolExecutions` exists and should be the proof source for real actions.
`AiTicketContexts` only records customer intent and conversation state. It must
not be treated as proof that a schedule, transfer, or closure happened.

## 7. Recommended Short-Term Memory Shape

Keep using `AiTicketContexts`, but evolve the stored data shape.

Recommended `collectedData` entry:

```json
{
  "tipoUso": {
    "label": "Tipo de uso",
    "value": "aula",
    "confidence": "alta",
    "sourceMessageId": "message-id",
    "source": "free_text",
    "updatedAt": "2026-06-07T10:01:00.000Z"
  }
}
```

Recommended `missingData`:

```json
[
  "diaPreferencia",
  "horarioPreferencia",
  "quantidadePessoas"
]
```

Recommended `contradictions`:

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
2. Merge candidate facts into `AiTicketContexts`.
3. Detect contradictions before overwriting high-confidence data.
4. Update `missingData`.
5. Update `nextQuestion`.
6. Log all changes in a new context log table.
7. Use the context in the next AI decision prompt.
8. Archive/freeze context when ticket closes.

The first implementation can be deterministic plus AI-assisted:

- Deterministic extraction for times, dates, quantities, yes/no, phone, email.
- AI JSON extraction for domain-specific values like service interest, objections, budget, and plan fit.

## 9. Prompt Strategy

Every AI decision should receive context in this order:

1. Ticket state
2. Structured ticket memory from `AiTicketContexts`
3. Contradictions needing clarification
4. Last 8-12 relevant messages
5. Relevant knowledge-base fragments
6. Agent rules
7. Tool constraints and `AiToolExecutions` outcome when relevant

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

- Before `pedir_mais_informacoes`, check `AiTicketContexts.collectedData`.
- If the AI asks for `usoRecorrente`, `tipoUso`, `duracao`, etc., record that in `Tickets.lastAiQuestionType` and/or `AiTicketContexts.nextQuestion`.
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

## 11. Context + Knowledge Base

The base is fixed institutional knowledge. The context is customer-specific.

Use both:

- Knowledge says what is available, rules, prices, constraints.
- Context says what this customer wants.

Decision rule:

- If context maps to a known category, search using enriched terms from collected data.
- If no direct hit exists, ask one qualifying question to map the request to a category.
- Do not invent facts outside the base.

Example enriched RAG query:

```text
aula recorrente 2 horas plano mensal mensalista pacote horas
```

## 12. Context + Tools

Tools must validate against structured context before executing real actions.

Existing tool tables/services:

- `AiToolExecutions`
- `AiCalendarConnections`
- `AiLeads`
- `AiToolService`

Required scheduling context:

- customer name
- contact phone or linked contact
- service/objective
- date
- time
- duration
- explicit confirmation
- active calendar connection

If any required field is missing:

- Do not execute the tool.
- Ask for the missing field.
- Log blocked execution in `AiToolExecutions`.

Important rule:

The context does not prove that an action happened. It only records what the
customer requested.

## 13. Group Conversations

Current state:

- `Contacts.isGroup` and `Tickets.isGroup` exist.
- `Messages.senderType` exists.
- Group author identity is not clearly represented in `Messages`.

Required improvement:

- Store or expose participant identity per message when provider supports it.
- In group tickets, format history with author labels.
- Track `primaryRequester` in structured context if detectable.
- If multiple people speak, ask clarification before assuming one person's intent.

## 14. Logging

`AiInteractionLogs` and `AiToolExecutions` exist, but they do not replace a
field-level context log.

Recommended new table:

`AiTicketContextLogs`

Suggested columns:

- `id`
- `ticketId`
- `messageId`
- `eventType`
- `field`
- `oldValue`
- `newValue`
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

## 15. Recommended Implementation Phases

### Phase 1: Consolidate Existing Context

- Keep `AiTicketContexts` as the memory table.
- Include `AiTicketContexts` in `GenerateAiResponseService`.
- Increase useful non-system recent messages from 3 to a controlled 8-10.
- Improve `buildAiConversationSummary` to structured bullet summary instead of append-only text.
- Add explicit prompt rules to avoid repeated questions.

### Phase 2: Strengthen Structured Memory

- Convert `AiTicketContexts.collectedData`, `missingData`, and `contradictions` from `TEXT` JSON to `JSONB`.
- Add confidence and source message IDs.
- Add deterministic extraction from free-text messages.
- Add structured contradiction detection.

### Phase 3: Add Context Logs

- Create `AiTicketContextLogs`.
- Log extraction, update, contradiction, usage, and archive events.

### Phase 4: Integrate With RAG

- Enrich knowledge-base search terms using collected data.
- Store which context fields influenced RAG.

### Phase 5: Integrate With Tools

- Add tool precondition validators.
- Prevent tool execution when required context fields are missing.
- Record validation outcome in `AiToolExecutions` and context logs.

## 16. Required Tests

Unit tests:

1. AI does not ask again for a field already collected.
2. AI uses information already stored in `AiTicketContexts`.
3. AI identifies missing data and asks only for the most important missing field.
4. AI detects contradiction and asks for clarification.
5. AI does not mix context from another ticket.
6. AI does not mix context from another group.
7. AI uses structured memory in the decision prompt.
8. AI keeps continuity after multiple turns.
9. AI does not confirm a real action based only on context.
10. AI combines context plus knowledge-base data for recommendation.
11. Qualification answers are merged into `AiTicketContexts`.
12. Tool validation blocks execution when required fields are missing.

Integration tests:

1. Customer says usage type, frequency, and duration in one message.
2. Customer first says avulso, later says mensal.
3. Two tickets for same contact remain isolated.
4. Group chat with multiple participants does not merge speakers blindly.
5. Customer asks to schedule without date.
6. Customer asks to schedule with all data and confirms.
7. Knowledge base has plans and context has usage details.
8. Ticket closes and context is archived/frozen or reset according to explicit rule.

## 17. Acceptance Criteria

1. Context is isolated by ticket.
2. AI receives recent history in a controlled way.
3. Structured memory is represented in `AiTicketContexts`.
4. Collected data and missing data are represented explicitly.
5. AI avoids repeated questions.
6. AI clarifies contradictions.
7. Context works in one-to-one conversations.
8. Context has a clear path for group conversations.
9. Context is combined with knowledge-base results.
10. Context validates tool calls before execution.
11. Logs allow auditing how context influenced responses.
12. Context is not confused with fixed knowledge-base content.
13. Context does not authorize real-world actions without tool success.
14. Context is archived or reset on close/reopen according to explicit rules.

## 18. Current Gap Summary

Already present:

- Ticket-scoped recent history.
- AI session scoping through `aiStartedAt`.
- Last AI action/question state.
- Basic rolling text summary.
- `AiTicketContexts` structured memory table.
- `BuildAiTicketContextTextService` included in the decision prompt.
- Qualification answers merged into structured memory.
- AI interaction logs.
- AI tool execution logs.
- Lead snapshot table.

Missing or incomplete:

- `GenerateAiResponseService` does not use structured context.
- Free-text structured extraction from customer messages.
- JSONB storage and validation for memory fields.
- Field-level context audit logs.
- Structured contradiction model.
- Group participant-aware context.
- Tool precondition validation based on complete context.
- Context-enriched RAG query generation.

## 19. Immediate Next Code Changes

Recommended next implementation slice:

1. Include `BuildAiTicketContextTextService` output in `GenerateAiResponseService`.
2. Send 8-10 useful recent messages instead of only the last 3 non-system messages.
3. Add a lightweight extractor that updates `AiTicketContexts` from customer free text.
4. Add tool precondition validation against `AiTicketContexts` for scheduling.
5. Create `AiTicketContextLogs`.
6. Add tests for repeated questions, contradictions, qualification answers, isolation, and tool blocking.
