# Database Map

Snapshot: 2026-06-07
Database: `whaticket_pg`

This is a sanitized operational map. It documents schema, relationships, and
software context only. It intentionally avoids secret values, API keys, full
messages, contact details, settings values, and knowledge-base article content.

## High-Level Domains

- Core atendimento: `Tickets`, `Messages`, `Contacts`, `Users`, `Queues`, `Whatsapps`
- IA and context: `AiSettings`, `AiInteractionLogs`, `AiTicketContexts`, `AiLeads`, `AiToolExecutions`, `AiCalendarConnections`, `AiTaggerHistories`, `KnowledgeBaseArticles`
- URA and qualification: `UraFlows`, `UraOptions`, `QualificationForms`, `QualificationFormQuestions`, `QualificationFormResponses`, `QualificationFormAnswers`
- Routing and ownership: `QueueDistributionLogs`, `UserQueues`, `WhatsappQueues`
- Classification and closure: `Tags`, `ContactTags`, `TicketCategories`, `ClosingReasons`
- Campaigns and schedules: `Campaigns`, `CampaignContacts`, `CampaignRecipientLogs`, `ScheduledMessages`, `ScheduledMessageExecutions`
- Satisfaction and audit: `SatisfactionSurveys`, `SatisfactionSurveyResponses`, `AuditLogs`
- Admin/system: `Settings`, `SequelizeMeta`, `WppKeys`, `QuickAnswers`, `ContactCustomFields`

## Current Tables

The public schema currently has 40 tables.

| Table | Context role |
|---|---|
| `AiCalendarConnections` | Calendar integration credentials/config used by AI tools. |
| `AiInteractionLogs` | AI call/decision audit, including intent, action, tokens, RAG metadata, and raw AI response fields. |
| `AiLeads` | Lead snapshot created from ticket context, contact, tags, queue, WhatsApp, and AI setting. |
| `AiSettings` | AI provider/model configuration, prompts, handoff, auto-close, allowed tools, and calendar link. |
| `AiTaggerHistories` | Audit of AI tag classification over contacts/tickets. |
| `AiTicketContexts` | Structured short-term memory per ticket. This is the main context table for avoiding repeated questions. |
| `AiToolExecutions` | Execution log for AI tools such as lead registration, queue transfer, close, calendar check, and scheduling. |
| `AuditLogs` | Admin/API audit trail for actions over resources. |
| `CampaignContacts` | Recipients and execution state for campaigns. |
| `CampaignRecipientLogs` | Attempt-level campaign delivery log. |
| `Campaigns` | Bulk message campaign definition and lifecycle. |
| `ClosingReasons` | Reasons and optional farewell behavior for ticket closure. |
| `ContactCustomFields` | Extra key/value data attached to contacts. |
| `ContactTags` | Many-to-many contact/tag relation and tag application timestamp. |
| `Contacts` | WhatsApp contacts/groups. Important identifiers: `number`, `lid`, `isGroup`. |
| `KnowledgeBaseArticles` | RAG content source for AI answers. Has full-text search support. |
| `Messages` | Ticket messages. Includes sender type, media info, quote relation, and AI session marker. |
| `QualificationFormAnswers` | Captured answers from qualification forms; can be included in AI context. |
| `QualificationFormQuestions` | Questions and options in qualification forms. |
| `QualificationFormResponses` | Per-ticket execution of a qualification form. |
| `QualificationForms` | Reusable forms that can run before URA option action. |
| `QueueDistributionLogs` | Routing/distribution audit for queue assignment decisions. |
| `Queues` | Attendance queues, AI enablement, business hours, and distribution controls. |
| `QuickAnswers` | Global or user-owned canned replies, optionally with media. |
| `SatisfactionSurveyResponses` | Rating responses tied to ticket/contact/user/queue/category/closing reason. |
| `SatisfactionSurveys` | Survey definitions and thank-you message. |
| `ScheduledMessageExecutions` | Execution attempts for scheduled messages. |
| `ScheduledMessages` | One-shot or recurring scheduled messages with tag filters and media. |
| `SequelizeMeta` | Migration bookkeeping. |
| `Settings` | Application settings. Values can contain sensitive operational configuration. |
| `Tags` | Contact labels/classification. |
| `TicketCategories` | Ticket categorization. |
| `Tickets` | Central workflow entity; stores current state, queue, contact, user, AI, URA, closure, and satisfaction state. |
| `UraFlows` | Menu/flow definition with fallback and AI auto-close controls. |
| `UraOptions` | URA selectable options, tree state, routing/action, AI handoff, closing, and qualification settings. |
| `UserQueues` | Many-to-many user/queue assignment. |
| `Users` | Attendants/admins, auth fields, profile, default WhatsApp, and operational status. |
| `WhatsappQueues` | Many-to-many WhatsApp/queue assignment. |
| `Whatsapps` | WhatsApp connection/session state and optional URA flow. |
| `WppKeys` | WhatsApp session key storage. Sensitive. |

