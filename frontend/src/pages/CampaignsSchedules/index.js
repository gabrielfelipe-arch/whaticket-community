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
  InputAdornment,
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
  Chip
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import SearchIcon from "@material-ui/icons/Search";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "auto",
    ...theme.scrollbarStyles
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2)
  },
  tabs: {
    marginBottom: theme.spacing(2)
  },
  paper: {
    padding: theme.spacing(1),
    overflowX: "auto"
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
    border: "1px solid rgba(0, 0, 0, 0.23)",
    borderRadius: 4,
    padding: theme.spacing(1)
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
    borderTop: "1px solid rgba(0, 0, 0, 0.08)"
  },
  contactRow: {
    display: "flex",
    alignItems: "center",
    minHeight: 42,
    borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
    cursor: "pointer"
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
  }
}));

const initialCampaign = {
  name: "",
  message: "",
  audience: "contacts",
  intervalPattern: "30",
  pauseAfter: 20,
  pauseMinutes: 5,
  whatsappId: "",
  contactIds: [],
  tagIds: []
};

const initialSchedule = {
  contactIds: [],
  tagIds: [],
  audience: "all",
  message: "",
  scheduledAt: "",
  intervalPattern: "30",
  pauseAfter: 20,
  pauseMinutes: 5,
  whatsappId: ""
};

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
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState(initialCampaign);
  const [scheduleForm, setScheduleForm] = useState(initialSchedule);
  const [editingScheduleId, setEditingScheduleId] = useState(null);

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
    const { name, value } = event.target;
    setScheduleForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCampaignAudienceChange = event => {
    const audience = event.target.value;
    const allowedContactIds = filterContactsByAudience(contacts, audience).map(contact => Number(contact.id));

    setCampaignForm(prev => ({
      ...prev,
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

  const renderTagValue = selected => (
    <div className={classes.tagChips}>
      {selected.map(tagId => {
        const tag = tags.find(item => item.id === tagId);
        return (
          <Chip
            key={tagId}
            size="small"
            label={tag?.name || tagId}
            style={{ backgroundColor: tag?.color || "#607d8b", color: "#fff" }}
          />
        );
      })}
    </div>
  );

  const createCampaign = async () => {
    try {
      await api.post("/campaigns", campaignForm);
      toast.success("Campanha iniciada.");
      setCampaignModalOpen(false);
      setCampaignForm(initialCampaign);
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

  const getCampaignStatusLabel = status => ({
    scheduled: "Agendado",
    running: "Em execucao",
    paused: "Parado",
    canceled: "Cancelado",
    completed: "Concluido",
    finished: "Concluido"
  }[status] || status);

  const getScheduleStatusLabel = status => ({
    scheduled: "Agendado",
    running: "Em execucao",
    paused: "Parado",
    canceled: "Cancelado",
    completed: "Concluido",
    sent: "Concluido",
    error: "Erro"
  }[status] || status);

  const openNewScheduleModal = () => {
    setEditingScheduleId(null);
    setScheduleForm(initialSchedule);
    setScheduleModalOpen(true);
  };

  const openEditScheduleModal = schedule => {
    setEditingScheduleId(schedule.id);
    setScheduleForm({
      contactIds: schedule.contactId ? [schedule.contactId] : [],
      tagIds: [],
      audience: "all",
      message: schedule.message || "",
      scheduledAt: toDateTimeLocalValue(schedule.scheduledAt),
      intervalPattern: schedule.intervalPattern || String(schedule.intervalSeconds || 30),
      pauseAfter: schedule.pauseAfter || 20,
      pauseMinutes: Math.max(1, Math.round((schedule.pauseSeconds || 300) / 60)),
      whatsappId: schedule.whatsappId || ""
    });
    setScheduleModalOpen(true);
  };

  const closeScheduleModal = () => {
    setScheduleModalOpen(false);
    setEditingScheduleId(null);
    setScheduleForm(initialSchedule);
  };

  const saveSchedule = async () => {
    try {
      if (editingScheduleId) {
        await api.put(`/scheduled-messages/${editingScheduleId}`, {
          message: scheduleForm.message,
          scheduledAt: scheduleForm.scheduledAt,
          intervalPattern: scheduleForm.intervalPattern,
          pauseAfter: scheduleForm.pauseAfter,
          pauseMinutes: scheduleForm.pauseMinutes,
          whatsappId: scheduleForm.whatsappId
        });
        toast.success("Agendamento atualizado.");
      } else {
        await api.post("/scheduled-messages", scheduleForm);
        toast.success("Mensagem agendada.");
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

  const renderCampaignActions = campaign => {
    if (campaign.status === "scheduled" || campaign.status === "running") {
      return (
        <>
          <Button size="small" onClick={() => updateCampaignStatus(campaign, "paused")}>
            Stop
          </Button>
          <Button size="small" onClick={() => updateCampaignStatus(campaign, "canceled")}>
            Cancelar
          </Button>
        </>
      );
    }

    if (campaign.status === "paused") {
      return (
        <Button size="small" onClick={() => updateCampaignStatus(campaign, "running")}>
          Play
        </Button>
      );
    }

    return null;
  };

  return (
    <Container maxWidth={false} className={classes.root}>
      <Tabs
        value={tab}
        indicatorColor="primary"
        textColor="primary"
        onChange={(event, value) => setTab(value)}
        className={classes.tabs}
      >
        <Tab label="Campanhas" />
        <Tab label="Agendamentos" />
      </Tabs>

      {tab === 0 && (
        <>
          <div className={classes.header}>
            <div>
              <Typography variant="h6">Campanhas</Typography>
              <Typography variant="body2" className={classes.helper}>
                Use {"{{nome}}"} para personalizar a mensagem com o nome do contato.
              </Typography>
            </div>
            <Button
              color="primary"
              variant="contained"
              onClick={() => setCampaignModalOpen(true)}
            >
              Nova campanha
            </Button>
          </div>
          <Paper className={classes.paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Público</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Destinatários</TableCell>
                  <TableCell>Intervalo</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.map(campaign => (
                  <TableRow key={campaign.id}>
                    <TableCell>{campaign.name}</TableCell>
                    <TableCell>{campaign.audience}</TableCell>
                    <TableCell>{getCampaignStatusLabel(campaign.status)}</TableCell>
                    <TableCell>{campaign.recipients?.length || 0}</TableCell>
                    <TableCell>{campaign.intervalPattern || `${campaign.intervalSeconds}s`}</TableCell>
                    <TableCell align="right">{renderCampaignActions(campaign)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {tab === 1 && (
        <>
          <div className={classes.header}>
            <Typography variant="h6">Agendamentos</Typography>
            <Button
              color="primary"
              variant="contained"
              onClick={openNewScheduleModal}
            >
              Novo agendamento
            </Button>
          </div>
          <Paper className={classes.paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Contato/grupo</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Mensagem</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedules.map(schedule => (
                  <TableRow key={schedule.id}>
                    <TableCell>{schedule.contact?.name}</TableCell>
                    <TableCell>{new Date(schedule.scheduledAt).toLocaleString()}</TableCell>
                    <TableCell>{getScheduleStatusLabel(schedule.status)}</TableCell>
                    <TableCell>{schedule.message}</TableCell>
                    <TableCell align="right">
                      {!["sent", "completed", "canceled"].includes(schedule.status) && (
                        <Button size="small" onClick={() => openEditScheduleModal(schedule)}>
                          Editar
                        </Button>
                      )}
                      {(schedule.status === "scheduled" || schedule.status === "running") && (
                        <Button size="small" onClick={() => updateScheduleStatus(schedule, "paused")}>
                          Stop
                        </Button>
                      )}
                      {schedule.status === "paused" && (
                        <Button size="small" onClick={() => updateScheduleStatus(schedule, "scheduled")}>
                          Play
                        </Button>
                      )}
                      <Button size="small" onClick={() => deleteSchedule(schedule)}>
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      <Dialog open={campaignModalOpen} onClose={() => setCampaignModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nova campanha</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required margin="dense" variant="outlined" label="Nome" name="name" value={campaignForm.name} onChange={handleCampaignChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Público" name="audience" value={campaignForm.audience} onChange={handleCampaignAudienceChange}>
                <MenuItem value="contacts">Somente contatos</MenuItem>
                <MenuItem value="groups">Somente grupos</MenuItem>
                <MenuItem value="all">Contatos e grupos</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <ContactPicker
                classes={classes}
                contacts={contacts}
                audience={campaignForm.audience}
                selectedIds={campaignForm.contactIds}
                label="Contatos específicos"
                onChange={contactIds => setCampaignForm(prev => ({ ...prev, contactIds }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                margin="dense"
                variant="outlined"
                label="Etiquetas"
                name="tagIds"
                value={campaignForm.tagIds}
                onChange={handleCampaignChange}
                SelectProps={{ multiple: true, renderValue: renderTagValue }}
              >
                {tags.map(tag => (
                  <MenuItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Pausar após envios" name="pauseAfter" value={campaignForm.pauseAfter} onChange={handleCampaignChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" margin="dense" variant="outlined" label="Tempo de pausa (min.)" name="pauseMinutes" value={campaignForm.pauseMinutes} onChange={handleCampaignChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required margin="dense" variant="outlined" label="Sequencia de intervalos em segundos" name="intervalPattern" value={campaignForm.intervalPattern} onChange={handleCampaignChange} placeholder="10:2:95:12:34" />
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth margin="dense" variant="outlined" label="Conexão WhatsApp" name="whatsappId" value={campaignForm.whatsappId} onChange={handleCampaignChange}>
                <MenuItem value="">Padrão</MenuItem>
                {whatsapps.map(whatsapp => (
                  <MenuItem key={whatsapp.id} value={whatsapp.id}>{whatsapp.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth required multiline rows={5} margin="dense" variant="outlined" label="Mensagem" name="message" value={campaignForm.message} onChange={handleCampaignChange} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignModalOpen(false)}>Cancelar</Button>
          <Button color="primary" variant="contained" onClick={createCampaign}>Iniciar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={scheduleModalOpen} onClose={closeScheduleModal} maxWidth="md" fullWidth>
        <DialogTitle>{editingScheduleId ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
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
              <TextField
                select
                fullWidth
                margin="dense"
                variant="outlined"
                label="Etiquetas"
                name="tagIds"
                value={scheduleForm.tagIds}
                onChange={handleScheduleChange}
                SelectProps={{ multiple: true, renderValue: renderTagValue }}
              >
                {tags.map(tag => (
                  <MenuItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required type="datetime-local" margin="dense" variant="outlined" label="Data e hora" name="scheduledAt" value={scheduleForm.scheduledAt} onChange={handleScheduleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
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
              <TextField fullWidth required multiline rows={5} margin="dense" variant="outlined" label="Mensagem" name="message" value={scheduleForm.message} onChange={handleScheduleChange} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeScheduleModal}>Cancelar</Button>
          <Button color="primary" variant="contained" onClick={saveSchedule}>
            {editingScheduleId ? "Salvar" : "Agendar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CampaignsSchedules;
