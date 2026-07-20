# Rocket Service - Inventario Do Schema Real PostgreSQL

Gerado em: 2026-07-18

Fonte: banco local `whaticket_pg`, schema `public`, via `information_schema` e `pg_catalog`. Este arquivo contem somente estrutura, sem dados de clientes, mensagens, tokens ou configuracoes.

Nota: as tabelas operacionais de Agenda (`CalendarBooks`, `CalendarEvents`, `CalendarEventTypes`, `CalendarBlocks`, `CalendarEventParticipants`, `CalendarEventReminders`, `CalendarReminderTemplates`) podem existir no Postgres local como legado, mas a funcionalidade foi removida/desconectada do backend e frontend em 2026-07-18. Nao recriar fluxo nem apagar dados sem decisao explicita.

Total de tabelas: 57

## `AiCalendarConnections`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"AiCalendarConnections_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `provider` | `character varying(255)` | NO | `` |
| 4 | `calendarId` | `character varying(255)` | YES | `` |
| 5 | `userPrincipalName` | `character varying(255)` | YES | `` |
| 6 | `accessToken` | `text / text` | YES | `` |
| 7 | `refreshToken` | `text / text` | YES | `` |
| 8 | `tokenExpiresAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 9 | `timezone` | `character varying(255)` | NO | `'America/Sao_Paulo'::character varying` |
| 10 | `active` | `boolean / bool` | NO | `false` |
| 11 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 12 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 13 | `companyId` | `integer(32,0)` | YES | `` |
| 14 | `createdByUserId` | `integer(32,0)` | YES | `` |
| 15 | `googleAccountEmail` | `character varying(255)` | YES | `` |
| 16 | `calendarName` | `character varying(255)` | YES | `` |
| 17 | `accessTokenEncrypted` | `text / text` | YES | `` |
| 18 | `refreshTokenEncrypted` | `text / text` | YES | `` |
| 19 | `accessTokenExpiresAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 20 | `scopes` | `text / text` | YES | `` |
| 21 | `lastSyncAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 22 | `lastError` | `text / text` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34305_1_not_null` | CHECK | `` |  |
| `2200_34305_10_not_null` | CHECK | `` |  |
| `2200_34305_11_not_null` | CHECK | `` |  |
| `2200_34305_12_not_null` | CHECK | `` |  |
| `2200_34305_2_not_null` | CHECK | `` |  |
| `2200_34305_3_not_null` | CHECK | `` |  |
| `2200_34305_9_not_null` | CHECK | `` |  |
| `AiCalendarConnections_createdByUserId_fkey` | FOREIGN KEY | `createdByUserId` | `Users(id)` |
| `AiCalendarConnections_pkey` | PRIMARY KEY | `id` | `AiCalendarConnections(id)` |

## `AiInteractionLogs`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"AiInteractionLogs_id_seq"'::regclass)` |
| 2 | `aiSettingId` | `integer(32,0)` | YES | `` |
| 3 | `ticketId` | `integer(32,0)` | YES | `` |
| 4 | `provider` | `character varying(255)` | NO | `` |
| 5 | `modelUsed` | `character varying(255)` | NO | `` |
| 6 | `promptTokens` | `integer(32,0)` | NO | `0` |
| 7 | `completionTokens` | `integer(32,0)` | NO | `0` |
| 8 | `totalTokens` | `integer(32,0)` | NO | `0` |
| 9 | `status` | `character varying(255)` | NO | `'success'::character varying` |
| 10 | `errorMessage` | `text / text` | YES | `` |
| 11 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 12 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 13 | `intent` | `character varying(255)` | YES | `` |
| 14 | `action` | `character varying(255)` | YES | `` |
| 15 | `decisionReason` | `text / text` | YES | `` |
| 16 | `userMessage` | `text / text` | YES | `` |
| 17 | `aiResponse` | `text / text` | YES | `` |
| 18 | `knowledgeIds` | `text / text` | YES | `` |
| 19 | `knowledgeTitles` | `text / text` | YES | `` |
| 20 | `knowledgeScores` | `text / text` | YES | `` |
| 21 | `contextMessageCount` | `integer(32,0)` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34313_1_not_null` | CHECK | `` |  |
| `2200_34313_11_not_null` | CHECK | `` |  |
| `2200_34313_12_not_null` | CHECK | `` |  |
| `2200_34313_4_not_null` | CHECK | `` |  |
| `2200_34313_5_not_null` | CHECK | `` |  |
| `2200_34313_6_not_null` | CHECK | `` |  |
| `2200_34313_7_not_null` | CHECK | `` |  |
| `2200_34313_8_not_null` | CHECK | `` |  |
| `2200_34313_9_not_null` | CHECK | `` |  |
| `AiInteractionLogs_aiSettingId_fkey` | FOREIGN KEY | `aiSettingId` | `AiSettings(id)` |
| `AiInteractionLogs_ticketId_fkey` | FOREIGN KEY | `ticketId` | `Tickets(id)` |
| `AiInteractionLogs_pkey` | PRIMARY KEY | `id` | `AiInteractionLogs(id)` |

## `AiLeads`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"AiLeads_id_seq"'::regclass)` |
| 2 | `ticketId` | `integer(32,0)` | NO | `` |
| 3 | `contactId` | `integer(32,0)` | NO | `` |
| 4 | `whatsappId` | `integer(32,0)` | YES | `` |
| 5 | `queueId` | `integer(32,0)` | YES | `` |
| 6 | `aiSettingId` | `integer(32,0)` | YES | `` |
| 7 | `status` | `character varying(255)` | NO | `'novo'::character varying` |
| 8 | `source` | `character varying(255)` | NO | `'ai'::character varying` |
| 9 | `summary` | `text / text` | YES | `` |
| 10 | `collectedData` | `text / text` | YES | `` |
| 11 | `tagIds` | `text / text` | YES | `` |
| 12 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 13 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34323_1_not_null` | CHECK | `` |  |
| `2200_34323_12_not_null` | CHECK | `` |  |
| `2200_34323_13_not_null` | CHECK | `` |  |
| `2200_34323_2_not_null` | CHECK | `` |  |
| `2200_34323_3_not_null` | CHECK | `` |  |
| `2200_34323_7_not_null` | CHECK | `` |  |
| `2200_34323_8_not_null` | CHECK | `` |  |
| `AiLeads_aiSettingId_fkey` | FOREIGN KEY | `aiSettingId` | `AiSettings(id)` |
| `AiLeads_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `AiLeads_queueId_fkey` | FOREIGN KEY | `queueId` | `Queues(id)` |
| `AiLeads_ticketId_fkey` | FOREIGN KEY | `ticketId` | `Tickets(id)` |
| `AiLeads_whatsappId_fkey` | FOREIGN KEY | `whatsappId` | `Whatsapps(id)` |
| `AiLeads_pkey` | PRIMARY KEY | `id` | `AiLeads(id)` |

## `AiSettings`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"AiSettings_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `'Principal'::character varying` |
| 3 | `provider` | `character varying(255)` | NO | `'openai'::character varying` |
| 4 | `model` | `character varying(255)` | NO | `'gpt-4o-mini'::character varying` |
| 5 | `apiKey` | `text / text` | YES | `` |
| 6 | `systemPrompt` | `text / text` | YES | `` |
| 7 | `temperature` | `numeric(3,2)` | NO | `0.2` |
| 8 | `maxTokens` | `integer(32,0)` | NO | `800` |
| 9 | `transferToHumanOnFailure` | `boolean / bool` | NO | `true` |
| 10 | `active` | `boolean / bool` | NO | `false` |
| 11 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 12 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 13 | `humanHandoffEnabled` | `boolean / bool` | NO | `false` |
| 14 | `humanHandoffQueueId` | `integer(32,0)` | YES | `` |
| 15 | `humanHandoffMessage` | `text / text` | YES | `` |
| 16 | `humanHandoffAlertEnabled` | `boolean / bool` | NO | `false` |
| 17 | `humanHandoffAlertTo` | `character varying(255)` | YES | `` |
| 18 | `humanHandoffAlertMessage` | `text / text` | YES | `` |
| 19 | `autoCloseEnabled` | `boolean / bool` | NO | `false` |
| 20 | `autoCloseMinutes` | `integer(32,0)` | YES | `` |
| 21 | `autoCloseMessage` | `text / text` | YES | `` |
| 22 | `autoCloseReasonId` | `integer(32,0)` | YES | `` |
| 23 | `autoCloseOnlyIfNotHandedOff` | `boolean / bool` | NO | `true` |
| 24 | `aiQueueId` | `integer(32,0)` | YES | `` |
| 25 | `confirmationMaxAttempts` | `integer(32,0)` | NO | `2` |
| 26 | `confirmationFailureMessage` | `text / text` | YES | `` |
| 27 | `companyName` | `character varying(255)` | YES | `` |
| 28 | `serviceType` | `character varying(255)` | YES | `` |
| 29 | `behaviorPrompt` | `text / text` | YES | `` |
| 30 | `baseUrl` | `text / text` | YES | `` |
| 31 | `allowedTools` | `text / text` | YES | `` |
| 32 | `allowedTransferQueueIds` | `text / text` | YES | `` |
| 33 | `calendarConnectionId` | `integer(32,0)` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34331_1_not_null` | CHECK | `` |  |
| `2200_34331_10_not_null` | CHECK | `` |  |
| `2200_34331_11_not_null` | CHECK | `` |  |
| `2200_34331_12_not_null` | CHECK | `` |  |
| `2200_34331_13_not_null` | CHECK | `` |  |
| `2200_34331_16_not_null` | CHECK | `` |  |
| `2200_34331_19_not_null` | CHECK | `` |  |
| `2200_34331_2_not_null` | CHECK | `` |  |
| `2200_34331_23_not_null` | CHECK | `` |  |
| `2200_34331_25_not_null` | CHECK | `` |  |
| `2200_34331_3_not_null` | CHECK | `` |  |
| `2200_34331_4_not_null` | CHECK | `` |  |
| `2200_34331_7_not_null` | CHECK | `` |  |
| `2200_34331_8_not_null` | CHECK | `` |  |
| `2200_34331_9_not_null` | CHECK | `` |  |
| `AiSettings_calendarConnectionId_fkey` | FOREIGN KEY | `calendarConnectionId` | `AiCalendarConnections(id)` |
| `AiSettings_humanHandoffQueueId_fkey` | FOREIGN KEY | `humanHandoffQueueId` | `Queues(id)` |
| `AiSettings_pkey` | PRIMARY KEY | `id` | `AiSettings(id)` |

## `AiTaggerHistories`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"AiTaggerHistories_id_seq"'::regclass)` |
| 2 | `contactId` | `integer(32,0)` | NO | `` |
| 3 | `ticketId` | `integer(32,0)` | NO | `` |
| 4 | `appliedTagId` | `integer(32,0)` | YES | `` |
| 5 | `removedTagId` | `integer(32,0)` | YES | `` |
| 6 | `classifiedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 7 | `source` | `character varying(255)` | NO | `'IA'::character varying` |
| 8 | `configName` | `character varying(255)` | YES | `` |
| 9 | `summary` | `text / text` | YES | `` |
| 10 | `errorMessage` | `text / text` | YES | `` |
| 11 | `noTagApplied` | `boolean / bool` | NO | `false` |
| 12 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 13 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34349_1_not_null` | CHECK | `` |  |
| `2200_34349_11_not_null` | CHECK | `` |  |
| `2200_34349_12_not_null` | CHECK | `` |  |
| `2200_34349_13_not_null` | CHECK | `` |  |
| `2200_34349_2_not_null` | CHECK | `` |  |
| `2200_34349_3_not_null` | CHECK | `` |  |
| `2200_34349_6_not_null` | CHECK | `` |  |
| `2200_34349_7_not_null` | CHECK | `` |  |
| `AiTaggerHistories_appliedTagId_fkey` | FOREIGN KEY | `appliedTagId` | `Tags(id)` |
| `AiTaggerHistories_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `AiTaggerHistories_removedTagId_fkey` | FOREIGN KEY | `removedTagId` | `Tags(id)` |
| `AiTaggerHistories_ticketId_fkey` | FOREIGN KEY | `ticketId` | `Tickets(id)` |
| `AiTaggerHistories_pkey` | PRIMARY KEY | `id` | `AiTaggerHistories(id)` |

## `AiTicketContexts`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"AiTicketContexts_id_seq"'::regclass)` |
| 2 | `ticketId` | `integer(32,0)` | NO | `` |
| 3 | `summary` | `text / text` | YES | `` |
| 4 | `collectedData` | `text / text` | YES | `` |
| 5 | `missingData` | `text / text` | YES | `` |
| 6 | `contradictions` | `text / text` | YES | `` |
| 7 | `currentObjective` | `text / text` | YES | `` |
| 8 | `nextQuestion` | `text / text` | YES | `` |
| 9 | `lastSource` | `character varying(255)` | YES | `` |
| 10 | `lastAiIntent` | `character varying(255)` | YES | `` |
| 11 | `lastAiAction` | `character varying(255)` | YES | `` |
| 12 | `lastAiDecisionReason` | `text / text` | YES | `` |
| 13 | `lastKnowledgeIds` | `text / text` | YES | `` |
| 14 | `lastUpdatedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 15 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 16 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 17 | `operationalState` | `text / text` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34357_1_not_null` | CHECK | `` |  |
| `2200_34357_15_not_null` | CHECK | `` |  |
| `2200_34357_16_not_null` | CHECK | `` |  |
| `2200_34357_2_not_null` | CHECK | `` |  |
| `AiTicketContexts_ticketId_fkey` | FOREIGN KEY | `ticketId` | `Tickets(id)` |
| `AiTicketContexts_pkey` | PRIMARY KEY | `id` | `AiTicketContexts(id)` |
| `AiTicketContexts_ticketId_key` | UNIQUE | `ticketId` | `AiTicketContexts(ticketId)` |

