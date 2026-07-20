import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  BeforeCreate,
  BeforeUpdate,
  PrimaryKey,
  AutoIncrement,
  Default,
  HasMany,
  BelongsToMany,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import { hash, compare } from "bcryptjs";
import Ticket from "./Ticket";
import Queue from "./Queue";
import UserQueue from "./UserQueue";
import Whatsapp from "./Whatsapp";
import QuickAnswer from "./QuickAnswer";
import UserProfile from "./UserProfile";

@Table
class User extends Model<User> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  email: string;

  @Column
  cpf: string;

  @Column(DataType.DATEONLY)
  birthDate: string;

  @Column
  jobTitle: string;

  @Column
  messageSignature: string;

  @Column(DataType.VIRTUAL)
  password: string;

  @Column
  passwordHash: string;

  @Default(false)
  @Column
  mustChangePassword: boolean;

  @Column(DataType.TEXT)
  workHours: string;

  @Default(0)
  @Column
  tokenVersion: number;

  @Default("user")
  @Column
  profile: string;

  @ForeignKey(() => UserProfile)
  @Column
  profileId: number;

  @BelongsTo(() => UserProfile)
  accessProfile: UserProfile;

  @Default(true)
  @Column
  active: boolean;

  @Default(false)
  @Column
  glpiEnabled: boolean;

  @Column(DataType.TEXT)
  glpiUserToken: string;

  @Column(DataType.TEXT)
  specialPermissions: string;

  @Column(DataType.TEXT)
  attendanceGreeting: string;

  @Default("offline")
  @Column
  operationalStatus: string;

  @Column
  lastActivityAt: Date;

  @Column
  lastStatusChangeAt: Date;

  @Column
  statusReason: string;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => QuickAnswer)
  quickAnswers: QuickAnswer[];

  @BelongsToMany(() => Queue, () => UserQueue)
  queues: Queue[];

  @BeforeUpdate
  @BeforeCreate
  static hashPassword = async (instance: User): Promise<void> => {
    if (instance.password) {
      instance.passwordHash = await hash(instance.password, 8);
    }
  };

  public checkPassword = async (password: string): Promise<boolean> => {
    return compare(password, this.getDataValue("passwordHash"));
  };
}

export default User;
