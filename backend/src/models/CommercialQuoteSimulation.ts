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
  BelongsTo,
  Default
} from "sequelize-typescript";
import AiSetting from "./AiSetting";
import CommercialService from "./CommercialService";
import Contact from "./Contact";
import Ticket from "./Ticket";

@Table({ tableName: "CommercialQuoteSimulations" })
class CommercialQuoteSimulation extends Model<CommercialQuoteSimulation> {
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

  @ForeignKey(() => AiSetting)
  @Column
  aiSettingId: number;

  @BelongsTo(() => AiSetting)
  aiSetting: AiSetting;

  @ForeignKey(() => CommercialService)
  @Column
  commercialServiceId: number;

  @BelongsTo(() => CommercialService)
  commercialService: CommercialService;

  @Default("success")
  @Column
  status: string;

  @Column(DataType.TEXT)
  input: string;

  @Column(DataType.TEXT)
  result: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CommercialQuoteSimulation;