## Core Context Chain

For the software context, the most important chain is:

```text
Contact -> Ticket -> Messages
              |
              +-> Queue -> AiSettings
              +-> UraFlow / UraOption
              +-> AiTicketContexts
              +-> AiInteractionLogs
              +-> AiToolExecutions
              +-> AiLeads
```

`Tickets` is the operational center. It is where the system knows who is being
served, which queue owns the work, whether AI or URA is active, which last AI
question is pending, and whether the ticket has been handed off or closed.

`Messages` is the chronological conversation source. It must always be scoped by
`ticketId` when building AI prompts.

`AiTicketContexts` is the structured short-term memory table. It stores compact
ticket-scoped context:

- `summary`
- `collectedData`
- `missingData`
- `contradictions`
- `currentObjective`
- `nextQuestion`
- last AI intent/action/reason/knowledge IDs

## Important Foreign Keys

### Ticket Center

- `Tickets.contactId` -> `Contacts.id`
- `Tickets.userId` -> `Users.id`
- `Tickets.queueId` -> `Queues.id`
- `Tickets.whatsappId` -> `Whatsapps.id`
- `Tickets.aiSettingId` -> `AiSettings.id`
- `Tickets.uraFlowId` -> `UraFlows.id`
- `Tickets.currentUraOptionId` -> `UraOptions.id`
- `Tickets.categoryId` -> `TicketCategories.id`
- `Tickets.closingReasonId` -> `ClosingReasons.id`

### Messages And Conversation

- `Messages.ticketId` -> `Tickets.id`
- `Messages.contactId` -> `Contacts.id`
- `Messages.quotedMsgId` -> `Messages.id`
- `AiTicketContexts.ticketId` -> `Tickets.id`
- `AiInteractionLogs.ticketId` -> `Tickets.id`
- `AiToolExecutions.ticketId` -> `Tickets.id`

### AI Configuration And Tools

- `Queues.aiSettingId` -> `AiSettings.id`
- `AiSettings.calendarConnectionId` -> `AiCalendarConnections.id`
- `AiSettings.humanHandoffQueueId` -> `Queues.id`
- `AiInteractionLogs.aiSettingId` -> `AiSettings.id`
- `AiToolExecutions.aiSettingId` -> `AiSettings.id`
- `AiLeads.aiSettingId` -> `AiSettings.id`

### URA And Qualification

- `UraFlows.fallbackQueueId` -> `Queues.id`
- `UraOptions.flowId` -> `UraFlows.id`
- `UraOptions.parentOptionId` -> `UraOptions.id`
- `UraOptions.targetQueueId` -> `Queues.id`
- `UraOptions.aiHumanHandoffQueueId` -> `Queues.id`
- `UraOptions.closingReasonId` -> `ClosingReasons.id`
- `UraOptions.qualificationFormId` -> `QualificationForms.id`
- `QualificationFormQuestions.formId` -> `QualificationForms.id`
- `QualificationFormResponses.formId` -> `QualificationForms.id`
- `QualificationFormResponses.ticketId` -> `Tickets.id`
- `QualificationFormAnswers.responseId` -> `QualificationFormResponses.id`
- `QualificationFormAnswers.questionId` -> `QualificationFormQuestions.id`

### Routing, Tags, Campaigns, Surveys

- `UserQueues.userId` -> `Users.id`
- `UserQueues.queueId` -> `Queues.id`
- `WhatsappQueues.whatsappId` -> `Whatsapps.id`
- `WhatsappQueues.queueId` -> `Queues.id`
- `ContactTags.contactId` -> `Contacts.id`
- `ContactTags.tagId` -> `Tags.id`
- `CampaignContacts.campaignId` -> `Campaigns.id`
- `CampaignContacts.contactId` -> `Contacts.id`
- `ScheduledMessages.contactId` -> `Contacts.id`
- `SatisfactionSurveyResponses.ticketId` -> `Tickets.id`

## Context-Relevant Table Assessment

### Strongly Relevant

- `Tickets`: current ticket state, AI/URA status, handoff, queue, closing, last AI fields, rolling summary.
- `Messages`: recent conversation history and sender type.
- `AiTicketContexts`: structured memory per ticket. This should be the primary source for collected/missing data.
- `AiInteractionLogs`: audit of AI decisions and knowledge fragments used.
- `KnowledgeBaseArticles`: fixed institutional knowledge for RAG.
- `QualificationFormAnswers`: structured customer answers that can populate `AiTicketContexts`.
- `AiToolExecutions`: proof that a real action was executed or blocked.

### Medium Relevance

