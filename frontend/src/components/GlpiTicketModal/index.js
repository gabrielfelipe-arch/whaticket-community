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
  MenuItem,
  TextField,
  Typography
} from "@material-ui/core";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const messageLine = message => message.body || "";

const GlpiTicketModal = ({ open, onClose, ticket, onCreated }) => {
  const [entities, setEntities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [descriptionMode, setDescriptionMode] = useState("complete");
  const [title, setTitle] = useState("");
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

  useEffect(() => {
    if (!open || !ticket?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: entityData }, { data: categoryData }, { data: locationData }, { data: messageData }] = await Promise.all([
          api.get("/glpi/entities"),
          api.get("/glpi/categories"),
          api.get("/glpi/locations"),
          api.get(`/messages/${ticket.id}`)
        ]);

        setEntities(entityData || []);
        setCategories(categoryData || []);
        setLocations(locationData || []);
        setMessages(messageData?.messages || []);
        setTitle(`Atendimento WhatsApp #${ticket.id} - ${ticket.contact?.name || "Contato"}`);
        setSelectedMessageIds([]);
        setForceCreate(false);
        setEntityId(entityData?.[0]?.glpiId || "");
        setCategoryId(categoryData?.[0]?.glpiId || "");
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
    if (!open) return;
    const selectedLines = selectedMessages.map(messageLine).join("\n");
    if (descriptionMode === "selected_messages") {
      setDescription(selectedLines);
      return;
    }

    setDescription([
      `${ticket?.isGroup ? "Grupo" : "Nome do contato"}: ${ticket?.contact?.name || ""}`,
      ticket?.isGroup ? "" : `Telefone: ${ticket?.contact?.number || ""}`,
      "Origem: WhatsApp",
      `Atendimento RocketService: #${ticket?.id || ""}`,
      "",
      "Mensagens selecionadas:",
      selectedLines || "(nenhuma mensagem selecionada)",
      "",
      "Descricao complementar:"
    ].join("\n"));
  }, [descriptionMode, open, selectedMessages, ticket]);

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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Chamado GLPI</DialogTitle>
      <DialogContent>
        {loading ? (
          <Typography variant="body2" color="textSecondary">Carregando dados do GLPI...</Typography>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth required variant="outlined" margin="dense" label="Titulo do chamado" value={title} onChange={event => setTitle(event.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required variant="outlined" margin="dense" label="Unidade / Entidade GLPI" value={entityId} onChange={event => setEntityId(event.target.value)}>
                {entities.map(entity => (
                  <MenuItem key={entity.id} value={entity.glpiId}>{entity.completeName || entity.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required variant="outlined" margin="dense" label="Categoria GLPI" value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.glpiId}>{category.completeName || category.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth variant="outlined" margin="dense" label="Localizacao GLPI" value={locationId} onChange={event => setLocationId(event.target.value)}>
                <MenuItem value="">Sem localizacao</MenuItem>
                {locations.map(location => (
                  <MenuItem key={location.id} value={location.glpiId}>{location.completeName || location.name}</MenuItem>
                ))}
              </TextField>
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
        <Button color="primary" variant="contained" onClick={handleSubmit} disabled={submitting || !title || !description || !entityId || !categoryId}>
          {submitting ? "Criando..." : "Criar chamado"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GlpiTicketModal;
