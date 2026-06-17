import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Ticket from "./Ticket";
import User from "./User";

@Table({ tableName: "GlpiTicketLinks" })
class GlpiTicketLink extends Model<GlpiTicketLink> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @AllowNull(false)
  @Column
  glpiTicketId: number;

  @Column
  glpiTicketNumber: string;

  @AllowNull(false)
  @Column
  title: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Column
  entityId: number;

  @Column
  entityName: string;

  @AllowNull(false)
  @Column
  categoryId: number;

  @Column
  categoryName: string;

  @Column
  locationId: number;

  @Column
  locationName: string;

  @ForeignKey(() => User)
  @Column
  createdByUserId: number;

  @BelongsTo(() => User)
  createdByUser: User;

  @Default("manual")
  @Column
  descriptionMode: string;

  @Column(DataType.TEXT)
  selectedMessageIds: string;

  @Column
  glpiUrl: string;

  @Default("created")
  @Column
  status: string;

  @Column(DataType.TEXT)
  rawResponse: string;

  @Column(DataType.TEXT)
  error: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GlpiTicketLink;
