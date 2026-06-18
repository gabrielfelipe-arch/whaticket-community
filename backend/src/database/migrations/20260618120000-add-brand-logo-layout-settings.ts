import { QueryInterface } from "sequelize";

const upsertSetting = async (
  queryInterface: QueryInterface,
  key: string,
  value: string
): Promise<void> => {
  await queryInterface.sequelize.query(
    `
      INSERT INTO "Settings" ("key", "value", "createdAt", "updatedAt")
      VALUES (:key, :value, NOW(), NOW())
      ON CONFLICT ("key") DO NOTHING
    `,
    { replacements: { key, value } }
  ).catch(() => {});
};

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await upsertSetting(queryInterface, "brandLogoFit", "contain");
    await upsertSetting(queryInterface, "brandLogoPositionX", "50");
    await upsertSetting(queryInterface, "brandLogoPositionY", "50");
    await upsertSetting(queryInterface, "brandLogoScale", "1");
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.bulkDelete("Settings", {
      key: ["brandLogoFit", "brandLogoPositionX", "brandLogoPositionY", "brandLogoScale"]
    }).catch(() => {});
  }
};
