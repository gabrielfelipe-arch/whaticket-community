import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, ForeignKey, BelongsTo, DataType
} from "sequelize-typescript";

import Contact from "./Contact";
import Queue from "./Queue";
import Ticket from "./Ticket";
import TicketCategory from "./TicketCategory";
import ClosingReason from "./ClosingReason";
import User from "./User";
import SatisfactionSurvey from "./SatisfactionSurvey";

@Table({ tableName: "SatisfactionSurveyResponses" })
class SatisfactionSurveyResponse extends Model<SatisfactionSurveyResponse> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => SatisfactionSurvey)
  @Column
  satisfactionSurveyId: number;

  @BelongsTo(() => SatisfactionSurvey)
  satisfactionSurvey: SatisfactionSurvey;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

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
  rating: number;

  @Column
  rawAnswer: string;

  @Column
  feedbackType: string;

  @Column(DataType.TEXT)
  feedbackText: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SatisfactionSurveyResponse;
