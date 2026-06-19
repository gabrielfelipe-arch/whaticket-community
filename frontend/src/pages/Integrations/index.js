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
  navTabs: {
    marginBottom: theme.spacing(2),
    minHeight: 44,
    padding: theme.spacing(0.5),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.type === "dark" ? theme.palette.background.paper : "#f8fafc",
    "& .MuiTabs-indicator": {
      display: "none"
    },
    "& .MuiTab-root": {
      minHeight: 36,
      borderRadius: 6,
      textTransform: "none",
      fontWeight: 600
    },
    "& .Mui-selected": {
      background: theme.palette.background.paper,
      boxShadow: theme.custom?.cardShadow || "0 1px 3px rgba(15, 23, 42, 0.12)"
    }
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
  warningNotice: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1.5),
    borderRadius: 6,
    border: `1px solid ${theme.palette.warning.light}`,
    background: theme.palette.type === "dark" ? "rgba(255, 193, 7, 0.12)" : "#fff8e1"
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
  },
  ruleField: {
    minHeight: 78
  },
  ruleAction: {
    minHeight: 78,
    display: "flex",
    alignItems: "flex-start",
    paddingTop: theme.spacing(0.5)
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

const mergeByGlpiId = (current, incoming) => {
  const map = new Map();
  [...(current || []), ...(incoming || [])].forEach(item => {
    if (item?.glpiId !== undefined && item?.glpiId !== null) {
      map.set(Number(item.glpiId), item);
    }
  });
  return Array.from(map.values());
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
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [checkingWhatsapp, setCheckingWhatsapp] = useState(false);
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

  const checkWhatsappUpdates = async () => {
    try {
      setCheckingWhatsapp(true);
      const { data } = await api.get("/whatsapp-updates/status");
      setWhatsappStatus(data);
      setStatusMessage(data.checkError || "Verificacao do WhatsApp concluida.");
    } catch (err) {
      setStatusMessage(errorMessage(err));
      toastError(err);
    } finally {
      setCheckingWhatsapp(false);
    }
  };

  const unavailableWhatsappAutomation = action => {
    toast.info(`${action} ainda precisa da rotina segura de manutencao/rollback no servidor.`);
  };

  const handleChange = event => {
    const { name, value } = event.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSettingValue = (name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const entityLocationRules = parseEntityLocationRules(settings.glpiEntityLocationRules);
  const hasDefaultGlpiEntity = Boolean(settings.glpiAutoEntityId);

  const locationsByEntity = entityId =>
    (catalogs.locations || []).filter(location => Number(location.entityId) === Number(entityId));

  const defaultEntityLocations = hasDefaultGlpiEntity
    ? locationsByEntity(settings.glpiAutoEntityId)
    : catalogs.locations;

  const loadLocationsForEntity = async entityId => {
    if (!entityId) return [];

    try {
      const { data } = await api.get("/glpi/locations", { params: { entityId } });
      const rows = Array.isArray(data) ? data : [];
      setCatalogs(prev => ({
        ...prev,
        locations: mergeByGlpiId(prev.locations, rows)
      }));
      return rows;
    } catch (err) {
      toastError(err);
      return [];
    }
  };

  useEffect(() => {
    const entityIds = Array.from(new Set(
      entityLocationRules.map(rule => Number(rule.entityId)).filter(entityId => Number.isInteger(entityId) && entityId > 0)
    ));

    entityIds.forEach(entityId => {
      if (!locationsByEntity(entityId).length) {
        loadLocationsForEntity(entityId);
      }
    });
  }, [settings.glpiEntityLocationRules]);

  useEffect(() => {
    if (!settings.glpiAutoEntityId) return;

    loadLocationsForEntity(settings.glpiAutoEntityId);
  }, [settings.glpiAutoEntityId]);

  useEffect(() => {
    if (!settings.glpiAutoEntityId || !settings.glpiAutoLocationId) return;
    const selectedLocation = findByGlpiId(catalogs.locations, settings.glpiAutoLocationId);
    if (
      selectedLocation &&
      Number(selectedLocation.entityId) !== Number(settings.glpiAutoEntityId)
    ) {
      handleSettingValue("glpiAutoLocationId", "");
      toast.warning("A localizacao padrao foi limpa porque pertence a outra entidade.");
    }
  }, [settings.glpiAutoEntityId, settings.glpiAutoLocationId, catalogs.locations]);

  const updateEntityLocationRules = nextRules => {
    handleSettingValue("glpiEntityLocationRules", serializeEntityLocationRules(nextRules));
  };

  const addEntityLocationRule = () => {
    if (hasDefaultGlpiEntity) {
      toast.warning("Limpe a entidade padrao antes de adicionar regras por entidade.");
      return;
    }

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

  const handleDefaultLocationChange = option => {
    const locationId = option?.glpiId ? String(option.glpiId) : "";
    const entityId = option?.entityId ? String(option.entityId) : "";

    setSettings(prev => ({
      ...prev,
      glpiAutoLocationId: locationId,
      glpiAutoEntityId: entityId || prev.glpiAutoEntityId
    }));

    if (entityId && entityId !== settings.glpiAutoEntityId) {
      loadLocationsForEntity(entityId);
      toast.info("Entidade padrao preenchida automaticamente pela localizacao selecionada.");
    }
  };

  const saveSettings = async () => {
    try {
      if (hasDefaultGlpiEntity && entityLocationRules.length) {
        const message = "Com entidade padrao preenchida, remova as regras por entidade ou limpe a entidade padrao antes de salvar.";
        setStatusMessage(message);
        toast.warning(message);
        return;
      }

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

      <Tabs value={tab} onChange={(event, value) => setTab(value)} indicatorColor="primary" textColor="primary" className={classes.navTabs}>
        <Tab label="GLPI" />
        <Tab label="WhatsApp" />
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
                      options={defaultEntityLocations}
                      value={findByGlpiId(defaultEntityLocations, settings.glpiAutoLocationId)}
                      getOptionLabel={optionLabel}
                      getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                      noOptionsText={hasDefaultGlpiEntity ? "Nenhuma localizacao desta entidade" : "Nenhuma localizacao encontrada"}
                      onChange={(event, option) => handleDefaultLocationChange(option)}
                      renderInput={params => <SearchTextField {...params} label="Localizacao padrao, opcional" placeholder="Pesquisar localizacao" helperText={hasDefaultGlpiEntity ? "Mostra somente localizacoes da entidade padrao." : "Ao escolher uma localizacao, a entidade padrao dela sera preenchida automaticamente."} />}
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
                            Defina quais localizacoes aparecem para cada entidade. Use esta area quando o formulario puder trabalhar com mais de uma entidade.
                          </Typography>
                        </div>
                        <Button color="primary" variant="outlined" onClick={addEntityLocationRule} disabled={hasDefaultGlpiEntity}>
                          Adicionar regra
                        </Button>
                      </div>
                      {hasDefaultGlpiEntity && (
                        <div className={classes.warningNotice}>
                          <Typography variant="body2">
                            Regras por entidade desabilitadas porque existe uma Entidade padrao selecionada.
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Com entidade padrao, o chamado sempre usa essa entidade fixa. Para configurar regras por unidade, limpe o campo Entidade padrao acima.
                          </Typography>
                        </div>
                      )}
                      {!entityLocationRules.length && !hasDefaultGlpiEntity && (
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
                            <Grid container spacing={2} alignItems="flex-start">
                              <Grid item xs={12} md={3} className={classes.ruleField}>
                                <Autocomplete
                                  options={catalogs.entities}
                                  value={findByGlpiId(catalogs.entities, rule.entityId)}
                                  getOptionLabel={entityOptionLabel}
                                  getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                                  noOptionsText="Nenhuma entidade encontrada"
                                  disabled={hasDefaultGlpiEntity}
                                  onChange={(event, option) => {
                                    const entityId = option?.glpiId ? Number(option.glpiId) : "";
                                    updateEntityLocationRule(index, {
                                      entityId,
                                      allowedLocationIds: [],
                                      defaultLocationId: ""
                                    });
                                    loadLocationsForEntity(entityId);
                                  }}
                                  renderInput={params => <SearchTextField {...params} label="Entidade" placeholder="Pesquisar entidade" />}
                                />
                              </Grid>
                              <Grid item xs={12} md={5} className={classes.ruleField}>
                                <Autocomplete
                                  multiple
                                  disableCloseOnSelect
                                  options={entityLocations}
                                  value={selectedAllowedLocations}
                                  getOptionLabel={optionLabel}
                                  getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                                  noOptionsText={rule.entityId ? "Nenhuma localizacao desta entidade" : "Selecione uma entidade primeiro"}
                                  disabled={hasDefaultGlpiEntity}
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
                              <Grid item xs={12} md={3} className={classes.ruleField}>
                                <Autocomplete
                                  options={defaultLocationOptions}
                                  value={findByGlpiId(defaultLocationOptions, rule.defaultLocationId)}
                                  getOptionLabel={optionLabel}
                                  getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                                  noOptionsText="Nenhuma localizacao disponivel"
                                  disabled={hasDefaultGlpiEntity}
                                  onChange={(event, option) => updateEntityLocationRule(index, {
                                    defaultLocationId: option?.glpiId ? Number(option.glpiId) : ""
                                  })}
                                  renderInput={params => <SearchTextField {...params} label="Localizacao padrao" placeholder="Pesquisar localizacao" />}
                                />
                              </Grid>
                              <Grid item xs={12} md={1} className={classes.ruleAction}>
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
        {tab === 1 && (
          <>
            <Typography variant="h6" className={classes.sectionTitle}>
              WhatsApp
            </Typography>
            <Typography variant="body2" color="textSecondary" className={classes.helper}>
              Acompanhe a versao do provedor Whaileys usado para conexao WhatsApp. A versao do WhatsApp Web pode ser buscada automaticamente, mas a biblioteca nao atualiza sozinha.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  label="Provedor"
                  value={whatsappStatus?.provider || "whaileys"}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  label="Versao instalada"
                  value={whatsappStatus?.installedVersion || "Nao verificada"}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  label="Ultima versao disponivel"
                  value={whatsappStatus?.latestVersion || "Nao verificada"}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <div className={whatsappStatus?.updateAvailable ? classes.warningNotice : classes.statusMessage}>
                  <Typography variant="body2">
                    {whatsappStatus?.updateAvailable
                      ? "Existe uma atualizacao disponivel para o provedor WhatsApp."
                      : whatsappStatus
                        ? "Nenhuma atualizacao detectada para o provedor WhatsApp."
                        : "Clique em Verificar atualizacao para consultar a versao atual."}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Instalacao e desfazer atualizacao devem criar ponto de rollback por Docker antes de serem habilitados.
                  </Typography>
                </div>
              </Grid>
            </Grid>

            <div className={classes.actions}>
              <Button variant="outlined" color="primary" onClick={checkWhatsappUpdates} disabled={checkingWhatsapp}>
                {checkingWhatsapp ? "Verificando..." : "Verificar atualizacao"}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                disabled={!whatsappStatus?.updateAvailable || !whatsappStatus?.installAutomationReady}
                onClick={() => unavailableWhatsappAutomation("Instalar atualizacao")}
              >
                Instalar atualizacao
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                disabled={!whatsappStatus?.rollbackAutomationReady}
                onClick={() => unavailableWhatsappAutomation("Desfazer ultima atualizacao")}
              >
                Desfazer ultima atualizacao
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
