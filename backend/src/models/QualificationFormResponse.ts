import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, Default, ForeignKey, BelongsTo, HasMany
} from "sequelize-typescript";
import QualificationForm from "./QualificationForm";
import Ticket from "./Ticket";
import Contact from "./Contact";
import Whatsapp from "./Whatsapp";
import Queue from "./Queue";
import UraOption from "./UraOption";
import QualificationFormAnswer from "./QualificationFormAnswer";

@Table({ tableName: "QualificationFormResponses" })
class QualificationFormResponse extends Model<QualificationFormResponse> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => QualificationForm)
  @Column
  formId: number;

  @BelongsTo(() => QualificationForm)
  form: QualificationForm;

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

  @ForeignKey(() => UraOption)
  @Column
  uraOptionId: number;

  @BelongsTo(() => UraOption)
  uraOption: UraOption;

  @Default("in_progress")
  @Column
  status: string;

  @Column
  currentQuestionId: number;

  @Default(0)
  @Column
  invalidAttempts: number;

  @Column
  afterAction: string;

  @Column
  afterQueueId: number;

  @Column
  completedAt: Date;

  @HasMany(() => QualificationFormAnswer)
  answers: QualificationFormAnswer[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QualificationFormResponse;
