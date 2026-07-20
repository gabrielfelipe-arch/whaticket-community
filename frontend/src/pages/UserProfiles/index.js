import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import SecurityOutlinedIcon from "@material-ui/icons/SecurityOutlined";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ConfirmationModal from "../../components/ConfirmationModal";
import { EmptyState, ListToolbar } from "../../components/ExecutiveLayout";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    overflow: "auto",
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.custom?.cardShadow,
    background: theme.palette.background.paper,
    ...theme.scrollbarStyles,
  },
  toolbarText: {
    color: theme.palette.text.secondary,
  },
  stickyFeature: {
    position: "sticky",
    left: 0,
    zIndex: 2,
    minWidth: 270,
    maxWidth: 320,
    background: theme.palette.background.paper,
    boxShadow: theme.palette.type === "dark"
      ? "8px 0 16px rgba(0,0,0,0.22)"
      : "8px 0 16px rgba(15,23,42,0.06)",
  },
  stickyHead: {
    position: "sticky",
    top: 0,
    zIndex: 3,
    background: theme.palette.background.paper,
  },
  profileHead: {
    minWidth: 240,
    verticalAlign: "top",
  },
  profileTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
  },
  profileName: {
    fontWeight: 800,
  },
  muted: {
    color: theme.palette.text.secondary,
  },
  featureName: {
    fontWeight: 800,
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: theme.spacing(0.5),
  },
  actionItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    minHeight: 32,
    padding: theme.spacing(0.25, 0.75),
    borderRadius: 8,
    background: theme.palette.type === "dark" ? "rgba(15,23,42,0.42)" : "#F8FAFC",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: 700,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: theme.spacing(2),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
}));

const profileInitialState = {
  name: "",
  description: "",
  baseRole: "user",
  active: true
};

