import axios from "axios";
import { closeGlpiSession, glpiHeaders, initGlpiSession, normalizeGlpiError } from "./GlpiClientService";
import CreateGlpiLogService from "./GlpiLogService";

const TestGlpiConnectionService = async (userId?: number, configurationId?: number | null) => {
  let session;
  try {
    session = await initGlpiSession({ configurationId });
    const [profileResponse, entitiesResponse, categoriesResponse, locationsResponse] = await Promise.all([
      axios.get(`${session.settings.apiUrl}/getActiveProfile`, {
        headers: glpiHeaders(session),
        timeout: session.settings.timeoutMs
      }).catch(err => ({ data: { error: normalizeGlpiError(err) } })),
      axios.get(`${session.settings.apiUrl}/getMyEntities`, {
        headers: glpiHeaders(session),
        timeout: session.settings.timeoutMs
      }).catch(err => ({ data: { error: normalizeGlpiError(err) } })),
      axios.get(`${session.settings.apiUrl}/ITILCategory?range=0-1`, {
        headers: glpiHeaders(session),
        timeout: session.settings.timeoutMs
      }).catch(err => ({ data: { error: normalizeGlpiError(err) } })),
      axios.get(`${session.settings.apiUrl}/Location?range=0-1`, {
        headers: glpiHeaders(session),
        timeout: session.settings.timeoutMs
      }).catch(err => ({ data: { error: normalizeGlpiError(err) } }))
    ]);

    await CreateGlpiLogService({
      action: "test_connection",
      status: "success",
      message: "Conexao GLPI validada.",
      userId,
      response: {
        activeProfile: profileResponse.data,
        entities: entitiesResponse.data,
        categories: categoriesResponse.data,
        locations: locationsResponse.data
      }
    });

    return {
      ok: true,
      message: "Conexao GLPI validada.",
      activeProfile: profileResponse.data,
      entities: entitiesResponse.data,
      categories: categoriesResponse.data,
      locations: locationsResponse.data
    };
  } catch (err) {
    await CreateGlpiLogService({
      action: "test_connection",
      status: "error",
      message: "Falha no teste de conexao GLPI.",
      userId,
      error: err instanceof Error ? err.message : err
    });
    throw err;
  } finally {
    if (session) await closeGlpiSession(session);
  }
};

export default TestGlpiConnectionService;
