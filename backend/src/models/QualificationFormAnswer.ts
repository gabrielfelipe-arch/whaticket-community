import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, Default, DataType, ForeignKey, BelongsTo
} from "sequelize-typescript";
import QualificationFormResponse from "./QualificationFormResponse";
import QualificationFormQuestion from "./QualificationFormQuestion";

@Table({ tableName: "QualificationFormAnswers" })
class QualificationFormAnswer extends Model<QualificationFormAnswer> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => QualificationFormResponse)
  @Column
  responseId: number;

  @BelongsTo(() => QualificationFormResponse)
  response: QualificationFormResponse;

  @ForeignKey(() => QualificationFormQuestion)
  @Column
  questionId: number;

  @BelongsTo(() => QualificationFormQuestion)
  question: QualificationFormQuestion;

  @Column
  key: string;

  @Column(DataType.TEXT)
  label: string;

  @Column(DataType.TEXT)
  value: string;

  @Column(DataType.TEXT)
  rawValue: string;

  @Column(DataType.TEXT)
  optionLabel: string;

  @Default(true)
  @Column
  includeInAiContext: boolean;

  @Default(true)
  @Column
  includeInReports: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QualificationFormAnswer;
