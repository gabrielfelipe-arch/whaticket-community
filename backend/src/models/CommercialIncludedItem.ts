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

@Table({ tableName: "CommercialIncludedItems" })
class CommercialIncludedItem extends Model<CommercialIncludedItem> {
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
  label: string;

  @Column(DataType.TEXT)
  description: string;

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

export default CommercialIncludedItem;
