import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType, ForeignKey, BelongsTo
} from "sequelize-typescript";
import UraFlow from "./UraFlow";
import QualificationForm from "./QualificationForm";

@Table({ tableName: "UraOptions" })
class UraOption extends Model<UraOption> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => UraFlow)
  @AllowNull(false)
  @Column
  flowId: number;

  @BelongsTo(() => UraFlow)
  flow: UraFlow;

  @ForeignKey(() => UraOption)
  @Column
  parentOptionId: number;

  @BelongsTo(() => UraOption)
  parentOption: UraOption;

  @AllowNull(false)
  @Column
  optionKey: string;

  @AllowNull(false)
  @Column
  title: string;

  @Column(DataType.TEXT)
  responseMessage: string;

  @Column
  responseMediaUrl: string;

  @Column
  responseMediaType: string;

  @Column
  responseMediaName: string;

  @Default("SEND_MESSAGE")
  @Column
  action: string;

  @Column
  targetQueueId: number;

  @Column
  closingReasonId: number;

  @ForeignKey(() => QualificationForm)
  @Column
  qualificationFormId: number;

  @BelongsTo(() => QualificationForm)
  qualificationForm: QualificationForm;

  @Default(false)
  @Column
  runQualificationFormBeforeAction: boolean;

  @Default(false)
  @Column
  allowQualificationFormSkip: boolean;

  @Default(false)
  @Column
  showMainMenuAfterMessage: boolean;

  @Default(false)
  @Column
  aiHumanHandoffEnabled: boolean;

  @Column
  aiHumanHandoffQueueId: number;

  @Column(DataType.TEXT)
  aiHumanHandoffMessage: string;

  @Default(false)
  @Column
  aiAutoCloseEnabled: boolean;

  @Column
  aiAutoCloseMinutes: number;

  @Column(DataType.TEXT)
  aiAutoCloseMessage: string;

  @Column
  aiAutoCloseReasonId: number;

  @Default(true)
  @Column
  aiAutoCloseOnlyIfNotHandedOff: boolean;

  @Default(false)
  @Column
  aiHandoffAlertEnabled: boolean;

  @Column
  aiHandoffAlertTo: string;

  @Column(DataType.TEXT)
  aiHandoffAlertMessage: string;

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

export default UraOption;
