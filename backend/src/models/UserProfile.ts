import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  Default,
  HasMany
} from "sequelize-typescript";

import User from "./User";

@Table({ tableName: "UserProfiles" })
class UserProfile extends Model<UserProfile> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @Default("user")
  @Column
  baseRole: string;

  @Column(DataType.TEXT)
  permissions: string;

  @Default(false)
  @Column
  isSystem: boolean;

  @Default(true)
  @Column
  active: boolean;

  @HasMany(() => User)
  users: User[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default UserProfile;
