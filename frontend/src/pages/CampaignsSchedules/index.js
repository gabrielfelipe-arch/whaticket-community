import React, { useEffect, useState } from "react";
import {
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Tooltip
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import SearchIcon from "@material-ui/icons/Search";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import StopIcon from "@material-ui/icons/Stop";
import EditIcon from "@material-ui/icons/Edit";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import ListAltIcon from "@material-ui/icons/ListAlt";
import ReplayIcon from "@material-ui/icons/Replay";
import SendIcon from "@material-ui/icons/Send";
import ScheduleIcon from "@material-ui/icons/Schedule";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import MessageTemplateField from "../../components/MessageTemplateField";
import TagCheckboxPicker from "../../components/TagCheckboxPicker";

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "auto",
    background: theme.palette.background.default,
    ...theme.scrollbarStyles
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2)
  },
  tabs: {
    marginBottom: theme.spacing(2),
    minHeight: 44,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  paper: {
    padding: theme.spacing(1.5),
    overflowX: "auto",
    borderRadius: 8,
    boxShadow: theme.custom?.cardShadow,
    borderColor: theme.palette.divider,
  },
  playlist: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.25),
  },
  automationCard: {
    padding: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    background: theme.palette.background.paper,
    boxShadow: theme.custom?.cardShadow || "0 10px 24px rgba(15,23,42,0.06)",
  },
  automationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(1.5),
  },
  automationTitle: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    minWidth: 0,
  },
  automationIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    background: theme.palette.primary.main,
    flexShrink: 0,
  },
  automationName: {
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  automationMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(0.5),
  },
  automationStats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(86px, 1fr))",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
  },
  statBox: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(1),
    background: theme.palette.type === "dark" ? "#111A2E" : "#F8FAFC",
  },
  statValue: {
    fontWeight: 700,
  },
  progressArea: {
    marginTop: theme.spacing(1.5),
  },
  playerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: theme.spacing(0.25),
    flexShrink: 0,
  },
  helper: {
    marginBottom: theme.spacing(2)
  },
  tagChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.5)
  },
  contactPicker: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(1.25),
    background: theme.palette.type === "dark" ? "#0B1220" : "#F8FAFC",
  },
  contactPickerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1),
    gap: theme.spacing(1)
  },
  contactList: {
    maxHeight: 220,
    overflowY: "auto",
    borderTop: `1px solid ${theme.palette.divider}`,
    marginTop: theme.spacing(1),
    ...theme.scrollbarStyles,
  },
  contactRow: {
    display: "flex",
    alignItems: "center",
    minHeight: 42,
    borderBottom: `1px solid ${theme.palette.divider}`,
    cursor: "pointer",
    borderRadius: 8,
    "&:hover": {
      background: theme.palette.type === "dark" ? "rgba(56,189,248,0.08)" : "#EFF6FF",
    },
  },
  contactInfo: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0
  },
  contactName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  contactNumber: {
    color: theme.palette.text.secondary,
    fontSize: 12
  },
  wizardSteps: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(120px, 1fr))",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr"
    }
  },
  wizardStep: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(1),
    cursor: "pointer",
    background: theme.palette.type === "dark" ? "#111A2E" : "#FFFFFF",
    color: theme.palette.text.secondary,
    transition: "all .2s ease",
    "& strong": {
      display: "block",
      color: "inherit",
      fontSize: 13
    },
    "& span": {
      fontSize: 12
    }
  },
  wizardStepActive: {
    borderColor: theme.palette.primary.main,
    background: theme.palette.type === "dark" ? "rgba(37,99,235,0.18)" : "#EFF6FF",
    color: theme.palette.primary.main,
    boxShadow: theme.custom?.cardShadow || "0 10px 24px rgba(15,23,42,0.08)"
  },
  wizardSection: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(1.5),
    background: theme.palette.type === "dark" ? "#111A2E" : "#FFFFFF",
    marginBottom: theme.spacing(1.5)
  },
  summaryList: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: theme.spacing(1),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr"
    }
  },
  summaryItem: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(1),
    background: theme.palette.type === "dark" ? "#0B1220" : "#F8FAFC"
  }
}));

const initialCampaign = {
  name: "",
  message: "",
  audience: "contacts",
  recipientType: "contacts",
  scheduledAt: "",
  intervalPattern: "30",
  pauseAfter: 20,
  pauseMinutes: 5,
  whatsappId: "",
  contactIds: [],
  tagIds: [],
  excludeTagIds: [],
  tagAppliedLastDays: ""
};

const initialSchedule = {
  sendType: "scheduled",
  contactIds: [],
  tagIds: [],
  excludeTagIds: [],
  tagAppliedLastDays: "",
  audience: "all",
  message: "",
  scheduledAt: "",
  recurrenceType: "once",
  weekdays: [],
  times: [],
  startsAt: "",
  endsAt: "",
  repeatEvery: 1,
  repeatUnit: "hours",
  maxRuns: "",
  respectBusinessHours: false,
  missedRunPolicy: "skip",
  intervalPattern: "30",
  pauseAfter: 20,
  pauseMinutes: 5,
  whatsappId: ""
};

const weekdayOptions = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terca" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sabado" },
  { value: 0, label: "Domingo" }
];

const repeatUnitOptions = [
  { value: "minutes", label: "minutos" },
  { value: "hours", label: "horas" },
  { value: "days", label: "dias" }
];

const scheduleSteps = [
  {
    title: "Mensagem e destinatarios",
    description: "Conteudo, anexo e publico"
  },
  {
    title: "Ritmo de envio",
    description: "Intervalo e pausas da fila"
  },
  {
    title: "Quando enviar",
    description: "Data, horarios e recorrencia"
  },
  {
    title: "Resumo",
    description: "Conferir e concluir"
  }
];

const toDateTimeLocalValue = value => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const normalizeSearch = value =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const filterContactsByAudience = (contacts, audience) =>
  contacts.filter(contact => {
    if (audience === "contacts") return !contact.isGroup;
    if (audience === "groups") return contact.isGroup;
    return true;
  });

const contactHasAnyTag = (contact, tagIds) => {
  if (!tagIds?.length) return false;
  const selected = new Set(tagIds.map(Number));
  return (contact.tags || []).some(tag => selected.has(Number(tag.id)));
};

