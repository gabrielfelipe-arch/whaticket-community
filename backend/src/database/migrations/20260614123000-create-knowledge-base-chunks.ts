import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("KnowledgeBaseChunks", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      articleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "KnowledgeBaseArticles", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      aiSettingId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "AiSettings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true
      },
      section: {
        type: DataTypes.STRING,
        allowNull: true
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      tags: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      embedding: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      contentHash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("KnowledgeBaseChunks", ["articleId", "contentHash"], {
      unique: true,
      name: "KnowledgeBaseChunks_article_hash_idx"
    });
    await queryInterface.addIndex("KnowledgeBaseChunks", ["aiSettingId"], {
      name: "KnowledgeBaseChunks_ai_setting_idx"
    });
    await queryInterface.addIndex("KnowledgeBaseChunks", ["active"], {
      name: "KnowledgeBaseChunks_active_idx"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("KnowledgeBaseChunks").catch(() => {});
  }
};
