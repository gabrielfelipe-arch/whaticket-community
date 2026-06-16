import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  HasMany,
  AutoIncrement,
  Default,
  DataType
} from "sequelize-typescript";

import Contact from "./Contact";
import Message from "./Message";
import Queue from "./Queue";
import User from "./User";
import Whatsapp from "./Whatsapp";
import TicketCategory from "./TicketCategory";
import ClosingReason from "./ClosingReason";

@Table
class Ticket extends Model<Ticket> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column({ defaultValue: "pending" })
  status: string;

  @Column
  unreadMessages: number;

  @Column
  lastMessage: string;

  @Default(false)
  @Column
  isGroup: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @Column
  queuePositionMessageSentAt: Date;

  @Column
  queueEnteredAt: Date;

  @ForeignKey(() => TicketCategory)
  @Column
  categoryId: number;

  @BelongsTo(() => TicketCategory)
  category: TicketCategory;

  @ForeignKey(() => ClosingReason)
  @Column
  closingReasonId: number;

  @BelongsTo(() => ClosingReason)
  closingReason: ClosingReason;

  @Column
  closingNote: string;

  @Column
  glpiTicketId: number;

  @Column
  uraFlowId: number;

  @Column
  uraMenuSentAt: Date;

  @Column
  currentUraOptionId: number;

  @Default(0)
  @Column
  uraInvalidAttempts: number;

  @Default(false)
  @Column
  uraActive: boolean;

  @Column
  lastUraInteractionAt: Date;

  @Default(false)
  @Column
  aiActive: boolean;

  @Default(false)
  @Column
  aiHandled: boolean;

  @Column
  aiHumanHandoffAt: Date;

  @Column
  aiHumanHandoffQueueId: number;

  @Column(DataType.TEXT)
  aiHumanHandoffMessage: string;

  @Column
  aiTaggerClassifiedAt: Date;

  @Default(false)
  @Column
  aiHumanHandoffAlertSent: boolean;

  @Column
  aiHandoffAlertEnabled: boolean;

  @Column
  aiHandoffAlertTo: string;

  @Column(DataType.TEXT)
  aiHandoffAlertMessage: string;

  @Default(false)
  @Column
  aiAutoClosed: boolean;

  @Column
  aiAutoClosedAt: Date;

  @Default(false)
  @Column
  aiAutoCloseEnabled: boolean;

  @Column
  aiAutoCloseMinutes: number;

  @Column(DataType.TEXT)
  aiAutoCloseMessage: string;

  @Column
  aiAutoCloseReasonId: number;

  @Default(true)
  @Column
  aiAutoCloseOnlyIfNotHandedOff: boolean;

  @Column
  aiSettingId: number;

  @Column
  aiQueueId: number;

  @Column
  aiStartedAt: Date;

  @Column
  aiFinishedAt: Date;

  @Column
  lastAiQuestionType: string;

  @Column
  lastAiQuestionOptions: string;

  @Column
  lastAiQuestionAt: Date;

  @Default(0)
  @Column
  lastAiQuestionAttempts: number;

  @Column
  lastAiInteractionAt: Date;

  @Column(DataType.TEXT)
  lastAiMessage: string;

  @Column
  lastAiExpectedReply: string;

  @Column
  lastAiIntent: string;

  @Column
  lastAiAction: string;

  @Column(DataType.TEXT)
  lastAiKnowledgeIds: string;

  @Column(DataType.TEXT)
  lastAiDecisionReason: string;

  @Default(false)
  @Column
  lastAiAskedMoreHelp: boolean;

  @Default(0)
  @Column
  aiInteractionCount: number;

  @Column(DataType.TEXT)
  aiConversationSummary: string;

  @Column
  satisfactionSurveyId: number;

  @Column
  satisfactionSurveySentAt: Date;

  @Column
  satisfactionSurveyAnsweredAt: Date;

  @Column
  satisfactionFeedbackPendingAt: Date;

  @Column
  satisfactionFeedbackExpiresAt: Date;

  @Column
  satisfactionFeedbackClosedAt: Date;

  @HasMany(() => Message)
  messages: Message[];
}

export default Ticket;
