import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, Default, DataType, HasMany
} from "sequelize-typescript";
import QualificationFormQuestion from "./QualificationFormQuestion";

@Table({ tableName: "QualificationForms" })
class QualificationForm extends Model<QualificationForm> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @Column(DataType.TEXT)
  greetingMessage: string;

  @Default(true)
  @Column
  active: boolean;

  @HasMany(() => QualificationFormQuestion)
  questions: QualificationFormQuestion[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QualificationForm;
