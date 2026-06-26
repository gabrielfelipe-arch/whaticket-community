import React, { useState, useContext } from "react";
import { useHistory } from "react-router-dom";

import MenuItem from "@material-ui/core/MenuItem";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import { Box, Menu } from "@material-ui/core";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";

const MessageOptionsMenu = ({ message, isGroup, menuOpen, handleClose, anchorEl }) => {
  const history = useHistory();
  const { setReplyingMessage } = useContext(ReplyMessageContext);
  const { user } = useContext(AuthContext);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  const canDeleteMessage = user?.profile === "admin" || user?.specialPermissions?.deleteMessages === true;

  const handleDeleteMessage = async () => {
    try {
      await api.delete(`/messages/${message.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  const hanldeReplyMessage = () => {
    setReplyingMessage(message);
    handleClose();
  };

  const handleOpenPrivateTicket = async () => {
    const contactId = message?.contact?.id;
    if (!contactId) return;

    try {
      const preferredQueue = user?.queues?.find(queue => queue.glpiEnabled)
        || user?.queues?.find(queue => !queue.useAI)
        || user?.queues?.[0];
      const { data: ticket } = await api.post("/tickets", {
        contactId,
        userId: user?.id,
        status: "open",
        queueId: preferredQueue?.id || null
      });
      handleClose();
      history.push(`/tickets/${ticket.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenConfirmationModal = (e) => {
    setConfirmationOpen(true);
    handleClose();
  };

  const handleReactMessage = async emoji => {
    try {
      await api.post(`/messages/${message.id}/reaction`, { emoji });
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <>
      <ConfirmationModal
        title={i18n.t("messageOptionsMenu.confirmationModal.title")}
        open={confirmationOpen}
        onClose={setConfirmationOpen}
        onConfirm={handleDeleteMessage}
      >
        {i18n.t("messageOptionsMenu.confirmationModal.message")}
      </ConfirmationModal>
      <Menu
        anchorEl={anchorEl}
        getContentAnchorEl={null}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        open={menuOpen}
        onClose={handleClose}
      >
        {message.fromMe && canDeleteMessage && (
          <MenuItem onClick={handleOpenConfirmationModal}>
            {i18n.t("messageOptionsMenu.delete")}
          </MenuItem>
        )}
        <MenuItem onClick={hanldeReplyMessage}>
          {i18n.t("messageOptionsMenu.reply")}
        </MenuItem>
        <Box display="flex" px={1} py={0.5} style={{ gap: 4 }}>
          {reactionEmojis.map(emoji => (
            <MenuItem
              key={emoji}
              dense
              onClick={() => handleReactMessage(emoji)}
              style={{ minWidth: 36, justifyContent: "center", paddingLeft: 8, paddingRight: 8 }}
            >
              {emoji}
            </MenuItem>
          ))}
          <MenuItem
            dense
            onClick={() => handleReactMessage("")}
            style={{ minWidth: 36, justifyContent: "center", paddingLeft: 8, paddingRight: 8 }}
          >
            ×
          </MenuItem>
        </Box>
        {isGroup && !message.fromMe && message.contact?.id && !message.contact?.isGroup && (
          <MenuItem onClick={handleOpenPrivateTicket}>
            Conversar no privado
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default MessageOptionsMenu;
