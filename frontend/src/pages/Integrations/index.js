import React, { useEffect, useState } from "react";

import {
  Button,
  Chip,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import Autocomplete from "@material-ui/lab/Autocomplete";
import SearchIcon from "@material-ui/icons/Search";
import SettingsApplicationsIcon from "@material-ui/icons/SettingsApplications";
import VpnKeyIcon from "@material-ui/icons/VpnKey";
import AssignmentIcon from "@material-ui/icons/Assignment";
import ViewListIcon from "@material-ui/icons/ViewList";
import MessageIcon from "@material-ui/icons/Message";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    padding: 0,
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
    ...theme.scrollbarStyles
  },
  pageHeader: {
	minHeight: 86,
	padding: theme.spacing(1.5, 3),
	background: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  pageEyebrow: {
    color: theme.palette.primary.main,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.5,
	textTransform: "none",
    marginBottom: theme.spacing(0.5)
  },
  pageTitle: {
    fontWeight: 800,
	letterSpacing: 0,
	fontSize: 26
  },
  statusStrip: {
	display: "grid",
	gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
	padding: theme.spacing(1.25, 3),
	borderBottom: `1px solid ${theme.palette.divider}`,
	background: theme.palette.background.paper,
	[theme.breakpoints.down("sm")]: {
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
	},
	[theme.breakpoints.down("xs")]: {
		gridTemplateColumns: "1fr",
		padding: theme.spacing(1, 1.5)
	}
  },
  statusItem: {
	minWidth: 0,
	padding: theme.spacing(0.5, 1.5),
	borderRight: `1px solid ${theme.palette.divider}`,
	"&:last-child": {
		borderRight: 0
	},
	[theme.breakpoints.down("xs")]: {
		borderRight: 0,
		borderBottom: `1px solid ${theme.palette.divider}`,
		padding: theme.spacing(1, 0),
		"&:last-child": {
			borderBottom: 0
		}
	}
  },
  summaryLabel: {
    color: theme.palette.text.secondary,
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.3
  },
  summaryValue: {
	fontSize: 15,
    fontWeight: 800,
    color: theme.palette.text.primary
  },
  summaryHelper: {
    color: theme.palette.text.secondary
  },
  glpiHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(2),
    flexWrap: "wrap",
    marginBottom: theme.spacing(2)
  },
  glpiHeaderSearch: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: theme.spacing(1),
    minWidth: 320,
    flex: "0 1 520px",
    [theme.breakpoints.down("xs")]: {
      minWidth: "100%",
      flex: "1 1 100%"
    }
  },
  glpiSearchField: {
    flex: 1
  },
  tabs: {
    marginBottom: theme.spacing(2),
    minHeight: 44,
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  navTabs: {
	marginBottom: 0,
	minHeight: 48,
	padding: theme.spacing(0, 3),
	borderBottom: `1px solid ${theme.palette.divider}`,
	background: theme.palette.background.paper,
	"& .MuiTab-root": {
		minHeight: 48,
		minWidth: 140,
		textTransform: "none",
		fontWeight: 700,
		transition: "color 180ms ease, background-color 180ms ease"
	},
	"& .Mui-selected": {
		background: theme.palette.type === "dark" ? "rgba(96,165,250,.12)" : "#EFF6FF"
	}
  },
  contentPaper: {
	padding: theme.spacing(2, 3, 3),
	border: 0,
	borderRadius: 0,
	boxShadow: "none",
	background: "transparent",
	[theme.breakpoints.down("xs")]: {
		padding: theme.spacing(1.5)
	}
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
  progressBox: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.default
  },
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  progressSteps: {
    display: "grid",
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(1)
  },
  progressStep: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(0.75, 1),
    borderRadius: 6,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper
  },
  progressStepRunning: {
    borderColor: theme.palette.primary.main,
    background: theme.palette.type === "dark" ? "rgba(37, 99, 235, 0.14)" : "#EFF6FF"
  },
  progressStepDone: {
    opacity: 0.82
  },
  progressStepError: {
    borderColor: theme.palette.error.main,
    background: theme.palette.type === "dark" ? "rgba(244, 67, 54, 0.12)" : "#FEE2E2"
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
  },
  glpiSection: {
    padding: 0,
    marginTop: theme.spacing(2),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    background: theme.palette.background.paper,
    overflow: "hidden"
  },
  glpiSectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.25),
    padding: theme.spacing(1.25, 1.75),
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: theme.palette.type === "dark" ? "rgba(37, 99, 235, 0.12)" : "#eef4ff"
  },
  glpiSectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.primary.main,
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`
  },
  glpiSectionBody: {
    padding: theme.spacing(1.75)
  },
  titleFieldHighlight: {
    padding: theme.spacing(1.25),
    borderRadius: 8,
    border: `1px solid ${theme.palette.primary.light}`,
    background: theme.palette.type === "dark" ? "rgba(37, 99, 235, 0.1)" : "#f3f7ff"
  },
  compactSwitches: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: theme.spacing(0.75, 2),
    marginTop: theme.spacing(0.5)
  },
  selectedSummary: {
    marginTop: theme.spacing(0.75),
    color: theme.palette.text.secondary
  },
  emptyState: {
    padding: theme.spacing(4),
    borderRadius: 8,
    border: `1px dashed ${theme.palette.divider}`,
    background: theme.palette.type === "dark" ? theme.palette.background.default : "#f8fafc",
    textAlign: "center"
  },
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
  glpiAllowedFormCategoryIds: "",
  glpiAllowedFormEntityIds: "",
  glpiAllowedFormLocationIds: "",
  glpiEntityLocationRules: "[]",
  glpiEntityCategoryRules: "[]",
  glpiAutoTitleTemplate: "Solicitacao WhatsApp - {{contactName}}",
  glpiAutoSuccessMessage: "Sua solicitacao foi registrada com sucesso. Chamado GLPI: #{{glpiTicketNumber}}.",
  glpiRequireConfirmationBeforeCreate: "true",
  glpiAutoCloseEnabled: "false",
  glpiAutoCloseMessage: "Atendimento finalizado automaticamente apos abertura do chamado #{{glpiTicketNumber}}.",
  glpiAutoCloseReasonId: "",
  glpiTimeoutMs: "15000",
  glpiConfigurationName: "GLPI Padrao",
  whatsappIds: []
};

const defaultWhatsappProviderSettings = {
  provider: "wwebjs",
  providerLabel: "WhatsApp Web.js",
  labels: {
    wwebjs: "WhatsApp Web.js",
    whaileys: "Whaileys",
    evolution: "Evolution API"
  },
  evolution: {
    apiUrl: "",
    apiKeyMasked: "",
    hasApiKey: false,
    webhookUrl: ""
  }
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

const parseRawData = value => {
  try {
    return typeof value === "string" ? JSON.parse(value || "{}") : value || {};
  } catch (error) {
    return {};
  }
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

const parseEntityCategoryRules = value => {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.map(rule => ({
      entityId: Number(rule.entityId) || "",
      allowedCategoryIds: Array.isArray(rule.allowedCategoryIds)
        ? rule.allowedCategoryIds.map(item => Number(item)).filter(item => Number.isInteger(item) && item > 0)
        : [],
      defaultCategoryId: Number(rule.defaultCategoryId) || ""
    }));
  } catch (error) {
    return [];
  }
};

const serializeEntityCategoryRules = rules =>
  JSON.stringify((rules || []).map(rule => ({
    entityId: Number(rule.entityId) || "",
    allowedCategoryIds: (rule.allowedCategoryIds || []).map(item => Number(item)).filter(item => Number.isInteger(item) && item > 0),
    defaultCategoryId: Number(rule.defaultCategoryId) || null
  })));

const SearchTextField = params => (
  <TextField
    {...params}
    fullWidth
    size="small"
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

const GlpiSectionHeader = ({ classes, icon: Icon, title, description }) => (
  <div className={classes.glpiSectionHeader}>
    <div className={classes.glpiSectionIcon}>
      {Icon ? <Icon fontSize="small" /> : null}
    </div>
    <div>
      <Typography variant="subtitle1">{title}</Typography>
      {description && (
        <Typography variant="body2" color="textSecondary">
          {description}
        </Typography>
      )}
    </div>
  </div>
);

const createLocalWhatsappMaintenance = (action, target = "whaileys") => ({
  active: true,
  action,
  target,
  percent: 5,
  currentStep: action === "rollback" ? (target === "evolution" ? "restore-image" : "npm-rollback") : "rollback-image",
  message: action === "rollback"
    ? "Iniciando rollback do motor WhatsApp..."
    : "Iniciando atualizacao do motor WhatsApp...",
  steps: target === "evolution"
    ? (action === "rollback"
        ? [
            { key: "restore-image", label: "Restaurar imagem anterior da Evolution", status: "running" },
            { key: "recreate", label: "Recriar servico Evolution", status: "pending" }
          ]
        : [
            { key: "rollback-image", label: "Criar ponto de rollback da Evolution", status: "running" },
            { key: "docker-pull", label: "Baixar imagem atualizada da Evolution", status: "pending" },
            { key: "recreate", label: "Recriar servico Evolution", status: "pending" }
          ])
    : (action === "rollback"
        ? [
            { key: "npm-rollback", label: "Restaurar versao anterior do Whaileys", status: "running" },
            { key: "commit-restored", label: "Salvar imagem Docker restaurada", status: "pending" },
            { key: "restart", label: "Reiniciar backend", status: "pending" }
          ]
        : [
            { key: "rollback-image", label: "Criar ponto de rollback Docker", status: "running" },
            { key: "npm-install", label: "Instalar nova versao do Whaileys", status: "pending" },
            { key: "commit-updated", label: "Salvar imagem Docker atualizada", status: "pending" },
            { key: "restart", label: "Reiniciar backend", status: "pending" }
          ])
});

const Integrations = () => {
  const classes = useStyles();
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [glpiConfigurations, setGlpiConfigurations] = useState([]);
  const [selectedGlpiConfigurationId, setSelectedGlpiConfigurationId] = useState("");
  const [newGlpiConfigOpen, setNewGlpiConfigOpen] = useState(false);
  const [newGlpiConfigName, setNewGlpiConfigName] = useState("");
  const [whatsapps, setWhatsapps] = useState([]);
  const [tab, setTab] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [whatsappProviderSettings, setWhatsappProviderSettings] = useState(defaultWhatsappProviderSettings);
  const [testingEvolution, setTestingEvolution] = useState(false);
  const [switchingProvider, setSwitchingProvider] = useState(false);
  const [checkingWhatsapp, setCheckingWhatsapp] = useState(false);
  const [updatingWhatsapp, setUpdatingWhatsapp] = useState("");
  const [localWhatsappMaintenance, setLocalWhatsappMaintenance] = useState(null);
  const [catalogs, setCatalogs] = useState({
    categories: [],
    entities: [],
    locations: [],
    closingReasons: []
  });

  const loadSettings = async (preferredConfigurationId = selectedGlpiConfigurationId) => {
    try {
      const [configurationsResponse, whatsappsResponse, closingReasons] = await Promise.all([
        api.get("/glpi/configurations").catch(() => ({ data: [] })),
        api.get("/whatsapp/").catch(() => ({ data: [] })),
        api.get("/closing-reasons").catch(() => ({ data: [] }))
      ]);
      const configurations = Array.isArray(configurationsResponse.data) ? configurationsResponse.data : [];
      const configurationId = preferredConfigurationId || "";
      setGlpiConfigurations(configurations);
      setWhatsapps(Array.isArray(whatsappsResponse.data) ? whatsappsResponse.data : []);

      if (!configurationId) {
        setSelectedGlpiConfigurationId("");
        setSettings(defaultSettings);
        setCatalogs({
          categories: [],
          entities: [],
          locations: [],
          closingReasons: Array.isArray(closingReasons.data) ? closingReasons.data : []
        });
        return;
      }

      const params = configurationId ? { configurationId } : {};
      const [{ data }, categories, entities, locations] = await Promise.all([
        api.get("/glpi/config", { params }),
        api.get("/glpi/categories", { params }).catch(() => ({ data: [] })),
        api.get("/glpi/entities", { params }).catch(() => ({ data: [] })),
        api.get("/glpi/locations", { params }).catch(() => ({ data: [] }))
      ]);
      setSelectedGlpiConfigurationId(data?.configurationId || configurationId || "");
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

  const checkWhatsappUpdates = async (silent = false) => {
    try {
      if (!silent) setCheckingWhatsapp(true);
      const { data } = await api.get("/whatsapp-updates/status");
      setWhatsappStatus(data);
      if (data.maintenance?.steps?.length) {
        setLocalWhatsappMaintenance(data.maintenance);
      }
      if (!silent) setStatusMessage(data.checkError || "Verificacao do WhatsApp concluida.");
    } catch (err) {
      if (!silent) {
        setStatusMessage(errorMessage(err));
        toastError(err);
      }
    } finally {
      if (!silent) setCheckingWhatsapp(false);
    }
  };

  const loadWhatsappProviderSettings = async () => {
    try {
      const { data } = await api.get("/whatsapp-provider");
      setWhatsappProviderSettings(prev => ({
        ...defaultWhatsappProviderSettings,
        ...data,
        evolution: {
          ...defaultWhatsappProviderSettings.evolution,
          ...(data.evolution || {}),
        }
      }));
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    loadWhatsappProviderSettings();
  }, []);

  const handleWhatsappProviderValue = (path, value) => {
    setWhatsappProviderSettings(prev => {
      if (path.startsWith("evolution.")) {
        const key = path.split(".")[1];
        return {
          ...prev,
          evolution: {
            ...prev.evolution,
            [key]: value
          }
        };
      }

      return { ...prev, [path]: value };
    });
  };

  const saveWhatsappProviderSettings = async () => {
    const { data } = await api.put("/whatsapp-provider", {
      provider: whatsappProviderSettings.provider
    });
    setWhatsappProviderSettings(prev => ({
      ...prev,
      ...data,
      evolution: {
        ...prev.evolution,
        ...(data.evolution || {})
      }
    }));
  };

  const testEvolutionConnection = async () => {
    try {
      setTestingEvolution(true);
      const { data } = await api.post("/whatsapp-provider/test-evolution");
      toast.success(data?.message || "Evolution API respondeu corretamente.");
    } catch (err) {
      toastError(err);
    } finally {
      setTestingEvolution(false);
    }
  };

  const switchWhatsappProvider = async () => {
    const label = whatsappProviderSettings.labels?.[whatsappProviderSettings.provider] || whatsappProviderSettings.provider;
    if (!window.confirm(`Trocar o provedor global para ${label}? Todas as conexoes serao desconectadas e precisarao ser reconectadas.`)) return;

    try {
      setSwitchingProvider(true);
      await saveWhatsappProviderSettings();
      const { data } = await api.post("/whatsapp-provider/switch", {
        provider: whatsappProviderSettings.provider
      });
      setWhatsappProviderSettings(prev => ({
        ...prev,
        ...data,
        evolution: {
          ...prev.evolution,
          ...(data.evolution || {})
        }
      }));
      toast.success(data?.message || "Provedor WhatsApp alterado.");
      await checkWhatsappUpdates(true);
    } catch (err) {
      toastError(err);
    } finally {
      setSwitchingProvider(false);
    }
  };

  useEffect(() => {
    if (!updatingWhatsapp) return undefined;

    const timer = setInterval(() => {
      api.get("/whatsapp-updates/progress")
        .then(({ data }) => {
          if (data.maintenance?.steps?.length) {
            setWhatsappStatus(prev => ({ ...(prev || {}), maintenance: data.maintenance }));
            setLocalWhatsappMaintenance(data.maintenance);
          }
        })
        .catch(() => undefined);
    }, 1500);

    return () => clearInterval(timer);
  }, [updatingWhatsapp]);

  const installWhatsappUpdate = async () => {
    try {
      setUpdatingWhatsapp("install");
      setLocalWhatsappMaintenance(createLocalWhatsappMaintenance("install", whatsappStatus?.updateProvider || "whaileys"));
      setStatusMessage("Criando ponto de rollback Docker e instalando atualizacao...");
      const { data } = await api.post("/whatsapp-updates/install");
      setWhatsappStatus(prev => ({ ...(prev || {}), maintenance: data.maintenance || prev?.maintenance }));
      setLocalWhatsappMaintenance(data.maintenance || createLocalWhatsappMaintenance("install", whatsappStatus?.updateProvider || "whaileys"));
      setStatusMessage(data.message || "Atualizacao iniciada.");
    } catch (err) {
      setStatusMessage(errorMessage(err));
      setLocalWhatsappMaintenance(prev => prev ? { ...prev, active: false, error: errorMessage(err), message: errorMessage(err), steps: prev.steps.map(step => step.status === "running" ? { ...step, status: "error" } : step) } : prev);
      toastError(err);
      setUpdatingWhatsapp("");
    }
  };

  const rollbackWhatsappUpdate = async () => {
    if (!window.confirm("Desfazer a ultima atualizacao do provedor WhatsApp? O backend sera reiniciado apos o rollback.")) return;

    try {
      setUpdatingWhatsapp("rollback");
      setLocalWhatsappMaintenance(createLocalWhatsappMaintenance("rollback", whatsappStatus?.updateProvider || "whaileys"));
      setStatusMessage("Restaurando versao anterior do provedor WhatsApp...");
      const { data } = await api.post("/whatsapp-updates/rollback");
      setWhatsappStatus(prev => ({ ...(prev || {}), maintenance: data.maintenance || prev?.maintenance }));
      setLocalWhatsappMaintenance(data.maintenance || createLocalWhatsappMaintenance("rollback", whatsappStatus?.updateProvider || "whaileys"));
      setStatusMessage(data.message || "Rollback iniciado.");
    } catch (err) {
      setStatusMessage(errorMessage(err));
      setLocalWhatsappMaintenance(prev => prev ? { ...prev, active: false, error: errorMessage(err), message: errorMessage(err), steps: prev.steps.map(step => step.status === "running" ? { ...step, status: "error" } : step) } : prev);
      toastError(err);
      setUpdatingWhatsapp("");
    }
  };

  const handleChange = event => {
    const { name, value } = event.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSettingValue = (name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleBooleanSetting = name => event => {
    handleSettingValue(name, event.target.checked ? "true" : "false");
  };

  const handleGlpiEnabledChange = event => {
    handleSettingValue("glpiEnabled", event.target.checked ? "enabled" : "disabled");
  };

  const createGlpiConfiguration = async () => {
    const name = newGlpiConfigName.trim();
    if (!name) {
      toast.warning("Informe o nome da configuracao GLPI.");
      return;
    }
    try {
      const { data } = await api.post("/glpi/configurations", { name });
      setNewGlpiConfigOpen(false);
      setNewGlpiConfigName("");
      setSelectedGlpiConfigurationId(data.id);
      await loadSettings(data.id);
      toast.success("Configuracao GLPI criada.");
    } catch (err) {
      toastError(err);
    }
  };

  const entityLocationRules = parseEntityLocationRules(settings.glpiEntityLocationRules);
  const entityCategoryRules = parseEntityCategoryRules(settings.glpiEntityCategoryRules);
  const hasDefaultGlpiCategory = Boolean(settings.glpiAutoCategoryId);
  const hasDefaultGlpiEntity = Boolean(settings.glpiAutoEntityId);
  const hasDefaultGlpiLocation = Boolean(settings.glpiAutoLocationId);
  const whatsappMaintenance = whatsappStatus?.maintenance?.steps?.length
    ? whatsappStatus.maintenance
    : localWhatsappMaintenance;
  const showWhatsappProgress = !!updatingWhatsapp || !!whatsappMaintenance?.active || !!whatsappMaintenance?.steps?.length;
  const whatsappProgressPercent = Math.max(0, Math.min(100, Number(whatsappMaintenance?.percent || 0)));
  const whatsappMaintenanceFinished = !!whatsappMaintenance?.steps?.length && !whatsappMaintenance?.active && whatsappProgressPercent >= 100;
  const glpiActive = settings.glpiEnabled !== "disabled";
  const selectedConfiguration = glpiConfigurations.find(item => Number(item.id) === Number(selectedGlpiConfigurationId));
  const selectedConfigurationName = selectedConfiguration?.name || settings.glpiConfigurationName || "Nenhuma configuracao";
  const syncedCatalogsCount = (catalogs.categories?.length || 0) + (catalogs.entities?.length || 0) + (catalogs.locations?.length || 0);
  const whatsappProviderLabel = whatsappProviderSettings.providerLabel || whatsappProviderSettings.labels?.[whatsappProviderSettings.provider] || whatsappProviderSettings.provider || "Nao definido";

  useEffect(() => {
    if (!updatingWhatsapp || !whatsappMaintenance?.steps?.length || whatsappMaintenance.active) return;

    if (whatsappMaintenance.error) {
      setUpdatingWhatsapp("");
      setStatusMessage(whatsappMaintenance.error);
      return;
    }

    if (whatsappProgressPercent >= 100) {
      setUpdatingWhatsapp("");
      setStatusMessage(whatsappMaintenance.message || "Processo concluido.");
      setTimeout(() => checkWhatsappUpdates(true), 8000);
    }
  }, [updatingWhatsapp, whatsappMaintenance, whatsappProgressPercent]);

  const maintenanceStepLabel = status => ({
    pending: "Aguardando",
    running: "Executando",
    done: "Concluido",
    error: "Erro"
  }[status] || status);

  const maintenanceStepClass = step => {
    if (step.status === "running") return `${classes.progressStep} ${classes.progressStepRunning}`;
    if (step.status === "done") return `${classes.progressStep} ${classes.progressStepDone}`;
    if (step.status === "error") return `${classes.progressStep} ${classes.progressStepError}`;
    return classes.progressStep;
  };

  const renderWhatsappProgress = () => {
    if (!showWhatsappProgress) return null;

    return (
      <div className={classes.progressBox}>
        <div className={classes.progressHeader}>
          <Typography variant="subtitle2">
            {whatsappMaintenance?.action === "rollback" ? "Rollback do WhatsApp" : "Atualizacao do WhatsApp"}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {whatsappProgressPercent}%
          </Typography>
        </div>
        <LinearProgress variant="determinate" value={whatsappProgressPercent} />
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
          {whatsappMaintenance?.message || statusMessage || "Preparando manutencao..."}
        </Typography>
        {whatsappMaintenanceFinished && (
          <Typography variant="body2" color="primary" style={{ marginTop: 6 }}>
            Processo concluido. Se a tela ainda mostrar versao antiga, aguarde o reinicio e clique em Verificar atualizacao.
          </Typography>
        )}
        {!!whatsappMaintenance?.steps?.length && (
          <div className={classes.progressSteps}>
            {whatsappMaintenance.steps.map(step => (
              <div key={step.key} className={maintenanceStepClass(step)}>
                <Typography variant="body2">{step.label}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {maintenanceStepLabel(step.status)}
                </Typography>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getEntityParentId = entityId => {
    const entity = findByGlpiId(catalogs.entities, entityId);
    const rawData = parseRawData(entity?.rawData);
    const parentId = Number(rawData.entities_id ?? rawData.entity_id ?? rawData.entityId);
    return Number.isInteger(parentId) && parentId > 0 ? parentId : null;
  };

  const directLocationsByEntity = entityId =>
    (catalogs.locations || []).filter(location => Number(location.entityId) === Number(entityId));

  const locationsByEntity = entityId => {
    const directLocations = directLocationsByEntity(entityId);
    if (directLocations.length) return directLocations;

    const parentId = getEntityParentId(entityId);
    return parentId ? directLocationsByEntity(parentId) : directLocations;
  };

  const defaultEntityLocations = hasDefaultGlpiEntity
    ? locationsByEntity(settings.glpiAutoEntityId)
    : catalogs.locations;
  const selectedConfiguredLocations = settings.glpiAutoLocationId
    ? filterByGlpiIds(defaultEntityLocations, settings.glpiAutoLocationId)
    : filterByGlpiIds(defaultEntityLocations, settings.glpiAllowedFormLocationIds);
  const selectedConfiguredCategories = settings.glpiAutoCategoryId
    ? filterByGlpiIds(catalogs.categories, settings.glpiAutoCategoryId)
    : filterByGlpiIds(catalogs.categories, settings.glpiAllowedFormCategoryIds);

  const loadLocationsForEntity = async entityId => {
    if (!entityId) return [];

    try {
      const { data } = await api.get("/glpi/locations", { params: { entityId, configurationId: selectedGlpiConfigurationId || undefined } });
      const rows = Array.isArray(data) ? data : [];
      const parentId = !rows.length ? getEntityParentId(entityId) : null;
      const parentRows = parentId
        ? (await api.get("/glpi/locations", { params: { entityId: parentId, configurationId: selectedGlpiConfigurationId || undefined } }).catch(() => ({ data: [] }))).data
        : [];
      const mergedRows = [...rows, ...(Array.isArray(parentRows) ? parentRows : [])];

      setCatalogs(prev => ({
        ...prev,
        locations: mergeByGlpiId(prev.locations, mergedRows)
      }));
      return mergedRows;
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

  const updateEntityCategoryRules = nextRules => {
    handleSettingValue("glpiEntityCategoryRules", serializeEntityCategoryRules(nextRules));
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

  const addEntityCategoryRule = () => {
    if (hasDefaultGlpiEntity || hasDefaultGlpiCategory) {
      toast.warning("Limpe a entidade ou categoria padrao antes de adicionar regras de categoria por entidade.");
      return;
    }

    updateEntityCategoryRules([
      ...entityCategoryRules,
      { entityId: "", allowedCategoryIds: [], defaultCategoryId: "" }
    ]);
  };

  const updateEntityCategoryRule = (index, patch) => {
    const nextRules = entityCategoryRules.map((rule, ruleIndex) => {
      if (ruleIndex !== index) return rule;
      const nextRule = { ...rule, ...patch };
      const availableCategoryIds = (catalogs.categories || []).map(category => Number(category.glpiId));

      return {
        ...nextRule,
        allowedCategoryIds: (nextRule.allowedCategoryIds || []).filter(categoryId => availableCategoryIds.includes(Number(categoryId))),
        defaultCategoryId: availableCategoryIds.includes(Number(nextRule.defaultCategoryId)) ? nextRule.defaultCategoryId : ""
      };
    });
    updateEntityCategoryRules(nextRules);
  };

  const removeEntityCategoryRule = index => {
    updateEntityCategoryRules(entityCategoryRules.filter((rule, ruleIndex) => ruleIndex !== index));
  };

  const buildLocationSelectionPatch = value => {
    const ids = (value || []).map(location => Number(location.glpiId)).filter(item => Number.isInteger(item) && item > 0);
    return {
      allowedLocationIds: ids.length > 1 ? ids : [],
      defaultLocationId: ids.length === 1 ? ids[0] : ""
    };
  };

  const buildCategorySelectionPatch = value => {
    const ids = (value || []).map(category => Number(category.glpiId)).filter(item => Number.isInteger(item) && item > 0);
    return {
      allowedCategoryIds: ids.length > 1 ? ids : [],
      defaultCategoryId: ids.length === 1 ? ids[0] : ""
    };
  };

  const upsertEntityCategoryRule = (entityId, patch) => {
    const normalizedEntityId = Number(entityId) || "";
    const existingIndex = entityCategoryRules.findIndex(rule => Number(rule.entityId) === Number(normalizedEntityId));
    if (!normalizedEntityId) return;

    if (existingIndex >= 0) {
      updateEntityCategoryRule(existingIndex, patch);
      return;
    }

    updateEntityCategoryRules([
      ...entityCategoryRules,
      {
        entityId: normalizedEntityId,
        allowedCategoryIds: [],
        defaultCategoryId: "",
        ...patch
      }
    ]);
  };

  const handleDefaultCategoryChange = option => {
    const selected = Array.isArray(option) ? option : option ? [option] : [];
    const categoryIds = selected.map(category => Number(category.glpiId)).filter(categoryId => Number.isInteger(categoryId) && categoryId > 0);
    setSettings(prev => ({
      ...prev,
      glpiAutoCategoryId: categoryIds.length === 1 ? String(categoryIds[0]) : "",
      glpiAllowedFormCategoryIds: categoryIds.length > 1 ? categoryIds.join(",") : ""
    }));
  };

  const handleDefaultLocationChange = option => {
    const selected = Array.isArray(option) ? option : option ? [option] : [];
    const locationIds = selected.map(location => Number(location.glpiId)).filter(locationId => Number.isInteger(locationId) && locationId > 0);
    const singleLocationId = locationIds.length === 1 ? String(locationIds[0]) : "";
    const entityIds = Array.from(new Set(
      selected.map(location => Number(location.entityId)).filter(entityId => Number.isInteger(entityId) && entityId > 0)
    ));
    const entityId = entityIds.length === 1 ? String(entityIds[0]) : "";

    setSettings(prev => ({
      ...prev,
      glpiAutoLocationId: singleLocationId,
      glpiAutoEntityId: entityId || prev.glpiAutoEntityId,
      glpiAllowedFormLocationIds: locationIds.length > 1 ? locationIds.join(",") : "",
      glpiAllowedFormEntityIds: entityId ? "" : prev.glpiAllowedFormEntityIds
    }));

    if (entityId && entityId !== settings.glpiAutoEntityId) {
      loadLocationsForEntity(entityId);
      toast.info("Entidade padrao preenchida automaticamente pela localizacao selecionada.");
    }
  };

  const handleDefaultEntityChange = option => {
    const entityId = option?.glpiId ? String(option.glpiId) : "";
    setSettings(prev => ({
      ...prev,
      glpiAutoEntityId: entityId,
      glpiAutoLocationId: "",
      glpiAllowedFormEntityIds: entityId ? "" : prev.glpiAllowedFormEntityIds
    }));
  };

  const saveSettings = async () => {
    try {
      if (hasDefaultGlpiEntity && entityLocationRules.length) {
        const message = "Com entidade padrao preenchida, remova as regras por entidade ou limpe a entidade padrao antes de salvar.";
        setStatusMessage(message);
        toast.warning(message);
        return;
      }
      if ((hasDefaultGlpiEntity || hasDefaultGlpiCategory) && entityCategoryRules.length) {
        const message = "Com entidade ou categoria padrao preenchida, remova as regras de categoria por entidade antes de salvar.";
        setStatusMessage(message);
        toast.warning(message);
        return;
      }

      setSaving(true);
      await api.put("/glpi/config", {
        ...settings,
        glpiAllowedFormEntityIds: "",
        configurationId: selectedGlpiConfigurationId || settings.configurationId || undefined
      });
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
      const { data } = await api.post("/glpi/test-connection", {}, {
        params: { configurationId: selectedGlpiConfigurationId || undefined }
      });
      const entitiesCount = data?.synced?.entities ?? countRows(data?.entities);
      const categoriesCount = data?.synced?.categories ?? countRows(data?.categories);
      const locationsCount = data?.synced?.locations ?? countRows(data?.locations);
      const details = [
        entitiesCount !== undefined ? `entidades: ${entitiesCount}` : null,
        categoriesCount !== undefined ? `categorias: ${categoriesCount}` : null,
        locationsCount !== undefined ? `localizacoes: ${locationsCount}` : null
      ].filter(Boolean).join(", ");
      const message = details ? `Conexao GLPI validada e catalogos sincronizados (${details}).` : data?.message || "Conexao GLPI validada.";
      toast.success(message);
      setStatusMessage(message);
      if (selectedGlpiConfigurationId) {
        await loadSettings(selectedGlpiConfigurationId);
      }
    } catch (err) {
      setStatusMessage(errorMessage(err));
      toastError(err);
    } finally {
      setTesting(false);
    }
  };

  const deleteGlpiConfiguration = async () => {
    if (!selectedGlpiConfigurationId) return;
    const selected = glpiConfigurations.find(item => Number(item.id) === Number(selectedGlpiConfigurationId));
    const name = selected?.name || settings.glpiConfigurationName || "esta configuracao";
    if (!window.confirm(`Excluir a configuracao GLPI "${name}"? Os catalogos sincronizados desta configuracao tambem serao removidos.`)) return;

    try {
      await api.delete(`/glpi/configurations/${selectedGlpiConfigurationId}`);
      toast.success("Configuracao GLPI excluida.");
      setSelectedGlpiConfigurationId("");
      await loadSettings("");
    } catch (err) {
      setStatusMessage(errorMessage(err));
      toastError(err);
    }
  };

  const mergedEntityRules = [
    ...entityLocationRules.map((rule, index) => ({
      rule,
      locationIndex: index,
      categoryRule: entityCategoryRules.find(categoryRule => Number(categoryRule.entityId) === Number(rule.entityId)) || { entityId: rule.entityId, allowedCategoryIds: [], defaultCategoryId: "" }
    })),
    ...entityCategoryRules
      .filter(categoryRule => !entityLocationRules.some(rule => Number(rule.entityId) === Number(categoryRule.entityId)))
      .map(categoryRule => ({
        rule: { entityId: categoryRule.entityId, allowedLocationIds: [], defaultLocationId: "" },
        locationIndex: -1,
        categoryRule
      }))
  ];

  return (
    <Container maxWidth={false} className={classes.root}>
      <div className={classes.pageHeader}>
		<Typography className={classes.pageEyebrow}>Administração / Integrações</Typography>
		<Typography variant="h4" className={classes.pageTitle}>Integracoes</Typography>
        <Typography variant="body2" color="textSecondary">
          Configure GLPI, provedores de WhatsApp e automacoes usadas pelo atendimento.
        </Typography>
      </div>

      <div className={classes.statusStrip}>
		<div className={classes.statusItem}>
			<Typography className={classes.summaryLabel}>GLPI</Typography>
			<Typography className={classes.summaryValue}>
			  {glpiActive ? "Ativo" : "Desativado"}
			</Typography>
			<Typography variant="caption" className={classes.summaryHelper}>{glpiActive ? "Automacao disponivel" : "Sem abertura automatica"}</Typography>
		</div>
		<div className={classes.statusItem}>
			<Typography className={classes.summaryLabel}>Configuracao</Typography>
			<Typography className={classes.summaryValue}>{selectedConfigurationName}</Typography>
			<Typography variant="caption" className={classes.summaryHelper}>
			  {selectedGlpiConfigurationId ? "Perfil GLPI selecionado" : "Crie ou selecione uma configuracao"}
			</Typography>
		</div>
		<div className={classes.statusItem}>
			<Typography className={classes.summaryLabel}>Catalogos</Typography>
			<Typography className={classes.summaryValue}>{syncedCatalogsCount}</Typography>
			<Typography variant="caption" className={classes.summaryHelper}>
			  Categorias, entidades e localizacoes sincronizadas.
			</Typography>
		</div>
		<div className={classes.statusItem}>
			<Typography className={classes.summaryLabel}>WhatsApp</Typography>
			<Typography className={classes.summaryValue}>{whatsappProviderLabel}</Typography>
			<Typography variant="caption" className={classes.summaryHelper}>
			  Provedor padrao de envio e recebimento.
			</Typography>
		</div>
	  </div>

      <Tabs value={tab} onChange={(event, value) => setTab(value)} indicatorColor="primary" textColor="primary" className={classes.navTabs}>
        <Tab label="GLPI" />
        <Tab label="WhatsApp" />
      </Tabs>

      <Paper className={classes.contentPaper} variant="outlined">
        {tab === 0 && (
          <>
            <div className={classes.glpiHeader}>
              <div>
                <Typography variant="h6" className={classes.sectionTitle}>
                  GLPI
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Busque uma configuracao existente ou crie uma nova para vincular conexoes WhatsApp.
                </Typography>
              </div>
              <div className={classes.glpiHeaderSearch}>
                <Autocomplete
                  className={classes.glpiSearchField}
                  options={glpiConfigurations}
                  value={glpiConfigurations.find(item => Number(item.id) === Number(selectedGlpiConfigurationId)) || null}
                  getOptionLabel={option => option?.name || ""}
                  getOptionSelected={(option, value) => Number(option.id) === Number(value.id)}
                  noOptionsText={glpiConfigurations.length ? "Nenhuma configuracao encontrada" : "Nenhuma configuracao cadastrada"}
                  onChange={(event, option) => {
                    const id = option?.id || "";
                    setSelectedGlpiConfigurationId(id);
                    if (id) {
                      loadSettings(id);
                    } else {
                      loadSettings("");
                    }
                  }}
                  renderInput={params => <SearchTextField {...params} label="" placeholder="Pesquisar configuracao GLPI" />}
                />
                <Button color="primary" variant="outlined" onClick={() => {
                  setNewGlpiConfigName("");
                  setNewGlpiConfigOpen(true);
                }}>
                  Novo
                </Button>
                {selectedGlpiConfigurationId && (
                  <IconButton aria-label="Excluir configuracao GLPI" onClick={deleteGlpiConfiguration}>
                    <DeleteOutlineIcon />
                  </IconButton>
                )}
              </div>
            </div>

            {!selectedGlpiConfigurationId ? (
              <div className={classes.emptyState}>
                <Typography variant="subtitle1">Nenhuma configuracao GLPI selecionada.</Typography>
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 6 }}>
                  Pesquise uma configuracao no canto superior direito ou clique em Novo para comecar.
                </Typography>
              </div>
            ) : (
            <>
            <div className={classes.compactSwitches}>
              <FormControlLabel
                control={<Switch color="primary" checked={settings.glpiEnabled === "enabled"} onChange={handleGlpiEnabledChange} />}
                label="GLPI ativo nesta configuracao"
              />
            </div>

            <div className={classes.glpiSection}>
              <GlpiSectionHeader
                classes={classes}
                icon={SettingsApplicationsIcon}
                title="Configuracao e conexoes"
                description="Nome da configuracao e numeros WhatsApp vinculados a este GLPI."
              />
              <div className={classes.glpiSectionBody}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                  <TextField fullWidth size="small" margin="dense" variant="outlined" label="Nome da configuracao" name="glpiConfigurationName" value={settings.glpiConfigurationName || ""} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={7}>
                  <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={whatsapps}
                    value={(whatsapps || []).filter(item => (settings.whatsappIds || []).map(Number).includes(Number(item.id)))}
                    getOptionLabel={option => option?.name || `Conexao ${option?.id || ""}`}
                    getOptionSelected={(option, value) => Number(option.id) === Number(value.id)}
                    noOptionsText="Nenhuma conexao encontrada"
                    onChange={(event, value) => handleSettingValue("whatsappIds", value.map(item => item.id))}
                    renderOption={(option, { selected }) => (
                      <>
                        <Checkbox color="primary" checked={selected} style={{ marginRight: 8 }} />
                        {option.name || `Conexao ${option.id}`}
                      </>
                    )}
                    renderInput={params => <SearchTextField {...params} label="Conexoes vinculadas" placeholder="Pesquisar conexao" helperText="Cada conexao pode usar somente uma configuracao GLPI." />}
                  />
                  <Typography variant="body2" className={classes.selectedSummary}>
                    {(settings.whatsappIds || []).length} conexao(oes) vinculada(s) a esta configuracao.
                  </Typography>
                </Grid>
              </Grid>
              </div>
            </div>

            <div className={classes.glpiSection}>
              <GlpiSectionHeader
                classes={classes}
                icon={VpnKeyIcon}
                title="Credenciais da API"
                description="Autenticacao, URLs e tempo limite usados por esta configuracao."
              />
              <div className={classes.glpiSectionBody}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                <TextField select fullWidth size="small" margin="dense" variant="outlined" label="Modo da API" name="glpiApiMode" value={settings.glpiApiMode} onChange={handleChange}>
                  <MenuItem value="legacy">API legada v1</MenuItem>
                </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" type="number" margin="dense" variant="outlined" label="Timeout da API (ms)" name="glpiTimeoutMs" value={settings.glpiTimeoutMs} onChange={handleChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" margin="dense" variant="outlined" label="URL da API GLPI" name="glpiApiUrl" value={settings.glpiApiUrl} onChange={handleChange} placeholder="http://10.80.11.210/api.php/v1" />
                </Grid>
                <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" margin="dense" variant="outlined" label="URL web do GLPI" name="glpiBaseWebUrl" value={settings.glpiBaseWebUrl} onChange={handleChange} placeholder="http://10.80.11.210" helperText="Usada no link Abrir no GLPI." />
                </Grid>
                <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" type="password" margin="dense" variant="outlined" label="App-Token" name="glpiAppToken" value={settings.glpiAppToken} onChange={handleChange} helperText="Valor mascarado mantem o token salvo." />
                </Grid>
                <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" type="password" margin="dense" variant="outlined" label="User Token tecnico" name="glpiUserToken" value={settings.glpiUserToken} onChange={handleChange} helperText="Valor mascarado mantem o token salvo." />
                </Grid>
              </Grid>
              </div>
            </div>

            <div className={classes.glpiSection}>
              <GlpiSectionHeader
                classes={classes}
                icon={AssignmentIcon}
                title="Abertura de chamados"
                description="Modo de criacao, titulo padrao e campos principais do chamado."
              />
              <div className={classes.glpiSectionBody}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4} md={3}>
                  <TextField select fullWidth size="small" margin="dense" variant="outlined" label="Modo de abertura" name="glpiAutomationMode" value={settings.glpiAutomationMode} onChange={handleChange}>
                    <MenuItem value="manual">Manual</MenuItem>
                    <MenuItem value="automatic">Automatico por formulario</MenuItem>
                    <MenuItem value="hybrid">Flexivel</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={8} md={5}>
                  <div className={classes.compactSwitches}>
                    <FormControlLabel
                      control={<Switch color="primary" checked={settings.glpiAllowMultipleTickets === "true"} onChange={handleBooleanSetting("glpiAllowMultipleTickets")} />}
                      label="Permitir multiplos chamados por atendimento"
                    />
                  </div>
                </Grid>
              </Grid>
              {["automatic", "hybrid"].includes(settings.glpiAutomationMode) && (
                <>
                  <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <div className={classes.titleFieldHighlight}>
                      <TextField fullWidth size="small" margin="dense" variant="outlined" label="Titulo padrao do chamado" name="glpiAutoTitleTemplate" value={settings.glpiAutoTitleTemplate} onChange={handleChange} helperText="Variaveis: {{contactName}}, {{contactNumber}}, {{ticketId}}, {{formName}}, {{entityName}}, {{locationName}}" />
                    </div>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      options={catalogs.categories}
                      value={selectedConfiguredCategories}
                      getOptionLabel={optionLabel}
                      getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                      noOptionsText="Nenhuma categoria encontrada"
                      onChange={(event, option) => handleDefaultCategoryChange(option)}
                      renderOption={(option, { selected }) => (
                        <>
                          <Checkbox color="primary" checked={selected} style={{ marginRight: 8 }} />
                          {optionLabel(option)}
                        </>
                      )}
                      renderInput={params => <SearchTextField {...params} required label="Categorias do formulario" placeholder="Pesquisar categoria" helperText="Vazio mostra todas quando houver pergunta Categoria GLPI. Uma vira padrao e pula a pergunta. Mais de uma vira lista." />}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={catalogs.entities}
                      value={findByGlpiId(catalogs.entities, settings.glpiAutoEntityId)}
                      getOptionLabel={entityOptionLabel}
                      getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                      noOptionsText="Nenhuma entidade encontrada"
                      onChange={(event, option) => handleDefaultEntityChange(option)}
                      renderInput={params => <SearchTextField {...params} label="Entidade padrao, se o formulario nao perguntar" placeholder="Pesquisar entidade" />}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      options={defaultEntityLocations}
                      value={selectedConfiguredLocations}
                      getOptionLabel={optionLabel}
                      getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                      noOptionsText={hasDefaultGlpiEntity ? "Nenhuma localizacao desta entidade" : "Nenhuma localizacao encontrada"}
                      onChange={(event, option) => handleDefaultLocationChange(option)}
                      renderOption={(option, { selected }) => (
                        <>
                          <Checkbox color="primary" checked={selected} style={{ marginRight: 8 }} />
                          {optionLabel(option)}
                        </>
                      )}
                      renderInput={params => <SearchTextField {...params} label="Localizacoes do formulario" placeholder="Pesquisar localizacao" helperText="Vazio mostra todas quando houver pergunta Localizacao GLPI. Uma vira padrao e pula a pergunta. Mais de uma vira lista." />}
                    />
                  </Grid>
                  </Grid>
                </>
              )}
              </div>
            </div>

            {["automatic", "hybrid"].includes(settings.glpiAutomationMode) && (
            <>
            <div className={classes.glpiSection}>
              <GlpiSectionHeader
                classes={classes}
                icon={ViewListIcon}
                title="Catalogo do formulario"
                description="Use as regras quando este GLPI atende multiplas unidades e o cliente precisa escolher a unidade/localizacao."
              />
              <div className={classes.glpiSectionBody}>
                <Grid container spacing={2}>
                  {!hasDefaultGlpiEntity && !hasDefaultGlpiLocation && (
                    <Grid item xs={12}>
                      <div className={classes.automaticSection}>
                        <div className={classes.ruleHeader}>
                          <div>
                            <Typography variant="subtitle1">Regras por entidade</Typography>
                            <Typography variant="body2" color="textSecondary">
                              Configure aqui quando o GLPI tiver multiplas unidades. Cada entidade pode exibir localizacoes e categorias proprias.
                            </Typography>
                          </div>
                          <Button color="primary" variant="outlined" onClick={addEntityLocationRule}>
                            Adicionar regra
                          </Button>
                        </div>
                        {!mergedEntityRules.length && (
                          <Typography variant="body2" color="textSecondary">
                            Sem regra especifica: o formulario mostra as localizacoes da entidade selecionada e as categorias configuradas acima.
                          </Typography>
                        )}
                        {mergedEntityRules.map(({ rule, locationIndex, categoryRule }, index) => {
                          const entityLocations = locationsByEntity(rule.entityId);
                          const selectedLocations = entityLocations.filter(location =>
                            [
                              ...(rule.allowedLocationIds || []),
                              ...(rule.defaultLocationId ? [rule.defaultLocationId] : [])
                            ].map(Number).includes(Number(location.glpiId))
                          );
                          const selectedCategories = (catalogs.categories || []).filter(category =>
                            [
                              ...(categoryRule.allowedCategoryIds || []),
                              ...(categoryRule.defaultCategoryId ? [categoryRule.defaultCategoryId] : [])
                            ].map(Number).includes(Number(category.glpiId))
                          );

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
                                    onChange={(event, option) => {
                                      const previousEntityId = rule.entityId;
                                      const entityId = option?.glpiId ? Number(option.glpiId) : "";
                                      if (locationIndex >= 0) {
                                        updateEntityLocationRule(locationIndex, {
                                          entityId,
                                          allowedLocationIds: [],
                                          defaultLocationId: ""
                                        });
                                      } else {
                                        updateEntityLocationRules([
                                          ...entityLocationRules,
                                          { entityId, allowedLocationIds: [], defaultLocationId: "" }
                                        ]);
                                      }
                                      const categoryIndex = entityCategoryRules.findIndex(item => Number(item.entityId) === Number(previousEntityId));
                                      if (categoryIndex >= 0) {
                                        updateEntityCategoryRule(categoryIndex, {
                                          entityId,
                                          allowedCategoryIds: [],
                                          defaultCategoryId: ""
                                        });
                                      }
                                      loadLocationsForEntity(entityId);
                                    }}
                                    renderInput={params => <SearchTextField {...params} label="Entidade" placeholder="Pesquisar entidade" />}
                                  />
                                </Grid>
                                <Grid item xs={12} md={4} className={classes.ruleField}>
                                  <Autocomplete
                                    multiple
                                    disableCloseOnSelect
                                    options={entityLocations}
                                    value={selectedLocations}
                                    getOptionLabel={optionLabel}
                                    getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                                    noOptionsText={rule.entityId ? "Nenhuma localizacao desta entidade" : "Selecione uma entidade primeiro"}
                                    onChange={(event, value) => {
                                      const patch = buildLocationSelectionPatch(value);
                                      if (locationIndex >= 0) {
                                        updateEntityLocationRule(locationIndex, patch);
                                      } else {
                                        updateEntityLocationRules([
                                          ...entityLocationRules,
                                          { entityId: rule.entityId, ...patch }
                                        ]);
                                      }
                                    }}
                                    renderOption={(option, { selected }) => (
                                      <>
                                        <Checkbox color="primary" checked={selected} style={{ marginRight: 8 }} />
                                        {optionLabel(option)}
                                      </>
                                    )}
                                    renderInput={params => <SearchTextField {...params} label="Localizacoes" placeholder="Pesquisar localizacao" helperText="Vazio mostra todas se o formulario tiver pergunta Localizacao GLPI. Uma vira padrao e pula a pergunta. Mais de uma vira lista." />}
                                  />
                                </Grid>
                                {!hasDefaultGlpiCategory && (
                                <Grid item xs={12} md={4} className={classes.ruleField}>
                                  <Autocomplete
                                    multiple
                                    disableCloseOnSelect
                                    options={catalogs.categories}
                                    value={selectedCategories}
                                    getOptionLabel={optionLabel}
                                    getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                                    noOptionsText="Nenhuma categoria encontrada"
                                    onChange={(event, value) => upsertEntityCategoryRule(rule.entityId, buildCategorySelectionPatch(value))}
                                    renderOption={(option, { selected }) => (
                                      <>
                                        <Checkbox color="primary" checked={selected} style={{ marginRight: 8 }} />
                                        {optionLabel(option)}
                                      </>
                                    )}
                                    renderInput={params => <SearchTextField {...params} label="Categorias" placeholder="Pesquisar categoria" helperText="Vazio mostra todas se o formulario tiver pergunta Categoria GLPI. Uma vira padrao e pula a pergunta. Mais de uma vira lista." />}
                                  />
                                </Grid>
                                )}
                                <Grid item xs={12} md={1} className={classes.ruleAction}>
                                  <Button fullWidth color="secondary" variant="outlined" onClick={() => {
                                    if (locationIndex >= 0) removeEntityLocationRule(locationIndex);
                                    const categoryIndex = entityCategoryRules.findIndex(item => Number(item.entityId) === Number(rule.entityId));
                                    if (categoryIndex >= 0) removeEntityCategoryRule(categoryIndex);
                                  }}>
                                    Remover
                                  </Button>
                                </Grid>
                              </Grid>
                            </div>
                          );
                        })}
                      </div>
                    </Grid>
                  )}
                  {(hasDefaultGlpiEntity || hasDefaultGlpiLocation) && (
                    <Grid item xs={12}>
                      <div className={classes.warningNotice}>
                        <Typography variant="body2">
                          Regras por entidade ocultas porque existe um destino padrao selecionado.
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {hasDefaultGlpiLocation
                            ? "Com localizacao padrao, o chamado sempre usa essa localizacao e nao precisa listar localizacoes para o cliente."
                            : "Com entidade padrao, o formulario usa uma unica entidade. Para configurar regras por unidade, limpe a entidade padrao acima."}
                        </Typography>
                      </div>
                    </Grid>
                  )}
                  {hasDefaultGlpiCategory && (
                    <Grid item xs={12}>
                      <div className={classes.warningNotice}>
                        <Typography variant="body2">
                          Regras de categoria por entidade ocultas porque existe uma categoria padrao selecionada.
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Com uma unica categoria, o chamado usa essa categoria automaticamente. Para listar categorias por unidade, limpe a categoria padrao acima.
                        </Typography>
                      </div>
                    </Grid>
                  )}
                </Grid>
              </div>
            </div>

            <div className={classes.glpiSection}>
              <GlpiSectionHeader
                classes={classes}
                icon={MessageIcon}
                title="Mensagens e encerramento"
                description="Resumo para o cliente, mensagem de sucesso e encerramento automatico."
              />
              <div className={classes.glpiSectionBody}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" multiline rows={2} margin="dense" variant="outlined" label="Mensagem apos abrir chamado" name="glpiAutoSuccessMessage" value={settings.glpiAutoSuccessMessage} onChange={handleChange} helperText="Use {{glpiTicketNumber}} para informar o numero do chamado." />
                  </Grid>
                  <Grid item xs={12}>
                    <div className={classes.compactSwitches}>
                      <FormControlLabel
                        control={<Switch color="primary" checked={settings.glpiRequireConfirmationBeforeCreate !== "false"} onChange={handleBooleanSetting("glpiRequireConfirmationBeforeCreate")} />}
                        label="Mostrar resumo antes de abrir chamado"
                      />
                      <FormControlLabel
                        control={<Switch color="primary" checked={settings.glpiAutoCloseEnabled === "true"} onChange={handleBooleanSetting("glpiAutoCloseEnabled")} />}
                        label="Finalizar atendimento automaticamente"
                      />
                    </div>
                    <Typography variant="body2" color="textSecondary">
                      O resumo permite confirmar, cancelar ou refazer antes de criar o chamado.
                    </Typography>
                  </Grid>
                  {settings.glpiAutoCloseEnabled === "true" && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField select fullWidth size="small" required margin="dense" variant="outlined" label="Motivo de encerramento" name="glpiAutoCloseReasonId" value={settings.glpiAutoCloseReasonId} onChange={handleChange}>
                          <MenuItem value="">Selecione</MenuItem>
                          {catalogs.closingReasons.map(reason => (
                            <MenuItem key={reason.id} value={String(reason.id)}>
                              {reason.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth size="small" multiline rows={2} margin="dense" variant="outlined" label="Mensagem de encerramento automatico" name="glpiAutoCloseMessage" value={settings.glpiAutoCloseMessage} onChange={handleChange} />
                      </Grid>
                    </>
                  )}
                </Grid>
              </div>
            </div>
            </>
            )}

            <div className={classes.actions}>
              <Button variant="outlined" color="primary" onClick={testConnection} disabled={testing}>
                {testing ? "Testando e sincronizando..." : "Testar e sincronizar"}
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
            <Dialog
              open={newGlpiConfigOpen}
              onClose={() => setNewGlpiConfigOpen(false)}
              maxWidth="xs"
              fullWidth
            >
              <DialogTitle>Nova configuracao GLPI</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  label="Nome da configuracao"
                  value={newGlpiConfigName}
                  onChange={event => setNewGlpiConfigName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter") createGlpiConfiguration();
                  }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setNewGlpiConfigOpen(false)}>
                  Cancelar
                </Button>
                <Button color="primary" variant="contained" onClick={createGlpiConfiguration}>
                  Criar
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
        {tab === 1 && (
          <>
            <Typography variant="h6" className={classes.sectionTitle}>
              WhatsApp
            </Typography>
            <Typography variant="body2" color="textSecondary" className={classes.helper}>
              Escolha manualmente qual provedor global todas as conexoes WhatsApp devem usar. Ao trocar, reconecte os numeros.
            </Typography>

            <div className={classes.glpiSection}>
              <GlpiSectionHeader
                classes={classes}
                icon={SettingsApplicationsIcon}
                title="Provedor global"
                description="A escolha vale para envio, recebimento, campanhas, URA, IA e abertura manual de chamados."
              />
              <div className={classes.glpiSectionBody}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      margin="dense"
                      variant="outlined"
                      label="Provedor em uso"
                      value={whatsappProviderSettings.provider}
                      onChange={event => handleWhatsappProviderValue("provider", event.target.value)}
                    >
                      {Object.entries(whatsappProviderSettings.labels || {}).map(([key, label]) => (
                        <MenuItem key={key} value={key}>
                          {label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <div className={classes.statusMessage}>
                      <Typography variant="body2">
                        Provedor ativo: {whatsappProviderSettings.providerLabel || whatsappProviderSettings.labels?.[whatsappProviderSettings.provider] || whatsappProviderSettings.provider}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                      A troca e manual. Depois de aplicar, todos os numeros ficam desconectados para novo pareamento no provedor selecionado.
                      </Typography>
                    </div>
                  </Grid>
                  {whatsappProviderSettings.provider === "evolution" && (
                    <Grid item xs={12}>
                      <div className={classes.statusMessage}>
                        <Typography variant="body2">
                          Evolution API sera usada como motor interno do sistema.
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          URL, chave e webhook ficam configurados no Docker/.env; o usuario so precisa aplicar a troca e reconectar os numeros.
                        </Typography>
                      </div>
                    </Grid>
                  )}
                </Grid>
                <div className={classes.actions}>
                  <Button variant="outlined" color="primary" onClick={testEvolutionConnection} disabled={testingEvolution}>
                    {testingEvolution ? "Testando..." : "Testar Evolution"}
                  </Button>
                  <Button variant="contained" color="primary" onClick={switchWhatsappProvider} disabled={switchingProvider}>
                    {switchingProvider ? "Aplicando..." : "Aplicar troca global"}
                  </Button>
                </div>
              </div>
            </div>

            <div className={classes.glpiSection}>
              <GlpiSectionHeader
                classes={classes}
                icon={VpnKeyIcon}
                title="Atualizacao do motor selecionado"
                description="Atualize ou desfaça a ultima atualizacao do provedor WhatsApp em uso."
              />
              <div className={classes.glpiSectionBody}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      margin="dense"
                      variant="outlined"
                      label="Biblioteca"
                      value={whatsappStatus?.updateProviderLabel || "Whaileys"}
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
                          ? `Existe uma atualizacao disponivel para ${whatsappStatus?.updateProviderLabel || "o provedor WhatsApp"}.`
                          : whatsappStatus
                            ? `Nenhuma atualizacao detectada para ${whatsappStatus?.updateProviderLabel || "o provedor WhatsApp"}.`
                            : "Clique em Verificar atualizacao para consultar a versao atual."}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {whatsappStatus?.installAutomationReady
                          ? "Ao instalar, o sistema cria automaticamente um ponto de rollback Docker antes de atualizar."
                          : "Automacao indisponivel: o backend precisa acessar o Docker para criar o ponto de rollback."}
                      </Typography>
                      {whatsappStatus?.rollbackPoint?.createdAt && (
                        <Typography variant="body2" color="textSecondary">
                          Ultimo rollback: versao {whatsappStatus.rollbackPoint.previousVersion} em {new Date(whatsappStatus.rollbackPoint.createdAt).toLocaleString()}.
                        </Typography>
                      )}
                    </div>
                  </Grid>
                </Grid>

                {renderWhatsappProgress()}

                <div className={classes.actions}>
                  <Button variant="outlined" color="primary" onClick={checkWhatsappUpdates} disabled={checkingWhatsapp}>
                    {checkingWhatsapp ? "Verificando..." : "Verificar atualizacao"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    disabled={!whatsappStatus?.updateAvailable || !whatsappStatus?.installAutomationReady || !!updatingWhatsapp}
                    onClick={installWhatsappUpdate}
                  >
                    {updatingWhatsapp === "install" ? "Instalando..." : "Instalar atualizacao"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    disabled={!whatsappStatus?.rollbackAutomationReady || !!updatingWhatsapp}
                    onClick={rollbackWhatsappUpdate}
                  >
                    {updatingWhatsapp === "rollback" ? "Desfazendo..." : "Desfazer ultima atualizacao"}
                  </Button>
                </div>
              </div>
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
