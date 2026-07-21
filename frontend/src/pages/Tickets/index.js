import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";

import TicketsManager from "../../components/TicketsManager/";
import Ticket from "../../components/Ticket/";
import DraftTicket from "../../components/DraftTicket/";

import { i18n } from "../../translate/i18n";
import Hidden from "@material-ui/core/Hidden";

const useStyles = makeStyles((theme) => ({
  chatContainer: {
    flex: 1,
    minHeight: 0,
    height: `calc(100% - 64px)`,
    overflowY: "hidden",
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(1),
    [theme.breakpoints.down("sm")]: {
      padding: 0,
      height: "100%",
    },
  },

  chatPapper: {
    display: "grid",
    gridTemplateColumns: "clamp(340px, 27vw, 400px) minmax(0, 1fr)",
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    boxShadow: theme.palette.type === "dark"
      ? "0 22px 60px rgba(0,0,0,0.34)"
      : "0 22px 60px rgba(15,23,42,0.10)",
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "minmax(0, 1fr)",
      borderRadius: 0,
    },
  },

  contactsWrapper: {
    display: "flex",
    height: "100%",
    minHeight: 0,
    flexDirection: "column",
    overflowY: "hidden",
    minWidth: 0,
    borderRight: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("sm")]: {
      borderRight: 0,
    },
  },
  contactsWrapperSmall: {
    display: "flex",
    height: "100%",
    minHeight: 0,
    flexDirection: "column",
    overflowY: "hidden",
    minWidth: 0,
    borderRight: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("sm")]: {
      display: "none",
      borderRight: 0,
    },
  },
  messagessWrapper: {
    display: "flex",
    height: "100%",
    minHeight: 0,
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  },
  welcomeMsg: {
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    justifyContent: "space-evenly",
    alignItems: "center",
    height: "100%",
    textAlign: "center",
    borderRadius: 8,
    color: theme.palette.text.secondary,
    fontWeight: 700,
  },
  ticketsManager: {},
  ticketsManagerClosed: {
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
}));

const Chat = () => {
  const classes = useStyles();
  const { ticketId } = useParams();
  const [draftContact, setDraftContact] = useState(null);
  const hasConversation = Boolean(ticketId || draftContact);

  useEffect(() => {
    if (ticketId) setDraftContact(null);
  }, [ticketId]);

  return (
    <div className={classes.chatContainer}>
      <div className={classes.chatPapper}>
          <div
            className={
              hasConversation ? classes.contactsWrapperSmall : classes.contactsWrapper
            }
          >
            <TicketsManager onStartDraft={setDraftContact} />
          </div>
          <div className={classes.messagessWrapper}>
            {ticketId ? (
              <Ticket />
            ) : draftContact ? (
              <DraftTicket contact={draftContact} onClose={() => setDraftContact(null)} />
            ) : (
              <Hidden only={["sm", "xs"]}>
                <Paper className={classes.welcomeMsg}>
                  {/* <Paper square variant="outlined" className={classes.welcomeMsg}> */}
                  <span>{i18n.t("chat.noTicketMessage")}</span>
                </Paper>
              </Hidden>
            )}
          </div>
      </div>
    </div>
  );
};

export default Chat;