- `Contacts`: identity, group flag, and identifiers.
- `Queues`: queue-specific AI, business hours, distribution rules.
- `AiSettings`: model, prompt, behavior, allowed tools, handoff/auto-close policy.
- `UraFlows` and `UraOptions`: menu state, routing, qualification, and AI handoff/close behavior.
- `AiLeads`: extracted lead snapshot after context is known.
- `Tags` and `ContactTags`: classification and segmentation.

### Low Context Relevance But Operationally Important

- `Campaigns`, `CampaignContacts`, `CampaignRecipientLogs`
- `ScheduledMessages`, `ScheduledMessageExecutions`
- `SatisfactionSurveys`, `SatisfactionSurveyResponses`
- `AuditLogs`
- `Settings`
- `WppKeys`
- `SequelizeMeta`

## Current Context Implementation

Already implemented:

- `AiTicketContexts` table and model.
- `UpdateAiTicketContextService`.
- `BuildAiTicketContextTextService`.
- `DecideAiTicketActionService` includes structured context in the decision prompt.
- Qualification form answers marked `includeInAiContext` are merged into `AiTicketContexts.collectedData`.
- `AiToolService` uses `AiTicketContexts` to register leads and summarize for attendants.
- `AiToolExecutions` logs tool success, block, or error.

Still weak or missing:

- `AiTicketContexts.collectedData`, `missingData`, and `contradictions` are stored as `TEXT` containing JSON. PostgreSQL `JSONB` would be safer for validation and querying.
- There is no dedicated `AiTicketContextLogs` table for field-level memory changes.
- Contradictions are currently a string array, not structured objects with old/new values, source message, confidence, and status.
- `GenerateAiResponseService` still does not load `AiTicketContexts`; only the decision service does.
- Group participant identity is not stored in `Messages`, so group context cannot distinguish speakers reliably.
- Tool preconditions are partial. Calendar tools require start/end but do not yet validate all required scheduling fields against structured context.

## Recommended Context Strategy

Use these sources in this order when deciding the next AI action:

1. `Tickets`: current workflow and AI/URA state.
2. `AiTicketContexts`: structured memory, collected data, missing data, contradictions, next question.
3. `Messages`: recent ticket-scoped history, filtered by `aiStartedAt` when present.
4. `QualificationFormAnswers`: structured intake answers, merged into context.
5. `KnowledgeBaseArticles`: fixed business knowledge, never customer-specific memory.
6. `AiInteractionLogs`: audit/debug, not primary prompt memory.
7. `AiToolExecutions`: proof of real-world action outcome.

## Useful Query Patterns

All tables:

```sql
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;
```

Ticket context diagnosis:

```sql
select
  t.id,
  t.status,
  t."contactId",
  t."queueId",
  t."aiActive",
  t."aiStartedAt",
  t."lastAiIntent",
  t."lastAiAction",
  t."lastAiExpectedReply",
  t."aiInteractionCount",
  c.summary as context_summary,
  c."collectedData",
  c."missingData",
  c.contradictions,
  c."nextQuestion"
from "Tickets" t
left join "AiTicketContexts" c on c."ticketId" = t.id
where t.id = :ticket_id;
```

Messages for one ticket:

```sql
select id, "createdAt", "fromMe", "senderType", body
from "Messages"
where "ticketId" = :ticket_id
order by "createdAt" asc;
```

AI logs for one ticket:

```sql
select id, "createdAt", status, intent, action, "decisionReason",
       "knowledgeIds", "knowledgeTitles", "knowledgeScores"
from "AiInteractionLogs"
where "ticketId" = :ticket_id
order by "createdAt" asc;
```

Tool executions for one ticket:

```sql
select id, "createdAt", "toolName", status, "errorMessage"
from "AiToolExecutions"
where "ticketId" = :ticket_id
order by "createdAt" asc;
```

Qualification answers included in AI context:

```sql
select a.key, a.label, a.value, a."rawValue", a."optionLabel"
from "QualificationFormAnswers" a
join "QualificationFormResponses" r on r.id = a."responseId"
where r."ticketId" = :ticket_id
  and a."includeInAiContext" = true
order by a.id;
```

## Safety Notes

Avoid broad dumps of:

- `Settings.value`
- `AiSettings.apiKey`, `systemPrompt`, `behaviorPrompt`, `baseUrl`
- `AiCalendarConnections.accessToken`, `refreshToken`
- `Messages.body` unless scoped to one ticket
- `KnowledgeBaseArticles.content`, `contentHtml` unless explicitly debugging RAG
- `Contacts.number`, `Contacts.email`, `lid` unless necessary
- `WppKeys.value`
- `AuditLogs.beforeData` and `afterData`
- `AiToolExecutions.input` and `output` when they may contain personal data
