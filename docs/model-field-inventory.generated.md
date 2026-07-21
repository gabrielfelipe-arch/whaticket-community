# Rocket Service - Inventario Gerado De Models E Campos

Gerado em: 2026-07-18

Fonte: `backend/src/models/*.ts`.

Este arquivo lista os campos declarados nos models Sequelize carregados pelo backend. Atualize quando criar/alterar/remover models ou campos.

## AiCalendarConnection / `AiCalendarConnections`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @Column |
| `provider` | `string` | @Column |
| `companyId` | `number` | @Column |
| `createdByUserId` | `number` | @Column |
| `googleAccountEmail` | `string` | @Column |
| `calendarId` | `string` | @Column |
| `calendarName` | `string` | @Column |
| `userPrincipalName` | `string` | @Column |
| `accessToken` | `string` | @Column(DataType.TEXT) |
| `refreshToken` | `string` | @Column(DataType.TEXT) |
| `tokenExpiresAt` | `Date` | @Column |
| `accessTokenEncrypted` | `string` | @Column(DataType.TEXT) |
| `refreshTokenEncrypted` | `string` | @Column(DataType.TEXT) |
| `accessTokenExpiresAt` | `Date` | @Column |
| `scopes` | `string` | @Column(DataType.TEXT) |
| `timezone` | `string` | @Default("America/Sao_Paulo") @Column |
| `active` | `boolean` | @Default(false) @Column |
| `lastSyncAt` | `Date` | @Column |
| `lastError` | `string` | @Column(DataType.TEXT) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## AiInteractionLog / `AiInteractionLogs`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `aiSettingId` | `number` | @ForeignKey(() => AiSetting) @Column |
| `aiSetting` | `AiSetting` | @BelongsTo(() => AiSetting) |
| `ticketId` | `number` | @ForeignKey(() => Ticket) @Column |
| `ticket` | `Ticket` | @BelongsTo(() => Ticket) |
| `provider` | `string` | @Column |
| `modelUsed` | `string` | @Column |
| `promptTokens` | `number` | @Column |
| `completionTokens` | `number` | @Column |
| `totalTokens` | `number` | @Column |
| `status` | `string` | @Column |
| `errorMessage` | `string` | @Column(DataType.TEXT) |
| `intent` | `string` | @Column |
| `action` | `string` | @Column |
| `decisionReason` | `string` | @Column(DataType.TEXT) |
| `userMessage` | `string` | @Column(DataType.TEXT) |
| `aiResponse` | `string` | @Column(DataType.TEXT) |
| `knowledgeIds` | `string` | @Column(DataType.TEXT) |
| `knowledgeTitles` | `string` | @Column(DataType.TEXT) |
| `knowledgeScores` | `string` | @Column(DataType.TEXT) |
| `contextMessageCount` | `number` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## AiLead / `AiLeads`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `ticketId` | `number` | @ForeignKey(() => Ticket) @Column |
| `ticket` | `Ticket` | @BelongsTo(() => Ticket) |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `whatsappId` | `number` | @ForeignKey(() => Whatsapp) @Column |
| `whatsapp` | `Whatsapp` | @BelongsTo(() => Whatsapp) |
| `queueId` | `number` | @ForeignKey(() => Queue) @Column |
| `queue` | `Queue` | @BelongsTo(() => Queue) |
| `aiSettingId` | `number` | @ForeignKey(() => AiSetting) @Column |
| `aiSetting` | `AiSetting` | @BelongsTo(() => AiSetting) |
| `status` | `string` | @Default("novo") @Column |
| `source` | `string` | @Default("ai") @Column |
| `summary` | `string` | @Column(DataType.TEXT) |
| `collectedData` | `string` | @Column(DataType.TEXT) |
| `tagIds` | `string` | @Column(DataType.TEXT) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## AiSetting / `AiSettings`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @Default("Principal") @Column |
| `companyName` | `string` | @Column |
| `serviceType` | `string` | @Column |
| `behaviorPrompt` | `string` | @Column(DataType.TEXT) |
| `provider` | `string` | @Default("openai") @Column |
| `model` | `string` | @Default("gpt-4o-mini") @Column |
| `apiKey` | `string` | @Column(DataType.TEXT) |
| `baseUrl` | `string` | @Column(DataType.TEXT) |
| `systemPrompt` | `string` | @Column(DataType.TEXT) |
| `temperature` | `number` | @Default(0.2) @Column(DataType.DECIMAL(3, 2)) |
| `maxTokens` | `number` | @Default(800) @Column |
| `transferToHumanOnFailure` | `boolean` | @Default(true) @Column |
| `aiQueueId` | `number` | @Column |
| `humanHandoffEnabled` | `boolean` | @Default(false) @Column |
| `humanHandoffQueueId` | `number` | @Column |
| `humanHandoffMessage` | `string` | @Column(DataType.TEXT) |
| `humanHandoffAlertEnabled` | `boolean` | @Default(false) @Column |
| `humanHandoffAlertTo` | `string` | @Column |
| `humanHandoffAlertMessage` | `string` | @Column(DataType.TEXT) |
| `autoCloseEnabled` | `boolean` | @Default(false) @Column |
| `autoCloseMinutes` | `number` | @Column |
| `autoCloseMessage` | `string` | @Column(DataType.TEXT) |
| `autoCloseReasonId` | `number` | @Column |
| `autoCloseOnlyIfNotHandedOff` | `boolean` | @Default(true) @Column |
| `confirmationMaxAttempts` | `number` | @Default(2) @Column |
| `confirmationFailureMessage` | `string` | @Column(DataType.TEXT) |
| `allowedTools` | `string` | @Column(DataType.TEXT) |
| `allowedTransferQueueIds` | `string` | @Column(DataType.TEXT) |
| `calendarConnectionId` | `number` | @Column |
| `active` | `boolean` | @Default(false) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## AiTaggerHistory / `AiTaggerHistories`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `ticketId` | `number` | @ForeignKey(() => Ticket) @Column |
| `ticket` | `Ticket` | @BelongsTo(() => Ticket) |
| `appliedTagId` | `number` | @ForeignKey(() => Tag) @Column |
| `removedTagId` | `number` | @ForeignKey(() => Tag) @Column |
| `classifiedAt` | `Date` | @Column |
| `source` | `string` | @Column |
| `configName` | `string` | @Column |
| `summary` | `string` | @Column(DataType.TEXT) |
| `errorMessage` | `string` | @Column(DataType.TEXT) |
| `noTagApplied` | `boolean` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## AiTicketContext / `AiTicketContexts`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `ticketId` | `number` | @ForeignKey(() => Ticket) @Column |
| `ticket` | `Ticket` | @BelongsTo(() => Ticket) |
| `summary` | `string` | @Column(DataType.TEXT) |
| `collectedData` | `string` | @Column(DataType.TEXT) |
| `missingData` | `string` | @Column(DataType.TEXT) |
| `operationalState` | `string` | @Column(DataType.TEXT) |
| `contradictions` | `string` | @Column(DataType.TEXT) |
| `currentObjective` | `string` | @Column(DataType.TEXT) |
| `nextQuestion` | `string` | @Column(DataType.TEXT) |
| `lastSource` | `string` | @Column |
| `lastAiIntent` | `string` | @Column |
| `lastAiAction` | `string` | @Column |
| `lastAiDecisionReason` | `string` | @Column(DataType.TEXT) |
| `lastKnowledgeIds` | `string` | @Column(DataType.TEXT) |
| `lastUpdatedAt` | `Date` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## AiToolExecution / `AiToolExecutions`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `ticketId` | `number` | @ForeignKey(() => Ticket) @Column |
| `ticket` | `Ticket` | @BelongsTo(() => Ticket) |
| `aiSettingId` | `number` | @ForeignKey(() => AiSetting) @Column |
| `aiSetting` | `AiSetting` | @BelongsTo(() => AiSetting) |
| `toolName` | `string` | @Column |
| `status` | `string` | @Column |
| `input` | `string` | @Column(DataType.TEXT) |
| `output` | `string` | @Column(DataType.TEXT) |
| `errorMessage` | `string` | @Column(DataType.TEXT) |
| `executedAt` | `Date` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## AuditLog / `AuditLogs`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `userId` | `number` | @ForeignKey(() => User) @Column |
| `user` | `User` | @BelongsTo(() => User) |
| `userName` | `string` | @Column |
| `userProfile` | `string` | @Column |
| `action` | `string` | @Column |
| `resource` | `string` | @Column |
| `resourceId` | `string` | @Column |
| `method` | `string` | @Column |
| `route` | `string` | @Column |
| `ip` | `string` | @Column |
| `beforeData` | `string` | @Column(DataType.TEXT) |
| `afterData` | `string` | @Column(DataType.TEXT) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## Campaign / `Campaigns`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @Column |
| `message` | `string` | @Column(DataType.TEXT) |
| `mediaUrl` | `string` | @Column |
| `mediaType` | `string` | @Column |
| `mediaName` | `string` | @Column |
| `audience` | `string` | @Default("contacts") @Column |
| `status` | `string` | @Default("draft") @Column |
| `intervalSeconds` | `number` | @Default(30) @Column |
| `intervalPattern` | `string` | @Column |
| `pauseAfter` | `number` | @Default(20) @Column |
| `pauseSeconds` | `number` | @Default(300) @Column |
| `whatsappId` | `number` | @ForeignKey(() => Whatsapp) @Column |
| `whatsapp` | `Whatsapp` | @BelongsTo(() => Whatsapp) |
| `userId` | `number` | @ForeignKey(() => User) @Column |
| `user` | `User` | @BelongsTo(() => User) |
| `recipients` | `CampaignContact[]` | @HasMany(() => CampaignContact) |
| `startedAt` | `Date` | @Column |
| `pausedAt` | `Date` | @Column |
| `canceledAt` | `Date` | @Column |
| `completedAt` | `Date` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## CampaignContact / `CampaignContacts`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `campaignId` | `number` | @ForeignKey(() => Campaign) @Column |
| `campaign` | `Campaign` | @BelongsTo(() => Campaign) |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `status` | `string` | @Default("pending") @Column |
| `attempts` | `number` | @Default(0) @Column |
| `sentAt` | `Date` | @Column |
| `nextRunAt` | `Date` | @Column |
| `errorMessage` | `string` | @Column(DataType.TEXT) |
| `lastAttemptAt` | `Date` | @Column |
| `errorAt` | `Date` | @Column |
| `providerResponse` | `string` | @Column(DataType.TEXT) |
| `messageId` | `string` | @Column |
| `lockedAt` | `Date` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## CampaignRecipientLog / `CampaignRecipientLogs`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `campaignId` | `number` | @ForeignKey(() => Campaign) @Column |
| `campaign` | `Campaign` | @BelongsTo(() => Campaign) |
| `campaignContactId` | `number` | @ForeignKey(() => CampaignContact) @Column |
| `campaignContact` | `CampaignContact` | @BelongsTo(() => CampaignContact) |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `whatsappId` | `number` | @ForeignKey(() => Whatsapp) @Column |
| `whatsapp` | `Whatsapp` | @BelongsTo(() => Whatsapp) |
| `phoneNumber` | `string` | @Column |
| `message` | `string` | @Column(DataType.TEXT) |
| `status` | `string` | @Default("pending") @Column |
| `attemptNumber` | `number` | @Default(0) @Column |
| `attemptedAt` | `Date` | @Column |
| `sentAt` | `Date` | @Column |
| `errorAt` | `Date` | @Column |
| `errorMessage` | `string` | @Column(DataType.TEXT) |
| `providerResponse` | `string` | @Column(DataType.TEXT) |
| `messageId` | `string` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## ClosingReason / `ClosingReasons`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @AllowNull(false) @Column |
| `description` | `string` | @Column(DataType.TEXT) |
| `farewellMessage` | `string` | @Column(DataType.TEXT) |
| `sendFarewellMessage` | `boolean` | @Default(false) @Column |
| `active` | `boolean` | @Default(true) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## CommercialIncludedItem / `CommercialIncludedItems`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `commercialServiceId` | `number` | @ForeignKey(() => CommercialService) @Column |
| `commercialService` | `CommercialService` | @BelongsTo(() => CommercialService) |
| `label` | `string` | @Column |
| `description` | `string` | @Column(DataType.TEXT) |
| `sortOrder` | `number` | @Default(0) @Column |
| `active` | `boolean` | @Default(true) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## CommercialPriceRule / `CommercialPriceRules`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `commercialServiceId` | `number` | @ForeignKey(() => CommercialService) @Column |
| `commercialService` | `CommercialService` | @BelongsTo(() => CommercialService) |
| `name` | `string` | @Column |
| `code` | `string` | @Column |
| `ruleType` | `string` | @Column |
| `mode` | `string` | @Column |
| `quantity` | `number` | @Column(DataType.DECIMAL(12, 2)) |
| `quantityMin` | `number` | @Column(DataType.DECIMAL(12, 2)) |
| `quantityMax` | `number` | @Column(DataType.DECIMAL(12, 2)) |
| `unitPrice` | `number` | @Column(DataType.DECIMAL(12, 2)) |
| `totalPrice` | `number` | @Column(DataType.DECIMAL(12, 2)) |
| `currency` | `string` | @Default("BRL") @Column |
| `minCommitmentMonths` | `number` | @Column |
| `metadata` | `string` | @Column(DataType.TEXT) |
| `sortOrder` | `number` | @Default(0) @Column |
| `active` | `boolean` | @Default(true) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## CommercialQuoteSimulation / `CommercialQuoteSimulations`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `ticketId` | `number` | @ForeignKey(() => Ticket) @Column |
| `ticket` | `Ticket` | @BelongsTo(() => Ticket) |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `aiSettingId` | `number` | @ForeignKey(() => AiSetting) @Column |
| `aiSetting` | `AiSetting` | @BelongsTo(() => AiSetting) |
| `commercialServiceId` | `number` | @ForeignKey(() => CommercialService) @Column |
| `commercialService` | `CommercialService` | @BelongsTo(() => CommercialService) |
| `status` | `string` | @Default("success") @Column |
| `input` | `string` | @Column(DataType.TEXT) |
| `result` | `string` | @Column(DataType.TEXT) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## CommercialService / `CommercialServices`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `aiSettingId` | `number` | @ForeignKey(() => AiSetting) @Column |
| `aiSetting` | `AiSetting` | @BelongsTo(() => AiSetting) |
| `name` | `string` | @Column |
| `slug` | `string` | @Column |
| `description` | `string` | @Column(DataType.TEXT) |
| `category` | `string` | @Column |
| `unitLabel` | `string` | @Column |
| `capacityMin` | `number` | @Column |
| `capacityMax` | `number` | @Column |
| `maxDurationPerOccurrence` | `number` | @Column |
| `metadata` | `string` | @Column(DataType.TEXT) |
| `active` | `boolean` | @Default(true) @Column |
| `includedItems` | `CommercialIncludedItem[]` | @HasMany(() => CommercialIncludedItem) |
| `priceRules` | `CommercialPriceRule[]` | @HasMany(() => CommercialPriceRule) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## Contact / `Contact`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @Column |
| `number` | `string` | @Unique @Column |
| `lid` | `string` | @Unique @Column |
| `email` | `string` | @AllowNull(false) @Default("") @Column |
| `profilePicUrl` | `string` | @Column |
| `isGroup` | `boolean` | @Default(false) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |
| `tickets` | `Ticket[]` | @HasMany(() => Ticket) |
| `extraInfo` | `ContactCustomField[]` | @HasMany(() => ContactCustomField) |
| `tags` | `Array<Tag & { ContactTag: ContactTag }>` | @BelongsToMany(() => Tag, () => ContactTag) |

