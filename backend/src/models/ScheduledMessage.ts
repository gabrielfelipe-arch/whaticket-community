import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";

import Contact from "./Contact";
import Whatsapp from "./Whatsapp";

@Table({ tableName: "ScheduledMessages" })
class ScheduledMessage extends Model<ScheduledMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

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

  @Column
  batchId: string;

  @Default(0)
  @Column
  sequence: number;

  @Column(DataType.TEXT)
  message: string;

  @Column
  mediaUrl: string;

  @Column
  mediaType: string;

  @Column
  mediaName: string;

  @Column
  scheduledAt: Date;

  @Column
  nextRunAt: Date;

  @Default(30)
  @Column
  intervalSeconds: number;

  @Column
  intervalPattern: string;

  @Default(20)
  @Column
  pauseAfter: number;

  @Default(300)
  @Column
  pauseSeconds: number;

  @Default("pending")
  @Column
  status: string;

  @Column
  sentAt: Date;

  @Column(DataType.TEXT)
  errorMessage: string;

  @Column
  recurrenceType: string;

  @Column(DataType.JSONB)
  weekdays: number[];

  @Column(DataType.JSONB)
  times: string[];

  @Column
  startsAt: Date;

  @Column
  endsAt: Date;

  @Column
  lastRunAt: Date;

  @Column
  canceledAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ScheduledMessage;
