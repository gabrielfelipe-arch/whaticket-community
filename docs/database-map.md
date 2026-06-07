# Database Map

Snapshot: 2026-06-07
Database: `whaticket_pg`

This is a sanitized operational map. It intentionally avoids secret values, API keys,
full messages, contact details, settings values, and knowledge-base article content.

## High-Level Domains

- Core atendimento: `Tickets`, `Messages`, `Contacts`, `Users`, `Queues`, `Whatsapps`
- IA: `AiSettings`, `AiInteractionLogs`, `KnowledgeBaseArticles`, `AiTaggerHistories`
- URA: `UraFlows`, `UraOptions`
- Atendimento and routing controls: `QueueDistributionLogs`, `UserQueues`, `WhatsappQueues`
- Classification and closure: `Tags`, `ContactTags`, `TicketCategories`, `ClosingReasons`
- Campaigns and schedules: `Campaigns`, `CampaignContacts`, `CampaignRecipientLogs`, `ScheduledMessages`, `ScheduledMessageExecutions`
- Satisfaction and audit: `SatisfactionSurveys`, `SatisfactionSurveyResponses`, `AuditLogs`
- Admin/system: `Settings`, `SequelizeMeta`, `WppKeys`, `QuickAnswers`, `ContactCustomFields`

## Current Volumetry

| Table | Estimated rows | Size |
|---|---:|---:|
| Contacts | 1392 | 408 kB |
| Messages | 287 | 152 kB |
| AiInteractionLogs | 92 | 312 kB |
| QueueDistributionLogs | 87 | 64 kB |
| SequelizeMeta | 77 | 24 kB |
| AuditLogs | 43 | 248 kB |
| Settings | 28 | 32 kB |
| Tickets | 17 | 72 kB |
| UserQueues | 6 | 24 kB |
| Users | 3 | 48 kB |
| Tags | 2 | 48 kB |
| TicketCategories | 2 | 32 kB |
| Queues | 2 | 64 kB |
| WhatsappQueues | 2 | 24 kB |
| AiSettings | 1 | 80 kB |
| ClosingReasons | 1 | 32 kB |
| KnowledgeBaseArticles | 1 | 136 kB |
| UraFlows | 1 | 32 kB |
| UraOptions | 1 | 32 kB |
| Whatsapps | 1 | 48 kB |
| Empty/near-empty operational tables | 0 | Campaigns, scheduled messages, surveys, quick answers, custom fields, WppKeys |

## Current Operational Aggregates

Tickets:

| Status | Count |
|---|---:|
| closed | 16 |
| pending | 1 |

Messages by sender:

| Sender type | Count |
|---|---:|
| customer | 118 |
| ura | 56 |
| human | 55 |
| ai | 51 |
| system | 7 |

Queues:

| Queue | Count |
|---|---:|
| Fila IA | 1 |
| Suporte | 1 |

## Main Relationships

### Tickets

`Tickets` is the central workflow table.

Important foreign keys:

- `contactId` -> `Contacts.id`
- `userId` -> `Users.id`
- `queueId` -> `Queues.id`
- `whatsappId` -> `Whatsapps.id`
- `aiSettingId` -> `AiSettings.id`
- `uraFlowId` -> `UraFlows.id`
- `currentUraOptionId` -> `UraOptions.id`
- `categoryId` -> `TicketCategories.id`
- `closingReasonId` -> `ClosingReasons.id`

Important IA/URA state fields:

- `aiActive`, `aiHandled`, `aiStartedAt`, `aiFinishedAt`
- `aiHumanHandoffAt`, `aiHumanHandoffQueueId`, `aiHumanHandoffMessage`
- `lastAiIntent`, `lastAiAction`, `lastAiDecisionReason`
- `lastAiMessage`, `lastAiExpectedReply`, `lastAiKnowledgeIds`
- `aiInteractionCount`, `aiConversationSummary`
- `uraActive`, `uraFlowId`, `currentUraOptionId`, `uraInvalidAttempts`
- `queueEnteredAt`, `queuePositionMessageSentAt`

### Messages

`Messages` belongs to `Tickets` and optionally to `Contacts`.

Important fields:

- `ticketId` -> `Tickets.id`
- `contactId` -> `Contacts.id`
- `quotedMsgId` -> `Messages.id`
- `senderType`: `customer`, `ai`, `human`, `system`, `ura`
- `fromMe`, `body`, `mediaType`, `mediaUrl`, `ack`, `read`

### IA

`AiSettings` stores provider/model and behavior configuration. Sensitive fields:

- `apiKey`
- `systemPrompt`
- `behaviorPrompt`
- `baseUrl`

