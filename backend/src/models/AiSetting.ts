import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType
} from "sequelize-typescript";

@Table({ tableName: "AiSettings" })
class AiSetting extends Model<AiSetting> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Default("Principal")
  @Column
  name: string;

  @Column
  companyName: string;

  @Column
  serviceType: string;

  @Column(DataType.TEXT)
  behaviorPrompt: string;

  @Default("openai")
  @Column
  provider: string;

  @Default("gpt-4o-mini")
  @Column
  model: string;

  @Column(DataType.TEXT)
  apiKey: string;

  @Column(DataType.TEXT)
  baseUrl: string;

  @Column(DataType.TEXT)
  systemPrompt: string;

  @Default(0.2)
  @Column(DataType.DECIMAL(3, 2))
  temperature: number;

  @Default(800)
  @Column
  maxTokens: number;

  @Default(true)
  @Column
  transferToHumanOnFailure: boolean;

  @Column
  aiQueueId: number;

  @Default(false)
  @Column
  humanHandoffEnabled: boolean;

  @Column
  humanHandoffQueueId: number;

  @Column(DataType.TEXT)
  humanHandoffMessage: string;

  @Default(false)
  @Column
  humanHandoffAlertEnabled: boolean;

  @Column
  humanHandoffAlertTo: string;

  @Column(DataType.TEXT)
  humanHandoffAlertMessage: string;

  @Default(false)
  @Column
  autoCloseEnabled: boolean;

  @Column
  autoCloseMinutes: number;

  @Column(DataType.TEXT)
  autoCloseMessage: string;

  @Column
  autoCloseReasonId: number;

  @Default(true)
  @Column
  autoCloseOnlyIfNotHandedOff: boolean;

  @Default(2)
  @Column
  confirmationMaxAttempts: number;

  @Column(DataType.TEXT)
  confirmationFailureMessage: string;

  @Column(DataType.TEXT)
  allowedTools: string;

  @Default(false)
  @Column
  useGuidedFlow: boolean;

  @Column
  guidedFlowKey: string;

  @Column(DataType.TEXT)
  allowedTransferQueueIds: string;

  @Column
  calendarConnectionId: number;

  @Default(false)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiSetting;
