import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, DataType, ForeignKey, BelongsTo
} from "sequelize-typescript";
import Ticket from "./Ticket";
import AiSetting from "./AiSetting";

@Table({ tableName: "AiToolExecutions" })
class AiToolExecution extends Model<AiToolExecution> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => AiSetting)
  @Column
  aiSettingId: number;

  @BelongsTo(() => AiSetting)
  aiSetting: AiSetting;

  @Column
  toolName: string;

  @Column
  status: string;

  @Column(DataType.TEXT)
  input: string;

  @Column(DataType.TEXT)
  output: string;

  @Column(DataType.TEXT)
  errorMessage: string;

  @Column
  executedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiToolExecution;
