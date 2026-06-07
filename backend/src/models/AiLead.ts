import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, DataType, ForeignKey, BelongsTo, Default
} from "sequelize-typescript";
import Ticket from "./Ticket";
import Contact from "./Contact";
import Whatsapp from "./Whatsapp";
import Queue from "./Queue";
import AiSetting from "./AiSetting";

@Table({ tableName: "AiLeads" })
class AiLead extends Model<AiLead> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

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

  @ForeignKey(() => AiSetting)
  @Column
  aiSettingId: number;

  @BelongsTo(() => AiSetting)
  aiSetting: AiSetting;

  @Default("novo")
  @Column
  status: string;

  @Default("ai")
  @Column
  source: string;

  @Column(DataType.TEXT)
  summary: string;

  @Column(DataType.TEXT)
  collectedData: string;

  @Column(DataType.TEXT)
  tagIds: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiLead;
