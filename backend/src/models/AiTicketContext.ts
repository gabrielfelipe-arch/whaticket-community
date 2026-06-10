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
import Ticket from "./Ticket";

@Table({ tableName: "AiTicketContexts" })
class AiTicketContext extends Model<AiTicketContext> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @Column(DataType.TEXT)
  summary: string;

  @Column(DataType.TEXT)
  collectedData: string;

  @Column(DataType.TEXT)
  missingData: string;

  @Column(DataType.TEXT)
  operationalState: string;

  @Column(DataType.TEXT)
  contradictions: string;

  @Column(DataType.TEXT)
  currentObjective: string;

  @Column(DataType.TEXT)
  nextQuestion: string;

  @Column
  lastSource: string;

  @Column
  lastAiIntent: string;

  @Column
  lastAiAction: string;

  @Column(DataType.TEXT)
  lastAiDecisionReason: string;

  @Column(DataType.TEXT)
  lastKnowledgeIds: string;

  @Column
  lastUpdatedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiTicketContext;
