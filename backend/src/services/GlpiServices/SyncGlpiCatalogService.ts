import axios from "axios";
import GlpiCategory from "../../models/GlpiCategory";
import GlpiEntity from "../../models/GlpiEntity";
import GlpiLocation from "../../models/GlpiLocation";
import { closeGlpiSession, glpiHeaders, initGlpiSession } from "./GlpiClientService";
import CreateGlpiLogService from "./GlpiLogService";

type SyncType = "entities" | "categories" | "locations";

const normalizeRows = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.myentities)) return data.myentities;
  return [];
};

const getName = (row: any): string => row.completename || row.complete_name || row.name || String(row.id);

const SyncGlpiCatalogService = async (type: SyncType, userId?: number) => {
  let session;
  try {
    session = await initGlpiSession();
    const endpoint = type === "entities"
      ? "Entity?range=0-999"
      : type === "categories"
        ? "ITILCategory?range=0-999"
        : "Location?range=0-999";
    const response = await axios.get(`${session.settings.apiUrl}/${endpoint}`, {
      headers: glpiHeaders(session),
      timeout: session.settings.timeoutMs
    });
    const rows = normalizeRows(response.data).filter(row => row?.id);
    const syncedAt = new Date();

    for (const row of rows) {
      const model = type === "entities"
        ? GlpiEntity
        : type === "categories"
          ? GlpiCategory
          : GlpiLocation;
      const values = {
        glpiId: Number(row.id),
        name: row.name || getName(row),
        completeName: getName(row),
        active: row.is_deleted ? false : row.is_active !== 0,
        rawData: JSON.stringify(row),
        lastSyncAt: syncedAt
      };
      const existing = await model.findOne({ where: { glpiId: values.glpiId } });
      if (existing) {
        await existing.update(values);
      } else {
        await model.create(values as any);
      }
    }

    await CreateGlpiLogService({
      action: `sync_${type}`,
      status: "success",
      message: `${rows.length} registros sincronizados.`,
      userId
    });

    return { count: rows.length };
  } catch (err) {
    await CreateGlpiLogService({
      action: `sync_${type}`,
      status: "error",
      message: "Falha na sincronizacao GLPI.",
      userId,
      error: err instanceof Error ? err.message : err
    });
    throw err;
  } finally {
    if (session) await closeGlpiSession(session);
  }
};

export default SyncGlpiCatalogService;