### Indices

| Nome | Definicao |
|---|---|
| `AiTicketContexts_pkey` | `CREATE UNIQUE INDEX "AiTicketContexts_pkey" ON public."AiTicketContexts" USING btree (id)` |
| `AiTicketContexts_ticketId_key` | `CREATE UNIQUE INDEX "AiTicketContexts_ticketId_key" ON public."AiTicketContexts" USING btree ("ticketId")` |

## `AiToolExecutions`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"AiToolExecutions_id_seq"'::regclass)` |
| 2 | `ticketId` | `integer(32,0)` | YES | `` |
| 3 | `aiSettingId` | `integer(32,0)` | YES | `` |
| 4 | `toolName` | `character varying(255)` | NO | `` |
| 5 | `status` | `character varying(255)` | NO | `` |
| 6 | `input` | `text / text` | YES | `` |
| 7 | `output` | `text / text` | YES | `` |
| 8 | `errorMessage` | `text / text` | YES | `` |
| 9 | `executedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 10 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 11 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34363_1_not_null` | CHECK | `` |  |
| `2200_34363_10_not_null` | CHECK | `` |  |
| `2200_34363_11_not_null` | CHECK | `` |  |
| `2200_34363_4_not_null` | CHECK | `` |  |
| `2200_34363_5_not_null` | CHECK | `` |  |
| `2200_34363_9_not_null` | CHECK | `` |  |
| `AiToolExecutions_aiSettingId_fkey` | FOREIGN KEY | `aiSettingId` | `AiSettings(id)` |
| `AiToolExecutions_ticketId_fkey` | FOREIGN KEY | `ticketId` | `Tickets(id)` |
| `AiToolExecutions_pkey` | PRIMARY KEY | `id` | `AiToolExecutions(id)` |

## `AuditLogs`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"AuditLogs_id_seq"'::regclass)` |
| 2 | `userId` | `integer(32,0)` | YES | `` |
| 3 | `userName` | `character varying(255)` | YES | `` |
| 4 | `userProfile` | `character varying(255)` | YES | `` |
| 5 | `action` | `character varying(255)` | NO | `` |
| 6 | `resource` | `character varying(255)` | NO | `` |
| 7 | `resourceId` | `character varying(255)` | YES | `` |
| 8 | `method` | `character varying(255)` | YES | `` |
| 9 | `route` | `character varying(255)` | YES | `` |
| 10 | `ip` | `character varying(255)` | YES | `` |
| 11 | `beforeData` | `text / text` | YES | `` |
| 12 | `afterData` | `text / text` | YES | `` |
| 13 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 14 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34369_1_not_null` | CHECK | `` |  |
| `2200_34369_13_not_null` | CHECK | `` |  |
| `2200_34369_14_not_null` | CHECK | `` |  |
| `2200_34369_5_not_null` | CHECK | `` |  |
| `2200_34369_6_not_null` | CHECK | `` |  |
| `AuditLogs_userId_fkey` | FOREIGN KEY | `userId` | `Users(id)` |
| `AuditLogs_pkey` | PRIMARY KEY | `id` | `AuditLogs(id)` |

## `CalendarBooks`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CalendarBooks_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `type` | `character varying(255)` | NO | `'custom'::character varying` |
| 4 | `color` | `character varying(255)` | NO | `'#2563EB'::character varying` |
| 5 | `description` | `text / text` | YES | `` |
| 6 | `queueId` | `integer(32,0)` | YES | `` |
| 7 | `defaultWhatsappId` | `integer(32,0)` | YES | `` |
| 8 | `dailyEventLimit` | `integer(32,0)` | YES | `` |
| 9 | `defaultDurationMinutes` | `integer(32,0)` | NO | `60` |
| 10 | `slotIntervalMinutes` | `integer(32,0)` | NO | `0` |
| 11 | `allowOverlaps` | `boolean / bool` | NO | `false` |
| 12 | `businessHours` | `jsonb / jsonb` | YES | `` |
| 13 | `summaryEnabled` | `boolean / bool` | NO | `false` |
| 14 | `summaryTime` | `character varying(255)` | YES | `` |
| 15 | `summaryDayOffset` | `integer(32,0)` | NO | `1` |
| 16 | `summaryContactIds` | `jsonb / jsonb` | YES | `` |
| 17 | `summaryMessageTemplate` | `text / text` | YES | `` |
| 18 | `active` | `boolean / bool` | NO | `true` |
| 19 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 20 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 21 | `defaultInvolvedContactIds` | `jsonb / jsonb` | YES | `` |
| 22 | `defaultNotificationContactIds` | `jsonb / jsonb` | YES | `` |
| 23 | `defaultReminderMessage` | `text / text` | YES | `` |
| 24 | `extraSlotsEnabled` | `boolean / bool` | NO | `false` |
| 25 | `extraDailyLimit` | `integer(32,0)` | YES | `` |
| 26 | `notifyOnCreate` | `boolean / bool` | NO | `true` |
| 27 | `notifyOnCancel` | `boolean / bool` | NO | `true` |
| 28 | `notifyOnReschedule` | `boolean / bool` | NO | `true` |
| 29 | `createNotificationTemplate` | `text / text` | YES | `` |
| 30 | `cancelNotificationTemplate` | `text / text` | YES | `` |
| 31 | `rescheduleNotificationTemplate` | `text / text` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_41142_1_not_null` | CHECK | `` |  |
| `2200_41142_10_not_null` | CHECK | `` |  |
| `2200_41142_11_not_null` | CHECK | `` |  |
| `2200_41142_13_not_null` | CHECK | `` |  |
| `2200_41142_15_not_null` | CHECK | `` |  |
| `2200_41142_18_not_null` | CHECK | `` |  |
| `2200_41142_19_not_null` | CHECK | `` |  |
| `2200_41142_2_not_null` | CHECK | `` |  |
| `2200_41142_20_not_null` | CHECK | `` |  |
| `2200_41142_24_not_null` | CHECK | `` |  |
| `2200_41142_26_not_null` | CHECK | `` |  |
| `2200_41142_27_not_null` | CHECK | `` |  |
| `2200_41142_28_not_null` | CHECK | `` |  |
| `2200_41142_3_not_null` | CHECK | `` |  |
| `2200_41142_4_not_null` | CHECK | `` |  |
| `2200_41142_9_not_null` | CHECK | `` |  |
| `CalendarBooks_defaultWhatsappId_fkey` | FOREIGN KEY | `defaultWhatsappId` | `Whatsapps(id)` |
| `CalendarBooks_queueId_fkey` | FOREIGN KEY | `queueId` | `Queues(id)` |
| `CalendarBooks_pkey` | PRIMARY KEY | `id` | `CalendarBooks(id)` |

## `CalendarEventParticipants`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CalendarEventParticipants_id_seq"'::regclass)` |
| 2 | `calendarEventId` | `integer(32,0)` | NO | `` |
| 3 | `contactId` | `integer(32,0)` | NO | `` |
| 4 | `role` | `character varying(255)` | NO | `'involved'::character varying` |
| 5 | `receiveReminders` | `boolean / bool` | NO | `true` |
| 6 | `receiveNotifications` | `boolean / bool` | NO | `true` |
| 7 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 8 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_41225_1_not_null` | CHECK | `` |  |
| `2200_41225_2_not_null` | CHECK | `` |  |
| `2200_41225_3_not_null` | CHECK | `` |  |
| `2200_41225_4_not_null` | CHECK | `` |  |
| `2200_41225_5_not_null` | CHECK | `` |  |
| `2200_41225_6_not_null` | CHECK | `` |  |
| `2200_41225_7_not_null` | CHECK | `` |  |
| `2200_41225_8_not_null` | CHECK | `` |  |
| `CalendarEventParticipants_calendarEventId_fkey` | FOREIGN KEY | `calendarEventId` | `CalendarEvents(id)` |
| `CalendarEventParticipants_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `CalendarEventParticipants_pkey` | PRIMARY KEY | `id` | `CalendarEventParticipants(id)` |

## `CalendarEventReminders`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CalendarEventReminders_id_seq"'::regclass)` |
| 2 | `calendarEventId` | `integer(32,0)` | YES | `` |
| 3 | `calendarBookId` | `integer(32,0)` | YES | `` |
| 4 | `contactId` | `integer(32,0)` | NO | `` |
| 5 | `scheduledMessageId` | `integer(32,0)` | YES | `` |
| 6 | `kind` | `character varying(255)` | NO | `'event_reminder'::character varying` |
| 7 | `offsetValue` | `integer(32,0)` | YES | `` |
| 8 | `offsetUnit` | `character varying(255)` | YES | `` |
| 9 | `scheduledAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 10 | `summaryDate` | `date / date` | YES | `` |
| 11 | `status` | `character varying(255)` | NO | `'scheduled'::character varying` |
| 12 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 13 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_41245_1_not_null` | CHECK | `` |  |
| `2200_41245_11_not_null` | CHECK | `` |  |
| `2200_41245_12_not_null` | CHECK | `` |  |
| `2200_41245_13_not_null` | CHECK | `` |  |
| `2200_41245_4_not_null` | CHECK | `` |  |
| `2200_41245_6_not_null` | CHECK | `` |  |
| `2200_41245_9_not_null` | CHECK | `` |  |
| `CalendarEventReminders_calendarBookId_fkey` | FOREIGN KEY | `calendarBookId` | `CalendarBooks(id)` |
| `CalendarEventReminders_calendarEventId_fkey` | FOREIGN KEY | `calendarEventId` | `CalendarEvents(id)` |
| `CalendarEventReminders_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `CalendarEventReminders_scheduledMessageId_fkey` | FOREIGN KEY | `scheduledMessageId` | `ScheduledMessages(id)` |
| `CalendarEventReminders_pkey` | PRIMARY KEY | `id` | `CalendarEventReminders(id)` |

## `CalendarEventTypes`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CalendarEventTypes_id_seq"'::regclass)` |
| 2 | `calendarBookId` | `integer(32,0)` | NO | `` |
| 3 | `name` | `character varying(255)` | NO | `` |
| 4 | `description` | `text / text` | YES | `` |
| 5 | `color` | `character varying(255)` | NO | `'#2563EB'::character varying` |
| 6 | `durationMinutes` | `integer(32,0)` | NO | `60` |
| 7 | `bufferBeforeMinutes` | `integer(32,0)` | NO | `0` |
| 8 | `bufferAfterMinutes` | `integer(32,0)` | NO | `0` |
| 9 | `capacity` | `integer(32,0)` | YES | `` |
| 10 | `location` | `character varying(255)` | YES | `` |
| 11 | `active` | `boolean / bool` | NO | `true` |
| 12 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 13 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `CalendarEventTypes_calendarBookId_fkey` | FOREIGN KEY | `calendarBookId` | `CalendarBooks(id)` |
| `CalendarEventTypes_pkey` | PRIMARY KEY | `id` | `CalendarEventTypes(id)` |

## `CalendarBlocks`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CalendarBlocks_id_seq"'::regclass)` |
| 2 | `calendarBookId` | `integer(32,0)` | NO | `` |
| 3 | `title` | `character varying(255)` | NO | `` |
| 4 | `reason` | `text / text` | YES | `` |
| 5 | `startAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `endAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 7 | `allDay` | `boolean / bool` | NO | `false` |
| 8 | `type` | `character varying(255)` | NO | `'blocked'::character varying` |
| 9 | `active` | `boolean / bool` | NO | `true` |
| 10 | `createdByUserId` | `integer(32,0)` | YES | `` |
| 11 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 12 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `CalendarBlocks_calendarBookId_fkey` | FOREIGN KEY | `calendarBookId` | `CalendarBooks(id)` |
| `CalendarBlocks_createdByUserId_fkey` | FOREIGN KEY | `createdByUserId` | `Users(id)` |
| `CalendarBlocks_pkey` | PRIMARY KEY | `id` | `CalendarBlocks(id)` |

