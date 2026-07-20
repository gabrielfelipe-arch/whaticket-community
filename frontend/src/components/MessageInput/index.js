import React, { useState, useEffect, useContext, useRef } from "react";
import "emoji-mart/css/emoji-mart.css";
import { useParams } from "react-router-dom";
import { Picker } from "emoji-mart";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import InputBase from "@material-ui/core/InputBase";
import CircularProgress from "@material-ui/core/CircularProgress";
import { green } from "@material-ui/core/colors";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import IconButton from "@material-ui/core/IconButton";
import MoreVert from "@material-ui/icons/MoreVert";
import MoodIcon from "@material-ui/icons/Mood";
import SendIcon from "@material-ui/icons/Send";
import CancelIcon from "@material-ui/icons/Cancel";
import ClearIcon from "@material-ui/icons/Clear";
import MicIcon from "@material-ui/icons/Mic";
import FormatBoldIcon from "@material-ui/icons/FormatBold";
import FormatItalicIcon from "@material-ui/icons/FormatItalic";
import FormatQuoteIcon from "@material-ui/icons/FormatQuote";
import CodeIcon from "@material-ui/icons/Code";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import {
  FormControlLabel,
  Hidden,
  Menu,
  MenuItem,
  Switch,
} from "@material-ui/core";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import RecordingTimer from "./RecordingTimer";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import toastError from "../../errors/toastError";

const getSupportedAudioMimeType = () => {
  if (!window.MediaRecorder) return "";

  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg"
  ].find(type => window.MediaRecorder.isTypeSupported(type)) || "";
};

const getAudioExtension = type => {
  if (String(type || "").includes("ogg")) return "ogg";
  return "webm";
};

const getMessageSignature = user => String(user?.messageSignature || user?.name || "").trim();

const useStyles = makeStyles(theme => ({
  mainWrapper: {
    background: theme.palette.background.paper,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderTop: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("sm")]: {
      position: "fixed",
      left: 0,
      right: 0,
      bottom: "calc(64px + env(safe-area-inset-bottom))",
      width: "100%",
      zIndex: theme.zIndex.appBar + 1,
      boxShadow: theme.palette.type === "dark"
        ? "0 -12px 28px rgba(0, 0, 0, 0.28)"
        : "0 -10px 24px rgba(15, 23, 42, 0.10)",
    },
  },

  newMessageBox: {
    background: theme.palette.background.paper,
    width: "100%",
    display: "flex",
    padding: theme.spacing(1.25),
    alignItems: "center",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(0.75, 0.75),
      minHeight: 58,
    },
  },

  messageInputWrapper: {
    padding: theme.spacing(0.75, 1.25),
    marginRight: 7,
    background: theme.palette.type === "dark" ? "#0B1220" : "#F8FAFC",
    display: "flex",
    borderRadius: 8,
    flex: 1,
    position: "relative",
    border: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("sm")]: {
      marginRight: 4,
      padding: theme.spacing(0.5, 0.75),
    },
  },

  messageInput: {
    paddingLeft: 10,
    flex: 1,
    border: "none",
    [theme.breakpoints.down("sm")]: {
      fontSize: 15,
      lineHeight: 1.35,
    },
  },

  sendMessageIcons: {
    color: theme.palette.text.secondary,
  },

  uploadInput: {
    display: "none",
  },

  viewMediaInputWrapper: {
    display: "flex",
    padding: "10px 13px",
    position: "relative",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(0.75, 1),
      bottom: "calc(64px + env(safe-area-inset-bottom))",
    },
  },

  mediaPreviewContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.75),
    minWidth: 0,
  },

  mediaPreviewLabel: {
    color: theme.palette.text.secondary,
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  mediaCaptionInput: {
    padding: theme.spacing(0.75, 1.25),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.type === "dark" ? "#0B1220" : "#F8FAFC",
  },

  emojiBox: {
    position: "absolute",
    bottom: 63,
    width: 40,
    borderTop: "1px solid #e8e8e8",
  },

  circleLoading: {
    color: green[500],
    opacity: "70%",
    position: "absolute",
    top: "20%",
    left: "50%",
    marginLeft: -12,
  },

  audioLoading: {
    color: green[500],
    opacity: "70%",
  },

  recorderWrapper: {
    display: "flex",
    alignItems: "center",
    alignContent: "middle",
  },

  cancelAudioIcon: {
    color: "red",
  },

  sendAudioIcon: {
    color: "green",
  },

  replyginMsgWrapper: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingLeft: 73,
    paddingRight: 7,
  },

  replyginMsgContainer: {
    flex: 1,
    marginRight: 5,
    overflowY: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  replyginMsgBody: {
    padding: 10,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  },

  replyginContactMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#35cd96",
  },

  replyginSelfMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#6bcbef",
  },

  messageContactName: {
    display: "flex",
    color: "#6bcbef",
    fontWeight: 500,
  },
  messageQuickAnswersWrapper: {
    margin: 0,
    position: "absolute",
    bottom: "50px",
    background: theme.palette.background.paper,
    padding: "2px",
    border: `1px solid ${theme.palette.divider}`,
    left: 0,
    width: "100%",
    "& li": {
      listStyle: "none",
      "& a": {
        display: "block",
        padding: "8px",
        textOverflow: "ellipsis",
        overflow: "hidden",
        maxHeight: "32px",
        "&:hover": {
          background: "#F1F1F1",
          cursor: "pointer",
        },
      },
    },
  },

  formattingToolbar: {
    position: "absolute",
    bottom: "calc(100% + 6px)",
    left: 8,
    zIndex: 3,
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: "4px 6px",
    borderRadius: 6,
    background: theme.palette.type === "dark" ? "#111827" : "#111827",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.28)",
  },

  formattingButton: {
    width: 30,
    height: 28,
    padding: 4,
    color: "#FFFFFF",
    "&:hover": {
      background: "rgba(255, 255, 255, 0.12)"
    }
  },
}));

