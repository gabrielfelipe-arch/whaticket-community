import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, Default, DataType, ForeignKey, BelongsTo
} from "sequelize-typescript";
import QualificationForm from "./QualificationForm";

@Table({ tableName: "QualificationFormQuestions" })
class QualificationFormQuestion extends Model<QualificationFormQuestion> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => QualificationForm)
  @Column
  formId: number;

  @BelongsTo(() => QualificationForm)
  form: QualificationForm;

  @Column
  key: string;

  @Column(DataType.TEXT)
  label: string;

  @Default("text")
  @Column
  type: string;

  @Column(DataType.TEXT)
  options: string;

  @Default(true)
  @Column
  required: boolean;

  @Default(true)
  @Column
  includeInAiContext: boolean;

  @Default(true)
  @Column
  includeInReports: boolean;

  @Default(2)
  @Column
  maxInvalidAttempts: number;

  @Default(0)
  @Column
  order: number;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QualificationFormQuestion;
