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
import CommercialService from "./CommercialService";

@Table({ tableName: "CommercialPriceRules" })
class CommercialPriceRule extends Model<CommercialPriceRule> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => CommercialService)
  @Column
  commercialServiceId: number;

  @BelongsTo(() => CommercialService)
  commercialService: CommercialService;

  @Column
  name: string;

  @Column
  code: string;

  @Column
  ruleType: string;

  @Column
  mode: string;

  @Column(DataType.DECIMAL(12, 2))
  quantity: number;

  @Column(DataType.DECIMAL(12, 2))
  quantityMin: number;

  @Column(DataType.DECIMAL(12, 2))
  quantityMax: number;

  @Column(DataType.DECIMAL(12, 2))
  unitPrice: number;

  @Column(DataType.DECIMAL(12, 2))
  totalPrice: number;

  @Default("BRL")
  @Column
  currency: string;

  @Column
  minCommitmentMonths: number;

  @Column(DataType.TEXT)
  metadata: string;

  @Default(0)
  @Column
  sortOrder: number;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CommercialPriceRule;