const ContactPicker = ({
  classes,
  contacts,
  audience,
  selectedIds,
  onChange,
  label
}) => {
  const [search, setSearch] = useState("");
  const selectedSet = new Set((selectedIds || []).map(Number));
  const searchValue = normalizeSearch(search);
  const filteredContacts = filterContactsByAudience(contacts, audience).filter(contact => {
    const searchable = normalizeSearch(`${contact.name} ${contact.number || ""}`);
    return searchable.includes(searchValue);
  });

  const toggleContact = contactId => {
    const normalizedId = Number(contactId);
    const nextSelected = selectedSet.has(normalizedId)
      ? (selectedIds || []).filter(id => Number(id) !== normalizedId)
      : [...(selectedIds || []), normalizedId];

    onChange(nextSelected);
  };

  return (
    <div className={classes.contactPicker}>
      <div className={classes.contactPickerHeader}>
        <Typography variant="subtitle2">{label}</Typography>
        {!!selectedIds?.length && (
          <Button size="small" onClick={() => onChange([])}>
            Limpar
          </Button>
        )}
      </div>
      <TextField
        fullWidth
        size="small"
        variant="outlined"
        placeholder="Buscar por nome ou numero"
        value={search}
        onChange={event => setSearch(event.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          )
        }}
      />
      {!!selectedIds?.length && (
        <div className={classes.tagChips} style={{ marginTop: 8 }}>
          {selectedIds.map(contactId => {
            const contact = contacts.find(item => Number(item.id) === Number(contactId));
            return (
              <Chip
                key={contactId}
                size="small"
                label={contact?.name || contactId}
                onDelete={() => toggleContact(contactId)}
              />
            );
          })}
        </div>
      )}
      <div className={classes.contactList}>
        {filteredContacts.map(contact => (
          <div
            key={contact.id}
            className={classes.contactRow}
            onClick={() => toggleContact(contact.id)}
            role="button"
            tabIndex={0}
          >
            <Checkbox
              color="primary"
              checked={selectedSet.has(Number(contact.id))}
              onChange={() => toggleContact(contact.id)}
              onClick={event => event.stopPropagation()}
            />
            <div className={classes.contactInfo}>
              <span className={classes.contactName}>
                {contact.name} {contact.isGroup ? "(grupo)" : ""}
              </span>
              <span className={classes.contactNumber}>{contact.number}</span>
            </div>
          </div>
        ))}
        {filteredContacts.length === 0 && (
          <Typography variant="body2" color="textSecondary" style={{ padding: 12 }}>
            Nenhum contato encontrado.
          </Typography>
        )}
      </div>
    </div>
  );
};

