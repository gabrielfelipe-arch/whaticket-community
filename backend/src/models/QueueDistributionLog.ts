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
  DataType
} from "sequelize-typescript";
import Ticket from "./Ticket";
import Queue from "./Queue";
import User from "./User";

@Table
class QueueDistributionLog extends Model<QueueDistributionLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column
  action: string;

  @Column
  distributionMode: string;

  @Column
  attendantStatus: string;

  @Column
  userActiveTickets: number;

  @Column(DataType.TEXT)
  reason: string;

  @Column(DataType.TEXT)
  metadata: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QueueDistributionLog;