## ContactCustomField / `ContactCustomField`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @Column |
| `value` | `string` | @Column |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## ContactTag / `ContactTags`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `tagId` | `number` | @ForeignKey(() => Tag) @Column |
| `tag` | `Tag` | @BelongsTo(() => Tag) |
| `appliedAt` | `Date` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## GlpiCategory / `GlpiCategories`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `glpiId` | `number` | @AllowNull(false) @Column |
| `glpiConfigurationId` | `number` | @ForeignKey(() => GlpiConfiguration) @Column |
| `name` | `string` | @AllowNull(false) @Column |
| `completeName` | `string` | @Column |
| `active` | `boolean` | @Default(true) @Column |
| `rawData` | `string` | @Column(DataType.TEXT) |
| `lastSyncAt` | `Date` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## GlpiConfiguration / `GlpiConfigurations`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @AllowNull(false) @Column |
| `active` | `boolean` | @Default(true) @Column |
| `settings` | `string` | @AllowNull(false) @Default("{}") @Column(DataType.TEXT) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |
| `whatsappLinks` | `GlpiConfigurationWhatsapp[]` | @HasMany(() => GlpiConfigurationWhatsapp) |

## GlpiConfigurationWhatsapp / `GlpiConfigurationWhatsapps`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `glpiConfigurationId` | `number` | @AllowNull(false) @ForeignKey(() => GlpiConfiguration) @Column |
| `whatsappId` | `number` | @AllowNull(false) @ForeignKey(() => Whatsapp) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |
| `configuration` | `GlpiConfiguration` | @BelongsTo(() => GlpiConfiguration) |
| `whatsapp` | `Whatsapp` | @BelongsTo(() => Whatsapp) |

