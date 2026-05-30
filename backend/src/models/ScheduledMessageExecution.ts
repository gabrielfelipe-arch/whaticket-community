import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  DataType,
  Default
} from "sequelize-typescript";

import ScheduledMessage from "./ScheduledMessage";
import Contact from "./Contact";
import Whatsapp from "./Whatsapp";

@Table({ tableName: "ScheduledMessageExecutions" })
class ScheduledMessageExecution extends Model<ScheduledMessageExecution> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => ScheduledMessage)
  @Column
  scheduleId: number;

  @BelongsTo(() => ScheduledMessage)
  schedule: ScheduledMessage;

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
  scheduledFor: Date;

  @Column
  executedAt: Date;

  @Default("pending")
  @Column
  status: string;

  @Default(0)
  @Column
  attempts: number;

  @Column(DataType.TEXT)
  errorMessage: string;

  @Column
  messageId: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ScheduledMessageExecution;
