import { QueryInterface } from "sequelize";

interface AiSettingRow {
  id: number;
}

const nowSql = "CURRENT_TIMESTAMP";

const escapeSql = (value: string): string => value.replace(/'/g, "''");

const insertIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  columns: string[],
  values: Array<string | number | null>,
  uniqueWhere: string
): Promise<void> => {
  const columnSql = columns.map(column => `"${column}"`).join(", ");
  const valueSql = values
    .map(value => {
      if (value === null) return "NULL";
      if (typeof value === "number") return String(value);
      if (value === nowSql) return nowSql;
      return `'${escapeSql(value)}'`;
    })
    .join(", ");

  await queryInterface.sequelize.query(`
    INSERT INTO "${table}" (${columnSql})
    SELECT ${valueSql}
    WHERE NOT EXISTS (
      SELECT 1 FROM "${table}" WHERE ${uniqueWhere}
    )
  `);
};

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const [settings] = await queryInterface.sequelize.query(`
      SELECT id
      FROM "AiSettings"
      WHERE
        lower(coalesce("companyName", '') || ' ' || coalesce(name, '') || ' ' || coalesce("serviceType", '')) LIKE '%salinha%'
        OR lower(coalesce(name, '')) LIKE '%mari%'
      ORDER BY id
      LIMIT 1
    `) as [AiSettingRow[], unknown];

    const aiSettingId = settings[0]?.id;
    if (!aiSettingId) return;

    await insertIfMissing(
      queryInterface,
      "CommercialServices",
      ["aiSettingId", "name", "slug", "description", "category", "unitLabel", "capacityMin", "capacityMax", "metadata", "active", "createdAt", "updatedAt"],
      [
        aiSettingId,
        "Salinha Meier - Aluguel de sala",
        "salinha-meier-aluguel-sala",
        "Locacao de sala para aulas, reunioes, treinamentos, atendimentos e encontros.",
        "locacao",
        "hora",
        1,
        20,
        JSON.stringify({ quoteNeedsHumanValidation: true, address: "Rua Dias da Cruz, 185 Sala 215" }),
        "true",
        nowSql,
        nowSql
      ],
      `"slug" = 'salinha-meier-aluguel-sala'`
    );

    const [services] = await queryInterface.sequelize.query(`
      SELECT id FROM "CommercialServices" WHERE "slug" = 'salinha-meier-aluguel-sala' LIMIT 1
    `) as [{ id: number }[], unknown];
    const serviceId = services[0]?.id;
    if (!serviceId) return;

    const includedItems = [
      "ar-condicionado",
      "capacidade para ate 20 pessoas",
      "quadro branco",
      "TV para reproducao de conteudo",
      "internet",
      "recepcao",
      "banheiro",
      "copa compartilhavel",
      "cafeteira",
      "micro-ondas",
      "filtro com agua gelada"
    ];

    for (let index = 0; index < includedItems.length; index += 1) {
      await insertIfMissing(
        queryInterface,
        "CommercialIncludedItems",
        ["commercialServiceId", "label", "description", "sortOrder", "active", "createdAt", "updatedAt"],
        [serviceId, includedItems[index], null, index + 1, "true", nowSql, nowSql],
        `"commercialServiceId" = ${serviceId} AND lower("label") = lower('${escapeSql(includedItems[index])}')`
      );
    }

    const priceRules = [
      { name: "Bloco avulso de 2h", code: "flex-2h", ruleType: "flexible_hours", mode: "flexible", quantity: 2, price: 140, sortOrder: 10 },
      { name: "Pacote flexivel de 3h", code: "flex-3h", ruleType: "flexible_hours", mode: "flexible", quantity: 3, price: 210, sortOrder: 20 },
      { name: "Pacote flexivel de 5h", code: "flex-5h", ruleType: "flexible_hours", mode: "flexible", quantity: 5, price: 350, sortOrder: 30 },
      { name: "Pacote flexivel de 10h", code: "flex-10h", ruleType: "flexible_hours", mode: "flexible", quantity: 10, price: 600, sortOrder: 40 },
      { name: "Pacote flexivel de 15h", code: "flex-15h", ruleType: "flexible_hours", mode: "flexible", quantity: 15, price: 900, sortOrder: 50 },
      { name: "Pacote flexivel de 20h", code: "flex-20h", ruleType: "flexible_hours", mode: "flexible", quantity: 20, price: 1000, sortOrder: 60 },
      { name: "Periodo consecutivo de 2h", code: "seq-2h", ruleType: "consecutive_hours", mode: "consecutive", quantity: 2, price: 140, sortOrder: 110 },
      { name: "Periodo consecutivo de 3h", code: "seq-3h", ruleType: "consecutive_hours", mode: "consecutive", quantity: 3, price: 210, sortOrder: 120 },
      { name: "Turno consecutivo de 5h", code: "seq-5h", ruleType: "consecutive_hours", mode: "consecutive", quantity: 5, price: 300, sortOrder: 130 },
      { name: "Diaria consecutiva de 10h", code: "seq-10h", ruleType: "daily_rate", mode: "consecutive", quantity: 10, price: 500, sortOrder: 140 }
    ];

    for (const rule of priceRules) {
      await insertIfMissing(
        queryInterface,
        "CommercialPriceRules",
        ["commercialServiceId", "name", "code", "ruleType", "mode", "quantity", "quantityMin", "quantityMax", "unitPrice", "totalPrice", "currency", "minCommitmentMonths", "metadata", "sortOrder", "active", "createdAt", "updatedAt"],
        [serviceId, rule.name, rule.code, rule.ruleType, rule.mode, rule.quantity, null, null, null, rule.price, "BRL", null, null, rule.sortOrder, "true", nowSql, nowSql],
        `"commercialServiceId" = ${serviceId} AND "code" = '${escapeSql(rule.code)}'`
      );
    }
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    const [services] = await queryInterface.sequelize.query(`
      SELECT id FROM "CommercialServices" WHERE "slug" = 'salinha-meier-aluguel-sala'
    `) as [{ id: number }[], unknown];
    for (const service of services) {
      await queryInterface.sequelize.query(`DELETE FROM "CommercialQuoteSimulations" WHERE "commercialServiceId" = ${service.id}`);
      await queryInterface.sequelize.query(`DELETE FROM "CommercialPriceRules" WHERE "commercialServiceId" = ${service.id}`);
      await queryInterface.sequelize.query(`DELETE FROM "CommercialIncludedItems" WHERE "commercialServiceId" = ${service.id}`);
      await queryInterface.sequelize.query(`DELETE FROM "CommercialServices" WHERE id = ${service.id}`);
    }
  }
};