const MessageInput = ({ ticketStatus }) => {
  const classes = useStyles();
  const { ticketId } = useParams();

  const [medias, setMedias] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [quickAnswers, setQuickAnswer] = useState([]);
  const [typeBar, setTypeBar] = useState(false);
  const [selectionRange, setSelectionRange] = useState(null);
  const inputRef = useRef();
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const { setReplyingMessage, replyingMessage } =
    useContext(ReplyMessageContext);
  const { user } = useContext(AuthContext);

  const [signMessage, setSignMessage] = useLocalStorage("signOption", true);

  useEffect(() => {
    inputRef.current.focus();
  }, [replyingMessage]);

  useEffect(() => {
    inputRef.current.focus();
    return () => {
      setInputMessage("");
      setShowEmoji(false);
      setMedias([]);
      setReplyingMessage(null);
    };
  }, [ticketId, setReplyingMessage]);

  const handleChangeInput = e => {
    setInputMessage(e.target.value);
    handleLoadQuickAnswer(e.target.value);
  };

  const updateSelectionRange = () => {
    const input = inputRef.current;
    if (!input || input.selectionStart === input.selectionEnd) {
      setSelectionRange(null);
      return;
    }

    setSelectionRange({
      start: input.selectionStart,
      end: input.selectionEnd
    });
  };

  const applyTextFormat = (prefix, suffix = prefix, linePrefix = "") => {
    const input = inputRef.current;
    const range = selectionRange || (
      input && input.selectionStart !== input.selectionEnd
        ? { start: input.selectionStart, end: input.selectionEnd }
        : null
    );

    if (!range) return;

    const selected = inputMessage.slice(range.start, range.end);
    const replacement = linePrefix
      ? selected.split("\n").map(line => `${linePrefix}${line}`).join("\n")
      : `${prefix}${selected}${suffix}`;
    const nextMessage = `${inputMessage.slice(0, range.start)}${replacement}${inputMessage.slice(range.end)}`;
    const nextCursor = range.start + replacement.length;

    setInputMessage(nextMessage);
    setSelectionRange(null);
    setTimeout(() => {
      input?.focus();
      input?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const renderFormattingToolbar = () => {
    if (!selectionRange || loading || recording || ticketStatus !== "open") return null;

    return (
      <div className={classes.formattingToolbar}>
        <IconButton size="small" className={classes.formattingButton} title="Negrito" onMouseDown={event => event.preventDefault()} onClick={() => applyTextFormat("*")}>
          <FormatBoldIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" className={classes.formattingButton} title="Italico" onMouseDown={event => event.preventDefault()} onClick={() => applyTextFormat("_")}>
          <FormatItalicIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" className={classes.formattingButton} title="Tachado" onMouseDown={event => event.preventDefault()} onClick={() => applyTextFormat("~")}>
          <span style={{ fontWeight: 700, textDecoration: "line-through" }}>S</span>
        </IconButton>
        <IconButton size="small" className={classes.formattingButton} title="Codigo" onMouseDown={event => event.preventDefault()} onClick={() => applyTextFormat("`")}>
          <CodeIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" className={classes.formattingButton} title="Citacao" onMouseDown={event => event.preventDefault()} onClick={() => applyTextFormat("", "", "> ")}>
          <FormatQuoteIcon fontSize="small" />
        </IconButton>
      </div>
    );
  };

  const handleQuickAnswersClick = async quickAnswer => {
    setInputMessage(quickAnswer.message);
    if (quickAnswer.mediaUrl) {
      try {
        const mediaPath = quickAnswer.mediaUrl.startsWith("http")
          ? quickAnswer.mediaUrl
          : `http://localhost:8085/public/${quickAnswer.mediaUrl}`;
        const response = await fetch(mediaPath);
        const blob = await response.blob();
        const file = new File([blob], quickAnswer.mediaName || "anexo", {
          type: quickAnswer.mediaType || blob.type
        });
        setMedias([file]);
      } catch (err) {
        toastError(err);
      }
    }
    setTypeBar(false);
  };

  const handleAddEmoji = e => {
    let emoji = e.native;
    setInputMessage(prevState => prevState + emoji);
  };

  const handleChangeMedias = e => {
    if (!e.target.files) {
      return;
    }

    const selectedMedias = Array.from(e.target.files);
    setMedias(selectedMedias);
  };

  const handleInputPaste = e => {
    if (e.clipboardData.files[0]) {
      setMedias([e.clipboardData.files[0]]);
    }
  };

  const handleUploadMedia = async e => {
    setLoading(true);
    e.preventDefault();

    const formData = new FormData();
    const caption = inputMessage.trim();
    const signature = getMessageSignature(user);
    const signedCaption = caption && signMessage && signature
      ? `*${signature}:*\n${caption}`
      : caption;

    formData.append("fromMe", true);
    formData.append("body", signedCaption);
    medias.forEach(media => {
      formData.append("medias", media);
    });

    try {
      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
    }

    setLoading(false);
    setMedias([]);
    setInputMessage("");
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;
    setLoading(true);

    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: signMessage && getMessageSignature(user)
        ? `*${getMessageSignature(user)}:*\n${inputMessage.trim()}`
        : inputMessage.trim(),
      quotedMsg: replyingMessage,
    };
    try {
      await api.post(`/messages/${ticketId}`, message);
    } catch (err) {
      toastError(err);
    }

    setInputMessage("");
    setShowEmoji(false);
    setLoading(false);
    setReplyingMessage(null);
  };

  const handleStartRecording = async () => {
    setLoading(true);
    try {
      if (!window.isSecureContext) {
        throw new Error("Para o navegador pedir permissao do microfone, acesse o sistema por HTTPS. Em HTTP por IP o microfone e bloqueado.");
      }

      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error("Seu navegador nao permite gravar audio nesta conexao. Use HTTPS ou acesse por localhost.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      audioChunksRef.current = [];
      audioStreamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data?.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      setRecording(true);
      setLoading(false);
    } catch (err) {
      if (err?.name === "NotAllowedError") {
        toastError(new Error("Permissao do microfone negada. Libere o microfone no navegador e tente novamente."));
      } else if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
        toastError(new Error("O navegador bloqueia microfone em HTTP por IP. Acesse o sistema por HTTPS para gravar audios."));
      } else {
        toastError(err);
      }
      setLoading(false);
    }
  };

  const handleLoadQuickAnswer = async value => {
    if (value && value.indexOf("/") === 0) {
      try {
        const { data } = await api.get("/quickAnswers/", {
          params: { searchParam: inputMessage.substring(1) },
        });
        setQuickAnswer(data.quickAnswers);
        if (data.quickAnswers.length > 0) {
          setTypeBar(true);
        } else {
          setTypeBar(false);
        }
      } catch (err) {
        setTypeBar(false);
      }
    } else {
      setTypeBar(false);
    }
  };

  const handleUploadAudio = async () => {
    setLoading(true);
    try {
      const recorder = recorderRef.current;
      if (!recorder) {
        throw new Error("Gravador de audio nao iniciado.");
      }

      const blob = await new Promise((resolve, reject) => {
        recorder.onstop = () => {
          const type = recorder.mimeType || "audio/webm";
          resolve(new Blob(audioChunksRef.current, { type }));
        };
        recorder.onerror = event => reject(event.error || new Error("Erro ao finalizar audio."));
        recorder.stop();
      });

      audioStreamRef.current?.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
      recorderRef.current = null;

      if (blob.size < 10000) {
        setLoading(false);
        setRecording(false);
        return;
      }

      const formData = new FormData();
      const extension = getAudioExtension(blob.type);
      const filename = `${new Date().getTime()}.${extension}`;
      formData.append("medias", blob, filename);
      formData.append("body", "");
      formData.append("fromMe", true);

      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
    }

    setRecording(false);
    setLoading(false);
  };

  const handleCancelAudio = async () => {
    try {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      audioStreamRef.current?.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
      recorderRef.current = null;
      audioChunksRef.current = [];
      setRecording(false);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenMenuClick = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuItemClick = event => {
    setAnchorEl(null);
  };

  const renderReplyingMessage = message => {
    return (
      <div className={classes.replyginMsgWrapper}>
        <div className={classes.replyginMsgContainer}>
          <span
            className={clsx(classes.replyginContactMsgSideColor, {
              [classes.replyginSelfMsgSideColor]: !message.fromMe,
            })}
          ></span>
          <div className={classes.replyginMsgBody}>
            {!message.fromMe && (
              <span className={classes.messageContactName}>
                {message.contact?.name}
              </span>
            )}
            {message.body}
          </div>
        </div>
        <IconButton
          aria-label="showRecorder"
          component="span"
          disabled={loading || ticketStatus !== "open"}
          onClick={() => setReplyingMessage(null)}
        >
          <ClearIcon className={classes.sendMessageIcons} />
        </IconButton>
      </div>
    );
  };

  if (medias.length > 0)
    return (
      <Paper elevation={0} square className={classes.viewMediaInputWrapper}>
        <IconButton
          aria-label="cancel-upload"
          component="span"
          onClick={e => setMedias([])}
        >
          <CancelIcon className={classes.sendMessageIcons} />
        </IconButton>

        {loading ? (
          <div>
            <CircularProgress className={classes.circleLoading} />
          </div>
        ) : (
          <div className={classes.mediaPreviewContent}>
            <span className={classes.mediaPreviewLabel}>
              {medias.length > 1 ? `${medias.length} anexos selecionados` : "Anexo selecionado"}
            </span>
            <InputBase
              inputRef={input => {
                input && input.focus();
                input && (inputRef.current = input);
              }}
              className={classes.mediaCaptionInput}
              placeholder="Escreva uma mensagem para enviar junto"
              multiline
              maxRows={4}
              value={inputMessage}
              onChange={handleChangeInput}
              onSelect={updateSelectionRange}
              onKeyUp={updateSelectionRange}
              onMouseUp={updateSelectionRange}
              disabled={loading || ticketStatus !== "open"}
              onKeyPress={event => {
                if (loading || event.shiftKey) return;
                if (event.key === "Enter") {
                  handleUploadMedia(event);
                }
              }}
            />
          </div>
        )}
        <IconButton
          aria-label="send-upload"
          component="span"
          onClick={handleUploadMedia}
          disabled={loading}
        >
          <SendIcon className={classes.sendMessageIcons} />
        </IconButton>
      </Paper>
    );
  else {
    return (
      <Paper square elevation={0} className={classes.mainWrapper}>
        {replyingMessage && renderReplyingMessage(replyingMessage)}
        <div className={classes.newMessageBox}>
          <Hidden only={["sm", "xs"]}>
            <IconButton
              aria-label="emojiPicker"
              component="span"
              disabled={loading || recording || ticketStatus !== "open"}
              onClick={e => setShowEmoji(prevState => !prevState)}
            >
              <MoodIcon className={classes.sendMessageIcons} />
            </IconButton>
            {showEmoji ? (
              <div className={classes.emojiBox}>
                <ClickAwayListener onClickAway={e => setShowEmoji(false)}>
                  <Picker
                    perLine={16}
                    showPreview={false}
                    showSkinTones={false}
                    onSelect={handleAddEmoji}
                  />
                </ClickAwayListener>
              </div>
            ) : null}

            <input
              multiple
              type="file"
              id="upload-button"
              disabled={loading || recording || ticketStatus !== "open"}
              className={classes.uploadInput}
              onChange={handleChangeMedias}
            />
            <label htmlFor="upload-button">
              <IconButton
                aria-label="upload"
                component="span"
                disabled={loading || recording || ticketStatus !== "open"}
              >
                <AttachFileIcon className={classes.sendMessageIcons} />
              </IconButton>
            </label>
            <FormControlLabel
              style={{ marginRight: 7, color: "gray" }}
              label={i18n.t("messagesInput.signMessage")}
              labelPlacement="start"
              control={
                <Switch
                  size="small"
                  checked={signMessage}
                  onChange={e => {
                    setSignMessage(e.target.checked);
                  }}
                  name="showAllTickets"
                  color="primary"
                />
              }
            />
          </Hidden>
          <Hidden only={["md", "lg", "xl"]}>
            <IconButton
              aria-controls="simple-menu"
              aria-haspopup="true"
              onClick={handleOpenMenuClick}
            >
              <MoreVert></MoreVert>
            </IconButton>
            <Menu
              id="simple-menu"
              keepMounted
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuItemClick}
            >
              <MenuItem onClick={handleMenuItemClick}>
                <IconButton
                  aria-label="emojiPicker"
                  component="span"
                  disabled={loading || recording || ticketStatus !== "open"}
                  onClick={e => setShowEmoji(prevState => !prevState)}
                >
                  <MoodIcon className={classes.sendMessageIcons} />
                </IconButton>
              </MenuItem>
              <MenuItem onClick={handleMenuItemClick}>
                <input
                  multiple
                  type="file"
                  id="upload-button"
                  disabled={loading || recording || ticketStatus !== "open"}
                  className={classes.uploadInput}
                  onChange={handleChangeMedias}
                />
                <label htmlFor="upload-button">
                  <IconButton
                    aria-label="upload"
                    component="span"
                    disabled={loading || recording || ticketStatus !== "open"}
                  >
                    <AttachFileIcon className={classes.sendMessageIcons} />
                  </IconButton>
                </label>
              </MenuItem>
              <MenuItem onClick={handleMenuItemClick}>
                <FormControlLabel
                  style={{ marginRight: 7, color: "gray" }}
                  label={i18n.t("messagesInput.signMessage")}
                  labelPlacement="start"
                  control={
                    <Switch
                      size="small"
                      checked={signMessage}
                      onChange={e => {
                        setSignMessage(e.target.checked);
                      }}
                      name="showAllTickets"
                      color="primary"
                    />
                  }
                />
              </MenuItem>
            </Menu>
          </Hidden>
          <div className={classes.messageInputWrapper}>
            {renderFormattingToolbar()}
            <InputBase
              inputRef={input => {
                input && input.focus();
                input && (inputRef.current = input);
              }}
              className={classes.messageInput}
              placeholder={
                ticketStatus === "open"
                  ? i18n.t("messagesInput.placeholderOpen")
                  : ticketStatus === "pending"
                    ? "Aceite o atendimento para responder."
                    : i18n.t("messagesInput.placeholderClosed")
              }
              multiline
              maxRows={5}
              value={inputMessage}
              onChange={handleChangeInput}
              onSelect={updateSelectionRange}
              onKeyUp={updateSelectionRange}
              onMouseUp={updateSelectionRange}
              disabled={recording || loading || ticketStatus !== "open"}
              onPaste={e => {
                ticketStatus === "open" && handleInputPaste(e);
              }}
              onKeyPress={e => {
                if (loading || e.shiftKey) return;
                else if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
            />
            {typeBar ? (
              <ul className={classes.messageQuickAnswersWrapper}>
                {quickAnswers.map((value, index) => {
                  return (
                    <li
                      className={classes.messageQuickAnswersWrapperItem}
                      key={index}
                    >
                      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                      <a onClick={() => handleQuickAnswersClick(value)}>
                        {`${value.shortcut} - ${value.message}`}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div></div>
            )}
          </div>
          {inputMessage ? (
            <IconButton
              aria-label="sendMessage"
              component="span"
              onClick={handleSendMessage}
              disabled={loading}
            >
              <SendIcon className={classes.sendMessageIcons} />
            </IconButton>
          ) : recording ? (
            <div className={classes.recorderWrapper}>
              <IconButton
                aria-label="cancelRecording"
                component="span"
                fontSize="large"
                disabled={loading}
                onClick={handleCancelAudio}
              >
                <HighlightOffIcon className={classes.cancelAudioIcon} />
              </IconButton>
              {loading ? (
                <div>
                  <CircularProgress className={classes.audioLoading} />
                </div>
              ) : (
                <RecordingTimer />
              )}

              <IconButton
                aria-label="sendRecordedAudio"
                component="span"
                onClick={handleUploadAudio}
                disabled={loading}
              >
                <CheckCircleOutlineIcon className={classes.sendAudioIcon} />
              </IconButton>
            </div>
          ) : (
            <IconButton
              aria-label="showRecorder"
              component="span"
              disabled={loading || ticketStatus !== "open"}
              onClick={handleStartRecording}
            >
              <MicIcon className={classes.sendMessageIcons} />
            </IconButton>
          )}
        </div>
      </Paper>
    );
  }
};

export default MessageInput;
