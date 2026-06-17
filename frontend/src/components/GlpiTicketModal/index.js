import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
  Typography
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import SearchIcon from "@material-ui/icons/Search";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const messageLine = message => message.body || "";
const hasSelectedValue = value => value !== "" && value !== null && value !== undefined;
const optionLabel = option => option?.completeName || option?.name || "";

const GlpiTicketModal = ({ open, onClose, ticket, onCreated }) => {
  const [entities, setEntities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [descriptionMode, setDescriptionMode] = useState("complete");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [entityId, setEntityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [forceCreate, setForceCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedMessages = useMemo(
    () => messages.filter(message => selectedMessageIds.includes(message.id)),
    [messages, selectedMessageIds]
  );
  const selectedEntity = useMemo(
    () => entities.find(entity => Number(entity.glpiId) === Number(entityId)) || null,
    [entities, entityId]
  );
  const selectedLocation = useMemo(
    () => locations.find(location => Number(location.glpiId) === Number(locationId)) || null,
    [locations, locationId]
  );
  const selectedCategory = useMemo(
    () => categories.find(category => Number(category.glpiId) === Number(categoryId)) || null,
    [categories, categoryId]
  );

  const sourceContact = useMemo(() => {
    const incomingSelected = selectedMessages.find(message => !message.fromMe && message.contact);
    if (incomingSelected?.contact) return incomingSelected.contact;

    const incomingMessage = [...messages].reverse().find(message => !message.fromMe && message.contact);
    if (incomingMessage?.contact) return incomingMessage.contact;

    return ticket?.contact;
  }, [messages, selectedMessages, ticket]);

  useEffect(() => {
    if (!open || !ticket?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: entityData }, { data: categoryData }, { data: messageData }] = await Promise.all([
          api.get("/glpi/entities"),
          api.get("/glpi/categories"),
          api.get(`/messages/${ticket.id}`)
        ]);

        setEntities(entityData || []);
        setCategories(categoryData || []);
        setLocations([]);
        const loadedMessages = messageData?.messages || [];
        const latestIncomingMessage = [...loadedMessages].reverse().find(message => !message.fromMe);
        const initialSourceContact = latestIncomingMessage?.contact || ticket.contact;

        setMessages(loadedMessages);
        setTitle(`Atendimento WhatsApp #${ticket.id} - ${initialSourceContact?.name || "Contato"}`);
        setTitleTouched(false);
        setSelectedMessageIds(latestIncomingMessage ? [latestIncomingMessage.id] : []);
        setForceCreate(false);
        setEntityId("");
        setCategoryId("");
        setLocationId("");
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, ticket]);

  useEffect(() => {
    if (!open || !hasSelectedValue(entityId)) {
      setLocations([]);
      setLocationId("");
      return;
    }

    const loadLocations = async () => {
      try {
        setLocationId("");
        const { data } = await api.get("/glpi/locations", { params: { entityId } });
        setLocations(data || []);
      } catch (err) {
        toastError(err);
      }
    };

    loadLocations();
  }, [entityId, open]);

  useEffect(() => {
    if (!open) return;
    if (!titleTouched && sourceContact?.name) {
      setTitle(`Atendimento WhatsApp #${ticket?.id || ""} - ${sourceContact.name}`);
    }

    const selectedLines = selectedMessages.map(messageLine).join("\n");
    if (descriptionMode === "selected_messages") {
      setDescription(selectedLines);
      return;
    }

    setDescription([
      `Nome do contato: ${sourceContact?.name || ""}`,
      `Telefone: ${sourceContact?.number || ""}`,
      `Atendimento RocketService: #${ticket?.id || ""}`,
      "",
      "Relato do usuario:",
      selectedLines || "(nenhuma mensagem selecionada)"
    ].filter(line => line !== "").join("\n"));
  }, [descriptionMode, open, selectedMessages, sourceContact, ticket, titleTouched]);

  const toggleMessage = messageId => {
    setSelectedMessageIds(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const { data } = await api.post(`/tickets/${ticket.id}/glpi`, {
        title,
        description,
        entityId,
        categoryId,
        locationId: locationId || null,
        descriptionMode: "manual",
        selectedMessageIds,
        forceCreate
      });
      toast.success(`Chamado GLPI ${data.glpiTicketNumber || data.glpiTicketId} criado.`);
      onCreated?.(data);
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const hasSelectedEntity = hasSelectedValue(entityId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Chamado GLPI</DialogTitle>
      <DialogContent>
        {loading ? (
          <Typography variant="body2" color="textSecondary">Carregando dados do GLPI...</Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                variant="outlined"
                margin="dense"
                label="Titulo do chamado"
                value={title}
                onChange={event => {
                  setTitleTouched(true);
                  setTitle(event.target.value);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={entities}
                value={selectedEntity}
                getOptionLabel={optionLabel}
                getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                noOptionsText="Nenhuma entidade encontrada"
                onChange={(event, option) => {
                  setEntityId(option?.glpiId || "");
                  setLocationId("");
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    fullWidth
                    required
                    variant="outlined"
                    margin="dense"
                    label="Unidade / Entidade GLPI"
                    placeholder="Pesquisar entidade"
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
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={categories}
                value={selectedCategory}
                getOptionLabel={optionLabel}
                getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                noOptionsText="Nenhuma categoria encontrada"
                onChange={(event, option) => setCategoryId(option?.glpiId || "")}
                renderInput={params => (
                  <TextField
                    {...params}
                    fullWidth
                    required
                    variant="outlined"
                    margin="dense"
                    label="Categoria GLPI"
                    placeholder="Pesquisar categoria"
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
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={locations}
                value={selectedLocation}
                disabled={!hasSelectedEntity}
                getOptionLabel={optionLabel}
                getOptionSelected={(option, value) => Number(option.glpiId) === Number(value.glpiId)}
                noOptionsText={hasSelectedEntity ? "Nenhuma localizacao encontrada" : "Selecione uma entidade primeiro"}
                onChange={(event, option) => setLocationId(option?.glpiId || "")}
                renderInput={params => (
                  <TextField
                    {...params}
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    label="Localizacao GLPI"
                    placeholder={hasSelectedEntity ? "Pesquisar localizacao" : "Selecione uma entidade primeiro"}
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
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth variant="outlined" margin="dense" label="Modo da descricao" value={descriptionMode} onChange={event => setDescriptionMode(event.target.value)}>
                <MenuItem value="complete">Modelo completo</MenuItem>
                <MenuItem value="selected_messages">Somente mensagens selecionadas</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox color="primary" checked={forceCreate} onChange={event => setForceCreate(event.target.checked)} />}
                label="Confirmar criacao mesmo se ja existir chamado vinculado"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Mensagens recentes</Typography>
              <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #E2E8F0", borderRadius: 6, padding: 8 }}>
                {messages.map(message => (
                  <FormControlLabel
                    key={message.id}
                    style={{ display: "flex", alignItems: "flex-start", margin: 0 }}
                    control={<Checkbox color="primary" checked={selectedMessageIds.includes(message.id)} onChange={() => toggleMessage(message.id)} />}
                    label={<Typography variant="body2">{messageLine(message)}</Typography>}
                  />
                ))}
                {!messages.length && <Typography variant="body2" color="textSecondary">Nenhuma mensagem encontrada.</Typography>}
              </div>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={8}
                variant="outlined"
                margin="dense"
                label="Descricao final enviada ao GLPI"
                value={description}
                onChange={event => setDescription(event.target.value)}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancelar</Button>
        <Button color="primary" variant="contained" onClick={handleSubmit} disabled={submitting || !title || !description || !hasSelectedEntity || !categoryId}>
          {submitting ? "Criando..." : "Criar chamado"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GlpiTicketModal;
