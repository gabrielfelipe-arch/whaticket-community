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
  Default,
  HasMany
} from "sequelize-typescript";
import AiSetting from "./AiSetting";
import CommercialIncludedItem from "./CommercialIncludedItem";
import CommercialPriceRule from "./CommercialPriceRule";

@Table({ tableName: "CommercialServices" })
class CommercialService extends Model<CommercialService> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => AiSetting)
  @Column
  aiSettingId: number;

  @BelongsTo(() => AiSetting)
  aiSetting: AiSetting;

  @Column
  name: string;

  @Column
  slug: string;

  @Column(DataType.TEXT)
  description: string;

  @Column
  category: string;

  @Column
  unitLabel: string;

  @Column
  capacityMin: number;

  @Column
  capacityMax: number;

  @Column(DataType.TEXT)
  metadata: string;

  @Default(true)
  @Column
  active: boolean;

  @HasMany(() => CommercialIncludedItem)
  includedItems: CommercialIncludedItem[];

  @HasMany(() => CommercialPriceRule)
  priceRules: CommercialPriceRule[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CommercialService;
