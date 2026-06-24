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

@Table({ tableName: "GlpiLocations" })
class GlpiLocation extends Model<GlpiLocation> {
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

  @Column
  entityId: number;

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

export default GlpiLocation;