## GlpiEntity / `GlpiEntities`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `glpiId` | `number` | @AllowNull(false) @Column |
| `glpiConfigurationId` | `number` | @ForeignKey(() => GlpiConfiguration) @Column |
| `name` | `string` | @AllowNull(false) @Column |
| `completeName` | `string` | @Column |
| `active` | `boolean` | @Default(true) @Column |
| `rawData` | `string` | @Column(DataType.TEXT) |
| `lastSyncAt` | `Date` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## GlpiLocation / `GlpiLocations`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `glpiId` | `number` | @AllowNull(false) @Column |
| `glpiConfigurationId` | `number` | @ForeignKey(() => GlpiConfiguration) @Column |
| `name` | `string` | @AllowNull(false) @Column |
| `completeName` | `string` | @Column |
| `entityId` | `number` | @Column |
| `active` | `boolean` | @Default(true) @Column |
| `rawData` | `string` | @Column(DataType.TEXT) |
| `lastSyncAt` | `Date` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## GlpiLog / `GlpiLogs`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `action` | `string` | @AllowNull(false) @Column |
| `status` | `string` | @AllowNull(false) @Column |
| `message` | `string` | @Column(DataType.TEXT) |
| `ticketId` | `number` | @Column |
| `userId` | `number` | @Column |
| `payload` | `string` | @Column(DataType.TEXT) |
| `response` | `string` | @Column(DataType.TEXT) |
| `error` | `string` | @Column(DataType.TEXT) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## GlpiTicketLink / `GlpiTicketLinks`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `ticketId` | `number` | @AllowNull(false) @ForeignKey(() => Ticket) @Column |
| `ticket` | `Ticket` | @BelongsTo(() => Ticket) |
| `glpiTicketId` | `number` | @AllowNull(false) @Column |
| `glpiTicketNumber` | `string` | @Column |
| `title` | `string` | @AllowNull(false) @Column |
| `description` | `string` | @AllowNull(false) @Column(DataType.TEXT) |
| `entityId` | `number` | @AllowNull(false) @Column |
| `entityName` | `string` | @Column |
| `categoryId` | `number` | @AllowNull(false) @Column |
| `categoryName` | `string` | @Column |
| `locationId` | `number` | @Column |
| `locationName` | `string` | @Column |
| `createdByUserId` | `number` | @ForeignKey(() => User) @Column |
| `createdByUser` | `User` | @BelongsTo(() => User) |
| `descriptionMode` | `string` | @Default("manual") @Column |
| `selectedMessageIds` | `string` | @Column(DataType.TEXT) |
| `glpiUrl` | `string` | @Column |
| `status` | `string` | @Default("created") @Column |
| `rawResponse` | `string` | @Column(DataType.TEXT) |
| `error` | `string` | @Column(DataType.TEXT) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## KnowledgeBaseArticle / `KnowledgeBaseArticles`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `title` | `string` | @AllowNull(false) @Column |
| `content` | `string` | @AllowNull(false) @Column(DataType.TEXT) |
| `contentHtml` | `string` | @Column(DataType.TEXT) |
| `tags` | `string` | @Column |
| `active` | `boolean` | @Default(true) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## KnowledgeBaseChunk / `KnowledgeBaseChunks`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `articleId` | `number` | @ForeignKey(() => KnowledgeBaseArticle) @AllowNull(false) @Column |
| `article` | `KnowledgeBaseArticle` | @BelongsTo(() => KnowledgeBaseArticle) |
| `aiSettingId` | `number` | @ForeignKey(() => AiSetting) @Column |
| `aiSetting` | `AiSetting` | @BelongsTo(() => AiSetting) |
| `title` | `string` | @Column |
| `section` | `string` | @Column |
| `content` | `string` | @AllowNull(false) @Column(DataType.TEXT) |
| `tags` | `string` | @Column(DataType.TEXT) |
| `embedding` | `string` | @AllowNull(false) @Column(DataType.TEXT) |
| `contentHash` | `string` | @AllowNull(false) @Column |
| `active` | `boolean` | @Default(true) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## Message / `Message`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `string` | @PrimaryKey @Column |
| `ack` | `number` | @Default(0) @Column |
| `read` | `boolean` | @Default(false) @Column |
| `fromMe` | `boolean` | @Default(false) @Column |
| `senderType` | `string` | @Column |
| `aiSessionStartedAt` | `Date` | @Column |
| `body` | `string` | @Column(DataType.TEXT) |
| `mediaType` | `string` | @Column(DataType.STRING) @Column |
| `isDeleted` | `boolean` | @Default(false) @Column |
| `reactions` | `Record<string, string>` | @Default({}) @Column(DataType.JSONB) |
| `createdAt` | `Date` | @CreatedAt @Column(DataType.DATE(6)) |
| `updatedAt` | `Date` | @UpdatedAt @Column(DataType.DATE(6)) |
| `quotedMsgId` | `string` | @ForeignKey(() => Message) @Column |
| `quotedMsg` | `Message` | @BelongsTo(() => Message, "quotedMsgId") |
| `ticketId` | `number` | @ForeignKey(() => Ticket) @Column |
| `ticket` | `Ticket` | @BelongsTo(() => Ticket) |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact, "contactId") |

