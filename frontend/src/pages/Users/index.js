import React, { useContext, useState, useEffect, useReducer } from "react";
import { toast } from "react-toastify";
import openSocket from "../../services/socket-io";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Chip from "@material-ui/core/Chip";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import SearchIcon from "@material-ui/icons/Search";
import SupervisorAccountIcon from "@material-ui/icons/SupervisorAccount";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";

import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import VpnKeyIcon from "@material-ui/icons/VpnKey";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import UserModal from "../../components/UserModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { EmptyState, ListToolbar } from "../../components/ExecutiveLayout";

const statusLabels = {
  online: "Online",
  away: "Ausente",
  offline: "Offline",
};

const statusColors = {
  online: "#22C55E",
  away: "#F59E0B",
  offline: "#94A3B8",
};

const accountStatusLabels = {
  active: "Ativo",
  inactive: "Inativo",
};

const accountStatusColors = {
  active: "#22C55E",
  inactive: "#EF4444",
};

const profileLabels = {
  admin: "Administrador",
  supervisor: "Supervisor",
  user: "Usuario",
};

const reducer = (state, action) => {
  if (action.type === "LOAD_USERS") {
    const users = action.payload;
    const newUsers = [];

    users.forEach((user) => {
      const userIndex = state.findIndex((u) => u.id === user.id);
      if (userIndex !== -1) {
        state[userIndex] = user;
      } else {
        newUsers.push(user);
      }
    });

    return [...state, ...newUsers];
  }

  if (action.type === "UPDATE_USERS") {
    const user = action.payload;
    const userIndex = state.findIndex((u) => u.id === user.id);

    if (userIndex !== -1) {
      state[userIndex] = user;
      return [...state];
    } else {
      return [user, ...state];
    }
  }

  if (action.type === "DELETE_USER") {
    const userId = action.payload;

    const userIndex = state.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      state.splice(userIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: 0,
    overflowY: "scroll",
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.custom?.cardShadow,
    background: theme.palette.background.paper,
    ...theme.scrollbarStyles,
  },
}));

const Users = () => {
  const classes = useStyles();
  const { user: loggedInUser } = useContext(AuthContext);
  const isSupervisor = loggedInUser?.profile === "supervisor";
  const canResetPassword = loggedInUser?.profile === "admin" || loggedInUser?.permissions?.["users.reset_password"] === true;

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [users, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchUsers = async () => {
        try {
          const { data } = await api.get("/users/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_USERS", payload: data.users });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("user", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_USERS", payload: data.user });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_USER", payload: +data.userId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOpenUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setSelectedUser(null);
    setUserModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      toast.success(i18n.t("users.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingUser(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Resetar a senha de ${user.name} para os 6 primeiros digitos do CPF?`)) return;

    try {
      await api.post(`/users/${user.id}/reset-password`);
      toast.success("Senha resetada. O usuario devera alterar no proximo acesso.");
    } catch (err) {
      toastError(err);
    }
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingUser &&
          `${i18n.t("users.confirmationModal.deleteTitle")} ${
            deletingUser.name
          }?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteUser(deletingUser.id)}
      >
        {i18n.t("users.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <UserModal
        open={userModalOpen}
        onClose={handleCloseUserModal}
        aria-labelledby="form-dialog-title"
        userId={selectedUser && selectedUser.id}
      />
      <MainHeader>
        <Title subtitle="Controle acesso, perfil, filas e status operacional da equipe.">{i18n.t("users.title")}</Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenUserModal}
          >
            {i18n.t("users.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <ListToolbar>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Pesquisar por nome, CPF ou e-mail"
          type="search"
          value={searchParam}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </ListToolbar>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{i18n.t("users.table.name")}</TableCell>
              <TableCell align="center">
                CPF / E-mail
              </TableCell>
              <TableCell align="center">
                {i18n.t("users.table.profile")}
              </TableCell>
              <TableCell align="center">
                Cargo
              </TableCell>
              <TableCell align="center">
                Acesso
              </TableCell>
              <TableCell align="center">
                Status
              </TableCell>
              <TableCell align="center">
                {i18n.t("users.table.whatsapp")}
              </TableCell>              
              <TableCell align="center">
                {i18n.t("users.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell align="center">{user.name}</TableCell>
                  <TableCell align="center">
                    <div>{user.cpf || "-"}</div>
                    {user.email && (
                      <small style={{ color: "#64748B" }}>{user.email}</small>
                    )}
                  </TableCell>
                  <TableCell align="center">{user.profileName || profileLabels[user.profile] || user.profile}</TableCell>
                  <TableCell align="center">{user.jobTitle || "-"}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={user.active === false ? accountStatusLabels.inactive : accountStatusLabels.active}
                      style={{
                        backgroundColor: user.active === false ? accountStatusColors.inactive : accountStatusColors.active,
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={statusLabels[user.operationalStatus] || "Offline"}
                      style={{
                        backgroundColor: statusColors[user.operationalStatus] || statusColors.offline,
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">{user.whatsapp?.name}</TableCell>
                  <TableCell align="center">
                    {!(isSupervisor && user.profile === "admin") && (
                      <IconButton
                        size="small"
                        onClick={() => handleEditUser(user)}
                      >
                        <EditIcon />
                      </IconButton>
                    )}

                    {canResetPassword && !(loggedInUser?.profile !== "admin" && user.profile === "admin") && (
                      <IconButton
                        size="small"
                        onClick={() => handleResetPassword(user)}
                        title="Resetar senha"
                      >
                        <VpnKeyIcon />
                      </IconButton>
                    )}

                    {!(isSupervisor && (user.profile === "admin" || Number(user.id) === Number(loggedInUser?.id))) && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setConfirmModalOpen(true);
                          setDeletingUser(user);
                        }}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={8} />}
              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState
                      icon={SupervisorAccountIcon}
                      title="Nenhum usuario encontrado"
                      description="Ajuste a busca ou cadastre um novo usuario para a equipe."
                      actionLabel={i18n.t("users.buttons.add")}
                      onAction={handleOpenUserModal}
                    />
                  </TableCell>
                </TableRow>
              )}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Users;
