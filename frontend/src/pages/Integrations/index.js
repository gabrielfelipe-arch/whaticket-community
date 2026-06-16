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
    marginTop: theme.spacing(2)
  }
}));

const glpiFields = [
  "glpiEnabled",
  "glpiApiUrl",
  "glpiAppToken",
  "glpiUserToken",
  "glpiEntityId",
  "glpiCategoryId"
];

const Integrations = () => {
  const classes = useStyles();
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);

  const loadSettings = async () => {
    try {
      const { data } = await api.get("/settings");
      const nextSettings = {};
      (data || []).forEach(setting => {
        nextSettings[setting.key] = setting.value || "";
      });
      setSettings(nextSettings);
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
      for (const key of glpiFields) {
        await api.put(`/settings/${key}`, { value: settings[key] || "" });
      }
      toast.success("Integração GLPI salva com sucesso.");
      loadSettings();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth={false} className={classes.root}>
      <div className={classes.pageHeader}>
        <Typography variant="h5">Integrações</Typography>
        <Typography variant="body2" color="textSecondary">
          Configure integrações externas usadas pelo atendimento.
        </Typography>
      </div>

      <Tabs
        value={tab}
        onChange={(event, value) => setTab(value)}
        indicatorColor="primary"
        textColor="primary"
        className={classes.tabs}
      >
        <Tab label="GLPI" />
      </Tabs>

      <Paper className={classes.contentPaper} variant="outlined">
        {tab === 0 && (
          <>
            <Typography variant="h6" className={classes.sectionTitle}>
              GLPI
            </Typography>
            <Typography variant="body2" color="textSecondary" className={classes.helper}>
              Quando ativado, o sistema pode abrir chamados no GLPI usando os dados abaixo.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  label="Integração GLPI"
                  name="glpiEnabled"
                  value={settings.glpiEnabled || "disabled"}
                  onChange={handleChange}
                >
                  <MenuItem value="disabled">Desativada</MenuItem>
                  <MenuItem value="enabled">Ativada</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  label="URL da API GLPI"
                  name="glpiApiUrl"
                  value={settings.glpiApiUrl || ""}
                  onChange={handleChange}
                  placeholder="https://glpi.exemplo.com/apirest.php"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  margin="dense"
                  variant="outlined"
                  label="App Token"
                  name="glpiAppToken"
                  value={settings.glpiAppToken || ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  margin="dense"
                  variant="outlined"
                  label="User Token"
                  name="glpiUserToken"
                  value={settings.glpiUserToken || ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  label="ID da entidade"
                  name="glpiEntityId"
                  value={settings.glpiEntityId || ""}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  label="ID da categoria GLPI"
                  name="glpiCategoryId"
                  value={settings.glpiCategoryId || ""}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            <div className={classes.actions}>
              <Button color="primary" variant="contained" onClick={saveSettings} disabled={saving}>
                {saving ? "Salvando..." : "Salvar integração"}
              </Button>
            </div>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default Integrations;
