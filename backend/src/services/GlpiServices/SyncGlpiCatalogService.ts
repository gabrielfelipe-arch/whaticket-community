import axios from "axios";
import GlpiCategory from "../../models/GlpiCategory";
import GlpiEntity from "../../models/GlpiEntity";
import GlpiLocation from "../../models/GlpiLocation";
import { closeGlpiSession, glpiHeaders, initGlpiSession } from "./GlpiClientService";
import CreateGlpiLogService from "./GlpiLogService";

type SyncType = "entities" | "categories" | "locations";
type GlpiSession = Awaited<ReturnType<typeof initGlpiSession>>;

const PAGE_SIZE = 1000;

const normalizeRows = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.myentities)) return data.myentities;
  return [];
};

const getName = (row: any): string => row.completename || row.complete_name || row.name || String(row.id);

const getEntityId = (row: any): number | null => {
  const value = row.entities_id ?? row.entity_id ?? row.entityId;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const endpointNameByType = (type: SyncType): string => {
  if (type === "entities") return "Entity";
  if (type === "categories") return "ITILCategory";
  return "Location";
};

const getTotalFromContentRange = (contentRange?: string): number | null => {
  const match = String(contentRange || "").match(/\/(\d+)$/);
  if (!match) return null;
  const total = Number(match[1]);
  return Number.isFinite(total) ? total : null;
};

const fetchCatalogRows = async (session: GlpiSession, type: SyncType): Promise<any[]> => {
  const endpointName = endpointNameByType(type);
  const rowsById = new Map<number, any>();
  let start = 0;
  let total: number | null = null;

  while (total === null || start < total) {
    const end = start + PAGE_SIZE - 1;
    const response = await axios.get(`${session.settings.apiUrl}/${endpointName}?range=${start}-${end}`, {
      headers: glpiHeaders(session),
      timeout: session.settings.timeoutMs
    });
    const rows = normalizeRows(response.data).filter(row => row?.id);

    rows.forEach(row => rowsById.set(Number(row.id), row));

    total = getTotalFromContentRange(response.headers?.["content-range"]);
    if (rows.length < PAGE_SIZE) break;

    start += PAGE_SIZE;
  }

  return Array.from(rowsById.values());
};

const SyncGlpiCatalogService = async (type: SyncType, userId?: number) => {
  let session;
  try {
    session = await initGlpiSession();
    const rows = await fetchCatalogRows(session, type);
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
        ...(type === "locations" ? { entityId: getEntityId(row) } : {}),
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