## `CalendarEvents`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CalendarEvents_id_seq"'::regclass)` |
| 2 | `calendarBookId` | `integer(32,0)` | NO | `` |
| 3 | `contactId` | `integer(32,0)` | YES | `` |
| 4 | `ticketId` | `integer(32,0)` | YES | `` |
| 5 | `userId` | `integer(32,0)` | YES | `` |
| 6 | `queueId` | `integer(32,0)` | YES | `` |
| 7 | `whatsappId` | `integer(32,0)` | YES | `` |
| 8 | `title` | `character varying(255)` | NO | `` |
| 9 | `description` | `text / text` | YES | `` |
| 10 | `location` | `character varying(255)` | YES | `` |
| 11 | `notes` | `text / text` | YES | `` |
| 12 | `startAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 13 | `endAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 14 | `status` | `character varying(255)` | NO | `'scheduled'::character varying` |
| 15 | `createdByUserId` | `integer(32,0)` | YES | `` |
| 16 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 17 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 18 | `isExtraSlot` | `boolean / bool` | NO | `false` |
| 19 | `calendarEventTypeId` | `integer(32,0)` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_41180_1_not_null` | CHECK | `` |  |
| `2200_41180_12_not_null` | CHECK | `` |  |
| `2200_41180_13_not_null` | CHECK | `` |  |
| `2200_41180_14_not_null` | CHECK | `` |  |
| `2200_41180_16_not_null` | CHECK | `` |  |
| `2200_41180_17_not_null` | CHECK | `` |  |
| `2200_41180_18_not_null` | CHECK | `` |  |
| `2200_41180_2_not_null` | CHECK | `` |  |
| `2200_41180_8_not_null` | CHECK | `` |  |
| `CalendarEvents_calendarBookId_fkey` | FOREIGN KEY | `calendarBookId` | `CalendarBooks(id)` |
| `CalendarEvents_calendarEventTypeId_fkey` | FOREIGN KEY | `calendarEventTypeId` | `CalendarEventTypes(id)` |
| `CalendarEvents_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `CalendarEvents_createdByUserId_fkey` | FOREIGN KEY | `createdByUserId` | `Users(id)` |
| `CalendarEvents_queueId_fkey` | FOREIGN KEY | `queueId` | `Queues(id)` |
| `CalendarEvents_ticketId_fkey` | FOREIGN KEY | `ticketId` | `Tickets(id)` |
| `CalendarEvents_userId_fkey` | FOREIGN KEY | `userId` | `Users(id)` |
| `CalendarEvents_whatsappId_fkey` | FOREIGN KEY | `whatsappId` | `Whatsapps(id)` |
| `CalendarEvents_pkey` | PRIMARY KEY | `id` | `CalendarEvents(id)` |

## `CalendarReminderTemplates`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CalendarReminderTemplates_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `audience` | `character varying(255)` | NO | `'client'::character varying` |
| 4 | `message` | `text / text` | NO | `` |
| 5 | `active` | `boolean / bool` | NO | `true` |
| 6 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 7 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_41169_1_not_null` | CHECK | `` |  |
| `2200_41169_2_not_null` | CHECK | `` |  |
| `2200_41169_3_not_null` | CHECK | `` |  |
| `2200_41169_4_not_null` | CHECK | `` |  |
| `2200_41169_5_not_null` | CHECK | `` |  |
| `2200_41169_6_not_null` | CHECK | `` |  |
| `2200_41169_7_not_null` | CHECK | `` |  |
| `CalendarReminderTemplates_pkey` | PRIMARY KEY | `id` | `CalendarReminderTemplates(id)` |

## `CampaignContacts`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CampaignContacts_id_seq"'::regclass)` |
| 2 | `campaignId` | `integer(32,0)` | NO | `` |
| 3 | `contactId` | `integer(32,0)` | NO | `` |
| 4 | `status` | `character varying(255)` | NO | `'pending'::character varying` |
| 5 | `attempts` | `integer(32,0)` | NO | `0` |
| 6 | `sentAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 7 | `nextRunAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 8 | `errorMessage` | `text / text` | YES | `` |
| 9 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 10 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 11 | `lastAttemptAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 12 | `errorAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 13 | `providerResponse` | `text / text` | YES | `` |
| 14 | `messageId` | `character varying(255)` | YES | `` |
| 15 | `lockedAt` | `timestamp with time zone / timestamptz` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34375_1_not_null` | CHECK | `` |  |
| `2200_34375_10_not_null` | CHECK | `` |  |
| `2200_34375_2_not_null` | CHECK | `` |  |
| `2200_34375_3_not_null` | CHECK | `` |  |
| `2200_34375_4_not_null` | CHECK | `` |  |
| `2200_34375_5_not_null` | CHECK | `` |  |
| `2200_34375_9_not_null` | CHECK | `` |  |
| `CampaignContacts_campaignId_fkey` | FOREIGN KEY | `campaignId` | `Campaigns(id)` |
| `CampaignContacts_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `CampaignContacts_pkey` | PRIMARY KEY | `id` | `CampaignContacts(id)` |

## `CampaignRecipientLogs`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CampaignRecipientLogs_id_seq"'::regclass)` |
| 2 | `campaignId` | `integer(32,0)` | NO | `` |
| 3 | `campaignContactId` | `integer(32,0)` | YES | `` |
| 4 | `contactId` | `integer(32,0)` | YES | `` |
| 5 | `whatsappId` | `integer(32,0)` | YES | `` |
| 6 | `phoneNumber` | `character varying(255)` | YES | `` |
| 7 | `message` | `text / text` | YES | `` |
| 8 | `status` | `character varying(255)` | NO | `'pending'::character varying` |
| 9 | `attemptNumber` | `integer(32,0)` | NO | `0` |
| 10 | `attemptedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 11 | `sentAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 12 | `errorAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 13 | `errorMessage` | `text / text` | YES | `` |
| 14 | `providerResponse` | `text / text` | YES | `` |
| 15 | `messageId` | `character varying(255)` | YES | `` |
| 16 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 17 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34383_1_not_null` | CHECK | `` |  |
| `2200_34383_16_not_null` | CHECK | `` |  |
| `2200_34383_17_not_null` | CHECK | `` |  |
| `2200_34383_2_not_null` | CHECK | `` |  |
| `2200_34383_8_not_null` | CHECK | `` |  |
| `2200_34383_9_not_null` | CHECK | `` |  |
| `CampaignRecipientLogs_campaignContactId_fkey` | FOREIGN KEY | `campaignContactId` | `CampaignContacts(id)` |
| `CampaignRecipientLogs_campaignId_fkey` | FOREIGN KEY | `campaignId` | `Campaigns(id)` |
| `CampaignRecipientLogs_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `CampaignRecipientLogs_whatsappId_fkey` | FOREIGN KEY | `whatsappId` | `Whatsapps(id)` |
| `CampaignRecipientLogs_pkey` | PRIMARY KEY | `id` | `CampaignRecipientLogs(id)` |

## `Campaigns`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"Campaigns_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `message` | `text / text` | NO | `` |
| 4 | `audience` | `character varying(255)` | NO | `'contacts'::character varying` |
| 5 | `status` | `character varying(255)` | NO | `'draft'::character varying` |
| 6 | `intervalSeconds` | `integer(32,0)` | NO | `30` |
| 7 | `pauseAfter` | `integer(32,0)` | NO | `20` |
| 8 | `pauseSeconds` | `integer(32,0)` | NO | `300` |
| 9 | `whatsappId` | `integer(32,0)` | YES | `` |
| 10 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 11 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 12 | `intervalPattern` | `character varying(255)` | YES | `` |
| 13 | `mediaUrl` | `character varying(255)` | YES | `` |
| 14 | `mediaType` | `character varying(255)` | YES | `` |
| 15 | `mediaName` | `character varying(255)` | YES | `` |
| 16 | `startedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 17 | `pausedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 18 | `canceledAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 19 | `completedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 20 | `userId` | `integer(32,0)` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34391_1_not_null` | CHECK | `` |  |
| `2200_34391_10_not_null` | CHECK | `` |  |
| `2200_34391_11_not_null` | CHECK | `` |  |
| `2200_34391_2_not_null` | CHECK | `` |  |
| `2200_34391_3_not_null` | CHECK | `` |  |
| `2200_34391_4_not_null` | CHECK | `` |  |
| `2200_34391_5_not_null` | CHECK | `` |  |
| `2200_34391_6_not_null` | CHECK | `` |  |
| `2200_34391_7_not_null` | CHECK | `` |  |
| `2200_34391_8_not_null` | CHECK | `` |  |
| `Campaigns_userId_fkey` | FOREIGN KEY | `userId` | `Users(id)` |
| `Campaigns_whatsappId_fkey` | FOREIGN KEY | `whatsappId` | `Whatsapps(id)` |
| `Campaigns_pkey` | PRIMARY KEY | `id` | `Campaigns(id)` |

## `ClosingReasons`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"ClosingReasons_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `description` | `text / text` | YES | `` |
| 4 | `farewellMessage` | `text / text` | YES | `` |
| 5 | `sendFarewellMessage` | `boolean / bool` | NO | `false` |
| 6 | `active` | `boolean / bool` | NO | `true` |
| 7 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 8 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34402_1_not_null` | CHECK | `` |  |
| `2200_34402_2_not_null` | CHECK | `` |  |
| `2200_34402_5_not_null` | CHECK | `` |  |
| `2200_34402_6_not_null` | CHECK | `` |  |
| `2200_34402_7_not_null` | CHECK | `` |  |
| `2200_34402_8_not_null` | CHECK | `` |  |
| `ClosingReasons_pkey` | PRIMARY KEY | `id` | `ClosingReasons(id)` |

## `CommercialIncludedItems`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CommercialIncludedItems_id_seq"'::regclass)` |
| 2 | `commercialServiceId` | `integer(32,0)` | NO | `` |
| 3 | `label` | `character varying(255)` | NO | `` |
| 4 | `description` | `text / text` | YES | `` |
| 5 | `sortOrder` | `integer(32,0)` | NO | `0` |
| 6 | `active` | `boolean / bool` | NO | `true` |
| 7 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 8 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34410_1_not_null` | CHECK | `` |  |
| `2200_34410_2_not_null` | CHECK | `` |  |
| `2200_34410_3_not_null` | CHECK | `` |  |
| `2200_34410_5_not_null` | CHECK | `` |  |
| `2200_34410_6_not_null` | CHECK | `` |  |
| `2200_34410_7_not_null` | CHECK | `` |  |
| `2200_34410_8_not_null` | CHECK | `` |  |
| `CommercialIncludedItems_commercialServiceId_fkey` | FOREIGN KEY | `commercialServiceId` | `CommercialServices(id)` |
| `CommercialIncludedItems_pkey` | PRIMARY KEY | `id` | `CommercialIncludedItems(id)` |

## `CommercialPriceRules`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CommercialPriceRules_id_seq"'::regclass)` |
| 2 | `commercialServiceId` | `integer(32,0)` | NO | `` |
| 3 | `name` | `character varying(255)` | NO | `` |
| 4 | `code` | `character varying(255)` | YES | `` |
| 5 | `ruleType` | `character varying(255)` | NO | `` |
| 6 | `mode` | `character varying(255)` | YES | `` |
| 7 | `quantity` | `numeric(12,2)` | YES | `` |
| 8 | `quantityMin` | `numeric(12,2)` | YES | `` |
| 9 | `quantityMax` | `numeric(12,2)` | YES | `` |
| 10 | `unitPrice` | `numeric(12,2)` | YES | `` |
| 11 | `totalPrice` | `numeric(12,2)` | YES | `` |
| 12 | `currency` | `character varying(255)` | NO | `'BRL'::character varying` |
| 13 | `minCommitmentMonths` | `integer(32,0)` | YES | `` |
| 14 | `metadata` | `text / text` | YES | `` |
| 15 | `sortOrder` | `integer(32,0)` | NO | `0` |
| 16 | `active` | `boolean / bool` | NO | `true` |
| 17 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 18 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34418_1_not_null` | CHECK | `` |  |
| `2200_34418_12_not_null` | CHECK | `` |  |
| `2200_34418_15_not_null` | CHECK | `` |  |
| `2200_34418_16_not_null` | CHECK | `` |  |
| `2200_34418_17_not_null` | CHECK | `` |  |
| `2200_34418_18_not_null` | CHECK | `` |  |
| `2200_34418_2_not_null` | CHECK | `` |  |
| `2200_34418_3_not_null` | CHECK | `` |  |
| `2200_34418_5_not_null` | CHECK | `` |  |
| `CommercialPriceRules_commercialServiceId_fkey` | FOREIGN KEY | `commercialServiceId` | `CommercialServices(id)` |
| `CommercialPriceRules_pkey` | PRIMARY KEY | `id` | `CommercialPriceRules(id)` |

## `CommercialQuoteSimulations`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CommercialQuoteSimulations_id_seq"'::regclass)` |
| 2 | `ticketId` | `integer(32,0)` | YES | `` |
| 3 | `contactId` | `integer(32,0)` | YES | `` |
| 4 | `aiSettingId` | `integer(32,0)` | YES | `` |
| 5 | `commercialServiceId` | `integer(32,0)` | YES | `` |
| 6 | `status` | `character varying(255)` | NO | `'success'::character varying` |
| 7 | `input` | `text / text` | YES | `` |
| 8 | `result` | `text / text` | YES | `` |
| 9 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 10 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34427_1_not_null` | CHECK | `` |  |
| `2200_34427_10_not_null` | CHECK | `` |  |
| `2200_34427_6_not_null` | CHECK | `` |  |
| `2200_34427_9_not_null` | CHECK | `` |  |
| `CommercialQuoteSimulations_aiSettingId_fkey` | FOREIGN KEY | `aiSettingId` | `AiSettings(id)` |
| `CommercialQuoteSimulations_commercialServiceId_fkey` | FOREIGN KEY | `commercialServiceId` | `CommercialServices(id)` |
| `CommercialQuoteSimulations_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `CommercialQuoteSimulations_ticketId_fkey` | FOREIGN KEY | `ticketId` | `Tickets(id)` |
| `CommercialQuoteSimulations_pkey` | PRIMARY KEY | `id` | `CommercialQuoteSimulations(id)` |

