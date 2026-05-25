import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      create index if not exists "KnowledgeBaseArticles_fts_idx"
      on "KnowledgeBaseArticles"
      using gin (
        (
          setweight(to_tsvector('portuguese', coalesce("title", '')), 'A') ||
          setweight(to_tsvector('portuguese', coalesce("tags", '')), 'A') ||
          setweight(to_tsvector('portuguese', coalesce("content", '')), 'B')
        )
      )
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      drop index if exists "KnowledgeBaseArticles_fts_idx"
    `);
  }
};
