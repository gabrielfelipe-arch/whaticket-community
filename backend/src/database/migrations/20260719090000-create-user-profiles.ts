import { QueryInterface, DataTypes } from "sequelize";

const PERMISSIONS = {
  "dashboard.view": true,
  "tickets.view": true,
  "tickets.view_all": true,
  "contacts.view": true,
  "contacts.manage": true,
  "contacts.import": true,
  "quickAnswers.view": true,
  "quickAnswers.manage": true,
  "scheduledMessages.view": true,
  "scheduledMessages.manage": true,
  "users.view": true,
  "users.manage": true,
  "profiles.manage": true,
  "connections.view": true,
  "connections.manage": true,
  "queues.view": true,
  "queues.manage": true,
  "settings.view": true,
  "settings.manage": true,
  "settings.ura": true,
  "settings.forms": true,
  "settings.ai": true,
  "integrations.view": true,
  "integrations.manage": true,
  "campaigns.manage_all": true,
  "messages.delete": true
};

const buildPermissions = (overrides: Record<string, boolean>) =>
  JSON.stringify({ ...Object.keys(PERMISSIONS).reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as Record<string, boolean>), ...overrides });

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    const hasUserProfiles = tables.map(String).includes("UserProfiles");

    if (!hasUserProfiles) {
      await queryInterface.createTable("UserProfiles", {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        baseRole: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: "user"
        },
        permissions: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        isSystem: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
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
    }

    await queryInterface.addColumn("Users", "profileId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "UserProfiles", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }).catch(() => {});

    const now = new Date().toISOString();
    await queryInterface.sequelize.query(
      `
      INSERT INTO "UserProfiles" ("name", "description", "baseRole", "permissions", "isSystem", "active", "createdAt", "updatedAt")
      VALUES
        ('Administrador', 'Acesso total ao sistema.', 'admin', :adminPermissions, true, true, :now, :now),
        ('Supervisor', 'Gestao operacional sem configuracoes sensiveis.', 'supervisor', :supervisorPermissions, true, true, :now, :now),
        ('Atendente', 'Atendimento padrao com acesso as rotinas do dia a dia.', 'user', :userPermissions, true, true, :now, :now)
      ON CONFLICT ("name") DO NOTHING
      `,
      {
        replacements: {
          now,
          adminPermissions: buildPermissions(PERMISSIONS),
          supervisorPermissions: buildPermissions({
            "dashboard.view": true,
            "tickets.view": true,
            "tickets.view_all": true,
            "contacts.view": true,
            "contacts.manage": true,
            "quickAnswers.view": true,
            "quickAnswers.manage": true,
            "scheduledMessages.view": true,
            "scheduledMessages.manage": true,
            "users.view": true,
            "connections.view": true,
            "settings.view": true
          }),
          userPermissions: buildPermissions({
            "tickets.view": true,
            "contacts.view": true,
            "quickAnswers.view": true,
            "scheduledMessages.view": true,
            "scheduledMessages.manage": true
          })
        }
      }
    );

    await queryInterface.sequelize.query(`
      UPDATE "Users" SET "profileId" = (SELECT id FROM "UserProfiles" WHERE "name" = 'Administrador')
      WHERE "profile" = 'admin' AND "profileId" IS NULL
    `);
    await queryInterface.sequelize.query(`
      UPDATE "Users" SET "profileId" = (SELECT id FROM "UserProfiles" WHERE "name" = 'Supervisor')
      WHERE "profile" = 'supervisor' AND "profileId" IS NULL
    `);
    await queryInterface.sequelize.query(`
      UPDATE "Users" SET "profileId" = (SELECT id FROM "UserProfiles" WHERE "name" = 'Atendente')
      WHERE "profile" = 'user' AND "profileId" IS NULL
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Users", "profileId").catch(() => {});
    await queryInterface.dropTable("UserProfiles").catch(() => {});
  }
};
