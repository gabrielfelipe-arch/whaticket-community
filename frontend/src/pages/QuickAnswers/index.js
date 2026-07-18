import React, { useContext, useState, useEffect, useReducer } from "react";
import openSocket from "../../services/socket-io";

import {
  Button,
  IconButton,
  makeStyles,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  InputAdornment,
  TextField,
  Chip,
} from "@material-ui/core";
import { Edit, DeleteOutline, Forum } from "@material-ui/icons";
import SearchIcon from "@material-ui/icons/Search";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import QuickAnswersModal from "../../components/QuickAnswersModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { EmptyState, ListToolbar } from "../../components/ExecutiveLayout";

const asBoolean = value =>
  value === true || value === "true" || value === "1" || value === 1;

const normalizeQuickAnswer = quickAnswer => ({
  ...quickAnswer,
  global: asBoolean(quickAnswer?.global),
});

const reducer = (state, action) => {
  if (action.type === "LOAD_QUICK_ANSWERS") {
    const quickAnswers = action.payload.map(normalizeQuickAnswer);
    const newQuickAnswers = [];

    quickAnswers.forEach((quickAnswer) => {
      const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswer.id);
      if (quickAnswerIndex !== -1) {
        state[quickAnswerIndex] = quickAnswer;
      } else {
        newQuickAnswers.push(quickAnswer);
      }
    });

    return [...state, ...newQuickAnswers];
  }

  if (action.type === "UPDATE_QUICK_ANSWERS") {
    const quickAnswer = normalizeQuickAnswer(action.payload);
    const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswer.id);

    if (quickAnswerIndex !== -1) {
      state[quickAnswerIndex] = quickAnswer;
      return [...state];
    } else {
      return [quickAnswer, ...state];
    }
  }

  if (action.type === "DELETE_QUICK_ANSWERS") {
    const quickAnswerId = action.payload;

    const quickAnswerIndex = state.findIndex((q) => q.id === quickAnswerId);
    if (quickAnswerIndex !== -1) {
      state.splice(quickAnswerIndex, 1);
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

const QuickAnswers = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [quickAnswers, dispatch] = useReducer(reducer, []);
  const [selectedQuickAnswers, setSelectedQuickAnswers] = useState(null);
  const [quickAnswersModalOpen, setQuickAnswersModalOpen] = useState(false);
  const [deletingQuickAnswers, setDeletingQuickAnswers] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchQuickAnswers = async () => {
        try {
          const { data } = await api.get("/quickAnswers/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_QUICK_ANSWERS", payload: data.quickAnswers });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchQuickAnswers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("quickAnswer", (data) => {
      if (data.action === "update" || data.action === "create") {
        if (isVisibleQuickAnswer(data.quickAnswer)) {
          dispatch({ type: "UPDATE_QUICK_ANSWERS", payload: data.quickAnswer });
        } else {
          dispatch({
            type: "DELETE_QUICK_ANSWERS",
            payload: +data.quickAnswer.id,
          });
        }
      }

      if (data.action === "delete") {
        dispatch({
          type: "DELETE_QUICK_ANSWERS",
          payload: +data.quickAnswerId,
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const isVisibleQuickAnswer = quickAnswer =>
    user?.profile === "admin" ||
    asBoolean(quickAnswer.global) ||
    Number(quickAnswer.userId) === Number(user?.id);

  const canEditQuickAnswer = quickAnswer =>
    user?.profile === "admin" ||
    Number(quickAnswer.userId) === Number(user?.id);

  const canDeleteQuickAnswer = quickAnswer =>
    user?.profile === "admin" ||
    (!asBoolean(quickAnswer.global) && Number(quickAnswer.userId) === Number(user?.id));

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenQuickAnswersModal = () => {
    setSelectedQuickAnswers(null);
    setQuickAnswersModalOpen(true);
  };

  const handleCloseQuickAnswersModal = () => {
    setSelectedQuickAnswers(null);
    setQuickAnswersModalOpen(false);
  };

  const handleEditQuickAnswers = (quickAnswer) => {
    setSelectedQuickAnswers(quickAnswer);
    setQuickAnswersModalOpen(true);
  };

  const handleDeleteQuickAnswers = async (quickAnswerId) => {
    try {
      await api.delete(`/quickAnswers/${quickAnswerId}`);
      toast.success(i18n.t("quickAnswers.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingQuickAnswers(null);
    setSearchParam("");
    setPageNumber(1);
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
          deletingQuickAnswers &&
          `${i18n.t("quickAnswers.confirmationModal.deleteTitle")} ${
            deletingQuickAnswers.shortcut
          }?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteQuickAnswers(deletingQuickAnswers.id)}
      >
        {i18n.t("quickAnswers.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <QuickAnswersModal
        open={quickAnswersModalOpen}
        onClose={handleCloseQuickAnswersModal}
        aria-labelledby="form-dialog-title"
        quickAnswerId={selectedQuickAnswers && selectedQuickAnswers.id}
      ></QuickAnswersModal>
      <MainHeader>
        <Title subtitle="Padronize respostas frequentes e reduza tempo de atendimento.">{i18n.t("quickAnswers.title")}</Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenQuickAnswersModal}
          >
            {i18n.t("quickAnswers.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <ListToolbar>
        <TextField
          variant="outlined"
          size="small"
          placeholder={i18n.t("quickAnswers.searchPlaceholder")}
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
              <TableCell align="center">
                {i18n.t("quickAnswers.table.shortcut")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("quickAnswers.table.message")}
              </TableCell>
              <TableCell align="center">Visibilidade</TableCell>
              <TableCell align="center">Criada por</TableCell>
              <TableCell align="center">
                {i18n.t("quickAnswers.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {quickAnswers.map((quickAnswer) => (
                <TableRow key={quickAnswer.id}>
                  <TableCell align="center">{quickAnswer.shortcut}</TableCell>
                  <TableCell align="center">{quickAnswer.message}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      color={asBoolean(quickAnswer.global) ? "primary" : "default"}
                      label={asBoolean(quickAnswer.global) ? "Publica" : "Privada"}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {quickAnswer.user?.name || (asBoolean(quickAnswer.global) ? "Administrador" : "")}
                  </TableCell>
                  <TableCell align="center">
                    {(canEditQuickAnswer(quickAnswer) || canDeleteQuickAnswer(quickAnswer)) && (
                      <>
                        {canEditQuickAnswer(quickAnswer) && (
                          <IconButton
                            size="small"
                            onClick={() => handleEditQuickAnswers(quickAnswer)}
                          >
                            <Edit />
                          </IconButton>
                        )}

                        {canDeleteQuickAnswer(quickAnswer) && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setConfirmModalOpen(true);
                              setDeletingQuickAnswers(quickAnswer);
                            }}
                          >
                            <DeleteOutline />
                          </IconButton>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={5} />}
              {!loading && quickAnswers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState
                      icon={Forum}
                      title="Nenhuma resposta rapida encontrada"
                      description="Cadastre atalhos para mensagens usadas com frequencia pela equipe."
                      actionLabel={i18n.t("quickAnswers.buttons.add")}
                      onAction={handleOpenQuickAnswersModal}
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

export default QuickAnswers;
