import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, DataType, Default
} from "sequelize-typescript";

@Table({ tableName: "AiCalendarConnections" })
class AiCalendarConnection extends Model<AiCalendarConnection> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  provider: string;

  @Column
  calendarId: string;

  @Column
  userPrincipalName: string;

  @Column(DataType.TEXT)
  accessToken: string;

  @Column(DataType.TEXT)
  refreshToken: string;

  @Column
  tokenExpiresAt: Date;

  @Default("America/Sao_Paulo")
  @Column
  timezone: string;

  @Default(false)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiCalendarConnection;
