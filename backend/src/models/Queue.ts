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
  BelongsToMany,
  Default,
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";
import User from "./User";
import UserQueue from "./UserQueue";

import Whatsapp from "./Whatsapp";
import WhatsappQueue from "./WhatsappQueue";
import AiSetting from "./AiSetting";

@Table
class Queue extends Model<Queue> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @AllowNull(false)
  @Unique
  @Column
  color: string;

  @Column
  greetingMessage: string;

  @Default(false)
  @Column
  businessHoursEnabled: boolean;

  @Default("always")
  @Column
  businessHoursMode: string;

  @Column(DataType.TEXT)
  businessHours: string;

  @Column(DataType.TEXT)
  unavailableMessage: string;

  @Column
  unavailableMediaUrl: string;

  @Column
  unavailableMediaType: string;

  @Column
  unavailableMediaName: string;

  @Default("manual_free")
  @Column
  distributionMode: string;

  @Column
  maxActiveTicketsPerUser: number;

  @Default("ignore")
  @Column
  balanceAction: string;

  @Default("keep_waiting")
  @Column
  overflowAction: string;

  @ForeignKey(() => User)
  @Column
  lastAssignedUserId: number;

  @BelongsTo(() => User, "lastAssignedUserId")
  lastAssignedUser: User;

  @Default(false)
  @Column
  sendQueuePositionMessage: boolean;

  @Default(24)
  @Column
  scheduledReturnWindowHours: number;

  @Column(DataType.TEXT)
  queuePositionMessage: string;

  @Default(false)
  @Column
  blockIfUserHasStalledTicket: boolean;

  @Column
  stalledTicketMinutes: number;

  @Default("ignore")
  @Column
  stalledTicketAction: string;

  @Default(false)
  @Column
  useAI: boolean;

  @Default(false)
  @Column
  glpiEnabled: boolean;

  @ForeignKey(() => AiSetting)
  @Column
  aiSettingId: number;

  @BelongsTo(() => AiSetting)
  aiSetting: AiSetting;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsToMany(() => Whatsapp, () => WhatsappQueue)
  whatsapps: Array<Whatsapp & { WhatsappQueue: WhatsappQueue }>;

  @BelongsToMany(() => User, () => UserQueue)
  users: Array<User & { UserQueue: UserQueue }>;
}

export default Queue;