## QualificationForm / `QualificationForms`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @Column |
| `description` | `string` | @Column(DataType.TEXT) |
| `greetingMessage` | `string` | @Column(DataType.TEXT) |
| `active` | `boolean` | @Default(true) @Column |
| `questions` | `QualificationFormQuestion[]` | @HasMany(() => QualificationFormQuestion) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## QualificationFormAnswer / `QualificationFormAnswers`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `responseId` | `number` | @ForeignKey(() => QualificationFormResponse) @Column |
| `response` | `QualificationFormResponse` | @BelongsTo(() => QualificationFormResponse) |
| `questionId` | `number` | @ForeignKey(() => QualificationFormQuestion) @Column |
| `question` | `QualificationFormQuestion` | @BelongsTo(() => QualificationFormQuestion) |
| `key` | `string` | @Column |
| `label` | `string` | @Column(DataType.TEXT) |
| `value` | `string` | @Column(DataType.TEXT) |
| `rawValue` | `string` | @Column(DataType.TEXT) |
| `optionLabel` | `string` | @Column(DataType.TEXT) |
| `includeInAiContext` | `boolean` | @Default(true) @Column |
| `includeInReports` | `boolean` | @Default(true) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## QualificationFormQuestion / `QualificationFormQuestions`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `formId` | `number` | @ForeignKey(() => QualificationForm) @Column |
| `form` | `QualificationForm` | @BelongsTo(() => QualificationForm) |
| `key` | `string` | @Column |
| `label` | `string` | @Column(DataType.TEXT) |
| `type` | `string` | @Default("text") @Column |
| `glpiField` | `string` | @Default("description") @Column |
| `options` | `string` | @Column(DataType.TEXT) |
| `required` | `boolean` | @Default(true) @Column |
| `includeInAiContext` | `boolean` | @Default(true) @Column |
| `includeInReports` | `boolean` | @Default(true) @Column |
| `maxInvalidAttempts` | `number` | @Default(2) @Column |
| `order` | `number` | @Default(0) @Column |
| `active` | `boolean` | @Default(true) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## QualificationFormResponse / `QualificationFormResponses`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `formId` | `number` | @ForeignKey(() => QualificationForm) @Column |
| `form` | `QualificationForm` | @BelongsTo(() => QualificationForm) |
| `ticketId` | `number` | @ForeignKey(() => Ticket) @Column |
| `ticket` | `Ticket` | @BelongsTo(() => Ticket) |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `whatsappId` | `number` | @ForeignKey(() => Whatsapp) @Column |
| `whatsapp` | `Whatsapp` | @BelongsTo(() => Whatsapp) |
| `queueId` | `number` | @ForeignKey(() => Queue) @Column |
| `queue` | `Queue` | @BelongsTo(() => Queue) |
| `uraOptionId` | `number` | @ForeignKey(() => UraOption) @Column |
| `uraOption` | `UraOption` | @BelongsTo(() => UraOption) |
| `status` | `string` | @Default("in_progress") @Column |
| `currentQuestionId` | `number` | @Column |
| `invalidAttempts` | `number` | @Default(0) @Column |
| `afterAction` | `string` | @Column |
| `afterQueueId` | `number` | @Column |
| `completedAt` | `Date` | @Column |
| `answers` | `QualificationFormAnswer[]` | @HasMany(() => QualificationFormAnswer) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## Queue / `Queue`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @AllowNull(false) @Unique @Column |
| `color` | `string` | @AllowNull(false) @Unique @Column |
| `greetingMessage` | `string` | @Column |
| `businessHoursEnabled` | `boolean` | @Default(false) @Column |
| `businessHoursMode` | `string` | @Default("always") @Column |
| `businessHours` | `string` | @Column(DataType.TEXT) |
| `unavailableMessage` | `string` | @Column(DataType.TEXT) |
| `unavailableMediaUrl` | `string` | @Column |
| `unavailableMediaType` | `string` | @Column |
| `unavailableMediaName` | `string` | @Column |
| `distributionMode` | `string` | @Default("manual_free") @Column |
| `maxActiveTicketsPerUser` | `number` | @Column |
| `balanceAction` | `string` | @Default("ignore") @Column |
| `overflowAction` | `string` | @Default("keep_waiting") @Column |
| `lastAssignedUserId` | `number` | @ForeignKey(() => User) @Column |
| `lastAssignedUser` | `User` | @BelongsTo(() => User, "lastAssignedUserId") |
| `sendQueuePositionMessage` | `boolean` | @Default(false) @Column |
| `scheduledReturnWindowHours` | `number` | @Default(24) @Column |
| `queuePositionMessage` | `string` | @Column(DataType.TEXT) |
| `blockIfUserHasStalledTicket` | `boolean` | @Default(false) @Column |
| `stalledTicketMinutes` | `number` | @Column |
| `stalledTicketAction` | `string` | @Default("ignore") @Column |
| `useAI` | `boolean` | @Default(false) @Column |
| `glpiEnabled` | `boolean` | @Default(false) @Column |
| `aiSettingId` | `number` | @ForeignKey(() => AiSetting) @Column |
| `aiSetting` | `AiSetting` | @BelongsTo(() => AiSetting) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |
| `whatsapps` | `Array<Whatsapp & { WhatsappQueue: WhatsappQueue }>` | @BelongsToMany(() => Whatsapp, () => WhatsappQueue) |
| `users` | `Array<User & { UserQueue: UserQueue }>` | @BelongsToMany(() => User, () => UserQueue) |

