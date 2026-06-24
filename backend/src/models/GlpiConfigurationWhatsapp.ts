import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import GlpiConfiguration from "./GlpiConfiguration";
import Whatsapp from "./Whatsapp";

@Table({ tableName: "GlpiConfigurationWhatsapps" })
class GlpiConfigurationWhatsapp extends Model<GlpiConfigurationWhatsapp> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => GlpiConfiguration)
  @Column
  glpiConfigurationId: number;

  @AllowNull(false)
  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => GlpiConfiguration)
  configuration: GlpiConfiguration;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;
}

export default GlpiConfigurationWhatsapp;
