import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
  DataType,
  HasMany,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import Whatsapp from "./Whatsapp";
import CampaignContact from "./CampaignContact";

@Table({ tableName: "Campaigns" })
class Campaign extends Model<Campaign> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column(DataType.TEXT)
  message: string;

  @Default("contacts")
  @Column
  audience: string;

  @Default("draft")
  @Column
  status: string;

  @Default(30)
  @Column
  intervalSeconds: number;

  @Column
  intervalPattern: string;

  @Default(20)
  @Column
  pauseAfter: number;

  @Default(300)
  @Column
  pauseSeconds: number;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @HasMany(() => CampaignContact)
  recipients: CampaignContact[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Campaign;
