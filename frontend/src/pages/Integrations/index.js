import React, { useEffect, useState } from "react";

import {
  Button,
  Container,
  Grid,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
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
  glpiAutoCreateEnabled: "false",
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

const Integrations = () => {
  const classes = useStyles();
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState("");
  const [tab, setTab] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  const loadSettings = async () => {
    try {
      const { data } = await api.get("/glpi/config");
      setSettings({ ...defaultSettings, ...(data || {}) });
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
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth margin="dense" variant="outlined" label="Criacao automatica por formulario" name="glpiAutoCreateEnabled" value={settings.glpiAutoCreateEnabled} onChange={handleChange}>
                  <MenuItem value="false">Desativada</MenuItem>
                  <MenuItem value="true">Ativada</MenuItem>
                </TextField>
              </Grid>
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
