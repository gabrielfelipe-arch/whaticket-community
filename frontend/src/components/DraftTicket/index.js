import React from "react";
import { Avatar, CardHeader, makeStyles, Paper } from "@material-ui/core";
import { useHistory } from "react-router-dom";
import PersonOutlineIcon from "@material-ui/icons/PersonOutline";

import MessageInput from "../MessageInput";
import TicketHeader from "../TicketHeader";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
    background: theme.palette.background.paper,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    border: `2px solid ${theme.palette.type === "dark" ? "#1E293B" : "#E0F2FE"}`,
  },
  messages: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.palette.type === "dark" ? "#0B1220" : "#F4F7FB",
  },
}));

const DraftTicket = ({ contact, onClose }) => {
  const classes = useStyles();
  const history = useHistory();
  const number = contact.number;
  const formattedNumber = String(number).startsWith("+") ? number : `+${number}`;

  const handleCreated = ticket => {
    onClose();
    history.push(`/tickets/${ticket.id}`);
  };

  return (
    <Paper square elevation={0} className={classes.root}>
      <TicketHeader loading={false} onBack={onClose}>
        <CardHeader
          className={classes.info}
          titleTypographyProps={{ noWrap: true }}
          subheaderTypographyProps={{ noWrap: true }}
          avatar={(
            <Avatar className={classes.avatar} src={contact.profilePicUrl || undefined}>
              <PersonOutlineIcon />
            </Avatar>
          )}
          title={contact.name || formattedNumber}
          subheader={contact.contactId
            ? formattedNumber
            : i18n.t("newTicketModal.unsavedContact")}
        />
      </TicketHeader>
      <div className={classes.messages} />
      <ReplyMessageProvider>
        <MessageInput
          ticketStatus="open"
          draftNumber={number}
          onDraftCreated={handleCreated}
        />
      </ReplyMessageProvider>
    </Paper>
  );
};

export default DraftTicket;
