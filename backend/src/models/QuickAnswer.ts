import {
  Table,
  Column,
  DataType,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import User from "./User";

@Table({ tableName: "QuickAnswers" })
class QuickAnswer extends Model<QuickAnswer> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.TEXT)
  shortcut: string;

  @Column(DataType.TEXT)
  message: string;

  @Default(true)
  @Column
  global: boolean;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QuickAnswer;