## QueueDistributionLog / `QueueDistributionLog`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `ticketId` | `number` | @ForeignKey(() => Ticket) @Column |
| `ticket` | `Ticket` | @BelongsTo(() => Ticket) |
| `queueId` | `number` | @ForeignKey(() => Queue) @Column |
| `queue` | `Queue` | @BelongsTo(() => Queue) |
| `userId` | `number` | @ForeignKey(() => User) @Column |
| `user` | `User` | @BelongsTo(() => User) |
| `action` | `string` | @Column |
| `distributionMode` | `string` | @Column |
| `attendantStatus` | `string` | @Column |
| `userActiveTickets` | `number` | @Column |
| `reason` | `string` | @Column(DataType.TEXT) |
| `metadata` | `string` | @Column(DataType.TEXT) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## QuickAnswer / `QuickAnswers`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `shortcut` | `string` | @Column(DataType.TEXT) |
| `message` | `string` | @Column(DataType.TEXT) |
| `mediaUrl` | `string` | @Column |
| `mediaType` | `string` | @Column |
| `mediaName` | `string` | @Column |
| `global` | `boolean` | @Default(true) @Column |
| `userId` | `number` | @ForeignKey(() => User) @Column |
| `user` | `User` | @BelongsTo(() => User) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## SatisfactionSurvey / `SatisfactionSurveys`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @AllowNull(false) @Column |
| `question` | `string` | @AllowNull(false) @Column(DataType.TEXT) |
| `thankYouMessage` | `string` | @Column(DataType.TEXT) |
| `collectFeedbackText` | `boolean` | @Default(false) @Column |
| `feedbackQuestion` | `string` | @Column(DataType.TEXT) |
| `feedbackTimeoutMinutes` | `number` | @Default(60) @Column |
| `scaleType` | `string` | @Default("1_5") @Column |
| `sendMode` | `string` | @Default("optional") @Column |
| `active` | `boolean` | @Default(true) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |
| `responses` | `SatisfactionSurveyResponse[]` | @HasMany(() => SatisfactionSurveyResponse) |

