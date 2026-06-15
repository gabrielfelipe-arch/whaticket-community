import {
  Table, Column, CreatedAt, UpdatedAt, Model, PrimaryKey,
  AutoIncrement, AllowNull, Default, DataType, ForeignKey, BelongsTo
} from "sequelize-typescript";
import KnowledgeBaseArticle from "./KnowledgeBaseArticle";
import AiSetting from "./AiSetting";

@Table({ tableName: "KnowledgeBaseChunks" })
class KnowledgeBaseChunk extends Model<KnowledgeBaseChunk> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => KnowledgeBaseArticle)
  @AllowNull(false)
  @Column
  articleId: number;

  @BelongsTo(() => KnowledgeBaseArticle)
  article: KnowledgeBaseArticle;

  @ForeignKey(() => AiSetting)
  @Column
  aiSettingId: number;

  @BelongsTo(() => AiSetting)
  aiSetting: AiSetting;

  @Column
  title: string;

  @Column
  section: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  content: string;

  @Column(DataType.TEXT)
  tags: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  embedding: string;

  @AllowNull(false)
  @Column
  contentHash: string;

  @Default(true)
  @Column
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KnowledgeBaseChunk;
