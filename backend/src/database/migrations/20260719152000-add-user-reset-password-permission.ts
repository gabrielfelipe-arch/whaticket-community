import { QueryInterface } from "sequelize";

const ensurePermissionKey = async (queryInterface: QueryInterface, enabled: boolean) => {
  const [profiles] = await queryInterface.sequelize.query("SELECT id, permissions FROM \"UserProfiles\";");

  await Promise.all((profiles as Array<{ id: number; permissions: string | null }>).map(async profile => {
    let permissions: Record<string, boolean> = {};

    try {
      permissions = profile.permissions ? JSON.parse(profile.permissions) : {};
    } catch (err) {
      permissions = {};
    }

    if (permissions["users.reset_password"] === enabled) return;

    permissions["users.reset_password"] = enabled;

    await queryInterface.sequelize.query(
      "UPDATE \"UserProfiles\" SET permissions = :permissions, \"updatedAt\" = NOW() WHERE id = :id;",
      {
        replacements: {
          id: profile.id,
          permissions: JSON.stringify(permissions)
        }
      }
    );
  }));
};

export = {
  up: async (queryInterface: QueryInterface) => {
    await ensurePermissionKey(queryInterface, false);
  },

  down: async (queryInterface: QueryInterface) => {
    const [profiles] = await queryInterface.sequelize.query("SELECT id, permissions FROM \"UserProfiles\";");

    await Promise.all((profiles as Array<{ id: number; permissions: string | null }>).map(async profile => {
      let permissions: Record<string, boolean> = {};

      try {
        permissions = profile.permissions ? JSON.parse(profile.permissions) : {};
      } catch (err) {
        permissions = {};
      }

      delete permissions["users.reset_password"];

      await queryInterface.sequelize.query(
        "UPDATE \"UserProfiles\" SET permissions = :permissions, \"updatedAt\" = NOW() WHERE id = :id;",
        {
          replacements: {
            id: profile.id,
            permissions: JSON.stringify(permissions)
          }
        }
      );
    }));
  }
};
