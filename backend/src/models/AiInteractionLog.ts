import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import AiSetting from "./AiSetting";
import Ticket from "./Ticket";

@Table({ tableName: "AiInteractionLogs" })
class AiInteractionLog extends Model<AiInteractionLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => AiSetting)
  @Column
  aiSettingId: number;

  @BelongsTo(() => AiSetting)
  aiSetting: AiSetting;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @Column
  provider: string;

  @Column
  modelUsed: string;

  @Column
  promptTokens: number;

  @Column
  completionTokens: number;

  @Column
  totalTokens: number;

  @Column
  status: string;

  @Column(DataType.TEXT)
  errorMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiInteractionLog;
