import React from "react";

import { Card, IconButton } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import TicketHeaderSkeleton from "../TicketHeaderSkeleton";
import ArrowBackIos from "@material-ui/icons/ArrowBackIos";
import { useHistory } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  ticketHeader: {
    display: "flex",
    backgroundColor: theme.palette.type === "dark" ? "#0F172A" : "#FFFFFF",
    flex: "none",
    borderBottom: `1px solid ${theme.palette.divider}`,
    minHeight: 72,
    alignItems: "center",
    padding: theme.spacing(0, 1),
    boxShadow: theme.palette.type === "dark"
      ? "0 10px 26px rgba(0,0,0,0.22)"
      : "0 10px 26px rgba(15,23,42,0.04)",
    [theme.breakpoints.down("sm")]: {
      flexWrap: "wrap",
    },
  },
  backButton: {
    width: 38,
    height: 38,
    marginRight: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.default,
  },
}));

const TicketHeader = ({ loading, children }) => {
  const classes = useStyles();
  const history = useHistory();
  const handleBack = () => {
    history.push("/tickets");
  };

  return (
    <>
      {loading ? (
        <TicketHeaderSkeleton />
      ) : (
        <Card square className={classes.ticketHeader}>
          <IconButton className={classes.backButton} onClick={handleBack} aria-label="Voltar para lista">
            <ArrowBackIos fontSize="small" />
          </IconButton>
          {children}
        </Card>
      )}
    </>
  );
};

export default TicketHeader;