## SatisfactionSurveyResponse / `SatisfactionSurveyResponses`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `satisfactionSurveyId` | `number` | @ForeignKey(() => SatisfactionSurvey) @Column |
| `satisfactionSurvey` | `SatisfactionSurvey` | @BelongsTo(() => SatisfactionSurvey) |
| `ticketId` | `number` | @ForeignKey(() => Ticket) @Column |
| `ticket` | `Ticket` | @BelongsTo(() => Ticket) |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `userId` | `number` | @ForeignKey(() => User) @Column |
| `user` | `User` | @BelongsTo(() => User) |
| `queueId` | `number` | @ForeignKey(() => Queue) @Column |
| `queue` | `Queue` | @BelongsTo(() => Queue) |
| `categoryId` | `number` | @ForeignKey(() => TicketCategory) @Column |
| `category` | `TicketCategory` | @BelongsTo(() => TicketCategory) |
| `closingReasonId` | `number` | @ForeignKey(() => ClosingReason) @Column |
| `closingReason` | `ClosingReason` | @BelongsTo(() => ClosingReason) |
| `rating` | `number` | @Column |
| `rawAnswer` | `string` | @Column |
| `feedbackType` | `string` | @Column |
| `feedbackText` | `string` | @Column(DataType.TEXT) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## ScheduledMessage / `ScheduledMessages`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `whatsappId` | `number` | @ForeignKey(() => Whatsapp) @Column |
| `whatsapp` | `Whatsapp` | @BelongsTo(() => Whatsapp) |
| `userId` | `number` | @ForeignKey(() => User) @Column |
| `user` | `User` | @BelongsTo(() => User) |
| `sourceTicketId` | `number` | @ForeignKey(() => Ticket) @Column |
| `sourceTicket` | `Ticket` | @BelongsTo(() => Ticket, "sourceTicketId") |
| `returnQueueId` | `number` | @ForeignKey(() => Queue) @Column |
| `returnQueue` | `Queue` | @BelongsTo(() => Queue, "returnQueueId") |
| `returnContext` | `string` | @Column(DataType.TEXT) |
| `returnWindowMinutes` | `number` | @Default(1440) @Column |
| `returnWindowExpiresAt` | `Date` | @Column |
| `returnHandledAt` | `Date` | @Column |
| `batchId` | `string` | @Column |
| `sendType` | `string` | @Default("scheduled") @Column |
| `tagIds` | `number[]` | @Column(DataType.JSONB) |
| `excludeTagIds` | `number[]` | @Column(DataType.JSONB) |
| `tagAppliedLastDays` | `number` | @Column |
| `sequence` | `number` | @Default(0) @Column |
| `message` | `string` | @Column(DataType.TEXT) |
| `mediaUrl` | `string` | @Column |
| `mediaType` | `string` | @Column |
| `mediaName` | `string` | @Column |
| `scheduledAt` | `Date` | @Column |
| `nextRunAt` | `Date` | @Column |
| `intervalSeconds` | `number` | @Default(30) @Column |
| `intervalPattern` | `string` | @Column |
| `pauseAfter` | `number` | @Default(20) @Column |
| `pauseSeconds` | `number` | @Default(300) @Column |
| `status` | `string` | @Default("pending") @Column |
| `sentAt` | `Date` | @Column |
| `errorMessage` | `string` | @Column(DataType.TEXT) |
| `recurrenceType` | `string` | @Column |
| `weekdays` | `number[]` | @Column(DataType.JSONB) |
| `times` | `string[]` | @Column(DataType.JSONB) |
| `startsAt` | `Date` | @Column |
| `endsAt` | `Date` | @Column |
| `lastRunAt` | `Date` | @Column |
| `canceledAt` | `Date` | @Column |
| `repeatEvery` | `number` | @Column |
| `repeatUnit` | `string` | @Column |
| `maxRuns` | `number` | @Column |
| `runCount` | `number` | @Default(0) @Column |
| `respectBusinessHours` | `boolean` | @Default(false) @Column |
| `missedRunPolicy` | `string` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## ScheduledMessageExecution / `ScheduledMessageExecutions`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `scheduleId` | `number` | @ForeignKey(() => ScheduledMessage) @Column |
| `schedule` | `ScheduledMessage` | @BelongsTo(() => ScheduledMessage) |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `whatsappId` | `number` | @ForeignKey(() => Whatsapp) @Column |
| `whatsapp` | `Whatsapp` | @BelongsTo(() => Whatsapp) |
| `scheduledFor` | `Date` | @Column |
| `executedAt` | `Date` | @Column |
| `status` | `string` | @Default("pending") @Column |
| `attempts` | `number` | @Default(0) @Column |
| `errorMessage` | `string` | @Column(DataType.TEXT) |
| `messageId` | `string` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## Setting / `Setting`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `key` | `string` | @PrimaryKey @Column |
| `value` | `string` | @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## Tag / `Tags`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @AllowNull(false) @Unique @Column |
| `color` | `string` | @Default("#607d8b") @Column |
| `fixed` | `boolean` | @Default(false) @Column |
| `contacts` | `Array<Contact & { ContactTag: ContactTag }>` | @BelongsToMany(() => Contact, () => ContactTag) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## Ticket / `Ticket`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `status` | `string` | @Column({ defaultValue: "pending" }) |
| `unreadMessages` | `number` | @Column |
| `lastMessage` | `string` | @Column |
| `isGroup` | `boolean` | @Default(false) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |
| `userId` | `number` | @ForeignKey(() => User) @Column |
| `user` | `User` | @BelongsTo(() => User) |
| `contactId` | `number` | @ForeignKey(() => Contact) @Column |
| `contact` | `Contact` | @BelongsTo(() => Contact) |
| `whatsappId` | `number` | @ForeignKey(() => Whatsapp) @Column |
| `whatsapp` | `Whatsapp` | @BelongsTo(() => Whatsapp) |
| `queueId` | `number` | @ForeignKey(() => Queue) @Column |
| `queue` | `Queue` | @BelongsTo(() => Queue) |
| `queuePositionMessageSentAt` | `Date` | @Column |
| `queueEnteredAt` | `Date` | @Column |
| `categoryId` | `number` | @ForeignKey(() => TicketCategory) @Column |
| `category` | `TicketCategory` | @BelongsTo(() => TicketCategory) |
| `closingReasonId` | `number` | @ForeignKey(() => ClosingReason) @Column |
| `closingReason` | `ClosingReason` | @BelongsTo(() => ClosingReason) |
| `closingNote` | `string` | @Column |
| `glpiTicketId` | `number` | @Column |
| `uraFlowId` | `number` | @Column |
| `uraMenuSentAt` | `Date` | @Column |
| `currentUraOptionId` | `number` | @Column |
| `uraInvalidAttempts` | `number` | @Default(0) @Column |
| `uraActive` | `boolean` | @Default(false) @Column |
| `lastUraInteractionAt` | `Date` | @Column |
| `aiActive` | `boolean` | @Default(false) @Column |
| `aiHandled` | `boolean` | @Default(false) @Column |
| `aiHumanHandoffAt` | `Date` | @Column |
| `aiHumanHandoffQueueId` | `number` | @Column |
| `aiHumanHandoffMessage` | `string` | @Column(DataType.TEXT) |
| `aiTaggerClassifiedAt` | `Date` | @Column |
| `aiHumanHandoffAlertSent` | `boolean` | @Default(false) @Column |
| `aiHandoffAlertEnabled` | `boolean` | @Column |
| `aiHandoffAlertTo` | `string` | @Column |
| `aiHandoffAlertMessage` | `string` | @Column(DataType.TEXT) |
| `aiAutoClosed` | `boolean` | @Default(false) @Column |
| `aiAutoClosedAt` | `Date` | @Column |
| `aiAutoCloseEnabled` | `boolean` | @Default(false) @Column |
| `aiAutoCloseMinutes` | `number` | @Column |
| `aiAutoCloseMessage` | `string` | @Column(DataType.TEXT) |
| `aiAutoCloseReasonId` | `number` | @Column |
| `aiAutoCloseOnlyIfNotHandedOff` | `boolean` | @Default(true) @Column |
| `aiSettingId` | `number` | @Column |
| `aiQueueId` | `number` | @Column |
| `aiStartedAt` | `Date` | @Column |
| `aiFinishedAt` | `Date` | @Column |
| `lastAiQuestionType` | `string` | @Column |
| `lastAiQuestionOptions` | `string` | @Column |
| `lastAiQuestionAt` | `Date` | @Column |
| `lastAiQuestionAttempts` | `number` | @Default(0) @Column |
| `lastAiInteractionAt` | `Date` | @Column |
| `lastAiMessage` | `string` | @Column(DataType.TEXT) |
| `lastAiExpectedReply` | `string` | @Column |
| `lastAiIntent` | `string` | @Column |
| `lastAiAction` | `string` | @Column |
| `lastAiKnowledgeIds` | `string` | @Column(DataType.TEXT) |
| `lastAiDecisionReason` | `string` | @Column(DataType.TEXT) |
| `lastAiAskedMoreHelp` | `boolean` | @Default(false) @Column |
| `aiInteractionCount` | `number` | @Default(0) @Column |
| `aiConversationSummary` | `string` | @Column(DataType.TEXT) |
| `satisfactionSurveyId` | `number` | @Column |
| `satisfactionSurveySentAt` | `Date` | @Column |
| `satisfactionSurveyAnsweredAt` | `Date` | @Column |
| `satisfactionFeedbackPendingAt` | `Date` | @Column |
| `satisfactionFeedbackExpiresAt` | `Date` | @Column |
| `satisfactionFeedbackClosedAt` | `Date` | @Column |
| `messages` | `Message[]` | @HasMany(() => Message) |

