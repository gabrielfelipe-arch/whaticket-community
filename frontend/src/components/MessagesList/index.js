import React, { useState, useEffect, useLayoutEffect, useReducer, useRef } from "react";

import { isSameDay, parseISO, format } from "date-fns";
import openSocket from "../../services/socket-io";
import clsx from "clsx";

import { green } from "@material-ui/core/colors";
import {
  Button,
  CircularProgress,
  Divider,
  IconButton,
  makeStyles,
} from "@material-ui/core";
import {
  AccessTime,
  Block,
  Done,
  DoneAll,
  ExpandMore,
  GetApp,
} from "@material-ui/icons";

import MarkdownWrapper from "../MarkdownWrapper";
import VcardPreview from "../VcardPreview";
import LocationPreview from "../LocationPreview";
import ModalImageCors from "../ModalImageCors";
import MessageOptionsMenu from "../MessageOptionsMenu";
import whatsBackground from "../../assets/wa-background.png";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import Audio from "../Audio";

const useStyles = makeStyles((theme) => ({
  messagesListWrapper: {
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minHeight: 0,
  },

  messagesList: {
    backgroundImage:
      theme.palette.type === "dark"
        ? "none"
        : `linear-gradient(rgba(248, 250, 252, 0.92), rgba(244, 247, 251, 0.94)), url(${whatsBackground})`,
    backgroundColor: theme.palette.type === "dark" ? "#0B1220" : "#F6F8FB",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minHeight: 0,
    padding: "26px 28px",
    overflowY: "scroll",
    [theme.breakpoints.down("sm")]: {
      padding: "18px 12px",
      paddingBottom: "calc(156px + env(safe-area-inset-bottom))",
    },
    ...theme.scrollbarStyles,
  },

  circleLoading: {
    color: green[500],
    position: "absolute",
    opacity: "70%",
    top: 0,
    left: "50%",
    marginTop: 12,
  },

  messageLeft: {
    marginRight: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },

    whiteSpace: "pre-wrap",
    backgroundColor: "#ffffff",
    color: "#303030",
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 8,
    paddingBottom: 3,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.palette.type === "dark"
      ? "0 10px 24px rgba(0,0,0,0.18)"
      : "0 8px 20px rgba(15,23,42,0.06)",
  },

  quotedContainerLeft: {
    margin: "-3px -80px 6px -6px",
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  quotedMsg: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  },

  quotedSideColorLeft: {
    flex: "none",
    width: "4px",
    backgroundColor: "#6bcbef",
  },

  messageRight: {
    marginLeft: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },

    whiteSpace: "pre-wrap",
    backgroundColor: theme.palette.type === "dark" ? "#0F2A24" : "#DCFCE7",
    color: theme.palette.type === "dark" ? "#E2E8F0" : "#0F172A",
    alignSelf: "flex-end",
    borderRadius: 10,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 8,
    paddingBottom: 3,
    border: "1px solid rgba(34, 197, 94, 0.24)",
    boxShadow: theme.palette.type === "dark"
      ? "0 10px 24px rgba(0,0,0,0.18)"
      : "0 8px 20px rgba(15,23,42,0.06)",
  },

  quotedContainerRight: {
    margin: "-3px -80px 6px -6px",
    overflowY: "hidden",
    backgroundColor: "#cfe9ba",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  quotedMsgRight: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    whiteSpace: "pre-wrap",
  },

  quotedSideColorRight: {
    flex: "none",
    width: "4px",
    backgroundColor: "#35cd96",
  },

  messageActionsButton: {
    display: "none",
    position: "relative",
    color: "#999",
    zIndex: 1,
    backgroundColor: "inherit",
    opacity: "90%",
    "&:hover, &.Mui-focusVisible": { backgroundColor: "inherit" },
  },

  messageContactName: {
    display: "flex",
    color: "#6bcbef",
    fontWeight: 500,
  },

  textContentItem: {
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  textContentItemDeleted: {
    fontStyle: "italic",
    color: "rgba(0, 0, 0, 0.36)",
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  messageMedia: {
    objectFit: "cover",
    width: 250,
    height: 200,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },

  timestamp: {
    fontSize: 11,
    position: "absolute",
    bottom: 0,
    right: 5,
    color: theme.palette.text.secondary,
  },

  reactionsBubble: {
    position: "absolute",
    bottom: -16,
    right: 8,
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    padding: "1px 6px",
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.4,
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
    zIndex: 2,
  },

  dailyTimestamp: {
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: "110px",
    backgroundColor: theme.palette.type === "dark" ? "#111A2E" : "#E0F2FE",
    margin: "10px",
    borderRadius: "10px",
    boxShadow: theme.palette.type === "dark"
      ? "0 8px 18px rgba(0,0,0,0.18)"
      : "0 8px 18px rgba(15,23,42,0.06)",
  },

  dailyTimestampText: {
    color: theme.palette.type === "dark" ? "#BAE6FD" : "#0369A1",
    padding: 8,
    alignSelf: "center",
    marginLeft: "0px",
  },

  ackIcons: {
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },

  deletedIcon: {
    fontSize: 18,
    verticalAlign: "middle",
    marginRight: 4,
  },

  ackDoneAllIcon: {
    color: green[500],
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },

  downloadMedia: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "inherit",
    padding: 10,
  },

  historyBar: {
    alignSelf: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
    padding: "8px 12px",
    borderRadius: 8,
    backgroundColor: theme.palette.type === "dark" ? "#111A2E" : "#FFFFFF",
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.palette.type === "dark"
      ? "0 8px 18px rgba(0,0,0,0.18)"
      : "0 8px 18px rgba(15,23,42,0.06)",
  },

  historyDivider: {
    alignSelf: "center",
    width: "100%",
    margin: "16px 0 12px",
    padding: "8px 12px",
    borderRadius: 0,
    textAlign: "center",
    fontSize: 13,
    fontWeight: 600,
    color: theme.palette.type === "dark" ? "#BAE6FD" : "#0369A1",
    backgroundColor: theme.palette.type === "dark" ? "#111A2E" : "#E0F2FE",
    border: `1px solid ${theme.palette.divider}`,
  },

  historyMeta: {
    display: "block",
    marginTop: 2,
    fontSize: 11,
    fontWeight: 400,
    color: theme.palette.text.secondary,
  },
  scheduledReturnCard: {
    alignSelf: "center",
    width: "min(640px, 100%)",
    margin: "8px 0 14px",
    padding: "12px 14px 10px 14px",
    borderRadius: 8,
    border: theme.palette.type === "dark"
      ? "1px solid rgba(251, 146, 60, 0.34)"
      : "1px solid #FED7AA",
    borderLeft: "5px solid #F97316",
    background: theme.palette.type === "dark"
      ? "rgba(154, 52, 18, 0.22)"
      : "#FFF7ED",
    color: theme.palette.type === "dark" ? "#FFEDD5" : "#7C2D12",
    boxShadow: theme.palette.type === "dark"
      ? "0 12px 26px rgba(0,0,0,0.22)"
      : "0 10px 24px rgba(124,45,18,0.08)",
    position: "relative",
  },
  scheduledReturnTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 800,
    marginBottom: 8,
  },
  scheduledReturnDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#F97316",
    boxShadow: "0 0 0 4px rgba(249, 115, 22, 0.14)",
    flexShrink: 0,
  },
  scheduledReturnLine: {
    fontSize: 13,
    lineHeight: 1.45,
    marginTop: 4,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  },
  scheduledReturnLabel: {
    fontWeight: 800,
  },
  scheduledReturnTimestamp: {
    display: "block",
    marginTop: 8,
    textAlign: "right",
    fontSize: 11,
    color: theme.palette.type === "dark" ? "#FDBA74" : "#9A3412",
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_MESSAGES") {
    const messages = action.payload;
    const newMessages = [];

    messages.forEach((message) => {
      const messageIndex = state.findIndex((m) => m.id === message.id);
      if (messageIndex !== -1) {
        state[messageIndex] = message;
      } else {
        newMessages.push(message);
      }
    });

    return [...newMessages, ...state];
  }

  if (action.type === "ADD_MESSAGE") {
    const newMessage = action.payload;
    const messageIndex = state.findIndex((m) => m.id === newMessage.id);

    if (messageIndex !== -1) {
      state[messageIndex] = newMessage;
    } else {
      state.push(newMessage);
    }

    return [...state];
  }

  if (action.type === "UPDATE_MESSAGE") {
    const messageToUpdate = action.payload;
    const messageIndex = state.findIndex((m) => m.id === messageToUpdate.id);

    if (messageIndex !== -1) {
      state[messageIndex] = messageToUpdate;
    }

    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const MessagesList = ({ ticketId, isGroup }) => {
  const classes = useStyles();

  const [messagesList, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyGroups, setHistoryGroups] = useState([]);
  const [historyPageNumber, setHistoryPageNumber] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const lastMessageRef = useRef();
  const messagesListRef = useRef();
  const preserveScrollRef = useRef(null);

  const [selectedMessage, setSelectedMessage] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const messageOptionsMenuOpen = Boolean(anchorEl);
  const currentTicketId = useRef(ticketId);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
    setHistoryGroups([]);
    setHistoryPageNumber(1);
    setHasMoreHistory(true);
    preserveScrollRef.current = null;

    currentTicketId.current = ticketId;
  }, [ticketId]);

  useLayoutEffect(() => {
    const scrollState = preserveScrollRef.current;
    const messagesListElement = messagesListRef.current;

    if (!scrollState || !messagesListElement) return;

    const heightDiff = messagesListElement.scrollHeight - scrollState.scrollHeight;
    messagesListElement.scrollTop = scrollState.scrollTop + heightDiff;
    preserveScrollRef.current = null;
  }, [historyGroups]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchMessages = async () => {
        try {
          const { data } = await api.get("/messages/" + ticketId, {
            params: { pageNumber },
          });

          if (currentTicketId.current === ticketId) {
            dispatch({ type: "LOAD_MESSAGES", payload: data.messages });
            setHasMore(data.hasMore);
            setLoading(false);
          }

          if (pageNumber === 1 && data.messages.length > 1) {
            scrollToBottom();
          }
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchMessages();
    }, 500);
    return () => {
      clearTimeout(delayDebounceFn);
    };
  }, [pageNumber, ticketId]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("connect", () => socket.emit("joinChatBox", ticketId));

    socket.on("appMessage", (data) => {
      if (data.action === "create") {
        dispatch({ type: "ADD_MESSAGE", payload: data.message });
        scrollToBottom();
      }

      if (data.action === "update") {
        dispatch({ type: "UPDATE_MESSAGE", payload: data.message });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [ticketId]);

  const loadMore = () => {
    setPageNumber((prevPageNumber) => prevPageNumber + 1);
  };

  const loadPreviousTickets = async () => {
    if (loadingHistory || !hasMoreHistory) return;

    const messagesListElement = messagesListRef.current;
    preserveScrollRef.current = messagesListElement
      ? {
        scrollHeight: messagesListElement.scrollHeight,
        scrollTop: messagesListElement.scrollTop,
      }
      : null;

    setLoadingHistory(true);
    try {
      const { data } = await api.get(`/tickets/${ticketId}/previous-messages`, {
        params: { pageNumber: historyPageNumber },
      });

      if (currentTicketId.current === ticketId) {
        setHistoryGroups(prev => [...(data.groups || []), ...prev]);
        setHasMoreHistory(data.hasMore);
        setHistoryPageNumber(prev => prev + 1);
      }
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
    }
  };

  const handleScroll = (e) => {
    if (!hasMore) return;
    const { scrollTop } = e.currentTarget;

    if (scrollTop === 0) {
      document.getElementById("messagesList").scrollTop = 1;
    }

    if (loading) {
      return;
    }

    if (scrollTop < 50) {
      loadMore();
    }
  };

  const handleOpenMessageOptionsMenu = (e, message) => {
    setAnchorEl(e.currentTarget);
    setSelectedMessage(message);
  };

  const handleCloseMessageOptionsMenu = (e) => {
    setAnchorEl(null);
  };

  const checkMessageMedia = (message) => {
    if (message.mediaType === "location" && message.body.split('|').length >= 2) {
      let locationParts = message.body.split('|')
      let imageLocation = locationParts[0]
      let linkLocation = locationParts[1]

      let descriptionLocation = null

      if (locationParts.length > 2)
        descriptionLocation = message.body.split('|')[2]

      return <LocationPreview image={imageLocation} link={linkLocation} description={descriptionLocation} />
    }
    else if (message.mediaType === "vcard") {
      //console.log("vcard")
      //console.log(message)
      let array = message.body.split("\n");
      let obj = [];
      let contact = "";
      for (let index = 0; index < array.length; index++) {
        const v = array[index];
        let values = v.split(":");
        for (let ind = 0; ind < values.length; ind++) {
          if (values[ind].indexOf("+") !== -1) {
            obj.push({ number: values[ind] });
          }
          if (values[ind].indexOf("FN") !== -1) {
            contact = values[ind + 1];
          }
        }
      }
      return <VcardPreview contact={contact} numbers={obj[0]?.number} />
    }
    /*else if (message.mediaType === "multi_vcard") {
      console.log("multi_vcard")
      console.log(message)
    	
      if(message.body !== null && message.body !== "") {
        let newBody = JSON.parse(message.body)
        return (
          <>
            {
            newBody.map(v => (
              <VcardPreview contact={v.name} numbers={v.number} />
            ))
            }
          </>
        )
      } else return (<></>)
    }*/
    else if (message.mediaUrl && ["image", "sticker"].includes(message.mediaType)) {
      return <ModalImageCors imageUrl={message.mediaUrl} />;
    } else if (["audio", "ptt"].includes(message.mediaType)) {
      return <Audio url={message.mediaUrl} />
    } else if (message.mediaType === "video") {
      return (
        <video
          className={classes.messageMedia}
          src={message.mediaUrl}
          controls
        />
      );
    } else {
      return (
        <>
          <div className={classes.downloadMedia}>
            <Button
              startIcon={<GetApp />}
              color="primary"
              variant="outlined"
              target="_blank"
              href={message.mediaUrl}
              download
            >
              Download
            </Button>
          </div>
          <Divider />
        </>
      );
    }
  };

  const renderMessageAck = (message) => {
    if (message.ack === 0) {
      return <AccessTime fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 1) {
      return <Done fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 2) {
      return <DoneAll fontSize="small" className={classes.ackIcons} />;
    }
    if (message.ack === 3 || message.ack === 4) {
      return <DoneAll fontSize="small" className={classes.ackDoneAllIcon} />;
    }
  };

  const renderDailyTimestamps = (message, index, list, useLastRef = false) => {
    if (index === 0) {
      return (
        <span
          className={classes.dailyTimestamp}
          key={`timestamp-${message.id}`}
        >
          <div className={classes.dailyTimestampText}>
            {format(parseISO(list[index].createdAt), "dd/MM/yyyy")}
          </div>
        </span>
      );
    }
    if (index < list.length - 1) {
      let messageDay = parseISO(list[index].createdAt);
      let previousMessageDay = parseISO(list[index - 1].createdAt);

      if (!isSameDay(messageDay, previousMessageDay)) {
        return (
          <span
            className={classes.dailyTimestamp}
            key={`timestamp-${message.id}`}
          >
            <div className={classes.dailyTimestampText}>
              {format(parseISO(list[index].createdAt), "dd/MM/yyyy")}
            </div>
          </span>
        );
      }
    }
    if (useLastRef && index === list.length - 1) {
      return (
        <div
          key={`ref-${message.createdAt}`}
          ref={lastMessageRef}
          style={{ float: "left", clear: "both" }}
        />
      );
    }
  };

  const renderMessageDivider = (message, index, list) => {
    if (index < list.length && index > 0) {
      let messageUser = list[index].fromMe;
      let previousMessageUser = list[index - 1].fromMe;

      if (messageUser !== previousMessageUser) {
        return (
          <span style={{ marginTop: 16 }} key={`divider-${message.id}`}></span>
        );
      }
    }
  };

  const renderQuotedMessage = (message) => {
    return (
      <div
        className={clsx(classes.quotedContainerLeft, {
          [classes.quotedContainerRight]: message.fromMe,
        })}
      >
        <span
          className={clsx(classes.quotedSideColorLeft, {
            [classes.quotedSideColorRight]: message.quotedMsg?.fromMe,
          })}
        ></span>
        <div className={classes.quotedMsg}>
          {!message.quotedMsg?.fromMe && (
            <span className={classes.messageContactName}>
              {message.quotedMsg?.contact?.name}
            </span>
          )}
          {message.quotedMsg?.body}
        </div>
      </div>
    );
  };

  const renderReactions = message => {
    const reactions = Object.values(message.reactions || {}).filter(Boolean);
    if (!reactions.length) return null;

    return (
      <span className={classes.reactionsBubble}>
        {reactions.slice(0, 4).join(" ")}
        {reactions.length > 4 ? ` +${reactions.length - 4}` : ""}
      </span>
    );
  };

  const isScheduledReturnContext = message =>
    message.senderType === "system" &&
    String(message.body || "").startsWith("Retorno de mensagem agendada.");

  const renderScheduledReturnContext = message => {
    const lines = String(message.body || "")
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);
    const title = lines[0] || "Retorno de mensagem agendada.";
    const details = lines.slice(1);

    return (
      <div className={classes.scheduledReturnCard}>
        <div className={classes.scheduledReturnTitle}>
          <span className={classes.scheduledReturnDot} />
          <strong>{title}</strong>
        </div>
        {details.map((line, index) => {
          const separatorIndex = line.indexOf(":");
          const hasLabel = separatorIndex > 0;

          return (
            <div className={classes.scheduledReturnLine} key={`${message.id}-return-${index}`}>
              {hasLabel ? (
                <>
                  <span className={classes.scheduledReturnLabel}>
                    {line.slice(0, separatorIndex + 1)}
                  </span>{" "}
                  <span>{line.slice(separatorIndex + 1).trim()}</span>
                </>
              ) : (
                <strong>{line}</strong>
              )}
            </div>
          );
        })}
        <span className={classes.scheduledReturnTimestamp}>
          {format(parseISO(message.createdAt), "HH:mm")}
        </span>
      </div>
    );
  };

  const renderMessagesForList = (list, options = {}) => {
    const { readOnly = false, keyPrefix = "message", useLastRef = false } = options;

    if (list.length > 0) {
      const viewMessagesList = list.map((message, index) => {
        if (isScheduledReturnContext(message)) {
          return (
            <React.Fragment key={`${keyPrefix}-${message.id}`}>
              {renderDailyTimestamps(message, index, list, useLastRef)}
              {renderScheduledReturnContext(message)}
            </React.Fragment>
          );
        }

        if (!message.fromMe) {
          return (
            <React.Fragment key={`${keyPrefix}-${message.id}`}>
              {renderDailyTimestamps(message, index, list, useLastRef)}
              {renderMessageDivider(message, index, list)}
              <div className={classes.messageLeft}>
                {!readOnly && (
                  <IconButton
                    variant="contained"
                    size="small"
                    id="messageActionsButton"
                    disabled={message.isDeleted}
                    className={classes.messageActionsButton}
                    onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                  >
                    <ExpandMore />
                  </IconButton>
                )}
                {isGroup && (
                  <span className={classes.messageContactName}>
                    {message.contact?.name}
                  </span>
                )}
                {(message.mediaUrl || message.mediaType === "location" || message.mediaType === "vcard"
                  //|| message.mediaType === "multi_vcard" 
                ) && checkMessageMedia(message)}
                <div className={classes.textContentItem}>
                  {message.quotedMsg && renderQuotedMessage(message)}
                  <MarkdownWrapper>{message.body}</MarkdownWrapper>
                  <span className={classes.timestamp}>
                    {format(parseISO(message.createdAt), "HH:mm")}
                  </span>
                  {renderReactions(message)}
                </div>
              </div>
            </React.Fragment>
          );
        } else {
          return (
            <React.Fragment key={`${keyPrefix}-${message.id}`}>
              {renderDailyTimestamps(message, index, list, useLastRef)}
              {renderMessageDivider(message, index, list)}
              <div className={classes.messageRight}>
                {!readOnly && (
                  <IconButton
                    variant="contained"
                    size="small"
                    id="messageActionsButton"
                    disabled={message.isDeleted}
                    className={classes.messageActionsButton}
                    onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                  >
                    <ExpandMore />
                  </IconButton>
                )}
                {(message.mediaUrl || message.mediaType === "location" || message.mediaType === "vcard"
                  //|| message.mediaType === "multi_vcard" 
                ) && checkMessageMedia(message)}
                <div
                  className={clsx(classes.textContentItem, {
                    [classes.textContentItemDeleted]: message.isDeleted,
                  })}
                >
                  {message.isDeleted && (
                    <Block
                      color="disabled"
                      fontSize="small"
                      className={classes.deletedIcon}
                    />
                  )}
                  {message.quotedMsg && renderQuotedMessage(message)}
                  <MarkdownWrapper>{message.body}</MarkdownWrapper>
                  <span className={classes.timestamp}>
                    {format(parseISO(message.createdAt), "HH:mm")}
                    {renderMessageAck(message)}
                  </span>
                  {renderReactions(message)}
                </div>
              </div>
            </React.Fragment>
          );
        }
      });
      return viewMessagesList;
    } else {
      return null;
    }
  };

  const formatTicketPeriod = (ticket) => {
    const createdAt = ticket?.createdAt ? format(parseISO(ticket.createdAt), "dd/MM/yyyy HH:mm") : "";
    const updatedAt = ticket?.updatedAt ? format(parseISO(ticket.updatedAt), "dd/MM/yyyy HH:mm") : "";
    if (createdAt && updatedAt) return `${createdAt} ate ${updatedAt}`;
    return createdAt || updatedAt;
  };

  const renderHistoryGroups = () => historyGroups.map(group => {
    const glpiText = group.glpiLinks?.length
      ? `GLPI: ${group.glpiLinks.map(link => `#${link.glpiTicketNumber || link.glpiTicketId}`).join(", ")}`
      : "Sem GLPI vinculado";

    return (
      <React.Fragment key={`history-ticket-${group.ticket.id}`}>
        <div className={classes.historyDivider}>
          Atendimento anterior #{group.ticket.id}
          <span className={classes.historyMeta}>
            {formatTicketPeriod(group.ticket)} - {group.ticket.status || "sem status"} - {glpiText}
          </span>
        </div>
        {renderMessagesForList(group.messages || [], {
          readOnly: true,
          keyPrefix: `history-${group.ticket.id}`,
        })}
      </React.Fragment>
    );
  });

  return (
    <div className={classes.messagesListWrapper}>
      <MessageOptionsMenu
        message={selectedMessage}
        isGroup={isGroup}
        anchorEl={anchorEl}
        menuOpen={messageOptionsMenuOpen}
        handleClose={handleCloseMessageOptionsMenu}
      />
      <div
        id="messagesList"
        ref={messagesListRef}
        className={classes.messagesList}
        onScroll={handleScroll}
      >
        <div className={classes.historyBar}>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={loadPreviousTickets}
            disabled={loadingHistory || !hasMoreHistory}
          >
            {loadingHistory
              ? "Carregando historico..."
              : hasMoreHistory
                ? "Carregar historico anterior"
                : "Todo o historico foi carregado"}
          </Button>
        </div>
        {renderHistoryGroups()}
        {historyGroups.length > 0 && (
          <div className={classes.historyDivider}>
            Atendimento atual #{ticketId}
          </div>
        )}
        {messagesList.length > 0
          ? renderMessagesForList(messagesList, { keyPrefix: "current", useLastRef: true })
          : <div>Say hello to your new contact!</div>}
      </div>
      {loading && (
        <div>
          <CircularProgress className={classes.circleLoading} />
        </div>
      )}
    </div>
  );
};

export default MessagesList;