const featureRows = [
  {
    key: "connections",
    label: "Conexoes",
    description: "Canais WhatsApp, QR code e reconexao.",
    actions: [
      { key: "connections.view", label: "Visualizar" },
      { key: "connections.reconnect", label: "Reconectar" },
      { key: "connections.create", label: "Adicionar" },
      { key: "connections.edit", label: "Editar" },
      { key: "connections.delete", label: "Excluir" }
    ]
  },
  {
    key: "quickAnswers",
    label: "Respostas rapidas",
    description: "Modelos usados pela equipe no atendimento.",
    actions: [
      { key: "quickAnswers.view", label: "Visualizar" },
      { key: "quickAnswers.create", label: "Adicionar" },
      { key: "quickAnswers.edit", label: "Editar" },
      { key: "quickAnswers.delete", label: "Excluir" }
    ]
  },
  {
    key: "contacts",
    label: "Contatos",
    description: "Cadastro, edicao e importacao de contatos.",
    actions: [
      { key: "contacts.view", label: "Visualizar" },
      { key: "contacts.create", label: "Adicionar" },
      { key: "contacts.edit", label: "Editar" },
      { key: "contacts.delete", label: "Excluir" },
      { key: "contacts.import_phone", label: "Importar" },
      { key: "contacts.import", label: "Importar planilha" }
    ]
  },
  {
    key: "scheduledMessages",
    label: "Mensagens programadas",
    description: "Agendamentos individuais e em lote.",
    actions: [
      { key: "scheduledMessages.view_all", label: "Visualizar todas" },
      { key: "scheduledMessages.view_own", label: "Visualizar minhas" },
      { key: "scheduledMessages.edit_own", label: "Editar minhas" },
      { key: "scheduledMessages.edit_all", label: "Editar todas" },
      { key: "scheduledMessages.cancel_own", label: "Cancelar minhas" },
      { key: "scheduledMessages.cancel_all", label: "Cancelar todas" },
      { key: "scheduledMessages.clone", label: "Clonar" }
    ]
  },
  {
    key: "campaigns",
    label: "Campanhas",
    description: "Disparos para contatos, grupos ou etiquetas.",
    actions: [
      { key: "campaigns.view_all", label: "Visualizar todas" },
      { key: "campaigns.view_own", label: "Visualizar minhas" },
      { key: "campaigns.edit_own", label: "Editar minhas" },
      { key: "campaigns.edit_all", label: "Editar todas" },
      { key: "campaigns.cancel_own", label: "Cancelar minhas" },
      { key: "campaigns.cancel_all", label: "Cancelar todas" },
      { key: "campaigns.clone", label: "Clonar" }
    ]
  },
  {
    key: "users",
    label: "Usuarios",
    description: "Equipe, status, filas e perfil de acesso.",
    actions: [
      { key: "users.view", label: "Visualizar" },
      { key: "users.create", label: "Criar" },
      { key: "users.edit", label: "Editar" },
      { key: "users.reset_password", label: "Resetar senha" },
      { key: "users.delete", label: "Remover" }
    ]
  },
  {
    key: "profiles",
    label: "Perfis",
    description: "Criacao e edicao desta matriz de acesso.",
    actions: [
      { key: "profiles.manage", label: "Administrar perfis" }
    ]
  },
  {
    key: "queues",
    label: "Filas",
    description: "Filas, horarios e regras operacionais.",
    actions: [
      { key: "queues.view", label: "Visualizar" },
      { key: "queues.create", label: "Adicionar" },
      { key: "queues.edit", label: "Editar" },
      { key: "queues.delete", label: "Excluir" }
    ]
  },
  {
    key: "tags",
    label: "Etiquetas",
    description: "Marcadores usados em contatos, tickets e automacoes.",
    actions: [
      { key: "tags.view", label: "Visualizar" },
      { key: "tags.create", label: "Adicionar" },
      { key: "tags.edit", label: "Editar" },
      { key: "tags.delete", label: "Excluir" }
    ]
  },
  {
    key: "ticketCategories",
    label: "Categorias",
    description: "Categorias usadas para classificar atendimentos.",
    actions: [
      { key: "settings.categories.view", label: "Visualizar" },
      { key: "settings.categories.create", label: "Adicionar" },
      { key: "settings.categories.edit", label: "Editar" },
      { key: "settings.categories.delete", label: "Excluir" }
    ]
  },
  {
    key: "closingReasons",
    label: "Motivos de encerramento",
    description: "Motivos e mensagens usados ao finalizar atendimentos.",
    actions: [
      { key: "settings.closing_reasons.view", label: "Visualizar" },
      { key: "settings.closing_reasons.create", label: "Adicionar" },
      { key: "settings.closing_reasons.edit", label: "Editar" },
      { key: "settings.closing_reasons.delete", label: "Excluir" }
    ]
  },
  {
    key: "satisfactionSurveys",
    label: "Pesquisa de satisfacao",
    description: "Pesquisas enviadas no fechamento do atendimento.",
    actions: [
      { key: "settings.satisfaction.view", label: "Visualizar" },
      { key: "settings.satisfaction.create", label: "Adicionar" },
      { key: "settings.satisfaction.edit", label: "Editar" },
      { key: "settings.satisfaction.delete", label: "Excluir" }
    ]
  },
  {
    key: "settings",
    label: "Configuracoes gerais",
    description: "Dados da empresa, parametros gerais e logo.",
    actions: [
      { key: "settings.view", label: "Visualizar" },
      { key: "settings.manage", label: "Configurar gerais" },
      { key: "settings.logo", label: "Logo" },
      { key: "settings.audit_logs", label: "Logs" }
    ]
  },
  {
    key: "ura",
    label: "URA",
    description: "Fluxos e opcoes do atendimento automatico.",
    actions: [
      { key: "settings.ura", label: "Visualizar" },
      { key: "settings.ura_flows", label: "Fluxos" },
      { key: "settings.ura_options", label: "Opcoes" }
    ]
  },
  {
    key: "forms",
    label: "Formularios",
    description: "Construtor, respostas e relatorios.",
    actions: [
      { key: "settings.forms", label: "Visualizar" },
      { key: "settings.form_builder", label: "Construtor" },
      { key: "settings.form_responses", label: "Respostas" },
      { key: "settings.form_reports", label: "Relatorios" }
    ]
  },
  {
    key: "ai",
    label: "IA",
    description: "Agentes, base de conhecimento, memoria e logs.",
    actions: [
      { key: "settings.ai", label: "Visualizar" },
      { key: "settings.ai_agents", label: "Agentes" },
      { key: "settings.knowledge_base", label: "Base" },
      { key: "settings.ai_contexts", label: "Memoria" },
      { key: "settings.ai_leads", label: "Leads" },
      { key: "settings.ai_tools", label: "Ferramentas" }
    ]
  },
  {
    key: "integrations",
    label: "Integracoes",
    description: "Permissoes separadas para GLPI e provedor WhatsApp.",
    actions: [
      { key: "glpi.view", label: "Ver GLPI" },
      { key: "glpi.manage", label: "Configurar GLPI" },
      { key: "glpi.sync", label: "Sincronizar GLPI" },
      { key: "whatsapp_provider.view", label: "Ver provedor" },
      { key: "whatsapp_provider.manage", label: "Configurar provedor" },
      { key: "whatsapp_updates.manage", label: "Atualizar WhatsApp" }
    ]
  },
  {
    key: "reports",
    label: "Relatorios e painel",
    description: "Indicadores, historico e exportacoes.",
    actions: [
      { key: "dashboard.view_linked_queues", label: "Painel - filas vinculadas" },
      { key: "dashboard.view_all_queues", label: "Painel - todas as filas" },
      { key: "reports.view", label: "Relatorios" },
      { key: "reports.export", label: "Exportar" }
    ]
  }
];

