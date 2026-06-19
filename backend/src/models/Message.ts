import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  Default,
  BelongsTo,
  ForeignKey
} from "sequelize-typescript";
import Contact from "./Contact";
import Ticket from "./Ticket";

@Table
class Message extends Model<Message> {
  @PrimaryKey
  @Column
  id: string;

  @Default(0)
  @Column
  ack: number;

  @Default(false)
  @Column
  read: boolean;

  @Default(false)
  @Column
  fromMe: boolean;

  @Column
  senderType: string;

  @Column
  aiSessionStartedAt: Date;

  @Column(DataType.TEXT)
  body: string;

  @Column(DataType.STRING)
  get mediaUrl(): string | null {
    const mediaUrl = this.getDataValue("mediaUrl");
    if (mediaUrl) {
      const backendUrl = String(process.env.BACKEND_URL || "").replace(/\/$/, "");
      const proxyPort = String(process.env.PROXY_PORT || "").trim();

      try {
        const url = new URL(backendUrl);
        if (proxyPort && !url.port) url.port = proxyPort;
        return `${url.origin}/public/${mediaUrl}`;
      } catch (error) {
        const hasPort = /:\d+$/.test(backendUrl);
        const portSuffix = proxyPort && !hasPort ? `:${proxyPort}` : "";
        return `${backendUrl}${portSuffix}/public/${mediaUrl}`;
      }
    }
    return null;
  }

  @Column
  mediaType: string;

  @Default(false)
  @Column
  isDeleted: boolean;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;

  @ForeignKey(() => Message)
  @Column
  quotedMsgId: string;

  @BelongsTo(() => Message, "quotedMsgId")
  quotedMsg: Message;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact, "contactId")
  contact: Contact;
}

export default Message;
