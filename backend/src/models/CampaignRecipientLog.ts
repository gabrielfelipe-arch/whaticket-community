import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  DataType,
  Default
} from "sequelize-typescript";

import Campaign from "./Campaign";
import CampaignContact from "./CampaignContact";
import Contact from "./Contact";
import Whatsapp from "./Whatsapp";

@Table({ tableName: "CampaignRecipientLogs" })
class CampaignRecipientLog extends Model<CampaignRecipientLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Campaign)
  @Column
  campaignId: number;

  @BelongsTo(() => Campaign)
  campaign: Campaign;

  @ForeignKey(() => CampaignContact)
  @Column
  campaignContactId: number;

  @BelongsTo(() => CampaignContact)
  campaignContact: CampaignContact;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @Column
  phoneNumber: string;

  @Column(DataType.TEXT)
  message: string;

  @Default("pending")
  @Column
  status: string;

  @Default(0)
  @Column
  attemptNumber: number;

  @Column
  attemptedAt: Date;

  @Column
  sentAt: Date;

  @Column
  errorAt: Date;

  @Column(DataType.TEXT)
  errorMessage: string;

  @Column(DataType.TEXT)
  providerResponse: string;

  @Column
  messageId: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CampaignRecipientLog;
