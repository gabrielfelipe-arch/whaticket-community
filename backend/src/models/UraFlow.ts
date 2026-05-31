import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType, HasMany
} from "sequelize-typescript";
import UraOption from "./UraOption";

@Table({ tableName: "UraFlows" })
class UraFlow extends Model<UraFlow> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  welcomeMessage: string;

  @Column
  welcomeMediaUrl: string;

  @Column
  welcomeMediaType: string;

  @Column
  welcomeMediaName: string;

  @Column(DataType.TEXT)
  invalidOptionMessage: string;

  @Default(3)
  @Column
  maxInvalidAttempts: number;

  @Column
  fallbackQueueId: number;

  @Default(true)
  @Column
  active: boolean;

  @Default(false)
  @Column
  aiAutoCloseEnabled: boolean;

  @Column
  aiAutoCloseMinutes: number;

  @Column(DataType.TEXT)
  aiAutoCloseMessage: string;

  @Column
  aiAutoCloseReasonId: number;

  @Default(true)
  @Column
  aiAutoCloseOnlyIfNotHandedOff: boolean;

  @HasMany(() => UraOption)
  options: UraOption[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default UraFlow;