## `CommercialServices`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"CommercialServices_id_seq"'::regclass)` |
| 2 | `aiSettingId` | `integer(32,0)` | YES | `` |
| 3 | `name` | `character varying(255)` | NO | `` |
| 4 | `slug` | `character varying(255)` | YES | `` |
| 5 | `description` | `text / text` | YES | `` |
| 6 | `category` | `character varying(255)` | YES | `` |
| 7 | `unitLabel` | `character varying(255)` | YES | `` |
| 8 | `capacityMin` | `integer(32,0)` | YES | `` |
| 9 | `capacityMax` | `integer(32,0)` | YES | `` |
| 10 | `metadata` | `text / text` | YES | `` |
| 11 | `active` | `boolean / bool` | NO | `true` |
| 12 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 13 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34434_1_not_null` | CHECK | `` |  |
| `2200_34434_11_not_null` | CHECK | `` |  |
| `2200_34434_12_not_null` | CHECK | `` |  |
| `2200_34434_13_not_null` | CHECK | `` |  |
| `2200_34434_3_not_null` | CHECK | `` |  |
| `CommercialServices_aiSettingId_fkey` | FOREIGN KEY | `aiSettingId` | `AiSettings(id)` |
| `CommercialServices_pkey` | PRIMARY KEY | `id` | `CommercialServices(id)` |

## `ContactCustomFields`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"ContactCustomFields_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `value` | `character varying(255)` | NO | `` |
| 4 | `contactId` | `integer(32,0)` | NO | `` |
| 5 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34441_1_not_null` | CHECK | `` |  |
| `2200_34441_2_not_null` | CHECK | `` |  |
| `2200_34441_3_not_null` | CHECK | `` |  |
| `2200_34441_4_not_null` | CHECK | `` |  |
| `2200_34441_5_not_null` | CHECK | `` |  |
| `2200_34441_6_not_null` | CHECK | `` |  |
| `ContactCustomFields_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `ContactCustomFields_pkey` | PRIMARY KEY | `id` | `ContactCustomFields(id)` |

## `Contacts`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"Contacts_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `number` | `character varying(255)` | YES | `` |
| 4 | `profilePicUrl` | `character varying(255)` | YES | `` |
| 5 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 7 | `email` | `character varying(255)` | NO | `''::character varying` |
| 8 | `isGroup` | `boolean / bool` | NO | `false` |
| 9 | `lid` | `character varying(255)` | YES | `NULL::character varying` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34451_1_not_null` | CHECK | `` |  |
| `2200_34451_2_not_null` | CHECK | `` |  |
| `2200_34451_5_not_null` | CHECK | `` |  |
| `2200_34451_6_not_null` | CHECK | `` |  |
| `2200_34451_7_not_null` | CHECK | `` |  |
| `2200_34451_8_not_null` | CHECK | `` |  |
| `Contacts_pkey` | PRIMARY KEY | `id` | `Contacts(id)` |
| `Contacts_lid_key` | UNIQUE | `lid` | `Contacts(lid)` |
| `Contacts_number_key` | UNIQUE | `number` | `Contacts(number)` |
| `Contacts_number_key1` | UNIQUE | `number` | `Contacts(number)` |

### Indices

| Nome | Definicao |
|---|---|
| `Contacts_lid_key` | `CREATE UNIQUE INDEX "Contacts_lid_key" ON public."Contacts" USING btree (lid)` |
| `Contacts_number_key` | `CREATE UNIQUE INDEX "Contacts_number_key" ON public."Contacts" USING btree (number)` |
| `Contacts_number_key1` | `CREATE UNIQUE INDEX "Contacts_number_key1" ON public."Contacts" USING btree (number)` |
| `Contacts_pkey` | `CREATE UNIQUE INDEX "Contacts_pkey" ON public."Contacts" USING btree (id)` |

## `ContactTags`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"ContactTags_id_seq"'::regclass)` |
| 2 | `contactId` | `integer(32,0)` | NO | `` |
| 3 | `tagId` | `integer(32,0)` | NO | `` |
| 4 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 5 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `appliedAt` | `timestamp with time zone / timestamptz` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34447_1_not_null` | CHECK | `` |  |
| `2200_34447_2_not_null` | CHECK | `` |  |
| `2200_34447_3_not_null` | CHECK | `` |  |
| `2200_34447_4_not_null` | CHECK | `` |  |
| `2200_34447_5_not_null` | CHECK | `` |  |
| `ContactTags_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `ContactTags_tagId_fkey` | FOREIGN KEY | `tagId` | `Tags(id)` |
| `ContactTags_pkey` | PRIMARY KEY | `id` | `ContactTags(id)` |

### Indices

| Nome | Definicao |
|---|---|
| `ContactTags_contactId_tagId_unique` | `CREATE UNIQUE INDEX "ContactTags_contactId_tagId_unique" ON public."ContactTags" USING btree ("contactId", "tagId")` |
| `ContactTags_pkey` | `CREATE UNIQUE INDEX "ContactTags_pkey" ON public."ContactTags" USING btree (id)` |

## `GlpiCategories`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"GlpiCategories_id_seq"'::regclass)` |
| 2 | `glpiId` | `integer(32,0)` | NO | `` |
| 3 | `name` | `character varying(255)` | NO | `` |
| 4 | `completeName` | `character varying(255)` | YES | `` |
| 5 | `active` | `boolean / bool` | NO | `true` |
| 6 | `rawData` | `text / text` | YES | `` |
| 7 | `lastSyncAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 8 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 9 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 10 | `glpiConfigurationId` | `integer(32,0)` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_35288_1_not_null` | CHECK | `` |  |
| `2200_35288_2_not_null` | CHECK | `` |  |
| `2200_35288_3_not_null` | CHECK | `` |  |
| `2200_35288_5_not_null` | CHECK | `` |  |
| `2200_35288_8_not_null` | CHECK | `` |  |
| `2200_35288_9_not_null` | CHECK | `` |  |
| `GlpiCategories_glpiConfigurationId_fkey` | FOREIGN KEY | `glpiConfigurationId` | `GlpiConfigurations(id)` |
| `GlpiCategories_pkey` | PRIMARY KEY | `id` | `GlpiCategories(id)` |

### Indices

| Nome | Definicao |
|---|---|
| `GlpiCategories_configuration_glpiId_unique` | `CREATE UNIQUE INDEX "GlpiCategories_configuration_glpiId_unique" ON public."GlpiCategories" USING btree ("glpiConfigurationId", "glpiId")` |
| `GlpiCategories_pkey` | `CREATE UNIQUE INDEX "GlpiCategories_pkey" ON public."GlpiCategories" USING btree (id)` |

## `GlpiConfigurations`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"GlpiConfigurations_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `active` | `boolean / bool` | NO | `true` |
| 4 | `settings` | `text / text` | NO | `'{}'::text` |
| 5 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_35349_1_not_null` | CHECK | `` |  |
| `2200_35349_2_not_null` | CHECK | `` |  |
| `2200_35349_3_not_null` | CHECK | `` |  |
| `2200_35349_4_not_null` | CHECK | `` |  |
| `2200_35349_5_not_null` | CHECK | `` |  |
| `2200_35349_6_not_null` | CHECK | `` |  |
| `GlpiConfigurations_pkey` | PRIMARY KEY | `id` | `GlpiConfigurations(id)` |

## `GlpiConfigurationWhatsapps`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"GlpiConfigurationWhatsapps_id_seq"'::regclass)` |
| 2 | `glpiConfigurationId` | `integer(32,0)` | NO | `` |
| 3 | `whatsappId` | `integer(32,0)` | NO | `` |
| 4 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 5 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_35360_1_not_null` | CHECK | `` |  |
| `2200_35360_2_not_null` | CHECK | `` |  |
| `2200_35360_3_not_null` | CHECK | `` |  |
| `2200_35360_4_not_null` | CHECK | `` |  |
| `2200_35360_5_not_null` | CHECK | `` |  |
| `GlpiConfigurationWhatsapps_glpiConfigurationId_fkey` | FOREIGN KEY | `glpiConfigurationId` | `GlpiConfigurations(id)` |
| `GlpiConfigurationWhatsapps_whatsappId_fkey` | FOREIGN KEY | `whatsappId` | `Whatsapps(id)` |
| `GlpiConfigurationWhatsapps_pkey` | PRIMARY KEY | `id` | `GlpiConfigurationWhatsapps(id)` |

### Indices

| Nome | Definicao |
|---|---|
| `GlpiConfigurationWhatsapps_pkey` | `CREATE UNIQUE INDEX "GlpiConfigurationWhatsapps_pkey" ON public."GlpiConfigurationWhatsapps" USING btree (id)` |
| `GlpiConfigurationWhatsapps_whatsappId_unique` | `CREATE UNIQUE INDEX "GlpiConfigurationWhatsapps_whatsappId_unique" ON public."GlpiConfigurationWhatsapps" USING btree ("whatsappId")` |

## `GlpiEntities`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"GlpiEntities_id_seq"'::regclass)` |
| 2 | `glpiId` | `integer(32,0)` | NO | `` |
| 3 | `name` | `character varying(255)` | NO | `` |
| 4 | `completeName` | `character varying(255)` | YES | `` |
| 5 | `active` | `boolean / bool` | NO | `true` |
| 6 | `rawData` | `text / text` | YES | `` |
| 7 | `lastSyncAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 8 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 9 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 10 | `glpiConfigurationId` | `integer(32,0)` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_35276_1_not_null` | CHECK | `` |  |
| `2200_35276_2_not_null` | CHECK | `` |  |
| `2200_35276_3_not_null` | CHECK | `` |  |
| `2200_35276_5_not_null` | CHECK | `` |  |
| `2200_35276_8_not_null` | CHECK | `` |  |
| `2200_35276_9_not_null` | CHECK | `` |  |
| `GlpiEntities_glpiConfigurationId_fkey` | FOREIGN KEY | `glpiConfigurationId` | `GlpiConfigurations(id)` |
| `GlpiEntities_pkey` | PRIMARY KEY | `id` | `GlpiEntities(id)` |

### Indices

| Nome | Definicao |
|---|---|
| `GlpiEntities_configuration_glpiId_unique` | `CREATE UNIQUE INDEX "GlpiEntities_configuration_glpiId_unique" ON public."GlpiEntities" USING btree ("glpiConfigurationId", "glpiId")` |
| `GlpiEntities_pkey` | `CREATE UNIQUE INDEX "GlpiEntities_pkey" ON public."GlpiEntities" USING btree (id)` |

## `GlpiLocations`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"GlpiLocations_id_seq"'::regclass)` |
| 2 | `glpiId` | `integer(32,0)` | NO | `` |
| 3 | `name` | `character varying(255)` | NO | `` |
| 4 | `completeName` | `character varying(255)` | YES | `` |
| 5 | `active` | `boolean / bool` | NO | `true` |
| 6 | `rawData` | `text / text` | YES | `` |
| 7 | `lastSyncAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 8 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 9 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 10 | `entityId` | `integer(32,0)` | YES | `` |
| 11 | `glpiConfigurationId` | `integer(32,0)` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_35330_1_not_null` | CHECK | `` |  |
| `2200_35330_2_not_null` | CHECK | `` |  |
| `2200_35330_3_not_null` | CHECK | `` |  |
| `2200_35330_5_not_null` | CHECK | `` |  |
| `2200_35330_8_not_null` | CHECK | `` |  |
| `2200_35330_9_not_null` | CHECK | `` |  |
| `GlpiLocations_glpiConfigurationId_fkey` | FOREIGN KEY | `glpiConfigurationId` | `GlpiConfigurations(id)` |
| `GlpiLocations_pkey` | PRIMARY KEY | `id` | `GlpiLocations(id)` |

### Indices

| Nome | Definicao |
|---|---|
| `GlpiLocations_configuration_glpiId_unique` | `CREATE UNIQUE INDEX "GlpiLocations_configuration_glpiId_unique" ON public."GlpiLocations" USING btree ("glpiConfigurationId", "glpiId")` |
| `GlpiLocations_pkey` | `CREATE UNIQUE INDEX "GlpiLocations_pkey" ON public."GlpiLocations" USING btree (id)` |