Do not dump those values casually.

`AiInteractionLogs` stores decision logs:

- `aiSettingId` -> `AiSettings.id`
- `ticketId` -> `Tickets.id`
- decision fields: `intent`, `action`, `decisionReason`
- raw context/response fields: `userMessage`, `aiResponse`
- RAG metadata: `knowledgeIds`, `knowledgeTitles`, `knowledgeScores`

`KnowledgeBaseArticles` stores RAG content and has a Portuguese full-text GIN index:

- `KnowledgeBaseArticles_fts_idx`

Do not dump article content unless explicitly needed.

### URA

`UraFlows` defines a menu flow and fallback behavior.

`UraOptions` defines selectable options:

- `flowId` -> `UraFlows.id`
- `targetQueueId` -> `Queues.id`
- `aiHumanHandoffQueueId` -> `Queues.id`
- `parentOptionId` -> `UraOptions.id`
- `closingReasonId` -> `ClosingReasons.id`

Key behavior:

- `action` can route, start IA, close, etc.
- IA fallback can be configured per option through `aiHumanHandoff*`.
- Auto-close can be configured per flow/option.

### Queues And Users

`Queues` can enable IA:

- `useAI`
- `aiSettingId` -> `AiSettings.id`
- distribution fields: `distributionMode`, `maxActiveTicketsPerUser`, `balanceAction`, `overflowAction`, `lastAssignedUserId`

`UserQueues` links attendants to queues:

- `userId` -> `Users.id`
- `queueId` -> `Queues.id`

`WhatsappQueues` links WhatsApp connections to queues:

- `whatsappId` -> `Whatsapps.id`
- `queueId` -> `Queues.id`

### Contacts And Tags

`Contacts` has unique indexes on `number` and `lid`.

`Tags` has unique `name`.

`ContactTags` is the many-to-many link:

- `contactId` -> `Contacts.id`
- `tagId` -> `Tags.id`
- unique index on (`contactId`, `tagId`)

### Campaigns And Schedules

Campaign flow:

- `Campaigns` -> `CampaignContacts` -> `CampaignRecipientLogs`
- campaign and logs can reference `Contacts` and `Whatsapps`

Scheduled flow:

- `ScheduledMessages` -> `ScheduledMessageExecutions`
- supports recurrence, filters by tags, media, business-hours behavior, retry status

## Useful Query Patterns

Latest ticket diagnosis:

```sql
select
  t.id,
  t.status,
  t."lastMessage",
  t."contactId",
  c.name as contact_name,
  t."queueId",
  q.name as queue_name,
  t."aiActive",
  t."aiHandled",
  t."aiHumanHandoffAt",
  t."lastAiIntent",
  t."lastAiAction",
  t."lastAiDecisionReason",
  t."aiInteractionCount",
  t."createdAt",
  t."updatedAt"
from "Tickets" t
left join "Contacts" c on c.id = t."contactId"
left join "Queues" q on q.id = t."queueId"
order by t."updatedAt" desc
limit 1;
```

Messages for a ticket:

```sql
select id, "createdAt", "fromMe", "senderType", body
from "Messages"
where "ticketId" = :ticket_id
order by "createdAt" asc;
```

IA logs for a ticket:

```sql
select id, "createdAt", status, intent, action, "decisionReason",
       "knowledgeIds", "knowledgeTitles", "knowledgeScores"
from "AiInteractionLogs"
where "ticketId" = :ticket_id
order by "createdAt" asc;
```

URA option behavior:

```sql
select
  uo.id,
  uo."flowId",
  uf.name as flow_name,
  uo."optionKey",
  uo.title,
  uo.action,
  uo."targetQueueId",
  tq.name as target_queue,
  uo."aiHumanHandoffEnabled",
  uo."aiHumanHandoffQueueId",
  hq.name as handoff_queue
from "UraOptions" uo
left join "UraFlows" uf on uf.id = uo."flowId"
left join "Queues" tq on tq.id = uo."targetQueueId"
left join "Queues" hq on hq.id = uo."aiHumanHandoffQueueId"
order by uo."flowId", uo."order", uo.id;
```

## Safety Notes

Avoid broad dumps of:

- `Settings.value`
- `AiSettings.apiKey`, `systemPrompt`, `behaviorPrompt`, `baseUrl`
- `Messages.body` unless scoped to one ticket
- `KnowledgeBaseArticles.content` unless explicitly debugging RAG
- `Contacts.number`, `Contacts.email` unless necessary
- `WppKeys.value`
- `AuditLogs.beforeData` and `afterData`

