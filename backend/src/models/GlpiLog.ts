import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  DataType
} from "sequelize-typescript";

@Table({ tableName: "GlpiLogs" })
class GlpiLog extends Model<GlpiLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  action: string;

  @AllowNull(false)
  @Column
  status: string;

  @Column(DataType.TEXT)
  message: string;

  @Column
  ticketId: number;

  @Column
  userId: number;

  @Column(DataType.TEXT)
  payload: string;

  @Column(DataType.TEXT)
  response: string;

  @Column(DataType.TEXT)
  error: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GlpiLog;