## TicketCategory / `TicketCategories`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @AllowNull(false) @Column |
| `description` | `string` | @Column(DataType.TEXT) |
| `active` | `boolean` | @Default(true) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## UraFlow / `UraFlows`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @AllowNull(false) @Column |
| `description` | `string` | @Column(DataType.TEXT) |
| `welcomeMessage` | `string` | @AllowNull(false) @Column(DataType.TEXT) |
| `welcomeMediaUrl` | `string` | @Column |
| `welcomeMediaType` | `string` | @Column |
| `welcomeMediaName` | `string` | @Column |
| `invalidOptionMessage` | `string` | @Column(DataType.TEXT) |
| `maxInvalidAttempts` | `number` | @Default(3) @Column |
| `fallbackQueueId` | `number` | @Column |
| `active` | `boolean` | @Default(true) @Column |
| `aiAutoCloseEnabled` | `boolean` | @Default(false) @Column |
| `aiAutoCloseMinutes` | `number` | @Column |
| `aiAutoCloseMessage` | `string` | @Column(DataType.TEXT) |
| `aiAutoCloseReasonId` | `number` | @Column |
| `aiAutoCloseOnlyIfNotHandedOff` | `boolean` | @Default(true) @Column |
| `options` | `UraOption[]` | @HasMany(() => UraOption) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## UraOption / `UraOptions`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `flowId` | `number` | @ForeignKey(() => UraFlow) @AllowNull(false) @Column |
| `flow` | `UraFlow` | @BelongsTo(() => UraFlow) |
| `parentOptionId` | `number` | @ForeignKey(() => UraOption) @Column |
| `parentOption` | `UraOption` | @BelongsTo(() => UraOption) |
| `optionKey` | `string` | @AllowNull(false) @Column |
| `title` | `string` | @AllowNull(false) @Column |
| `responseMessage` | `string` | @Column(DataType.TEXT) |
| `responseMediaUrl` | `string` | @Column |
| `responseMediaType` | `string` | @Column |
| `responseMediaName` | `string` | @Column |
| `action` | `string` | @Default("SEND_MESSAGE") @Column |
| `targetQueueId` | `number` | @Column |
| `closingReasonId` | `number` | @Column |
| `qualificationFormId` | `number` | @ForeignKey(() => QualificationForm) @Column |
| `qualificationForm` | `QualificationForm` | @BelongsTo(() => QualificationForm) |
| `runQualificationFormBeforeAction` | `boolean` | @Default(false) @Column |
| `allowQualificationFormSkip` | `boolean` | @Default(false) @Column |
| `showMainMenuAfterMessage` | `boolean` | @Default(false) @Column |
| `aiHumanHandoffEnabled` | `boolean` | @Default(false) @Column |
| `aiHumanHandoffQueueId` | `number` | @Column |
| `aiHumanHandoffMessage` | `string` | @Column(DataType.TEXT) |
| `aiAutoCloseEnabled` | `boolean` | @Default(false) @Column |
| `aiAutoCloseMinutes` | `number` | @Column |
| `aiAutoCloseMessage` | `string` | @Column(DataType.TEXT) |
| `aiAutoCloseReasonId` | `number` | @Column |
| `aiAutoCloseOnlyIfNotHandedOff` | `boolean` | @Default(true) @Column |
| `aiHandoffAlertEnabled` | `boolean` | @Default(false) @Column |
| `aiHandoffAlertTo` | `string` | @Column |
| `aiHandoffAlertMessage` | `string` | @Column(DataType.TEXT) |
| `order` | `number` | @Default(0) @Column |
| `active` | `boolean` | @Default(true) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## User / `User`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @Column |
| `email` | `string` | @Column |
| `password` | `string` | @Column(DataType.VIRTUAL) |
| `passwordHash` | `string` | @Column |
| `tokenVersion` | `number` | @Default(0) @Column |
| `profile` | `string` | @Default("user") @Column |
| `active` | `boolean` | @Default(true) @Column |
| `glpiEnabled` | `boolean` | @Default(false) @Column |
| `glpiUserToken` | `string` | @Column(DataType.TEXT) |
| `specialPermissions` | `string` | @Column(DataType.TEXT) |
| `attendanceGreeting` | `string` | @Column(DataType.TEXT) |
| `operationalStatus` | `string` | @Default("offline") @Column |
| `lastActivityAt` | `Date` | @Column |
| `lastStatusChangeAt` | `Date` | @Column |
| `statusReason` | `string` | @Column |
| `whatsappId` | `number` | @ForeignKey(() => Whatsapp) @Column |
| `whatsapp` | `Whatsapp` | @BelongsTo(() => Whatsapp) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |
| `tickets` | `Ticket[]` | @HasMany(() => Ticket) |
| `quickAnswers` | `QuickAnswer[]` | @HasMany(() => QuickAnswer) |
| `queues` | `Queue[]` | @BelongsToMany(() => Queue, () => UserQueue) |

