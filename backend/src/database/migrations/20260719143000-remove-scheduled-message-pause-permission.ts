import { QueryInterface } from "sequelize";

const removePermission = (permissions: Record<string, unknown>) => {
  const next = { ...(permissions || {}) };
  delete next["scheduledMessages.pause"];
  return next;
};

export = {
  up: async (queryInterface: QueryInterface) => {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT id, permissions FROM "UserProfiles";'
    ) as unknown as [Array<{ id: number; permissions: string | Record<string, unknown> | null }>];

    for (const row of rows) {
      const parsed = typeof row.permissions === "string"
        ? JSON.parse(row.permissions || "{}")
        : row.permissions || {};

      await queryInterface.sequelize.query(
        'UPDATE "UserProfiles" SET permissions = :permissions, "updatedAt" = NOW() WHERE id = :id;',
        {
          replacements: {
            id: row.id,
            permissions: JSON.stringify(removePermission(parsed))
          }
        }
      );
    }
  },

  down: async () => {}
};
