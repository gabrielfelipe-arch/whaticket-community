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
  HasMany
} from "sequelize-typescript";
import GlpiConfigurationWhatsapp from "./GlpiConfigurationWhatsapp";

@Table({ tableName: "GlpiConfigurations" })
class GlpiConfiguration extends Model<GlpiConfiguration> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @Default(true)
  @Column
  active: boolean;

  @AllowNull(false)
  @Default("{}")
  @Column(DataType.TEXT)
  settings: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => GlpiConfigurationWhatsapp)
  whatsappLinks: GlpiConfigurationWhatsapp[];
}

export default GlpiConfiguration;