## UserQueue / `UserQueue`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `userId` | `number` | @ForeignKey(() => User) @Column |
| `queueId` | `number` | @ForeignKey(() => Queue) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |

## Whatsapp / `Whatsapp`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `name` | `string` | @AllowNull @Unique @Column(DataType.TEXT) |
| `session` | `string` | @Column(DataType.TEXT) |
| `qrcode` | `string` | @Column(DataType.TEXT) |
| `status` | `string` | @Column |
| `battery` | `string` | @Column |
| `plugged` | `boolean` | @Column |
| `retries` | `number` | @Column |
| `greetingMessage` | `string` | @Column(DataType.TEXT) |
| `farewellMessage` | `string` | @Column(DataType.TEXT) |
| `isDefault` | `boolean` | @Default(false) @AllowNull @Column |
| `uraFlowId` | `number` | @ForeignKey(() => UraFlow) @Column |
| `uraFlow` | `UraFlow` | @BelongsTo(() => UraFlow) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |
| `tickets` | `Ticket[]` | @HasMany(() => Ticket) |
| `queues` | `Array<Queue & { WhatsappQueue: WhatsappQueue }>` | @BelongsToMany(() => Queue, () => WhatsappQueue) |
| `whatsappQueues` | `WhatsappQueue[]` | @HasMany(() => WhatsappQueue) |

## WhatsappQueue / `WhatsappQueue`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `whatsappId` | `number` | @ForeignKey(() => Whatsapp) @Column |
| `queueId` | `number` | @ForeignKey(() => Queue) @Column |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |
| `queue` | `Queue` | @BelongsTo(() => Queue) |

## WppKey / `WppKey`

| Campo | Tipo TS | Decorators/relacao |
|---|---|---|
| `id` | `number` | @PrimaryKey @AutoIncrement @Column |
| `connectionId` | `number` | @ForeignKey(() => Whatsapp) @Column |
| `type` | `string` | @Column(DataType.TEXT) |
| `keyId` | `string` | @Column(DataType.TEXT) |
| `value` | `string` | @Column(DataType.TEXT) |
| `createdAt` | `Date` | @CreatedAt |
| `updatedAt` | `Date` | @UpdatedAt |
| `whatsapp` | `Whatsapp` | @BelongsTo(() => Whatsapp) |