const isAdminProfile = profile => profile.baseRole === "admin" || profile.name === "Administrador";

const applyPermissionDependencies = permissions => {
  const next = { ...permissions };

  if (next["glpi.manage"] || next["glpi.sync"]) {
    next["glpi.view"] = true;
  }

  if (next["whatsapp_provider.manage"] || next["whatsapp_updates.manage"]) {
    next["whatsapp_provider.view"] = true;
  }

  return next;
};

const UserProfiles = () => {
  const classes = useStyles();
  const [profiles, setProfiles] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(profileInitialState);
  const [editingProfile, setEditingProfile] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removingProfile, setRemovingProfile] = useState(null);

  const visibleProfiles = useMemo(
    () => profiles.filter(profile => !isAdminProfile(profile)),
    [profiles]
  );

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/user-profiles");
      setProfiles(data || []);
      setDrafts((data || []).reduce((acc, profile) => {
        acc[profile.id] = profile.permissions || {};
        return acc;
      }, {}));
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const openCreate = () => {
    setEditingProfile(null);
    setProfileForm(profileInitialState);
    setModalOpen(true);
  };

  const openEdit = profile => {
    setEditingProfile(profile);
    setProfileForm({
      name: profile.name || "",
      description: profile.description || "",
      baseRole: profile.baseRole === "supervisor" ? "supervisor" : "user",
      active: profile.active !== false
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProfile(null);
    setProfileForm(profileInitialState);
  };

  const togglePermission = async (profileId, key) => {
    const profile = profiles.find(item => Number(item.id) === Number(profileId));
    if (!profile) return;

    const nextPermissions = applyPermissionDependencies({
      ...(drafts[profileId] || {}),
      [key]: drafts[profileId]?.[key] !== true
    });

    setDrafts(prev => ({
      ...prev,
      [profileId]: nextPermissions
    }));
    setSavingIds(prev => new Set(prev).add(profileId));

    try {
      const { data } = await api.put(`/user-profiles/${profileId}`, {
        name: profile.name,
        description: profile.description,
        baseRole: profile.baseRole,
        active: profile.active,
        permissions: nextPermissions
      });

      setProfiles(prev => prev.map(item =>
        Number(item.id) === Number(profileId) ? { ...item, permissions: data.permissions || nextPermissions } : item
      ));
      setDrafts(prev => ({
        ...prev,
        [profileId]: data.permissions || nextPermissions
      }));
    } catch (err) {
      setDrafts(prev => ({
        ...prev,
        [profileId]: profile.permissions || {}
      }));
      toastError(err);
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    }
  };

  const saveProfile = async () => {
    if (!profileForm.name.trim()) {
      toast.error("Informe o nome do perfil.");
      return;
    }

    try {
      const payload = {
        ...profileForm,
        name: profileForm.name.trim(),
        permissions: editingProfile ? drafts[editingProfile.id] || {} : {}
      };

      if (editingProfile) {
        await api.put(`/user-profiles/${editingProfile.id}`, payload);
      } else {
        await api.post("/user-profiles", payload);
      }

      toast.success("Perfil salvo.");
      closeModal();
      fetchProfiles();
    } catch (err) {
      toastError(err);
    }
  };

  const removeProfile = async () => {
    try {
      await api.delete(`/user-profiles/${removingProfile.id}`);
      toast.success("Perfil removido ou desativado.");
      setConfirmOpen(false);
      setRemovingProfile(null);
      fetchProfiles();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={removingProfile ? `Remover perfil ${removingProfile.name}?` : ""}
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={removeProfile}
      >
        Perfis em uso serao desativados para preservar os usuarios vinculados.
      </ConfirmationModal>

      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProfile ? "Editar perfil" : "Novo perfil"}</DialogTitle>
        <DialogContent dividers>
          <div className={classes.formGrid}>
            <TextField
              label="Nome do perfil"
              value={profileForm.name}
              onChange={event => setProfileForm(prev => ({ ...prev, name: event.target.value }))}
              variant="outlined"
              margin="dense"
              fullWidth
            />
            <FormControl variant="outlined" margin="dense" fullWidth>
              <InputLabel id="profile-base-role-label">Base do perfil</InputLabel>
              <Select
                labelId="profile-base-role-label"
                label="Base do perfil"
                value={profileForm.baseRole}
                onChange={event => setProfileForm(prev => ({ ...prev, baseRole: event.target.value }))}
              >
                <MenuItem value="user">Atendente</MenuItem>
                <MenuItem value="supervisor">Supervisor</MenuItem>
              </Select>
            </FormControl>
          </div>
          <TextField
            label="Descricao"
            value={profileForm.description}
            onChange={event => setProfileForm(prev => ({ ...prev, description: event.target.value }))}
            variant="outlined"
            margin="dense"
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal} color="secondary" variant="outlined">Cancelar</Button>
          <Button onClick={saveProfile} color="primary" variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      <MainHeader>
        <Title subtitle="Configure perfis operacionais em uma matriz por funcionalidade. O Administrador tem acesso total fixo.">
          Perfis de acesso
        </Title>
        <MainHeaderButtonsWrapper>
          <Button variant="outlined" color="primary" disabled={savingIds.size > 0} onClick={fetchProfiles}>
            Recarregar
          </Button>
          <Button variant="contained" color="primary" onClick={openCreate}>
            Novo perfil
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <ListToolbar>
        <Typography variant="body2" className={classes.toolbarText}>
          As permissoes sao salvas automaticamente ao ligar ou desligar. Atendimento basico fica liberado para todos; excluir conversa continua restrito ao Administrador.
        </Typography>
        <Chip
          size="small"
          color={savingIds.size > 0 ? "primary" : "default"}
          label={savingIds.size > 0 ? "Salvando..." : `${visibleProfiles.length} perfis editaveis`}
        />
      </ListToolbar>

      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell className={`${classes.stickyFeature} ${classes.stickyHead}`}>Funcionalidade</TableCell>
              {visibleProfiles.map(profile => (
                <TableCell key={profile.id} align="center" className={`${classes.profileHead} ${classes.stickyHead}`}>
                  <div className={classes.profileTitle}>
                    <div>
                      <Typography className={classes.profileName}>{profile.name}</Typography>
                      {profile.description && (
                        <Typography variant="caption" className={classes.muted}>{profile.description}</Typography>
                      )}
                    </div>
                    <div>
                      <Tooltip title="Editar perfil">
                        <IconButton size="small" onClick={() => openEdit(profile)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remover perfil">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setRemovingProfile(profile);
                            setConfirmOpen(true);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && <TableRowSkeleton columns={Math.max(2, visibleProfiles.length + 1)} />}
            {!loading && visibleProfiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={2}>
                  <EmptyState
                    icon={SecurityOutlinedIcon}
                    title="Nenhum perfil operacional"
                    description="Crie perfis como Recepcao, Financeiro, Suporte ou Supervisor para liberar acessos por funcao."
                    actionLabel="Novo perfil"
                    onAction={openCreate}
                  />
                </TableCell>
              </TableRow>
            )}
            {!loading && visibleProfiles.length > 0 && featureRows.map(row => (
              <TableRow key={row.key}>
                <TableCell className={classes.stickyFeature}>
                  <Typography className={classes.featureName}>{row.label}</Typography>
                  <Typography variant="caption" className={classes.muted}>{row.description}</Typography>
                </TableCell>
                {visibleProfiles.map(profile => (
                  <TableCell key={`${row.key}-${profile.id}`}>
                    <div className={classes.actionGrid}>
                      {row.actions.map(action => (
                        <div className={classes.actionItem} key={action.key}>
                          <Typography className={classes.actionLabel}>{action.label}</Typography>
                          <Switch
                            color="primary"
                            size="small"
                            checked={drafts[profile.id]?.[action.key] === true}
                            disabled={savingIds.has(profile.id)}
                            onChange={() => togglePermission(profile.id, action.key)}
                          />
                        </div>
                      ))}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default UserProfiles;
