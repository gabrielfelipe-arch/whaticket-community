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
  companyId: number;

  @Column
  createdByUserId: number;

  @Column
  googleAccountEmail: string;

  @Column
  calendarId: string;

  @Column
  calendarName: string;

  @Column
  userPrincipalName: string;

  @Column(DataType.TEXT)
  accessToken: string;

  @Column(DataType.TEXT)
  refreshToken: string;

  @Column
  tokenExpiresAt: Date;

  @Column(DataType.TEXT)
  accessTokenEncrypted: string;

  @Column(DataType.TEXT)
  refreshTokenEncrypted: string;

  @Column
  accessTokenExpiresAt: Date;

  @Column(DataType.TEXT)
  scopes: string;

  @Default("America/Sao_Paulo")
  @Column
  timezone: string;

  @Default(false)
  @Column
  active: boolean;

  @Column
  lastSyncAt: Date;

  @Column(DataType.TEXT)
  lastError: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AiCalendarConnection;
