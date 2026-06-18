import React, { useEffect, useState } from "react";

import {
  Button,
  Checkbox,
  Container,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import Autocomplete from "@material-ui/lab/Autocomplete";
import SearchIcon from "@material-ui/icons/Search";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
    ...theme.scrollbarStyles
  },
  pageHeader: {
    marginBottom: theme.spacing(2)
  },
  tabs: {
    marginBottom: theme.spacing(2),
    minHeight: 44,
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  contentPaper: {
    padding: theme.spacing(2),
    borderRadius: 8,
    boxShadow: theme.custom?.cardShadow,
    borderColor: theme.palette.divider,
    background: theme.palette.background.paper
  },
  sectionTitle: {
    marginBottom: theme.spacing(1)
  },
  helper: {
    marginBottom: theme.spacing(2)
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2)
  },
  statusMessage: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: 6,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.default
  },
  automaticSection: {
    marginTop: theme.spacing(1),
    paddingTop: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.divider}`
  },
  ruleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  ruleRow: {
    width: "100%",
    padding: theme.spacing(1.5),
    marginTop: theme.spacing(1),
    borderRadius: 6,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.default
  }
}));

const defaultSettings = {
  glpiEnabled: "disabled",
  glpiApiMode: "legacy",
  glpiApiUrl: "",
  glpiBaseWebUrl: "",
  glpiAppToken: "",
  glpiUserToken: "",
  glpiAllowMultipleTickets: "false",
  glpiAutomationMode: "manual",
  glpiAutoCategoryId: "",
  glpiAutoEntityId: "",
  glpiAutoLocationId: "",
  glpiAllowedFormEntityIds: "",
  glpiAllowedFormLocationIds: "",
  glpiEntityLocationRules: "[]",
  glpiAutoTitleTemplate: "Solicitacao WhatsApp - {{contactName}}",
  glpiAutoSuccessMessage: "Sua solicitacao foi registrada com sucesso. Chamado GLPI: #{{glpiTicketNumber}}.",
  glpiAutoCloseEnabled: "false",
  glpiAutoCloseMessage: "Atendimento finalizado automaticamente apos abertura do chamado #{{glpiTicketNumber}}.",
  glpiAutoCloseReasonId: "",
  glpiTimeoutMs: "15000"
};

const countRows = data => {
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.data)) return data.data.length;
  if (Array.isArray(data?.myentities)) return data.myentities.length;
  return data?.error ? 0 : undefined;
};

const errorMessage = err =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  "Erro ao comunicar com o GLPI.";

const optionLabel = option => option?.completeName || option?.name || "";
const entityOptionLabel = option => option?.name || option?.completeName || "";

const parseIdList = value =>
  String(value || "")
    .split(/[,\s;|]+/)
    .map(item => Number(item))
    .filter(item => Number.isInteger(item) && item >= 0);

const serializeIdList = list => (list || []).map(item => item.glpiId).filter(item => item !== undefined && item !== null).join(",");

const findByGlpiId = (list, value) =>
  (list || []).find(item => Number(item.glpiId) === Number(value)) || null;

const filterByGlpiIds = (list, value) => {
  const ids = parseIdList(value);
  return (list || []).filter(item => ids.includes(Number(item.glpiId)));
};

const parseEntityLocationRules = value => {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.map(rule => ({
      entityId: Number(rule.entityId) || "",
      allowedLocationIds: Array.isArray(rule.allowedLocationIds)
        ? rule.allowedLocationIds.map(item => Number(item)).filter(item => Number.isInteger(item) && item > 0)
        : [],
      defaultLocationId: Number(rule.defaultLocationId) || ""
    }));
  } catch (error) {
    return [];
  }
};

const serializeEntityLocationRules = rules =>
  JSON.stringify((rules || []).map(rule => ({
    entityId: Number(rule.entityId) || "",
    allowedLocationIds: (rule.allowedLocationIds || []).map(item => Number(item)).filter(item => Number.isInteger(item) && item > 0),
    defaultLocationId: Number(rule.defaultLocationId) || null
  })));

const SearchTextField = params => (
  <TextField
    {...params}
    fullWidth
    margin="dense"
    variant="outlined"
    InputProps={{
      ...params.InputProps,
      startAdornment: (
        <>
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
          {params.InputProps.startAdornment}
        </>
      )
    }}
  />
);

const Integrations = () => {
  const classes = useStyles();
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState("");
  const [tab, setTab] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [catalogs, setCatalogs] = useState({
    categories: [],
    entities: [],
    locations: [],
    closingReasons: []
  });

  const loadSettings = async () => {
    try {
      const [{ data }, categories, entities, locations, closingReasons] = await Promise.all([
        api.get("/glpi/config"),
        api.get("/glpi/categories").catch(() => ({ data: [] })),
        api.get("/glpi/entities").catch(() => ({ data: [] })),
        api.get("/glpi/locations").catch(() => ({ data: [] })),
        api.get("/closing-reasons").catch(() => ({ data: [] }))
      ]);
      setSettings({ ...defaultSettings, ...(data || {}) });
      setCatalogs({
        categories: Array.isArray(categories.data) ? categories.data : [],
        entities: Array.isArray(entities.data) ? entities.data : [],
        locations: Array.isArray(locations.data) ? locations.data : [],
        closingReasons: Array.isArray(closingReasons.data) ? closingReasons.data : []
      });
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = event => {
    const { name, value } = event.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSettingValue = (name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const entityLocationRules = parseEntityLocationRules(settings.glpiEntityLocationRules);

  const locationsByEntity = entityId =>
    (catalogs.locations || []).filter(location => Number(location.entityId) === Number(entityId));

  const updateEntityLocationRules = nextRules => {
    handleSettingValue("glpiEntityLocationRules", serializeEntityLocationRules(nextRules));
  };

  const addEntityLocationRule = () => {
    updateEntityLocationRules([
      ...entityLocationRules,
      { entityId: "", allowedLocationIds: [], defaultLocationId: "" }
    ]);
  };

  const updateEntityLocationRule = (index, patch) => {
    const nextRules = entityLocationRules.map((rule, ruleIndex) => {
      if (ruleIndex !== index) return rule;
      const nextRule = { ...rule, ...patch };
      const availableLocationIds = locationsByEntity(nextRule.entityId).map(location => Number(location.glpiId));

      return {
        ...nextRule,
        allowedLocationIds: (nextRule.allowedLocationIds || []).filter(locationId => availableLocationIds.includes(Number(locationId))),
        defaultLocationId: availableLocationIds.includes(Number(nextRule.defaultLocationId)) ? nextRule.defaultLocationId : ""
      };
    });
    updateEntityLocationRules(nextRules);
  };

  const removeEntityLocationRule = index => {
    updateEntityLocationRules(entityLocationRules.filter((rule, ruleIndex) => ruleIndex !== index));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await api.put("/glpi/config", settings);
      toast.success("Integracao GLPI salva com sucesso.");
      setStatusMessage("Configuracao salva. Se alterou tokens, rode o teste de conexao antes de sincronizar.");
      loadSettings();
    } catch (err) {
      setStatusMessage(errorMessage(err));
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      const { data } = await api.post("/glpi/test-connection");
      const entitiesCount = countRows(data?.entities);
      const categoriesCount = countRows(data?.categories);
      const locationsCount = countRows(data?.locations);
      const details = [
        entitiesCount !== undefined ? `entidades: ${entitiesCount}` : null,
        categoriesCount !== undefined ? `categorias: ${categoriesCount}` : null,
        locationsCount !== undefined ? `localizacoes: ${locationsCount}` : null
      ].filter(Boolean).join(", ");
      const message = details ? `Conexao GLPI validada (${details}).` : data?.message || "Conexao GLPI validada.";
      toast.success(message);
      setStatusMessage(message);
    } catch (err) {
      setStatusMessage(errorMessage(err));
      toastError(err);
    } finally {
      setTesting(false);
    }
  };

  const sync = async type => {
    try {
      setSyncing(type);
      const { data } = await api.post(`/glpi/sync/${type}`);
      const labels = {
        entities: "entidades",
        categories: "categorias",
        locations: "localizacoes"
      };
      const message = `${data.count || 0} ${labels[type] || "registros"} sincronizadas.`;
      toast.success(message);
      setStatusMessage(message);
    } catch (err) {
      setStatusMessage(errorMessage(err));
      toastError(err);
    } finally {
      setSyncing("");
    }
  };

  return (
    <Container maxWidth={false} className={classes.root}>
      <div className={classes.pageHeader}>
        <Typography variant="h5">Integracoes</Typography>
        <Typography variant="body2" color="textSecondary">
          Configure integracoes externas usadas pelo atendimento.
        </Typography>
      </div>

      <Tabs value={tab} onChange={(event, value) => setTab(value)} indicatorColor="primary" textColor="primary" className={classes.tabs}>
        <Tab label="GLPI" />
      </Tabs>

      <Paper className={classes.contentPaper} variant="outlined">
        {tab === 0 && (
          <>
            <Typography variant="h6" className={classes.sectionTitle}>
              GLPI
            </Typography>
            <Typography variant="body2" color="textSecondary" className={classes.helper}>
              Use a API legada v1 do GLPI para App-Token, User Token, initSession e criacao de tickets.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth margin="dense" variant="outlined" label="Integracao GLPI" name="glpiEnabled" value={settings.glpiEnabled} onChange={handleChange}>
                  <MenuItem value="disabled">Desativada</MenuItem>
                  <MenuItem value="enabled">Ativada</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth margin="dense" variant="outlined" label="Modo GLPI" name="glpiAutomationMode" value={settings.glpiAutomationMode} onChange={handleChange}>
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="automatic">Automatico por formulario</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth margin="dense" variant="outlined" label="Modo da API" name="glpiApiMode" value={settings.glpiApiMode} onChange={handleChange}>
                  <MenuItem value="legacy">API legada v1</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" margin="dense" variant="outlined" label="Timeout da API (ms)" name="glpiTimeoutMs" value={settings.glpiTimeoutMs} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth margin="dense" variant="outlined" label="URL da API GLPI" name="glpiApiUrl" value={settings.glpiApiUrl} onChange={handleChange} placeholder="http://10.80.11.210/api.php/v1" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth margin="dense" variant="outlined" label="URL web do GLPI" name="glpiBaseWebUrl" value={settings.glpiBaseWebUrl} onChange={handleChange} placeholder="http://10.80.11.210" helperText="Usada para montar o link Abrir no GLPI." />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="password" margin="dense" variant="outlined" label="App-Token" name="glpiAppToken" value={settings.glpiAppToken} onChange={handleChange} helperText="Se ja estiver salvo, deixe o valor mascarado para manter." />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="password" margin="dense" variant="outlined" label="User Token do usuario tecnico" name="glpiUserToken" value={settings.glpiUserToken} onChange={handleChange} helperText="Se ja estiver salvo, deixe o valor mascarado para manter." />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth margin="dense" variant="outlined" label="Permitir multiplos chamados por atendimento" name="glpiAllowMultipleTickets" value={settings.glpiAllowMultipleTickets} onChange={handleChange}>
                  <MenuItem value="false">Nao</MenuItem>
                  <MenuItem value="true">Sim</MenuItem>
                </TextField>
              </Grid>
              {settings.glpiAutomationMode === "automatic" && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Abertura automatica por formulario</Typography>
                    <Typography variant="body2" color="textSecondary">
                      O formulario coleta entidade/localizacao e respostas livres. A categoria e o titulo ficam padronizados aqui.
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={catalogs.categories}
                      value={findByGlpiId(catalogs.categories, settings.glpiAutoCategoryId)}
                      getOptionLabel={optionLabel}
                      getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                      noOptionsText="Nenhuma categoria encontrada"
                      onChange={(event, option) => handleSettingValue("glpiAutoCategoryId", option?.glpiId ? String(option.glpiId) : "")}
                      renderInput={params => <SearchTextField {...params} required label="Categoria padrao do chamado" placeholder="Pesquisar categoria" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={catalogs.entities}
                      value={findByGlpiId(catalogs.entities, settings.glpiAutoEntityId)}
                      getOptionLabel={entityOptionLabel}
                      getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                      noOptionsText="Nenhuma entidade encontrada"
                      onChange={(event, option) => handleSettingValue("glpiAutoEntityId", option?.glpiId ? String(option.glpiId) : "")}
                      renderInput={params => <SearchTextField {...params} label="Entidade padrao, se o formulario nao perguntar" placeholder="Pesquisar entidade" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={catalogs.locations}
                      value={findByGlpiId(catalogs.locations, settings.glpiAutoLocationId)}
                      getOptionLabel={optionLabel}
                      getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                      noOptionsText="Nenhuma localizacao encontrada"
                      onChange={(event, option) => handleSettingValue("glpiAutoLocationId", option?.glpiId ? String(option.glpiId) : "")}
                      renderInput={params => <SearchTextField {...params} label="Localizacao padrao, opcional" placeholder="Pesquisar localizacao" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth margin="dense" variant="outlined" label="Titulo padrao do chamado" name="glpiAutoTitleTemplate" value={settings.glpiAutoTitleTemplate} onChange={handleChange} helperText="Variaveis: {{contactName}}, {{contactNumber}}, {{ticketId}}, {{formName}}, {{entityName}}, {{locationName}}" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      options={catalogs.entities}
                      value={filterByGlpiIds(catalogs.entities, settings.glpiAllowedFormEntityIds)}
                      getOptionLabel={entityOptionLabel}
                      getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                      noOptionsText="Nenhuma entidade encontrada"
                      onChange={(event, value) => handleSettingValue("glpiAllowedFormEntityIds", serializeIdList(value))}
                      renderOption={(option, { selected }) => (
                        <>
                          <Checkbox color="primary" checked={selected} style={{ marginRight: 8 }} />
                          {entityOptionLabel(option)}
                        </>
                      )}
                      renderInput={params => <SearchTextField {...params} label="Entidades exibidas no formulario" placeholder="Pesquisar entidade" helperText="Se vazio, todas as entidades sincronizadas aparecem." />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      options={catalogs.locations}
                      value={filterByGlpiIds(catalogs.locations, settings.glpiAllowedFormLocationIds)}
                      getOptionLabel={optionLabel}
                      getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                      noOptionsText="Nenhuma localizacao encontrada"
                      onChange={(event, value) => handleSettingValue("glpiAllowedFormLocationIds", serializeIdList(value))}
                      renderOption={(option, { selected }) => (
                        <>
                          <Checkbox color="primary" checked={selected} style={{ marginRight: 8 }} />
                          {optionLabel(option)}
                        </>
                      )}
                      renderInput={params => <SearchTextField {...params} label="Filtro global de localizacoes" placeholder="Pesquisar localizacao" helperText="Usado apenas quando a entidade nao tiver uma regra especifica." />}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <div className={classes.automaticSection}>
                      <div className={classes.ruleHeader}>
                        <div>
                          <Typography variant="subtitle1">Regras de localizacao por entidade</Typography>
                          <Typography variant="body2" color="textSecondary">
                            Defina quais localizacoes aparecem para cada entidade. A localizacao padrao da entidade e usada quando o formulario nao pergunta o setor.
                          </Typography>
                        </div>
                        <Button color="primary" variant="outlined" onClick={addEntityLocationRule}>
                          Adicionar regra
                        </Button>
                      </div>
                      {!entityLocationRules.length && (
                        <Typography variant="body2" color="textSecondary">
                          Sem regra especifica: o formulario usa o filtro global de localizacoes; se ele estiver vazio, mostra todas as localizacoes da entidade selecionada.
                        </Typography>
                      )}
                      {entityLocationRules.map((rule, index) => {
                        const entityLocations = locationsByEntity(rule.entityId);
                        const selectedAllowedLocations = entityLocations.filter(location =>
                          (rule.allowedLocationIds || []).includes(Number(location.glpiId))
                        );
                        const defaultLocationOptions = rule.allowedLocationIds?.length
                          ? selectedAllowedLocations
                          : entityLocations;

                        return (
                          <div className={classes.ruleRow} key={`${rule.entityId || "new"}-${index}`}>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} md={3}>
                                <Autocomplete
                                  options={catalogs.entities}
                                  value={findByGlpiId(catalogs.entities, rule.entityId)}
                                  getOptionLabel={entityOptionLabel}
                                  getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                                  noOptionsText="Nenhuma entidade encontrada"
                                  onChange={(event, option) => updateEntityLocationRule(index, {
                                    entityId: option?.glpiId ? Number(option.glpiId) : "",
                                    allowedLocationIds: [],
                                    defaultLocationId: ""
                                  })}
                                  renderInput={params => <SearchTextField {...params} label="Entidade" placeholder="Pesquisar entidade" />}
                                />
                              </Grid>
                              <Grid item xs={12} md={5}>
                                <Autocomplete
                                  multiple
                                  disableCloseOnSelect
                                  options={entityLocations}
                                  value={selectedAllowedLocations}
                                  getOptionLabel={optionLabel}
                                  getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                                  noOptionsText={rule.entityId ? "Nenhuma localizacao desta entidade" : "Selecione uma entidade primeiro"}
                                  onChange={(event, value) => updateEntityLocationRule(index, {
                                    allowedLocationIds: value.map(location => Number(location.glpiId)),
                                    defaultLocationId: value.some(location => Number(location.glpiId) === Number(rule.defaultLocationId))
                                      ? rule.defaultLocationId
                                      : ""
                                  })}
                                  renderOption={(option, { selected }) => (
                                    <>
                                      <Checkbox color="primary" checked={selected} style={{ marginRight: 8 }} />
                                      {optionLabel(option)}
                                    </>
                                  )}
                                  renderInput={params => <SearchTextField {...params} label="Localizacoes exibidas" placeholder="Pesquisar localizacao" helperText="Vazio mostra todas desta entidade." />}
                                />
                              </Grid>
                              <Grid item xs={12} md={3}>
                                <Autocomplete
                                  options={defaultLocationOptions}
                                  value={findByGlpiId(defaultLocationOptions, rule.defaultLocationId)}
                                  getOptionLabel={optionLabel}
                                  getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                                  noOptionsText="Nenhuma localizacao disponivel"
                                  onChange={(event, option) => updateEntityLocationRule(index, {
                                    defaultLocationId: option?.glpiId ? Number(option.glpiId) : ""
                                  })}
                                  renderInput={params => <SearchTextField {...params} label="Localizacao padrao" placeholder="Pesquisar localizacao" />}
                                />
                              </Grid>
                              <Grid item xs={12} md={1}>
                                <Button fullWidth color="secondary" variant="outlined" onClick={() => removeEntityLocationRule(index)}>
                                  Remover
                                </Button>
                              </Grid>
                            </Grid>
                          </div>
                        );
                      })}
                    </div>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={2} margin="dense" variant="outlined" label="Mensagem apos abrir chamado" name="glpiAutoSuccessMessage" value={settings.glpiAutoSuccessMessage} onChange={handleChange} helperText="Use {{glpiTicketNumber}} para informar o numero do chamado." />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField select fullWidth margin="dense" variant="outlined" label="Finalizar atendimento automaticamente" name="glpiAutoCloseEnabled" value={settings.glpiAutoCloseEnabled} onChange={handleChange}>
                      <MenuItem value="false">Nao</MenuItem>
                      <MenuItem value="true">Sim</MenuItem>
                    </TextField>
                  </Grid>
                  {settings.glpiAutoCloseEnabled === "true" && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField select fullWidth required margin="dense" variant="outlined" label="Motivo de encerramento" name="glpiAutoCloseReasonId" value={settings.glpiAutoCloseReasonId} onChange={handleChange}>
                          <MenuItem value="">Selecione</MenuItem>
                          {catalogs.closingReasons.map(reason => (
                            <MenuItem key={reason.id} value={String(reason.id)}>
                              {reason.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth multiline rows={2} margin="dense" variant="outlined" label="Mensagem de encerramento automatico" name="glpiAutoCloseMessage" value={settings.glpiAutoCloseMessage} onChange={handleChange} />
                      </Grid>
                    </>
                  )}
                </>
              )}
            </Grid>

            <div className={classes.actions}>
              <Button variant="outlined" color="primary" onClick={testConnection} disabled={testing}>
                {testing ? "Testando..." : "Testar conexao"}
              </Button>
              <Button variant="outlined" color="primary" onClick={() => sync("entities")} disabled={!!syncing}>
                {syncing === "entities" ? "Sincronizando..." : "Sincronizar entidades"}
              </Button>
              <Button variant="outlined" color="primary" onClick={() => sync("categories")} disabled={!!syncing}>
                {syncing === "categories" ? "Sincronizando..." : "Sincronizar categorias"}
              </Button>
              <Button variant="outlined" color="primary" onClick={() => sync("locations")} disabled={!!syncing}>
                {syncing === "locations" ? "Sincronizando..." : "Sincronizar localizacoes"}
              </Button>
              <Button color="primary" variant="contained" onClick={saveSettings} disabled={saving}>
                {saving ? "Salvando..." : "Salvar integracao"}
              </Button>
            </div>

            {statusMessage && (
              <Typography variant="body2" color="textSecondary" className={classes.statusMessage}>
                {statusMessage}
              </Typography>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default Integrations;
