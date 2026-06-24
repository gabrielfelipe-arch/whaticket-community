import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  DataType,
  Default,
  ForeignKey
} from "sequelize-typescript";
import GlpiConfiguration from "./GlpiConfiguration";

@Table({ tableName: "GlpiCategories" })
class GlpiCategory extends Model<GlpiCategory> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  glpiId: number;

  @ForeignKey(() => GlpiConfiguration)
  @Column
  glpiConfigurationId: number;

  @AllowNull(false)
  @Column
  name: string;

  @Column
  completeName: string;

  @Default(true)
  @Column
  active: boolean;

  @Column(DataType.TEXT)
  rawData: string;

  @Column
  lastSyncAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default GlpiCategory;
