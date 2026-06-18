import { QueryInterface } from "sequelize";

const upsertSetting = async (queryInterface: QueryInterface, key: string, value = "") => {
  await queryInterface.sequelize.query(
    `insert into "Settings" ("key", "value", "createdAt", "updatedAt")
     values (:key, :value, now(), now())
     on conflict ("key") do nothing`,
    { replacements: { key, value } }
  );
};

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await upsertSetting(queryInterface, "glpiAllowedFormEntityIds", "");
    await upsertSetting(queryInterface, "glpiAllowedFormLocationIds", "");
    await upsertSetting(queryInterface, "glpiEntityLocationRules", "[]");
  },

  down: async (): Promise<void> => {}
};