## `GlpiLogs`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"GlpiLogs_id_seq"'::regclass)` |
| 2 | `action` | `character varying(255)` | NO | `` |
| 3 | `status` | `character varying(255)` | NO | `` |
| 4 | `message` | `text / text` | YES | `` |
| 5 | `ticketId` | `integer(32,0)` | YES | `` |
| 6 | `userId` | `integer(32,0)` | YES | `` |
| 7 | `payload` | `text / text` | YES | `` |
| 8 | `response` | `text / text` | YES | `` |
| 9 | `error` | `text / text` | YES | `` |
| 10 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 11 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_35321_1_not_null` | CHECK | `` |  |
| `2200_35321_10_not_null` | CHECK | `` |  |
| `2200_35321_11_not_null` | CHECK | `` |  |
| `2200_35321_2_not_null` | CHECK | `` |  |
| `2200_35321_3_not_null` | CHECK | `` |  |
| `GlpiLogs_pkey` | PRIMARY KEY | `id` | `GlpiLogs(id)` |

## `GlpiTicketLinks`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"GlpiTicketLinks_id_seq"'::regclass)` |
| 2 | `ticketId` | `integer(32,0)` | NO | `` |
| 3 | `glpiTicketId` | `integer(32,0)` | NO | `` |
| 4 | `glpiTicketNumber` | `character varying(255)` | YES | `` |
| 5 | `title` | `character varying(255)` | NO | `` |
| 6 | `description` | `text / text` | NO | `` |
| 7 | `entityId` | `integer(32,0)` | NO | `` |
| 8 | `entityName` | `character varying(255)` | YES | `` |
| 9 | `categoryId` | `integer(32,0)` | NO | `` |
| 10 | `categoryName` | `character varying(255)` | YES | `` |
| 11 | `createdByUserId` | `integer(32,0)` | YES | `` |
| 12 | `descriptionMode` | `character varying(255)` | NO | `'manual'::character varying` |
| 13 | `selectedMessageIds` | `text / text` | YES | `` |
| 14 | `glpiUrl` | `character varying(255)` | YES | `` |
| 15 | `status` | `character varying(255)` | NO | `'created'::character varying` |
| 16 | `rawResponse` | `text / text` | YES | `` |
| 17 | `error` | `text / text` | YES | `` |
| 18 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 19 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 20 | `locationId` | `integer(32,0)` | YES | `` |
| 21 | `locationName` | `character varying(255)` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_35300_1_not_null` | CHECK | `` |  |
| `2200_35300_12_not_null` | CHECK | `` |  |
| `2200_35300_15_not_null` | CHECK | `` |  |
| `2200_35300_18_not_null` | CHECK | `` |  |
| `2200_35300_19_not_null` | CHECK | `` |  |
| `2200_35300_2_not_null` | CHECK | `` |  |
| `2200_35300_3_not_null` | CHECK | `` |  |
| `2200_35300_5_not_null` | CHECK | `` |  |
| `2200_35300_6_not_null` | CHECK | `` |  |
| `2200_35300_7_not_null` | CHECK | `` |  |
| `2200_35300_9_not_null` | CHECK | `` |  |
| `GlpiTicketLinks_createdByUserId_fkey` | FOREIGN KEY | `createdByUserId` | `Users(id)` |
| `GlpiTicketLinks_ticketId_fkey` | FOREIGN KEY | `ticketId` | `Tickets(id)` |
| `GlpiTicketLinks_pkey` | PRIMARY KEY | `id` | `GlpiTicketLinks(id)` |

## `KnowledgeBaseArticles`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"KnowledgeBaseArticles_id_seq"'::regclass)` |
| 2 | `title` | `character varying(255)` | NO | `` |
| 3 | `content` | `text / text` | NO | `` |
| 4 | `tags` | `character varying(255)` | YES | `` |
| 5 | `active` | `boolean / bool` | NO | `true` |
| 6 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 7 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 8 | `contentHtml` | `text / text` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34460_1_not_null` | CHECK | `` |  |
| `2200_34460_2_not_null` | CHECK | `` |  |
| `2200_34460_3_not_null` | CHECK | `` |  |
| `2200_34460_5_not_null` | CHECK | `` |  |
| `2200_34460_6_not_null` | CHECK | `` |  |
| `2200_34460_7_not_null` | CHECK | `` |  |
| `KnowledgeBaseArticles_pkey` | PRIMARY KEY | `id` | `KnowledgeBaseArticles(id)` |

### Indices

| Nome | Definicao |
|---|---|
| `KnowledgeBaseArticles_fts_idx` | `CREATE INDEX "KnowledgeBaseArticles_fts_idx" ON public."KnowledgeBaseArticles" USING gin ((((setweight(to_tsvector('portuguese'::regconfig, (COALESCE(title, ''::character varying))::text), 'A'::"char") // setweight(to_tsvector('portuguese'::regconfig, (COALESCE(tags, ''::character varying))::text), 'A'::"char")) // setweight(to_tsvector('portuguese'::regconfig, COALESCE(content, ''::text)), 'B'::"char"))))` |
| `KnowledgeBaseArticles_pkey` | `CREATE UNIQUE INDEX "KnowledgeBaseArticles_pkey" ON public."KnowledgeBaseArticles" USING btree (id)` |

## `KnowledgeBaseChunks`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"KnowledgeBaseChunks_id_seq"'::regclass)` |
| 2 | `articleId` | `integer(32,0)` | NO | `` |
| 3 | `aiSettingId` | `integer(32,0)` | YES | `` |
| 4 | `title` | `character varying(255)` | YES | `` |
| 5 | `section` | `character varying(255)` | YES | `` |
| 6 | `content` | `text / text` | NO | `` |
| 7 | `tags` | `text / text` | YES | `` |
| 8 | `embedding` | `text / text` | NO | `` |
| 9 | `contentHash` | `character varying(255)` | NO | `` |
| 10 | `active` | `boolean / bool` | NO | `true` |
| 11 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 12 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34467_1_not_null` | CHECK | `` |  |
| `2200_34467_10_not_null` | CHECK | `` |  |
| `2200_34467_11_not_null` | CHECK | `` |  |
| `2200_34467_12_not_null` | CHECK | `` |  |
| `2200_34467_2_not_null` | CHECK | `` |  |
| `2200_34467_6_not_null` | CHECK | `` |  |
| `2200_34467_8_not_null` | CHECK | `` |  |
| `2200_34467_9_not_null` | CHECK | `` |  |
| `KnowledgeBaseChunks_aiSettingId_fkey` | FOREIGN KEY | `aiSettingId` | `AiSettings(id)` |
| `KnowledgeBaseChunks_articleId_fkey` | FOREIGN KEY | `articleId` | `KnowledgeBaseArticles(id)` |
| `KnowledgeBaseChunks_pkey` | PRIMARY KEY | `id` | `KnowledgeBaseChunks(id)` |

### Indices

| Nome | Definicao |
|---|---|
| `KnowledgeBaseChunks_active_idx` | `CREATE INDEX "KnowledgeBaseChunks_active_idx" ON public."KnowledgeBaseChunks" USING btree (active)` |
| `KnowledgeBaseChunks_ai_setting_idx` | `CREATE INDEX "KnowledgeBaseChunks_ai_setting_idx" ON public."KnowledgeBaseChunks" USING btree ("aiSettingId")` |
| `KnowledgeBaseChunks_article_hash_idx` | `CREATE UNIQUE INDEX "KnowledgeBaseChunks_article_hash_idx" ON public."KnowledgeBaseChunks" USING btree ("articleId", "contentHash")` |
| `KnowledgeBaseChunks_pkey` | `CREATE UNIQUE INDEX "KnowledgeBaseChunks_pkey" ON public."KnowledgeBaseChunks" USING btree (id)` |

## `Messages`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `character varying(255)` | NO | `` |
| 2 | `body` | `text / text` | NO | `` |
| 3 | `ack` | `integer(32,0)` | NO | `0` |
| 4 | `read` | `boolean / bool` | NO | `false` |
| 5 | `mediaType` | `character varying(255)` | YES | `` |
| 6 | `mediaUrl` | `character varying(255)` | YES | `` |
| 7 | `ticketId` | `integer(32,0)` | NO | `` |
| 8 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 9 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 10 | `fromMe` | `boolean / bool` | NO | `false` |
| 11 | `isDeleted` | `boolean / bool` | NO | `false` |
| 12 | `contactId` | `integer(32,0)` | YES | `` |
| 13 | `quotedMsgId` | `character varying(255)` | YES | `` |
| 14 | `senderType` | `character varying(255)` | YES | `` |
| 15 | `aiSessionStartedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 16 | `reactions` | `jsonb / jsonb` | NO | `'{}'::jsonb` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34474_1_not_null` | CHECK | `` |  |
| `2200_34474_10_not_null` | CHECK | `` |  |
| `2200_34474_11_not_null` | CHECK | `` |  |
| `2200_34474_16_not_null` | CHECK | `` |  |
| `2200_34474_2_not_null` | CHECK | `` |  |
| `2200_34474_3_not_null` | CHECK | `` |  |
| `2200_34474_4_not_null` | CHECK | `` |  |
| `2200_34474_7_not_null` | CHECK | `` |  |
| `2200_34474_8_not_null` | CHECK | `` |  |
| `2200_34474_9_not_null` | CHECK | `` |  |
| `Messages_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `Messages_quotedMsgId_fkey` | FOREIGN KEY | `quotedMsgId` | `Messages(id)` |
| `Messages_ticketId_fkey` | FOREIGN KEY | `ticketId` | `Tickets(id)` |
| `Messages_pkey` | PRIMARY KEY | `id` | `Messages(id)` |

## `QualificationFormAnswers`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"QualificationFormAnswers_id_seq"'::regclass)` |
| 2 | `responseId` | `integer(32,0)` | NO | `` |
| 3 | `questionId` | `integer(32,0)` | NO | `` |
| 4 | `key` | `character varying(255)` | NO | `` |
| 5 | `label` | `text / text` | NO | `` |
| 6 | `value` | `text / text` | YES | `` |
| 7 | `rawValue` | `text / text` | YES | `` |
| 8 | `optionLabel` | `text / text` | YES | `` |
| 9 | `includeInAiContext` | `boolean / bool` | NO | `true` |
| 10 | `includeInReports` | `boolean / bool` | NO | `true` |
| 11 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 12 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34483_1_not_null` | CHECK | `` |  |
| `2200_34483_10_not_null` | CHECK | `` |  |
| `2200_34483_11_not_null` | CHECK | `` |  |
| `2200_34483_12_not_null` | CHECK | `` |  |
| `2200_34483_2_not_null` | CHECK | `` |  |
| `2200_34483_3_not_null` | CHECK | `` |  |
| `2200_34483_4_not_null` | CHECK | `` |  |
| `2200_34483_5_not_null` | CHECK | `` |  |
| `2200_34483_9_not_null` | CHECK | `` |  |
| `QualificationFormAnswers_questionId_fkey` | FOREIGN KEY | `questionId` | `QualificationFormQuestions(id)` |
| `QualificationFormAnswers_responseId_fkey` | FOREIGN KEY | `responseId` | `QualificationFormResponses(id)` |
| `QualificationFormAnswers_pkey` | PRIMARY KEY | `id` | `QualificationFormAnswers(id)` |

## `QualificationFormQuestions`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"QualificationFormQuestions_id_seq"'::regclass)` |
| 2 | `formId` | `integer(32,0)` | NO | `` |
| 3 | `key` | `character varying(255)` | NO | `` |
| 4 | `label` | `text / text` | NO | `` |
| 5 | `type` | `character varying(255)` | NO | `'text'::character varying` |
| 6 | `options` | `text / text` | YES | `` |
| 7 | `required` | `boolean / bool` | NO | `true` |
| 8 | `includeInAiContext` | `boolean / bool` | NO | `true` |
| 9 | `includeInReports` | `boolean / bool` | NO | `true` |
| 10 | `maxInvalidAttempts` | `integer(32,0)` | NO | `2` |
| 11 | `order` | `integer(32,0)` | NO | `0` |
| 12 | `active` | `boolean / bool` | NO | `true` |
| 13 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 14 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 15 | `glpiField` | `character varying(255)` | NO | `'description'::character varying` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34491_1_not_null` | CHECK | `` |  |
| `2200_34491_10_not_null` | CHECK | `` |  |
| `2200_34491_11_not_null` | CHECK | `` |  |
| `2200_34491_12_not_null` | CHECK | `` |  |
| `2200_34491_13_not_null` | CHECK | `` |  |
| `2200_34491_14_not_null` | CHECK | `` |  |
| `2200_34491_15_not_null` | CHECK | `` |  |
| `2200_34491_2_not_null` | CHECK | `` |  |
| `2200_34491_3_not_null` | CHECK | `` |  |
| `2200_34491_4_not_null` | CHECK | `` |  |
| `2200_34491_5_not_null` | CHECK | `` |  |
| `2200_34491_7_not_null` | CHECK | `` |  |
| `2200_34491_8_not_null` | CHECK | `` |  |
| `2200_34491_9_not_null` | CHECK | `` |  |
| `QualificationFormQuestions_formId_fkey` | FOREIGN KEY | `formId` | `QualificationForms(id)` |
| `QualificationFormQuestions_pkey` | PRIMARY KEY | `id` | `QualificationFormQuestions(id)` |

## `QualificationFormResponses`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"QualificationFormResponses_id_seq"'::regclass)` |
| 2 | `formId` | `integer(32,0)` | NO | `` |
| 3 | `ticketId` | `integer(32,0)` | NO | `` |
| 4 | `contactId` | `integer(32,0)` | YES | `` |
| 5 | `whatsappId` | `integer(32,0)` | YES | `` |
| 6 | `queueId` | `integer(32,0)` | YES | `` |
| 7 | `uraOptionId` | `integer(32,0)` | YES | `` |
| 8 | `status` | `character varying(255)` | NO | `'in_progress'::character varying` |
| 9 | `currentQuestionId` | `integer(32,0)` | YES | `` |
| 10 | `invalidAttempts` | `integer(32,0)` | NO | `0` |
| 11 | `afterAction` | `character varying(255)` | YES | `` |
| 12 | `afterQueueId` | `integer(32,0)` | YES | `` |
| 13 | `completedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 14 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 15 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34504_1_not_null` | CHECK | `` |  |
| `2200_34504_10_not_null` | CHECK | `` |  |
| `2200_34504_14_not_null` | CHECK | `` |  |
| `2200_34504_15_not_null` | CHECK | `` |  |
| `2200_34504_2_not_null` | CHECK | `` |  |
| `2200_34504_3_not_null` | CHECK | `` |  |
| `2200_34504_8_not_null` | CHECK | `` |  |
| `QualificationFormResponses_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `QualificationFormResponses_formId_fkey` | FOREIGN KEY | `formId` | `QualificationForms(id)` |
| `QualificationFormResponses_queueId_fkey` | FOREIGN KEY | `queueId` | `Queues(id)` |
| `QualificationFormResponses_ticketId_fkey` | FOREIGN KEY | `ticketId` | `Tickets(id)` |
| `QualificationFormResponses_uraOptionId_fkey` | FOREIGN KEY | `uraOptionId` | `UraOptions(id)` |
| `QualificationFormResponses_whatsappId_fkey` | FOREIGN KEY | `whatsappId` | `Whatsapps(id)` |
| `QualificationFormResponses_pkey` | PRIMARY KEY | `id` | `QualificationFormResponses(id)` |

## `QualificationForms`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"QualificationForms_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `description` | `text / text` | YES | `` |
| 4 | `active` | `boolean / bool` | NO | `true` |
| 5 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 7 | `greetingMessage` | `text / text` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34512_1_not_null` | CHECK | `` |  |
| `2200_34512_2_not_null` | CHECK | `` |  |
| `2200_34512_4_not_null` | CHECK | `` |  |
| `2200_34512_5_not_null` | CHECK | `` |  |
| `2200_34512_6_not_null` | CHECK | `` |  |
| `QualificationForms_pkey` | PRIMARY KEY | `id` | `QualificationForms(id)` |

## `QueueDistributionLogs`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"QueueDistributionLogs_id_seq"'::regclass)` |
| 2 | `ticketId` | `integer(32,0)` | YES | `` |
| 3 | `queueId` | `integer(32,0)` | YES | `` |
| 4 | `userId` | `integer(32,0)` | YES | `` |
| 5 | `action` | `character varying(255)` | NO | `` |
| 6 | `distributionMode` | `character varying(255)` | YES | `` |
| 7 | `attendantStatus` | `character varying(255)` | YES | `` |
| 8 | `userActiveTickets` | `integer(32,0)` | YES | `` |
| 9 | `reason` | `text / text` | YES | `` |
| 10 | `metadata` | `text / text` | YES | `` |
| 11 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 12 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34519_1_not_null` | CHECK | `` |  |
| `2200_34519_11_not_null` | CHECK | `` |  |
| `2200_34519_12_not_null` | CHECK | `` |  |
| `2200_34519_5_not_null` | CHECK | `` |  |
| `QueueDistributionLogs_queueId_fkey` | FOREIGN KEY | `queueId` | `Queues(id)` |
| `QueueDistributionLogs_ticketId_fkey` | FOREIGN KEY | `ticketId` | `Tickets(id)` |
| `QueueDistributionLogs_userId_fkey` | FOREIGN KEY | `userId` | `Users(id)` |
| `QueueDistributionLogs_pkey` | PRIMARY KEY | `id` | `QueueDistributionLogs(id)` |

## `Queues`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"Queues_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `color` | `character varying(255)` | NO | `` |
| 4 | `greetingMessage` | `text / text` | YES | `` |
| 5 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 7 | `useAI` | `boolean / bool` | NO | `false` |
| 8 | `aiSettingId` | `integer(32,0)` | YES | `` |
| 9 | `businessHoursEnabled` | `boolean / bool` | NO | `false` |
| 10 | `businessHours` | `text / text` | YES | `` |
| 11 | `unavailableMessage` | `text / text` | YES | `` |
| 12 | `unavailableMediaUrl` | `character varying(255)` | YES | `` |
| 13 | `unavailableMediaType` | `character varying(255)` | YES | `` |
| 14 | `unavailableMediaName` | `character varying(255)` | YES | `` |
| 15 | `businessHoursMode` | `character varying(255)` | NO | `'always'::character varying` |
| 16 | `distributionMode` | `character varying(255)` | NO | `'manual_free'::character varying` |
| 17 | `maxActiveTicketsPerUser` | `integer(32,0)` | YES | `` |
| 18 | `balanceAction` | `character varying(255)` | NO | `'ignore'::character varying` |
| 19 | `overflowAction` | `character varying(255)` | NO | `'keep_waiting'::character varying` |
| 20 | `lastAssignedUserId` | `integer(32,0)` | YES | `` |
| 21 | `sendQueuePositionMessage` | `boolean / bool` | NO | `false` |
| 22 | `queuePositionMessage` | `text / text` | YES | `` |
| 23 | `blockIfUserHasStalledTicket` | `boolean / bool` | NO | `false` |
| 24 | `stalledTicketMinutes` | `integer(32,0)` | YES | `` |
| 25 | `stalledTicketAction` | `character varying(255)` | NO | `'ignore'::character varying` |
| 26 | `glpiEnabled` | `boolean / bool` | NO | `false` |
| 27 | `scheduledReturnWindowHours` | `integer(32,0)` | NO | `24` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34525_1_not_null` | CHECK | `` |  |
| `2200_34525_15_not_null` | CHECK | `` |  |
| `2200_34525_16_not_null` | CHECK | `` |  |
| `2200_34525_18_not_null` | CHECK | `` |  |
| `2200_34525_19_not_null` | CHECK | `` |  |
| `2200_34525_2_not_null` | CHECK | `` |  |
| `2200_34525_21_not_null` | CHECK | `` |  |
| `2200_34525_23_not_null` | CHECK | `` |  |
| `2200_34525_25_not_null` | CHECK | `` |  |
| `2200_34525_26_not_null` | CHECK | `` |  |
| `2200_34525_27_not_null` | CHECK | `` |  |
| `2200_34525_3_not_null` | CHECK | `` |  |
| `2200_34525_5_not_null` | CHECK | `` |  |
| `2200_34525_6_not_null` | CHECK | `` |  |
| `2200_34525_7_not_null` | CHECK | `` |  |
| `2200_34525_9_not_null` | CHECK | `` |  |
| `Queues_aiSettingId_fkey` | FOREIGN KEY | `aiSettingId` | `AiSettings(id)` |
| `Queues_lastAssignedUserId_fkey` | FOREIGN KEY | `lastAssignedUserId` | `Users(id)` |
| `Queues_pkey` | PRIMARY KEY | `id` | `Queues(id)` |
| `Queues_color_key` | UNIQUE | `color` | `Queues(color)` |
| `Queues_name_key` | UNIQUE | `name` | `Queues(name)` |

### Indices

| Nome | Definicao |
|---|---|
| `Queues_color_key` | `CREATE UNIQUE INDEX "Queues_color_key" ON public."Queues" USING btree (color)` |
| `Queues_name_key` | `CREATE UNIQUE INDEX "Queues_name_key" ON public."Queues" USING btree (name)` |
| `Queues_pkey` | `CREATE UNIQUE INDEX "Queues_pkey" ON public."Queues" USING btree (id)` |

## `QuickAnswers`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"QuickAnswers_id_seq"'::regclass)` |
| 2 | `shortcut` | `text / text` | NO | `` |
| 3 | `message` | `text / text` | NO | `` |
| 4 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 5 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `global` | `boolean / bool` | NO | `true` |
| 7 | `userId` | `integer(32,0)` | YES | `` |
| 8 | `mediaUrl` | `character varying(255)` | YES | `` |
| 9 | `mediaType` | `character varying(255)` | YES | `` |
| 10 | `mediaName` | `character varying(255)` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34540_1_not_null` | CHECK | `` |  |
| `2200_34540_2_not_null` | CHECK | `` |  |
| `2200_34540_3_not_null` | CHECK | `` |  |
| `2200_34540_4_not_null` | CHECK | `` |  |
| `2200_34540_5_not_null` | CHECK | `` |  |
| `2200_34540_6_not_null` | CHECK | `` |  |
| `QuickAnswers_userId_fkey` | FOREIGN KEY | `userId` | `Users(id)` |
| `QuickAnswers_pkey` | PRIMARY KEY | `id` | `QuickAnswers(id)` |

## `SatisfactionSurveyResponses`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"SatisfactionSurveyResponses_id_seq"'::regclass)` |
| 2 | `satisfactionSurveyId` | `integer(32,0)` | YES | `` |
| 3 | `ticketId` | `integer(32,0)` | NO | `` |
| 4 | `contactId` | `integer(32,0)` | NO | `` |
| 5 | `userId` | `integer(32,0)` | YES | `` |
| 6 | `queueId` | `integer(32,0)` | YES | `` |
| 7 | `categoryId` | `integer(32,0)` | YES | `` |
| 8 | `closingReasonId` | `integer(32,0)` | YES | `` |
| 9 | `rating` | `integer(32,0)` | NO | `` |
| 10 | `rawAnswer` | `character varying(255)` | YES | `` |
| 11 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 12 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 13 | `feedbackText` | `text / text` | YES | `` |
| 14 | `feedbackType` | `character varying(255)` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34547_1_not_null` | CHECK | `` |  |
| `2200_34547_11_not_null` | CHECK | `` |  |
| `2200_34547_12_not_null` | CHECK | `` |  |
| `2200_34547_3_not_null` | CHECK | `` |  |
| `2200_34547_4_not_null` | CHECK | `` |  |
| `2200_34547_9_not_null` | CHECK | `` |  |
| `SatisfactionSurveyResponses_pkey` | PRIMARY KEY | `id` | `SatisfactionSurveyResponses(id)` |

## `SatisfactionSurveys`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"SatisfactionSurveys_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `question` | `text / text` | NO | `` |
| 4 | `scaleType` | `character varying(255)` | NO | `'1_5'::character varying` |
| 5 | `sendMode` | `character varying(255)` | NO | `'optional'::character varying` |
| 6 | `active` | `boolean / bool` | NO | `true` |
| 7 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 8 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 9 | `thankYouMessage` | `text / text` | YES | `` |
| 10 | `collectFeedbackText` | `boolean / bool` | NO | `false` |
| 11 | `feedbackQuestion` | `text / text` | YES | `` |
| 12 | `feedbackTimeoutMinutes` | `integer(32,0)` | NO | `60` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34551_1_not_null` | CHECK | `` |  |
| `2200_34551_10_not_null` | CHECK | `` |  |
| `2200_34551_12_not_null` | CHECK | `` |  |
| `2200_34551_2_not_null` | CHECK | `` |  |
| `2200_34551_3_not_null` | CHECK | `` |  |
| `2200_34551_4_not_null` | CHECK | `` |  |
| `2200_34551_5_not_null` | CHECK | `` |  |
| `2200_34551_6_not_null` | CHECK | `` |  |
| `2200_34551_7_not_null` | CHECK | `` |  |
| `2200_34551_8_not_null` | CHECK | `` |  |
| `SatisfactionSurveys_pkey` | PRIMARY KEY | `id` | `SatisfactionSurveys(id)` |

## `ScheduledMessageExecutions`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"ScheduledMessageExecutions_id_seq"'::regclass)` |
| 2 | `scheduleId` | `integer(32,0)` | NO | `` |
| 3 | `contactId` | `integer(32,0)` | YES | `` |
| 4 | `whatsappId` | `integer(32,0)` | YES | `` |
| 5 | `scheduledFor` | `timestamp with time zone / timestamptz` | YES | `` |
| 6 | `executedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 7 | `status` | `character varying(255)` | NO | `'pending'::character varying` |
| 8 | `attempts` | `integer(32,0)` | NO | `0` |
| 9 | `errorMessage` | `text / text` | YES | `` |
| 10 | `messageId` | `character varying(255)` | YES | `` |
| 11 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 12 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34560_1_not_null` | CHECK | `` |  |
| `2200_34560_11_not_null` | CHECK | `` |  |
| `2200_34560_12_not_null` | CHECK | `` |  |
| `2200_34560_2_not_null` | CHECK | `` |  |
| `2200_34560_7_not_null` | CHECK | `` |  |
| `2200_34560_8_not_null` | CHECK | `` |  |
| `ScheduledMessageExecutions_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `ScheduledMessageExecutions_scheduleId_fkey` | FOREIGN KEY | `scheduleId` | `ScheduledMessages(id)` |
| `ScheduledMessageExecutions_whatsappId_fkey` | FOREIGN KEY | `whatsappId` | `Whatsapps(id)` |
| `ScheduledMessageExecutions_pkey` | PRIMARY KEY | `id` | `ScheduledMessageExecutions(id)` |

## `ScheduledMessages`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"ScheduledMessages_id_seq"'::regclass)` |
| 2 | `contactId` | `integer(32,0)` | NO | `` |
| 3 | `whatsappId` | `integer(32,0)` | YES | `` |
| 4 | `message` | `text / text` | NO | `` |
| 5 | `scheduledAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `status` | `character varying(255)` | NO | `'pending'::character varying` |
| 7 | `sentAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 8 | `errorMessage` | `text / text` | YES | `` |
| 9 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 10 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 11 | `batchId` | `character varying(255)` | YES | `` |
| 12 | `sequence` | `integer(32,0)` | NO | `0` |
| 13 | `nextRunAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 14 | `intervalSeconds` | `integer(32,0)` | NO | `30` |
| 15 | `intervalPattern` | `character varying(255)` | YES | `` |
| 16 | `pauseAfter` | `integer(32,0)` | NO | `20` |
| 17 | `pauseSeconds` | `integer(32,0)` | NO | `300` |
| 18 | `mediaUrl` | `character varying(255)` | YES | `` |
| 19 | `mediaType` | `character varying(255)` | YES | `` |
| 20 | `mediaName` | `character varying(255)` | YES | `` |
| 21 | `recurrenceType` | `character varying(255)` | YES | `` |
| 22 | `weekdays` | `jsonb / jsonb` | YES | `` |
| 23 | `times` | `jsonb / jsonb` | YES | `` |
| 24 | `startsAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 25 | `endsAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 26 | `lastRunAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 27 | `canceledAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 28 | `repeatEvery` | `integer(32,0)` | YES | `` |
| 29 | `repeatUnit` | `character varying(255)` | YES | `` |
| 30 | `maxRuns` | `integer(32,0)` | YES | `` |
| 31 | `runCount` | `integer(32,0)` | NO | `0` |
| 32 | `respectBusinessHours` | `boolean / bool` | NO | `false` |
| 33 | `missedRunPolicy` | `character varying(255)` | YES | `` |
| 34 | `sendType` | `character varying(255)` | NO | `'scheduled'::character varying` |
| 35 | `tagIds` | `jsonb / jsonb` | YES | `` |
| 36 | `excludeTagIds` | `jsonb / jsonb` | YES | `` |
| 37 | `tagAppliedLastDays` | `integer(32,0)` | YES | `` |
| 38 | `userId` | `integer(32,0)` | YES | `` |
| 39 | `sourceTicketId` | `integer(32,0)` | YES | `` |
| 40 | `returnQueueId` | `integer(32,0)` | YES | `` |
| 41 | `returnContext` | `text / text` | YES | `` |
| 42 | `returnWindowMinutes` | `integer(32,0)` | NO | `1440` |
| 43 | `returnWindowExpiresAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 44 | `returnHandledAt` | `timestamp with time zone / timestamptz` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34568_1_not_null` | CHECK | `` |  |
| `2200_34568_10_not_null` | CHECK | `` |  |
| `2200_34568_12_not_null` | CHECK | `` |  |
| `2200_34568_14_not_null` | CHECK | `` |  |
| `2200_34568_16_not_null` | CHECK | `` |  |
| `2200_34568_17_not_null` | CHECK | `` |  |
| `2200_34568_2_not_null` | CHECK | `` |  |
| `2200_34568_31_not_null` | CHECK | `` |  |
| `2200_34568_32_not_null` | CHECK | `` |  |
| `2200_34568_34_not_null` | CHECK | `` |  |
| `2200_34568_4_not_null` | CHECK | `` |  |
| `2200_34568_42_not_null` | CHECK | `` |  |
| `2200_34568_5_not_null` | CHECK | `` |  |
| `2200_34568_6_not_null` | CHECK | `` |  |
| `2200_34568_9_not_null` | CHECK | `` |  |
| `ScheduledMessages_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `ScheduledMessages_returnQueueId_fkey` | FOREIGN KEY | `returnQueueId` | `Queues(id)` |
| `ScheduledMessages_sourceTicketId_fkey` | FOREIGN KEY | `sourceTicketId` | `Tickets(id)` |
| `ScheduledMessages_userId_fkey` | FOREIGN KEY | `userId` | `Users(id)` |
| `ScheduledMessages_whatsappId_fkey` | FOREIGN KEY | `whatsappId` | `Whatsapps(id)` |
| `ScheduledMessages_pkey` | PRIMARY KEY | `id` | `ScheduledMessages(id)` |

## `SequelizeMeta`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `name` | `character varying(255)` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34582_1_not_null` | CHECK | `` |  |
| `SequelizeMeta_pkey` | PRIMARY KEY | `name` | `SequelizeMeta(name)` |

## `Settings`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `key` | `character varying(255)` | NO | `` |
| 2 | `value` | `text / text` | NO | `` |
| 3 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 4 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34585_1_not_null` | CHECK | `` |  |
| `2200_34585_2_not_null` | CHECK | `` |  |
| `2200_34585_3_not_null` | CHECK | `` |  |
| `2200_34585_4_not_null` | CHECK | `` |  |
| `Settings_pkey` | PRIMARY KEY | `key` | `Settings(key)` |

## `Tags`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"Tags_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `color` | `character varying(255)` | NO | `'#607d8b'::character varying` |
| 4 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 5 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `fixed` | `boolean / bool` | NO | `false` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34590_1_not_null` | CHECK | `` |  |
| `2200_34590_2_not_null` | CHECK | `` |  |
| `2200_34590_3_not_null` | CHECK | `` |  |
| `2200_34590_4_not_null` | CHECK | `` |  |
| `2200_34590_5_not_null` | CHECK | `` |  |
| `2200_34590_6_not_null` | CHECK | `` |  |
| `Tags_pkey` | PRIMARY KEY | `id` | `Tags(id)` |
| `Tags_name_key` | UNIQUE | `name` | `Tags(name)` |

### Indices

| Nome | Definicao |
|---|---|
| `Tags_name_key` | `CREATE UNIQUE INDEX "Tags_name_key" ON public."Tags" USING btree (name)` |
| `Tags_pkey` | `CREATE UNIQUE INDEX "Tags_pkey" ON public."Tags" USING btree (id)` |

## `TicketCategories`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"TicketCategories_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `description` | `text / text` | YES | `` |
| 4 | `active` | `boolean / bool` | NO | `true` |
| 5 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34598_1_not_null` | CHECK | `` |  |
| `2200_34598_2_not_null` | CHECK | `` |  |
| `2200_34598_4_not_null` | CHECK | `` |  |
| `2200_34598_5_not_null` | CHECK | `` |  |
| `2200_34598_6_not_null` | CHECK | `` |  |
| `TicketCategories_pkey` | PRIMARY KEY | `id` | `TicketCategories(id)` |

## `Tickets`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"Tickets_id_seq"'::regclass)` |
| 2 | `status` | `character varying(255)` | NO | `'pending'::character varying` |
| 3 | `lastMessage` | `text / text` | YES | `` |
| 4 | `contactId` | `integer(32,0)` | YES | `` |
| 5 | `userId` | `integer(32,0)` | YES | `` |
| 6 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 7 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 8 | `whatsappId` | `integer(32,0)` | YES | `` |
| 9 | `isGroup` | `boolean / bool` | NO | `false` |
| 10 | `unreadMessages` | `integer(32,0)` | YES | `` |
| 11 | `queueId` | `integer(32,0)` | YES | `` |
| 12 | `categoryId` | `integer(32,0)` | YES | `` |
| 13 | `closingReasonId` | `integer(32,0)` | YES | `` |
| 14 | `closingNote` | `text / text` | YES | `` |
| 15 | `glpiTicketId` | `integer(32,0)` | YES | `` |
| 16 | `uraFlowId` | `integer(32,0)` | YES | `` |
| 17 | `uraMenuSentAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 18 | `aiActive` | `boolean / bool` | NO | `false` |
| 19 | `aiSettingId` | `integer(32,0)` | YES | `` |
| 20 | `aiHumanHandoffAlertSent` | `boolean / bool` | NO | `false` |
| 21 | `aiHandled` | `boolean / bool` | NO | `false` |
| 22 | `aiHumanHandoffAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 23 | `aiTaggerClassifiedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 24 | `aiAutoClosed` | `boolean / bool` | NO | `false` |
| 25 | `aiAutoClosedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 26 | `aiQueueId` | `integer(32,0)` | YES | `` |
| 27 | `aiStartedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 28 | `aiFinishedAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 29 | `lastAiQuestionType` | `character varying(255)` | YES | `` |
| 30 | `lastAiQuestionOptions` | `text / text` | YES | `` |
| 31 | `lastAiQuestionAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 32 | `lastAiQuestionAttempts` | `integer(32,0)` | NO | `0` |
| 33 | `lastAiInteractionAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 34 | `satisfactionSurveyId` | `integer(32,0)` | YES | `` |
| 35 | `satisfactionSurveySentAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 36 | `satisfactionSurveyAnsweredAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 37 | `aiHandoffAlertEnabled` | `boolean / bool` | YES | `` |
| 38 | `aiHandoffAlertTo` | `character varying(255)` | YES | `` |
| 39 | `aiHandoffAlertMessage` | `text / text` | YES | `` |
| 40 | `aiHumanHandoffQueueId` | `integer(32,0)` | YES | `` |
| 41 | `aiHumanHandoffMessage` | `text / text` | YES | `` |
| 42 | `aiAutoCloseEnabled` | `boolean / bool` | NO | `false` |
| 43 | `aiAutoCloseMinutes` | `integer(32,0)` | YES | `` |
| 44 | `aiAutoCloseMessage` | `text / text` | YES | `` |
| 45 | `aiAutoCloseReasonId` | `integer(32,0)` | YES | `` |
| 46 | `aiAutoCloseOnlyIfNotHandedOff` | `boolean / bool` | NO | `true` |
| 47 | `lastAiMessage` | `text / text` | YES | `` |
| 48 | `lastAiExpectedReply` | `character varying(255)` | YES | `` |
| 49 | `lastAiIntent` | `character varying(255)` | YES | `` |
| 50 | `lastAiAction` | `character varying(255)` | YES | `` |
| 51 | `lastAiKnowledgeIds` | `text / text` | YES | `` |
| 52 | `lastAiDecisionReason` | `text / text` | YES | `` |
| 53 | `lastAiAskedMoreHelp` | `boolean / bool` | NO | `false` |
| 54 | `aiInteractionCount` | `integer(32,0)` | NO | `0` |
| 55 | `aiConversationSummary` | `text / text` | YES | `` |
| 56 | `currentUraOptionId` | `integer(32,0)` | YES | `` |
| 57 | `uraInvalidAttempts` | `integer(32,0)` | NO | `0` |
| 58 | `uraActive` | `boolean / bool` | NO | `false` |
| 59 | `lastUraInteractionAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 60 | `queuePositionMessageSentAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 61 | `queueEnteredAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 62 | `satisfactionFeedbackPendingAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 63 | `satisfactionFeedbackExpiresAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 64 | `satisfactionFeedbackClosedAt` | `timestamp with time zone / timestamptz` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34605_1_not_null` | CHECK | `` |  |
| `2200_34605_18_not_null` | CHECK | `` |  |
| `2200_34605_2_not_null` | CHECK | `` |  |
| `2200_34605_20_not_null` | CHECK | `` |  |
| `2200_34605_21_not_null` | CHECK | `` |  |
| `2200_34605_24_not_null` | CHECK | `` |  |
| `2200_34605_32_not_null` | CHECK | `` |  |
| `2200_34605_42_not_null` | CHECK | `` |  |
| `2200_34605_46_not_null` | CHECK | `` |  |
| `2200_34605_53_not_null` | CHECK | `` |  |
| `2200_34605_54_not_null` | CHECK | `` |  |
| `2200_34605_57_not_null` | CHECK | `` |  |
| `2200_34605_58_not_null` | CHECK | `` |  |
| `2200_34605_6_not_null` | CHECK | `` |  |
| `2200_34605_7_not_null` | CHECK | `` |  |
| `2200_34605_9_not_null` | CHECK | `` |  |
| `Tickets_aiSettingId_fkey` | FOREIGN KEY | `aiSettingId` | `AiSettings(id)` |
| `Tickets_categoryId_fkey` | FOREIGN KEY | `categoryId` | `TicketCategories(id)` |
| `Tickets_closingReasonId_fkey` | FOREIGN KEY | `closingReasonId` | `ClosingReasons(id)` |
| `Tickets_contactId_fkey` | FOREIGN KEY | `contactId` | `Contacts(id)` |
| `Tickets_currentUraOptionId_fkey` | FOREIGN KEY | `currentUraOptionId` | `UraOptions(id)` |
| `Tickets_queueId_fkey` | FOREIGN KEY | `queueId` | `Queues(id)` |
| `Tickets_uraFlowId_fkey` | FOREIGN KEY | `uraFlowId` | `UraFlows(id)` |
| `Tickets_userId_fkey` | FOREIGN KEY | `userId` | `Users(id)` |
| `Tickets_whatsappId_fkey` | FOREIGN KEY | `whatsappId` | `Whatsapps(id)` |
| `Tickets_pkey` | PRIMARY KEY | `id` | `Tickets(id)` |

## `UraFlows`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"UraFlows_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `description` | `text / text` | YES | `` |
| 4 | `welcomeMessage` | `text / text` | NO | `` |
| 5 | `invalidOptionMessage` | `text / text` | YES | `` |
| 6 | `maxInvalidAttempts` | `integer(32,0)` | NO | `3` |
| 7 | `fallbackQueueId` | `integer(32,0)` | YES | `` |
| 8 | `active` | `boolean / bool` | NO | `true` |
| 9 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 10 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 11 | `welcomeMediaUrl` | `character varying(255)` | YES | `` |
| 12 | `welcomeMediaType` | `character varying(255)` | YES | `` |
| 13 | `welcomeMediaName` | `character varying(255)` | YES | `` |
| 14 | `aiAutoCloseEnabled` | `boolean / bool` | NO | `false` |
| 15 | `aiAutoCloseMinutes` | `integer(32,0)` | YES | `` |
| 16 | `aiAutoCloseMessage` | `text / text` | YES | `` |
| 17 | `aiAutoCloseReasonId` | `integer(32,0)` | YES | `` |
| 18 | `aiAutoCloseOnlyIfNotHandedOff` | `boolean / bool` | NO | `true` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34624_1_not_null` | CHECK | `` |  |
| `2200_34624_10_not_null` | CHECK | `` |  |
| `2200_34624_14_not_null` | CHECK | `` |  |
| `2200_34624_18_not_null` | CHECK | `` |  |
| `2200_34624_2_not_null` | CHECK | `` |  |
| `2200_34624_4_not_null` | CHECK | `` |  |
| `2200_34624_6_not_null` | CHECK | `` |  |
| `2200_34624_8_not_null` | CHECK | `` |  |
| `2200_34624_9_not_null` | CHECK | `` |  |
| `UraFlows_fallbackQueueId_fkey` | FOREIGN KEY | `fallbackQueueId` | `Queues(id)` |
| `UraFlows_pkey` | PRIMARY KEY | `id` | `UraFlows(id)` |

## `UraOptions`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"UraOptions_id_seq"'::regclass)` |
| 2 | `flowId` | `integer(32,0)` | NO | `` |
| 3 | `optionKey` | `character varying(255)` | NO | `` |
| 4 | `title` | `character varying(255)` | NO | `` |
| 5 | `responseMessage` | `text / text` | YES | `` |
| 6 | `action` | `character varying(255)` | NO | `'SEND_MESSAGE'::character varying` |
| 7 | `targetQueueId` | `integer(32,0)` | YES | `` |
| 8 | `order` | `integer(32,0)` | NO | `0` |
| 9 | `active` | `boolean / bool` | NO | `true` |
| 10 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 11 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 12 | `aiHandoffAlertEnabled` | `boolean / bool` | NO | `false` |
| 13 | `aiHandoffAlertTo` | `character varying(255)` | YES | `` |
| 14 | `aiHandoffAlertMessage` | `text / text` | YES | `` |
| 15 | `aiHumanHandoffEnabled` | `boolean / bool` | NO | `false` |
| 16 | `aiHumanHandoffQueueId` | `integer(32,0)` | YES | `` |
| 17 | `aiHumanHandoffMessage` | `text / text` | YES | `` |
| 18 | `aiAutoCloseEnabled` | `boolean / bool` | NO | `false` |
| 19 | `aiAutoCloseMinutes` | `integer(32,0)` | YES | `` |
| 20 | `aiAutoCloseMessage` | `text / text` | YES | `` |
| 21 | `aiAutoCloseReasonId` | `integer(32,0)` | YES | `` |
| 22 | `aiAutoCloseOnlyIfNotHandedOff` | `boolean / bool` | NO | `true` |
| 23 | `responseMediaUrl` | `character varying(255)` | YES | `` |
| 24 | `responseMediaType` | `character varying(255)` | YES | `` |
| 25 | `responseMediaName` | `character varying(255)` | YES | `` |
| 26 | `parentOptionId` | `integer(32,0)` | YES | `` |
| 27 | `closingReasonId` | `integer(32,0)` | YES | `` |
| 28 | `qualificationFormId` | `integer(32,0)` | YES | `` |
| 29 | `runQualificationFormBeforeAction` | `boolean / bool` | NO | `false` |
| 30 | `allowQualificationFormSkip` | `boolean / bool` | NO | `false` |
| 31 | `showMainMenuAfterMessage` | `boolean / bool` | NO | `false` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34634_1_not_null` | CHECK | `` |  |
| `2200_34634_10_not_null` | CHECK | `` |  |
| `2200_34634_11_not_null` | CHECK | `` |  |
| `2200_34634_12_not_null` | CHECK | `` |  |
| `2200_34634_15_not_null` | CHECK | `` |  |
| `2200_34634_18_not_null` | CHECK | `` |  |
| `2200_34634_2_not_null` | CHECK | `` |  |
| `2200_34634_22_not_null` | CHECK | `` |  |
| `2200_34634_29_not_null` | CHECK | `` |  |
| `2200_34634_3_not_null` | CHECK | `` |  |
| `2200_34634_30_not_null` | CHECK | `` |  |
| `2200_34634_31_not_null` | CHECK | `` |  |
| `2200_34634_4_not_null` | CHECK | `` |  |
| `2200_34634_6_not_null` | CHECK | `` |  |
| `2200_34634_8_not_null` | CHECK | `` |  |
| `2200_34634_9_not_null` | CHECK | `` |  |
| `UraOptions_aiHumanHandoffQueueId_fkey` | FOREIGN KEY | `aiHumanHandoffQueueId` | `Queues(id)` |
| `UraOptions_closingReasonId_fkey` | FOREIGN KEY | `closingReasonId` | `ClosingReasons(id)` |
| `UraOptions_flowId_fkey` | FOREIGN KEY | `flowId` | `UraFlows(id)` |
| `UraOptions_parentOptionId_fkey` | FOREIGN KEY | `parentOptionId` | `UraOptions(id)` |
| `UraOptions_qualificationFormId_fkey` | FOREIGN KEY | `qualificationFormId` | `QualificationForms(id)` |
| `UraOptions_targetQueueId_fkey` | FOREIGN KEY | `targetQueueId` | `Queues(id)` |
| `UraOptions_pkey` | PRIMARY KEY | `id` | `UraOptions(id)` |

## `UserQueues`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `userId` | `integer(32,0)` | NO | `` |
| 2 | `queueId` | `integer(32,0)` | NO | `` |
| 3 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 4 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34650_1_not_null` | CHECK | `` |  |
| `2200_34650_2_not_null` | CHECK | `` |  |
| `2200_34650_3_not_null` | CHECK | `` |  |
| `2200_34650_4_not_null` | CHECK | `` |  |
| `UserQueues_pkey` | PRIMARY KEY | `userId, userId, queueId, queueId` | `UserQueues(userId, queueId, userId, queueId)` |

## `Users`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"Users_id_seq"'::regclass)` |
| 2 | `name` | `character varying(255)` | NO | `` |
| 3 | `email` | `character varying(255)` | NO | `` |
| 4 | `passwordHash` | `character varying(255)` | NO | `` |
| 5 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 6 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 7 | `profile` | `character varying(255)` | NO | `'admin'::character varying` |
| 8 | `tokenVersion` | `integer(32,0)` | NO | `0` |
| 9 | `whatsappId` | `integer(32,0)` | YES | `` |
| 10 | `attendanceGreeting` | `text / text` | YES | `` |
| 11 | `operationalStatus` | `character varying(255)` | NO | `'offline'::character varying` |
| 12 | `lastActivityAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 13 | `lastStatusChangeAt` | `timestamp with time zone / timestamptz` | YES | `` |
| 14 | `statusReason` | `character varying(255)` | YES | `` |
| 15 | `active` | `boolean / bool` | NO | `true` |
| 16 | `glpiEnabled` | `boolean / bool` | NO | `false` |
| 17 | `glpiUserToken` | `text / text` | YES | `` |
| 18 | `specialPermissions` | `text / text` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34653_1_not_null` | CHECK | `` |  |
| `2200_34653_11_not_null` | CHECK | `` |  |
| `2200_34653_15_not_null` | CHECK | `` |  |
| `2200_34653_16_not_null` | CHECK | `` |  |
| `2200_34653_2_not_null` | CHECK | `` |  |
| `2200_34653_3_not_null` | CHECK | `` |  |
| `2200_34653_4_not_null` | CHECK | `` |  |
| `2200_34653_5_not_null` | CHECK | `` |  |
| `2200_34653_6_not_null` | CHECK | `` |  |
| `2200_34653_7_not_null` | CHECK | `` |  |
| `2200_34653_8_not_null` | CHECK | `` |  |
| `Users_whatsappId_fkey` | FOREIGN KEY | `whatsappId` | `Whatsapps(id)` |
| `Users_pkey` | PRIMARY KEY | `id` | `Users(id)` |
| `Users_email_key` | UNIQUE | `email` | `Users(email)` |

### Indices

| Nome | Definicao |
|---|---|
| `Users_email_key` | `CREATE UNIQUE INDEX "Users_email_key" ON public."Users" USING btree (email)` |
| `Users_pkey` | `CREATE UNIQUE INDEX "Users_pkey" ON public."Users" USING btree (id)` |

## `WhatsappQueues`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `whatsappId` | `integer(32,0)` | NO | `` |
| 2 | `queueId` | `integer(32,0)` | NO | `` |
| 3 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 4 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34663_1_not_null` | CHECK | `` |  |
| `2200_34663_2_not_null` | CHECK | `` |  |
| `2200_34663_3_not_null` | CHECK | `` |  |
| `2200_34663_4_not_null` | CHECK | `` |  |
| `WhatsappQueues_pkey` | PRIMARY KEY | `whatsappId, whatsappId, queueId, queueId` | `WhatsappQueues(whatsappId, queueId, whatsappId, queueId)` |

## `Whatsapps`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"Whatsapps_id_seq"'::regclass)` |
| 2 | `session` | `text / text` | YES | `` |
| 3 | `qrcode` | `text / text` | YES | `` |
| 4 | `status` | `character varying(255)` | YES | `` |
| 5 | `battery` | `character varying(255)` | YES | `` |
| 6 | `plugged` | `boolean / bool` | YES | `` |
| 7 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 8 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 9 | `name` | `character varying(255)` | NO | `` |
| 10 | `isDefault` | `boolean / bool` | NO | `false` |
| 11 | `retries` | `integer(32,0)` | NO | `0` |
| 12 | `greetingMessage` | `text / text` | YES | `` |
| 13 | `farewellMessage` | `text / text` | YES | `` |
| 14 | `uraFlowId` | `integer(32,0)` | YES | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34666_1_not_null` | CHECK | `` |  |
| `2200_34666_10_not_null` | CHECK | `` |  |
| `2200_34666_11_not_null` | CHECK | `` |  |
| `2200_34666_7_not_null` | CHECK | `` |  |
| `2200_34666_8_not_null` | CHECK | `` |  |
| `2200_34666_9_not_null` | CHECK | `` |  |
| `Whatsapps_uraFlowId_fkey` | FOREIGN KEY | `uraFlowId` | `UraFlows(id)` |
| `Whatsapps_pkey` | PRIMARY KEY | `id` | `Whatsapps(id)` |
| `Whatsapps_name_key` | UNIQUE | `name` | `Whatsapps(name)` |

### Indices

| Nome | Definicao |
|---|---|
| `Whatsapps_name_key` | `CREATE UNIQUE INDEX "Whatsapps_name_key" ON public."Whatsapps" USING btree (name)` |
| `Whatsapps_pkey` | `CREATE UNIQUE INDEX "Whatsapps_pkey" ON public."Whatsapps" USING btree (id)` |

## `WppKeys`

### Colunas

| # | Coluna | Tipo | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `integer(32,0)` | NO | `nextval('"WppKeys_id_seq"'::regclass)` |
| 2 | `connectionId` | `integer(32,0)` | NO | `` |
| 3 | `type` | `text / text` | NO | `` |
| 4 | `keyId` | `text / text` | NO | `` |
| 5 | `value` | `text / text` | NO | `` |
| 6 | `createdAt` | `timestamp with time zone / timestamptz` | NO | `` |
| 7 | `updatedAt` | `timestamp with time zone / timestamptz` | NO | `` |

### Constraints

| Nome | Tipo | Colunas | Referencia |
|---|---|---|---|
| `2200_34674_1_not_null` | CHECK | `` |  |
| `2200_34674_2_not_null` | CHECK | `` |  |
| `2200_34674_3_not_null` | CHECK | `` |  |
| `2200_34674_4_not_null` | CHECK | `` |  |
| `2200_34674_5_not_null` | CHECK | `` |  |
| `2200_34674_6_not_null` | CHECK | `` |  |
| `2200_34674_7_not_null` | CHECK | `` |  |
| `WppKeys_connectionId_fkey` | FOREIGN KEY | `connectionId` | `Whatsapps(id)` |
| `WppKeys_pkey` | PRIMARY KEY | `id` | `WppKeys(id)` |

### Indices

| Nome | Definicao |
|---|---|
| `wpp_keys_connection_type_key_unique` | `CREATE UNIQUE INDEX wpp_keys_connection_type_key_unique ON public."WppKeys" USING btree ("connectionId", type, "keyId")` |
| `WppKeys_pkey` | `CREATE UNIQUE INDEX "WppKeys_pkey" ON public."WppKeys" USING btree (id)` |