const CampaignsSchedules = () => {
  const classes = useStyles();
  const [tab, setTab] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [tags, setTags] = useState([]);
  const [whatsapps, setWhatsapps] = useState([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [sendType, setSendType] = useState("scheduled");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterText, setFilterText] = useState("");
  const [campaignForm, setCampaignForm] = useState(initialCampaign);
  const [scheduleForm, setScheduleForm] = useState(initialSchedule);
  const [campaignMedia, setCampaignMedia] = useState(null);
  const [scheduleMedia, setScheduleMedia] = useState(null);
  const [scheduleTimeInput, setScheduleTimeInput] = useState("");
  const [scheduleStep, setScheduleStep] = useState(0);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsTitle, setLogsTitle] = useState("");
  const [logs, setLogs] = useState([]);

  const loadData = async () => {
    try {
      const [
        { data: campaignData },
        { data: scheduleData },
        { data: contactData },
        { data: whatsappData },
        { data: tagData }
      ] = await Promise.all([
        api.get("/campaigns"),
        api.get("/scheduled-messages"),
        api.get("/contacts", { params: { all: true } }),
        api.get("/whatsapp/"),
        api.get("/tags")
      ]);

      setCampaigns(campaignData);
      setSchedules(scheduleData);
      setContacts(contactData.contacts || []);
      setWhatsapps(whatsappData || []);
      setTags(tagData || []);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCampaignChange = event => {
    const { name, value } = event.target;
    setCampaignForm(prev => ({ ...prev, [name]: value }));
  };

  const handleScheduleChange = event => {
    const { name, value, type, checked } = event.target;
    if (type === "checkbox") {
      setScheduleForm(prev => ({ ...prev, [name]: checked }));
      return;
    }
    setScheduleForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleScheduleWeekday = day => {
    setScheduleForm(prev => {
      const current = prev.weekdays.map(Number);
      const exists = current.includes(day);
      return {
        ...prev,
        weekdays: exists ? current.filter(item => item !== day) : [...current, day].sort()
      };
    });
  };

  const addScheduleTime = () => {
    if (!/^\d{2}:\d{2}$/.test(scheduleTimeInput)) {
      toast.error("Informe um horario valido.");
      return;
    }

    setScheduleForm(prev => {
      const currentTimes = Array.isArray(prev.times) ? prev.times : [];
      if (currentTimes.includes(scheduleTimeInput)) {
        toast.info("Este horario ja foi adicionado.");
        return prev;
      }

      return {
        ...prev,
        times: [...currentTimes, scheduleTimeInput].sort()
      };
    });
    setScheduleTimeInput("");
  };

  const removeScheduleTime = time => {
    setScheduleForm(prev => ({
      ...prev,
      times: (prev.times || []).filter(item => item !== time)
    }));
  };

  const handleCampaignAudienceChange = event => {
    const recipientType = event.target.value;
    const audience = recipientType === "groups" ? "groups" : "contacts";
    const allowedContactIds = filterContactsByAudience(contacts, audience).map(contact => Number(contact.id));

    setCampaignForm(prev => ({
      ...prev,
      recipientType,
      audience,
      contactIds: prev.contactIds.filter(contactId => allowedContactIds.includes(Number(contactId)))
    }));
  };

  const handleScheduleAudienceChange = event => {
    const audience = event.target.value;
    const allowedContactIds = filterContactsByAudience(contacts, audience).map(contact => Number(contact.id));

    setScheduleForm(prev => ({
      ...prev,
      audience,
      contactIds: prev.contactIds.filter(contactId => allowedContactIds.includes(Number(contactId)))
    }));
  };

  const createCampaign = async () => {
    try {
      let estimatedContacts = [];

      if (campaignForm.recipientType === "contacts" || campaignForm.recipientType === "groups") {
        estimatedContacts = contacts.filter(contact =>
          campaignForm.contactIds.map(Number).includes(Number(contact.id))
        );
      } else {
        estimatedContacts = contacts.filter(contact =>
          !contact.isGroup && contactHasAnyTag(contact, campaignForm.tagIds)
        );
      }

      const excluded = estimatedContacts.filter(contact =>
        contactHasAnyTag(contact, campaignForm.excludeTagIds)
      );
      const total = estimatedContacts.length - excluded.length;
      const confirmed = window.confirm(
        `Resumo da campanha\n\nTipo de envio: ${campaignForm.recipientType === "tags" ? "Etiquetas" : campaignForm.recipientType === "groups" ? "Grupos de WhatsApp" : "Contatos"}\nEncontrados: ${estimatedContacts.length}\nRemovidos por etiquetas de exclusao: ${excluded.length}\nTotal que recebera: ${Math.max(total, 0)}\n\nConfira o resumo antes de enviar para evitar mensagens duplicadas ou contatos indesejados.`
      );
      if (!confirmed) return;

      const payload = new FormData();
      Object.entries(campaignForm).forEach(([key, value]) => {
        payload.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
      });
      if (campaignMedia) payload.append("media", campaignMedia);

      await api.post("/campaigns", payload, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(campaignForm.scheduledAt ? "Campanha agendada." : "Campanha criada.");
      setScheduleModalOpen(false);
      setCampaignForm(initialCampaign);
      setCampaignMedia(null);
      setSendType("scheduled");
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const updateCampaignStatus = async (campaign, status) => {
    try {
      await api.put(`/campaigns/${campaign.id}`, { status });
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const retryCampaignErrors = async campaign => {
    try {
      await api.post(`/campaigns/${campaign.id}/retry-failed`);
      toast.success("Reenvio iniciado apenas para os contatos que falharam.");
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const duplicateCampaign = async campaign => {
    try {
      await api.post(`/campaigns/${campaign.id}/duplicate`);
      toast.success("Campanha duplicada como novo envio.");
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const openCampaignLogs = async campaign => {
    try {
      const { data } = await api.get(`/campaigns/${campaign.id}/logs`);
      setLogsTitle(`Logs da campanha: ${campaign.name}`);
      setLogs(data || []);
      setLogsModalOpen(true);
    } catch (err) {
      toastError(err);
    }
  };

  const openScheduleLogs = async schedule => {
    try {
      const { data } = await api.get(`/scheduled-messages/${schedule.id}/executions`);
      setLogsTitle(`Execucoes do agendamento: ${schedule.contact?.name || schedule.id}`);
      setLogs(data || []);
      setLogsModalOpen(true);
    } catch (err) {
      toastError(err);
    }
  };

  const getCampaignStatusLabel = status => ({
    scheduled: "Agendado",
    running: "Em execucao",
    paused: "Parado",
    canceled: "Cancelado",
    completed: "Concluido",
    completed_with_errors: "Concluido com erros",
    failed: "Erro",
    error: "Erro",
    finished: "Concluido"
  }[status] || status);

  const getScheduleStatusLabel = status => ({
    scheduled: "Agendado",
    running: "Em execucao",
    paused: "Parado",
    canceled: "Cancelado",
    completed: "Concluido",
    sent: "Concluido",
    failed: "Erro",
    error: "Erro"
  }[status] || status);

  const getStatusColor = status => ({
    draft: "default",
    scheduled: "primary",
    running: "primary",
    paused: "secondary",
    completed: "primary",
    completed_with_errors: "secondary",
    sent: "primary",
    failed: "secondary",
    error: "secondary",
    canceled: "default",
    finished: "primary"
  }[status] || "default");

  const formatDateTime = value => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const getScheduleRecurrenceLabel = schedule => {
    if (schedule.recurrenceType === "weekly") return "Dias e horarios";
    if (schedule.recurrenceType === "interval") {
      const unitLabel = repeatUnitOptions.find(item => item.value === schedule.repeatUnit)?.label || "horas";
      return `A cada ${schedule.repeatEvery || 1} ${unitLabel}`;
    }
    return "Unico";
  };

  const getCampaignProgress = campaign => {
    const recipients = campaign.recipients || [];
    const sent = recipients.filter(item => item.status === "sent").length;
    const failed = recipients.filter(item => ["failed", "error"].includes(item.status)).length;
    const pending = recipients.filter(item => ["pending", "sending"].includes(item.status)).length;
    return { sent, failed, pending, total: recipients.length };
  };

  const getScheduleProgress = schedule => {
    const completed = ["sent", "completed"].includes(schedule.status) ? 1 : 0;
    const failed = ["failed", "error"].includes(schedule.status) ? 1 : 0;
    const pending = completed || failed || schedule.status === "canceled" ? 0 : 1;
    return { sent: completed, failed, pending, total: 1 };
  };

  const getProgressPercent = progress => {
    if (!progress.total) return 0;
    return Math.min(100, Math.round((progress.sent / progress.total) * 100));
  };

  const getSelectedRecipientCount = () => {
    const selectedContacts = contacts.filter(contact =>
      scheduleForm.contactIds.map(Number).includes(Number(contact.id))
    ).length;

    const tagContacts = scheduleForm.tagIds?.length
      ? contacts.filter(contact => !contact.isGroup && contactHasAnyTag(contact, scheduleForm.tagIds)).length
      : 0;

    if (selectedContacts && tagContacts) return `${selectedContacts} selecionado(s) + ${tagContacts} por etiqueta`;
    if (selectedContacts) return `${selectedContacts} selecionado(s)`;
    if (tagContacts) return `${tagContacts} por etiqueta`;
    return "Nenhum destinatario selecionado";
  };

  const getWhenSummary = () => {
    if (scheduleForm.recurrenceType === "once") {
      return scheduleForm.scheduledAt
        ? `Uma vez em ${new Date(scheduleForm.scheduledAt).toLocaleString()}`
        : "Envio unico sem data definida";
    }

    if (scheduleForm.recurrenceType === "weekly") {
      const days = weekdayOptions
        .filter(day => (scheduleForm.weekdays || []).map(Number).includes(day.value))
        .map(day => day.label)
        .join(", ");
      const times = (scheduleForm.times || []).join(", ");
      return `Semanal: ${days || "sem dias"} às ${times || "sem horarios"}`;
    }

    const unitLabel = repeatUnitOptions.find(item => item.value === scheduleForm.repeatUnit)?.label || "horas";
    return `Repetir a cada ${scheduleForm.repeatEvery || 1} ${unitLabel}`;
  };

  const validateScheduleStep = step => {
    if (step === 0) {
      const hasRecipients = !!scheduleForm.contactIds?.length || !!scheduleForm.tagIds?.length;
      if (!scheduleForm.message && !scheduleMedia) {
        toast.error("Informe a mensagem ou anexe um arquivo para enviar.");
        return false;
      }
      if (!hasRecipients) {
        toast.error("Escolha pelo menos um contato, grupo ou etiqueta.");
        return false;
      }
      return true;
    }

    if (step === 1) {
      const intervals = String(scheduleForm.intervalPattern || "")
        .split(":")
        .map(item => Number(item.trim()))
        .filter(Number.isFinite);
      if (!intervals.length || intervals.some(item => item <= 0)) {
        toast.error("Informe pelo menos um intervalo valido em segundos.");
        return false;
      }
      if (Number(scheduleForm.pauseAfter || 0) < 0 || Number(scheduleForm.pauseMinutes || 0) < 0) {
        toast.error("Os campos de pausa nao podem ser negativos.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (scheduleForm.recurrenceType === "once" && !scheduleForm.scheduledAt) {
        toast.error("Informe a data e hora do envio.");
        return false;
      }
      if (scheduleForm.recurrenceType === "weekly" && !scheduleForm.weekdays?.length) {
        toast.error("Escolha pelo menos um dia da semana.");
        return false;
      }
      if (scheduleForm.recurrenceType === "weekly" && !scheduleForm.times?.length) {
        toast.error("Adicione pelo menos um horario.");
        return false;
      }
      if (scheduleForm.recurrenceType === "interval" && Number(scheduleForm.repeatEvery || 0) <= 0) {
        toast.error("Informe um intervalo de repeticao valido.");
        return false;
      }
      return true;
    }

    return true;
  };

  const goToScheduleStep = nextStep => {
    if (nextStep <= scheduleStep) {
      setScheduleStep(nextStep);
      return;
    }

    for (let step = scheduleStep; step < nextStep; step += 1) {
      if (!validateScheduleStep(step)) return;
    }
    setScheduleStep(nextStep);
  };

  const nextScheduleStep = () => {
    if (!validateScheduleStep(scheduleStep)) return;
    setScheduleStep(prev => Math.min(prev + 1, scheduleSteps.length - 1));
  };

  const buildAutomationItems = () => {
    const campaignItems = campaigns.map(campaign => {
      const progress = getCampaignProgress(campaign);
      return {
        id: `campaign-${campaign.id}`,
        source: "campaign",
        raw: campaign,
        name: campaign.name || `Campanha #${campaign.id}`,
        typeLabel: "Campanha",
        recurrenceLabel: "Envio em fila",
        status: campaign.status,
        statusLabel: getCampaignStatusLabel(campaign.status),
        nextRunAt: campaign.recipients?.find(recipient => recipient.nextRunAt)?.nextRunAt || (campaign.status === "scheduled" ? campaign.createdAt : null),
        lastRunAt: campaign.completedAt || campaign.startedAt || campaign.updatedAt,
        whatsappName: campaign.whatsapp?.name || "Padrao",
        message: campaign.message,
        progress
      };
    });

    const scheduleItems = schedules.map(schedule => {
      const progress = getScheduleProgress(schedule);
      return {
        id: `schedule-${schedule.id}`,
        source: "schedule",
        sendType: schedule.sendType || "scheduled",
        raw: schedule,
        name: schedule.contact?.name || schedule.message?.slice(0, 42) || `Agendamento #${schedule.id}`,
        typeLabel: schedule.sendType === "campaign" ? "Campanha" : "Mensagem agendada",
        recurrenceLabel: getScheduleRecurrenceLabel(schedule),
        status: schedule.status,
        statusLabel: getScheduleStatusLabel(schedule.status),
        nextRunAt: schedule.nextRunAt || schedule.scheduledAt,
        lastRunAt: schedule.lastRunAt || schedule.updatedAt,
        whatsappName: schedule.whatsapp?.name || "Padrao",
        message: schedule.message,
        progress
      };
    });

    const allItems = [...campaignItems, ...scheduleItems].sort((a, b) => {
      const aDate = new Date(a.nextRunAt || a.lastRunAt || 0).getTime();
      const bDate = new Date(b.nextRunAt || b.lastRunAt || 0).getTime();
      return bDate - aDate;
    });

    return allItems.filter(item => {
      if (filterType !== "all" && (item.sendType || item.source) !== filterType) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterText) {
        const searchable = normalizeSearch(`${item.name} ${item.message} ${item.statusLabel} ${item.typeLabel}`);
        if (!searchable.includes(normalizeSearch(filterText))) return false;
      }
      return true;
    });
  };

  const renderIconAction = ({ title, icon, onClick, disabled = false, color = "default" }) => (
    <Tooltip title={title}>
      <span>
        <IconButton size="small" onClick={onClick} disabled={disabled} color={color}>
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  const openNewScheduleModal = () => {
    setEditingScheduleId(null);
    setSendType("scheduled");
    setCampaignForm(initialCampaign);
    setScheduleForm(initialSchedule);
    setCampaignMedia(null);
    setScheduleMedia(null);
    setScheduleTimeInput("");
    setScheduleStep(0);
    setScheduleModalOpen(true);
  };

  const openNewSendModal = () => {
    setEditingScheduleId(null);
    setSendType("scheduled");
    setCampaignForm(initialCampaign);
    setScheduleForm(initialSchedule);
    setCampaignMedia(null);
    setScheduleMedia(null);
    setScheduleTimeInput("");
    setScheduleStep(0);
    setScheduleModalOpen(true);
  };

  const openEditScheduleModal = schedule => {
    setEditingScheduleId(schedule.id);
    setSendType(schedule.sendType || "scheduled");
    setScheduleForm({
      sendType: schedule.sendType || "scheduled",
      contactIds: schedule.contactId ? [schedule.contactId] : [],
      tagIds: schedule.tagIds || [],
      excludeTagIds: schedule.excludeTagIds || [],
      tagAppliedLastDays: schedule.tagAppliedLastDays || "",
      audience: "all",
      message: schedule.message || "",
      scheduledAt: toDateTimeLocalValue(schedule.scheduledAt),
      recurrenceType: schedule.recurrenceType || "once",
      weekdays: schedule.weekdays || [],
      times: schedule.times || [],
      startsAt: toDateTimeLocalValue(schedule.startsAt),
      endsAt: toDateTimeLocalValue(schedule.endsAt),
      repeatEvery: schedule.repeatEvery || 1,
      repeatUnit: schedule.repeatUnit || "hours",
      maxRuns: schedule.maxRuns || "",
      respectBusinessHours: !!schedule.respectBusinessHours,
      missedRunPolicy: schedule.missedRunPolicy || "skip",
      intervalPattern: schedule.intervalPattern || String(schedule.intervalSeconds || 30),
      pauseAfter: schedule.pauseAfter || 20,
      pauseMinutes: Math.max(1, Math.round((schedule.pauseSeconds || 300) / 60)),
      whatsappId: schedule.whatsappId || ""
    });
    setScheduleMedia(null);
    setScheduleTimeInput("");
    setScheduleStep(0);
    setScheduleModalOpen(true);
  };

  const closeScheduleModal = () => {
    setScheduleModalOpen(false);
    setEditingScheduleId(null);
    setSendType("scheduled");
    setScheduleForm(initialSchedule);
    setCampaignForm(initialCampaign);
    setCampaignMedia(null);
    setScheduleMedia(null);
    setScheduleTimeInput("");
    setScheduleStep(0);
  };

  const saveSchedule = async () => {
    try {
      for (let step = 0; step < scheduleSteps.length - 1; step += 1) {
        if (!validateScheduleStep(step)) {
          setScheduleStep(step);
          return;
        }
      }

      const payload = new FormData();
      const schedulePayload = { ...scheduleForm, sendType };
      Object.entries(schedulePayload).forEach(([key, value]) => {
        payload.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
      });
      if (scheduleMedia) payload.append("media", scheduleMedia);

      if (editingScheduleId) {
        await api.put(`/scheduled-messages/${editingScheduleId}`, payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Agendamento atualizado.");
      } else {
        await api.post("/scheduled-messages", payload, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success(sendType === "campaign" ? "Campanha agendada." : "Mensagem agendada.");
      }

      closeScheduleModal();
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const deleteSchedule = async schedule => {
    try {
      await api.delete(`/scheduled-messages/${schedule.id}`);
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const updateScheduleStatus = async (schedule, status) => {
    try {
      await api.put(`/scheduled-messages/${schedule.id}`, { status });
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const duplicateSchedule = async schedule => {
    try {
      await api.post(`/scheduled-messages/${schedule.id}/duplicate`);
      toast.success("Agendamento clonado. Revise antes de ativar.");
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const renderCampaignActions = campaign => {
    const progress = getCampaignProgress(campaign);

    return (
      <>
        {(campaign.status === "scheduled" || campaign.status === "running") && (
          <>
            <Button size="small" onClick={() => updateCampaignStatus(campaign, "paused")}>
              Pause
            </Button>
            <Button size="small" onClick={() => updateCampaignStatus(campaign, "canceled")}>
              Stop
            </Button>
          </>
        )}
        {campaign.status === "paused" && (
          <Button size="small" onClick={() => updateCampaignStatus(campaign, "running")}>
            Play
          </Button>
        )}
        {progress.failed > 0 && (
          <Button size="small" onClick={() => retryCampaignErrors(campaign)}>
            Reenviar erros
          </Button>
        )}
        {["completed", "completed_with_errors", "canceled", "failed", "error"].includes(campaign.status) && (
          <Button size="small" onClick={() => duplicateCampaign(campaign)}>
            Reenviar tudo
          </Button>
        )}
        <Button size="small" onClick={() => openCampaignLogs(campaign)}>
          Logs
        </Button>
      </>
    );
  };

  const renderAutomationActions = item => {
    if (item.source === "campaign") {
      const campaign = item.raw;
      return (
        <div className={classes.playerActions}>
          {["scheduled", "paused"].includes(campaign.status) && renderIconAction({
            title: campaign.status === "paused" ? "Retomar campanha" : "Iniciar agora",
            icon: <PlayArrowIcon />,
            color: "primary",
            onClick: () => updateCampaignStatus(campaign, "running")
          })}
          {campaign.status === "running" && renderIconAction({
            title: "Pausar campanha",
            icon: <PauseIcon />,
            onClick: () => updateCampaignStatus(campaign, "paused")
          })}
          {["scheduled", "running", "paused"].includes(campaign.status) && renderIconAction({
            title: "Cancelar campanha",
            icon: <StopIcon />,
            onClick: () => updateCampaignStatus(campaign, "canceled")
          })}
          {item.progress.failed > 0 && renderIconAction({
            title: "Reenviar erros",
            icon: <ReplayIcon />,
            color: "secondary",
            onClick: () => retryCampaignErrors(campaign)
          })}
          {renderIconAction({
            title: "Clonar campanha",
            icon: <FileCopyIcon />,
            onClick: () => duplicateCampaign(campaign)
          })}
          {renderIconAction({
            title: "Logs",
            icon: <ListAltIcon />,
            onClick: () => openCampaignLogs(campaign)
          })}
        </div>
      );
    }

    const schedule = item.raw;
    return (
      <div className={classes.playerActions}>
        {schedule.status === "paused" && renderIconAction({
          title: "Retomar agendamento",
          icon: <PlayArrowIcon />,
          color: "primary",
          onClick: () => updateScheduleStatus(schedule, "scheduled")
        })}
        {["scheduled", "running"].includes(schedule.status) && renderIconAction({
          title: "Pausar agendamento",
          icon: <PauseIcon />,
          onClick: () => updateScheduleStatus(schedule, "paused")
        })}
        {["scheduled", "running", "paused"].includes(schedule.status) && renderIconAction({
          title: "Cancelar agendamento",
          icon: <StopIcon />,
          onClick: () => updateScheduleStatus(schedule, "canceled")
        })}
        {!["sent", "completed", "canceled"].includes(schedule.status) && renderIconAction({
          title: "Editar agendamento",
          icon: <EditIcon />,
          onClick: () => openEditScheduleModal(schedule)
        })}
        {renderIconAction({
          title: "Clonar agendamento",
          icon: <FileCopyIcon />,
          onClick: () => duplicateSchedule(schedule)
        })}
        {renderIconAction({
          title: "Logs",
          icon: <ListAltIcon />,
          onClick: () => openScheduleLogs(schedule)
        })}
      </div>
    );
  };

  const automationItems = buildAutomationItems();

  return (
    <Container maxWidth={false} className={classes.root}>
      <div className={classes.header}>
        <div>
          <Typography variant="h6">Agendamentos</Typography>
          <Typography variant="body2" className={classes.helper}>
            Centralize mensagens agendadas, campanhas por etiqueta e envios recorrentes em uma unica area.
          </Typography>
        </div>
        <div>
          <Button
            color="primary"
            variant="contained"
            onClick={openNewSendModal}
          >
            Novo envio
          </Button>
        </div>
      </div>
      <Tabs value={0} indicatorColor="primary" textColor="primary" className={classes.tabs}>
        <Tab label="Todos" />
      </Tabs>

      <Paper className={classes.paper} variant="outlined" style={{ marginBottom: 16 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              margin="dense"
              variant="outlined"
              label="Buscar"
              value={filterText}
              onChange={event => setFilterText(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth margin="dense" variant="outlined" label="Tipo" value={filterType} onChange={event => setFilterType(event.target.value)}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="schedule">Mensagem agendada</MenuItem>
              <MenuItem value="campaign">Campanha</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth margin="dense" variant="outlined" label="Status" value={filterStatus} onChange={event => setFilterStatus(event.target.value)}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="scheduled">Agendado</MenuItem>
              <MenuItem value="running">Em execucao</MenuItem>
              <MenuItem value="paused">Pausado</MenuItem>
              <MenuItem value="completed">Concluido</MenuItem>
              <MenuItem value="completed_with_errors">Concluido com erros</MenuItem>
              <MenuItem value="sent">Enviado</MenuItem>
              <MenuItem value="failed">Erro</MenuItem>
              <MenuItem value="canceled">Cancelado</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper className={classes.paper} variant="outlined">
        <div className={classes.playlist}>
          {automationItems.map(item => {
            const percent = getProgressPercent(item.progress);
            const isCampaign = item.source === "campaign";

            return (
              <div className={classes.automationCard} key={item.id}>
                <div className={classes.automationHeader}>
                  <div className={classes.automationTitle}>
                    <div className={classes.automationIcon}>
                      {isCampaign ? <SendIcon /> : <ScheduleIcon />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Typography className={classes.automationName}>{item.name}</Typography>
                      <div className={classes.automationMeta}>
                        <Chip size="small" label={item.typeLabel} />
                        <Chip size="small" color={getStatusColor(item.status)} label={item.statusLabel} />
                        <Chip size="small" label={item.recurrenceLabel} />
                        <Chip size="small" label={`WhatsApp: ${item.whatsappName}`} />
                      </div>
                    </div>
                  </div>
                  {renderAutomationActions(item)}
                </div>

                <div className={classes.automationStats}>
                  <div className={classes.statBox}>
                    <Typography variant="caption" color="textSecondary">Proxima execucao</Typography>
                    <Typography variant="body2" className={classes.statValue}>{formatDateTime(item.nextRunAt)}</Typography>
                  </div>
                  <div className={classes.statBox}>
                    <Typography variant="caption" color="textSecondary">Ultima execucao</Typography>
                    <Typography variant="body2" className={classes.statValue}>{formatDateTime(item.lastRunAt)}</Typography>
                  </div>
                  <div className={classes.statBox}>
                    <Typography variant="caption" color="textSecondary">Enviados</Typography>
                    <Typography variant="body2" className={classes.statValue}>{item.progress.sent} / {item.progress.total}</Typography>
                  </div>
                  <div className={classes.statBox}>
                    <Typography variant="caption" color="textSecondary">Pendentes / erros</Typography>
                    <Typography variant="body2" className={classes.statValue}>{item.progress.pending} pend. / {item.progress.failed} erro(s)</Typography>
                  </div>
                </div>

                <div className={classes.progressArea}>
                  <LinearProgress variant="determinate" value={percent} />
                  <Typography variant="caption" color="textSecondary">
                    {percent}% concluido
                  </Typography>
                </div>
              </div>
            );
          })}
          {!automationItems.length && (
            <Typography variant="body2" color="textSecondary">
              Nenhuma campanha ou agendamento encontrado para este filtro.
            </Typography>
          )}
        </div>
      </Paper>

      <Dialog open={scheduleModalOpen} onClose={closeScheduleModal} maxWidth="md" fullWidth>
        <DialogTitle>{editingScheduleId ? "Editar agendamento" : "Novo envio"}</DialogTitle>
        <DialogContent>
          <div className={classes.wizardSteps}>
            {scheduleSteps.map((step, index) => (
              <div
                key={step.title}
                className={`${classes.wizardStep} ${scheduleStep === index ? classes.wizardStepActive : ""}`}
                onClick={() => goToScheduleStep(index)}
                role="button"
                tabIndex={0}
              >
                <strong>{index + 1}. {step.title}</strong>
                <span>{step.description}</span>
              </div>
            ))}
          </div>

          {scheduleStep === 0 && (
            <>
              <Paper className={classes.wizardSection} variant="outlined">
                <Typography variant="subtitle1">Mensagem</Typography>
                <Typography variant="body2" color="textSecondary">
                  Escreva o conteudo, escolha a conexao e anexe arquivo se precisar.
                </Typography>
                <Grid container spacing={2}>
                  {!editingScheduleId && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        fullWidth
                        margin="dense"
                        variant="outlined"
                        label="Tipo do envio"
                        value={sendType}
                        onChange={event => setSendType(event.target.value)}
                      >
                        <MenuItem value="scheduled">Mensagem agendada</MenuItem>
                        <MenuItem value="campaign">Campanha</MenuItem>
                      </TextField>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6}>
                    <TextField select fullWidth margin="dense" variant="outlined" label="Conexao WhatsApp" name="whatsappId" value={scheduleForm.whatsappId} onChange={handleScheduleChange}>
                      <MenuItem value="">Padrao</MenuItem>
                      {whatsapps.map(whatsapp => (
                        <MenuItem key={whatsapp.id} value={whatsapp.id}>{whatsapp.name}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <MessageTemplateField
                      label="Mensagem"
                      name="message"
                      value={scheduleForm.message}
                      onChange={handleScheduleChange}
                      rows={5}
                      required
                      onMediaChange={setScheduleMedia}
                      mediaName={scheduleMedia?.name}
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper className={classes.wizardSection} variant="outlined">
                <Typography variant="subtitle1">Destinatarios</Typography>
                <Typography variant="body2" color="textSecondary">
                  Selecione contatos, grupos ou etiquetas. Contatos com etiquetas de exclusao serao ignorados.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField select fullWidth margin="dense" variant="outlined" label="Publico" name="audience" value={scheduleForm.audience} onChange={handleScheduleAudienceChange}>
                      <MenuItem value="all">Contatos e grupos</MenuItem>
                      <MenuItem value="contacts">Somente contatos</MenuItem>
                      <MenuItem value="groups">Somente grupos</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TagCheckboxPicker
                      tags={tags}
                      selectedIds={scheduleForm.tagIds}
                      label="Etiquetas"
                      helperText="Se marcar etiquetas, o envio sera feito para contatos que tenham pelo menos uma delas."
                      onChange={tagIds => setScheduleForm(prev => ({ ...prev, tagIds }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <ContactPicker
                      classes={classes}
                      contacts={contacts}
                      audience={scheduleForm.audience}
                      selectedIds={scheduleForm.contactIds}
                      label="Contatos ou grupos"
                      onChange={contactIds => setScheduleForm(prev => ({ ...prev, contactIds }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth type="number" margin="dense" variant="outlined" label="Etiqueta aplicada nos ultimos dias" name="tagAppliedLastDays" value={scheduleForm.tagAppliedLastDays} onChange={handleScheduleChange} placeholder="Ex: 7" />
                    <TagCheckboxPicker
                      tags={tags}
                      selectedIds={scheduleForm.excludeTagIds}
                      label="Nao enviar para contatos com estas etiquetas"
                      helperText="Contatos com essas etiquetas serao ignorados neste envio."
                      onChange={excludeTagIds => setScheduleForm(prev => ({ ...prev, excludeTagIds }))}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </>
          )}

          {scheduleStep === 1 && (
            <Paper className={classes.wizardSection} variant="outlined">
              <Typography variant="subtitle1">Ritmo de envio</Typography>
              <Typography variant="body2" color="textSecondary">
                O sistema envia em fila. Configure intervalos e pausas para evitar envio rapido demais.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth required margin="dense" variant="outlined" label="Intervalos entre mensagens em segundos" name="intervalPattern" value={scheduleForm.intervalPattern} onChange={handleScheduleChange} placeholder="30 ou 20:35:50" />
                  <Typography variant="caption" color="textSecondary">
                    Use um tempo fixo, como 30, ou varios tempos separados por dois-pontos, como 20:35:50.
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="number" margin="dense" variant="outlined" label="Pausar apos quantos contatos" name="pauseAfter" value={scheduleForm.pauseAfter} onChange={handleScheduleChange} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="number" margin="dense" variant="outlined" label="Tempo da pausa em minutos" name="pauseMinutes" value={scheduleForm.pauseMinutes} onChange={handleScheduleChange} />
                </Grid>
              </Grid>
            </Paper>
          )}

          {scheduleStep === 2 && (
            <Paper className={classes.wizardSection} variant="outlined">
              <Typography variant="subtitle1">Quando enviar</Typography>
              <Typography variant="body2" color="textSecondary">
                Escolha envio unico, dias e horarios especificos ou repeticao por intervalo.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth margin="dense" variant="outlined" label="Tipo de agendamento" name="recurrenceType" value={scheduleForm.recurrenceType} onChange={handleScheduleChange}>
                    <MenuItem value="once">Executar uma vez</MenuItem>
                    <MenuItem value="weekly">Dias e horarios especificos</MenuItem>
                    <MenuItem value="interval">Repetir por intervalo</MenuItem>
                  </TextField>
                </Grid>
                {scheduleForm.recurrenceType === "once" && (
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth required type="datetime-local" margin="dense" variant="outlined" label="Data e hora" name="scheduledAt" value={scheduleForm.scheduledAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
                  </Grid>
                )}
                {scheduleForm.recurrenceType === "weekly" && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Dias da semana</Typography>
                      <Grid container spacing={1}>
                        {weekdayOptions.map(day => (
                          <Grid item xs={6} sm={3} md={2} key={day.value}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  color="primary"
                                  checked={(scheduleForm.weekdays || []).map(Number).includes(day.value)}
                                  onChange={() => toggleScheduleWeekday(day.value)}
                                />
                              }
                              label={day.label}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Horarios</Typography>
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={12} sm={4}>
                          <TextField fullWidth type="time" margin="dense" variant="outlined" label="Horario" value={scheduleTimeInput} onChange={event => setScheduleTimeInput(event.target.value)} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Button fullWidth variant="outlined" color="primary" onClick={addScheduleTime}>
                            Adicionar horario
                          </Button>
                        </Grid>
                      </Grid>
                      <div className={classes.tagChips} style={{ marginTop: 8 }}>
                        {(scheduleForm.times || []).map(time => (
                          <Chip key={time} size="small" label={time} onDelete={() => removeScheduleTime(time)} />
                        ))}
                      </div>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Inicio" name="startsAt" value={scheduleForm.startsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Fim opcional" name="endsAt" value={scheduleForm.endsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                  </>
                )}
                {scheduleForm.recurrenceType === "interval" && (
                  <>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth required type="number" margin="dense" variant="outlined" label="Repetir a cada" name="repeatEvery" value={scheduleForm.repeatEvery} onChange={handleScheduleChange} inputProps={{ min: 1 }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField select fullWidth margin="dense" variant="outlined" label="Unidade" name="repeatUnit" value={scheduleForm.repeatUnit} onChange={handleScheduleChange}>
                        {repeatUnitOptions.map(unit => (
                          <MenuItem key={unit.value} value={unit.value}>{unit.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth type="number" margin="dense" variant="outlined" label="Limite de execucoes" name="maxRuns" value={scheduleForm.maxRuns} onChange={handleScheduleChange} inputProps={{ min: 1 }} helperText="Opcional" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Comecar em" name="startsAt" value={scheduleForm.startsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} helperText="Se vazio, comeca no proximo minuto." />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Fim opcional" name="endsAt" value={scheduleForm.endsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                  </>
                )}
              </Grid>
            </Paper>
          )}

          {scheduleStep === 3 && (
            <Paper className={classes.wizardSection} variant="outlined">
              <Typography variant="subtitle1">Resumo</Typography>
              <Typography variant="body2" color="textSecondary">
                Confira antes de concluir. O envio sera processado em fila respeitando o ritmo configurado.
              </Typography>
              <div className={classes.summaryList}>
                <div className={classes.summaryItem}>
                  <Typography variant="caption" color="textSecondary">Tipo</Typography>
                  <Typography variant="body2">{sendType === "campaign" ? "Campanha" : "Mensagem agendada"}</Typography>
                </div>
                <div className={classes.summaryItem}>
                  <Typography variant="caption" color="textSecondary">Destinatarios</Typography>
                  <Typography variant="body2">{getSelectedRecipientCount()}</Typography>
                </div>
                <div className={classes.summaryItem}>
                  <Typography variant="caption" color="textSecondary">Ritmo</Typography>
                  <Typography variant="body2">
                    Intervalos: {scheduleForm.intervalPattern || "nao informado"}s. Pausa a cada {scheduleForm.pauseAfter || 0} contato(s) por {scheduleForm.pauseMinutes || 0} min.
                  </Typography>
                </div>
                <div className={classes.summaryItem}>
                  <Typography variant="caption" color="textSecondary">Quando enviar</Typography>
                  <Typography variant="body2">{getWhenSummary()}</Typography>
                </div>
                <div className={classes.summaryItem}>
                  <Typography variant="caption" color="textSecondary">Conexao</Typography>
                  <Typography variant="body2">{whatsapps.find(item => Number(item.id) === Number(scheduleForm.whatsappId))?.name || "Padrao"}</Typography>
                </div>
                <div className={classes.summaryItem}>
                  <Typography variant="caption" color="textSecondary">Anexo</Typography>
                  <Typography variant="body2">{scheduleMedia?.name || "Sem anexo novo"}</Typography>
                </div>
              </div>
            </Paper>
          )}

          <Grid container spacing={2} style={{ display: "none" }}>
            {!editingScheduleId && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  margin="dense"
                  variant="outlined"
                  label="Tipo do envio"
                  value={sendType}
                  onChange={event => setSendType(event.target.value)}
                >
                  <MenuItem value="scheduled">Mensagem agendada</MenuItem>
                  <MenuItem value="campaign">Campanha</MenuItem>
                </TextField>
                <Typography variant="caption" color="textSecondary">
                  Escolha se este envio sera uma mensagem simples agendada ou uma campanha com destinatarios em massa.
                </Typography>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Público" name="audience" value={scheduleForm.audience} onChange={handleScheduleAudienceChange}>
                <MenuItem value="all">Contatos e grupos</MenuItem>
                <MenuItem value="contacts">Somente contatos</MenuItem>
                <MenuItem value="groups">Somente grupos</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <ContactPicker
                classes={classes}
                contacts={contacts}
                audience={scheduleForm.audience}
                selectedIds={scheduleForm.contactIds}
                label="Contatos ou grupos"
                onChange={contactIds => setScheduleForm(prev => ({ ...prev, contactIds }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TagCheckboxPicker
                tags={tags}
                selectedIds={scheduleForm.tagIds}
                label="Etiquetas"
                helperText="Se marcar etiquetas, o envio sera feito para contatos que tenham pelo menos uma delas."
                onChange={tagIds => setScheduleForm(prev => ({ ...prev, tagIds }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Etiqueta aplicada nos ultimos dias" name="tagAppliedLastDays" value={scheduleForm.tagAppliedLastDays} onChange={handleScheduleChange} placeholder="Ex: 7" />
              <Typography variant="caption" color="textSecondary">
                Opcional. Use para enviar apenas para contatos cuja etiqueta foi aplicada recentemente.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TagCheckboxPicker
                tags={tags}
                selectedIds={scheduleForm.excludeTagIds}
                label="Nao enviar para contatos com estas etiquetas"
                helperText="Contatos com essas etiquetas serao ignorados neste envio."
                onChange={excludeTagIds => setScheduleForm(prev => ({ ...prev, excludeTagIds }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Tipo de agendamento" name="recurrenceType" value={scheduleForm.recurrenceType} onChange={handleScheduleChange}>
                <MenuItem value="once">Executar uma vez</MenuItem>
                <MenuItem value="weekly">Dias e horarios especificos</MenuItem>
                <MenuItem value="interval">Repetir por intervalo</MenuItem>
              </TextField>
            </Grid>
            {scheduleForm.recurrenceType === "once" && (
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required type="datetime-local" margin="dense" variant="outlined" label="Data e hora" name="scheduledAt" value={scheduleForm.scheduledAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
              </Grid>
            )}
            {scheduleForm.recurrenceType === "weekly" && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Dias da semana</Typography>
                  <Grid container spacing={1}>
                    {weekdayOptions.map(day => (
                      <Grid item xs={6} sm={3} md={2} key={day.value}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              color="primary"
                              checked={(scheduleForm.weekdays || []).map(Number).includes(day.value)}
                              onChange={() => toggleScheduleWeekday(day.value)}
                            />
                          }
                          label={day.label}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Horarios</Typography>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="time"
                        margin="dense"
                        variant="outlined"
                        label="Horario"
                        value={scheduleTimeInput}
                        onChange={event => setScheduleTimeInput(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button fullWidth variant="outlined" color="primary" onClick={addScheduleTime}>
                        Adicionar horario
                      </Button>
                    </Grid>
                  </Grid>
                  <div className={classes.tagChips} style={{ marginTop: 8 }}>
                    {(scheduleForm.times || []).map(time => (
                      <Chip key={time} size="small" label={time} onDelete={() => removeScheduleTime(time)} />
                    ))}
                  </div>
                  <Typography variant="caption" color="textSecondary">
                    Adicione os horarios um por um. O sistema ordena e evita duplicados.
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Inicio" name="startsAt" value={scheduleForm.startsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Fim opcional" name="endsAt" value={scheduleForm.endsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
                </Grid>
              </>
            )}
            {scheduleForm.recurrenceType === "interval" && (
              <>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth required type="number" margin="dense" variant="outlined" label="Repetir a cada" name="repeatEvery" value={scheduleForm.repeatEvery} onChange={handleScheduleChange} inputProps={{ min: 1 }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField select fullWidth margin="dense" variant="outlined" label="Unidade" name="repeatUnit" value={scheduleForm.repeatUnit} onChange={handleScheduleChange}>
                    {repeatUnitOptions.map(unit => (
                      <MenuItem key={unit.value} value={unit.value}>{unit.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth type="number" margin="dense" variant="outlined" label="Limite de execucoes" name="maxRuns" value={scheduleForm.maxRuns} onChange={handleScheduleChange} inputProps={{ min: 1 }} helperText="Opcional" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Comecar em" name="startsAt" value={scheduleForm.startsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} helperText="Se vazio, comeca no proximo minuto." />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="datetime-local" margin="dense" variant="outlined" label="Fim opcional" name="endsAt" value={scheduleForm.endsAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
                </Grid>
              </>
            )}
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Pausar apos envios" name="pauseAfter" value={scheduleForm.pauseAfter} onChange={handleScheduleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Tempo de pausa (min.)" name="pauseMinutes" value={scheduleForm.pauseMinutes} onChange={handleScheduleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required margin="dense" variant="outlined" label="Sequencia de intervalos em segundos" name="intervalPattern" value={scheduleForm.intervalPattern} onChange={handleScheduleChange} placeholder="10:2:95:12:34" />
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Conexão WhatsApp" name="whatsappId" value={scheduleForm.whatsappId} onChange={handleScheduleChange}>
                <MenuItem value="">Padrão</MenuItem>
                {whatsapps.map(whatsapp => (
                  <MenuItem key={whatsapp.id} value={whatsapp.id}>{whatsapp.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <MessageTemplateField
                label="Mensagem"
                name="message"
                value={scheduleForm.message}
                onChange={handleScheduleChange}
                rows={5}
                required
                onMediaChange={setScheduleMedia}
                mediaName={scheduleMedia?.name}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeScheduleModal}>Cancelar</Button>
          {scheduleStep > 0 && (
            <Button onClick={() => setScheduleStep(prev => Math.max(prev - 1, 0))}>
              Voltar
            </Button>
          )}
          {scheduleStep < scheduleSteps.length - 1 ? (
            <Button color="primary" variant="contained" onClick={nextScheduleStep}>
              Avancar
            </Button>
          ) : (
            <Button color="primary" variant="contained" onClick={saveSchedule}>
            {editingScheduleId ? "Salvar" : "Agendar"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Dialog open={logsModalOpen} onClose={() => setLogsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{logsTitle}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Contato</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Tentativa</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Erro</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{log.contact?.name || log.phoneNumber || log.contactId}</TableCell>
                  <TableCell>{log.status}</TableCell>
                  <TableCell>{log.attemptNumber || log.attempts || 0}</TableCell>
                  <TableCell>{new Date(log.attemptedAt || log.executedAt || log.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{log.errorMessage || "-"}</TableCell>
                </TableRow>
              ))}
              {!logs.length && (
                <TableRow>
                  <TableCell colSpan={5}>Nenhum log registrado ainda.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsModalOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CampaignsSchedules;
