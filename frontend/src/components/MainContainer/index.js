import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    flex: 1,
    padding: theme.spacing(2, 3, 3),
    height: "100%",
    background: theme.palette.background.default,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5, 2, 2),
    },
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(1),
    },
  },

  contentWrapper: {
    height: "100%",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    ...theme.scrollbarStyles,
  },
}));

const MainContainer = ({ children }) => {
  const classes = useStyles();

  return (
    <Container className={classes.mainContainer} maxWidth={false}>
      <div className={classes.contentWrapper}>{children}</div>
    </Container>
  );
};

export default MainContainer;
