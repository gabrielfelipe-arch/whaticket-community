import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Unique,
  DataType,
  Default
} from "sequelize-typescript";

@Table({ tableName: "GlpiLocations" })
class GlpiLocation extends Model<GlpiLocation> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  glpiId: number;

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

export default GlpiLocation;
