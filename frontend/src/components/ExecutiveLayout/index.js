import React from "react";
import {
  Button,
  Paper,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import AddIcon from "@material-ui/icons/Add";

const tones = {
  primary: { bg: "rgba(37, 99, 235, 0.12)", color: "#2563EB" },
  success: { bg: "rgba(34, 197, 94, 0.12)", color: "#16A34A" },
  warning: { bg: "rgba(245, 158, 11, 0.14)", color: "#D97706" },
  danger: { bg: "rgba(220, 38, 38, 0.12)", color: "#DC2626" },
  neutral: { bg: "rgba(100, 116, 139, 0.12)", color: "#64748B" },
  purple: { bg: "rgba(124, 58, 237, 0.12)", color: "#7C3AED" },
};

const useStyles = makeStyles(theme => ({
  sectionPanel: {
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    boxShadow: theme.custom?.cardShadow,
    overflow: "hidden",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    padding: theme.spacing(2, 2, 1.25),
    borderBottom: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down("xs")]: {
      flexDirection: "column",
    },
  },
  sectionTitle: {
    fontWeight: 800,
    letterSpacing: 0,
  },
  sectionDescription: {
    marginTop: 2,
    color: theme.palette.text.secondary,
  },
  sectionBody: {
    padding: theme.spacing(2),
  },
  sectionBodyDense: {
    padding: theme.spacing(1.25),
  },
  metricCard: {
    height: "100%",
    padding: theme.spacing(2),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    boxShadow: theme.custom?.cardShadow,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.25),
  },
  metricTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(1),
  },
  metricLabel: {
    color: theme.palette.text.secondary,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: 800,
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 34,
    lineHeight: 1,
    fontWeight: 800,
    color: theme.palette.text.primary,
  },
  metricHelper: {
    color: theme.palette.text.secondary,
    fontSize: 13,
    lineHeight: 1.35,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emptyState: {
    minHeight: 180,
    padding: theme.spacing(4, 2),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: theme.palette.text.secondary,
    borderRadius: 8,
    border: `1px dashed ${theme.palette.divider}`,
    background: theme.palette.type === "dark" ? "rgba(15, 23, 42, 0.48)" : "#F8FAFC",
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(1.5),
    background: theme.custom?.surfaceSoft || theme.palette.background.default,
    color: theme.palette.primary.main,
  },
  emptyTitle: {
    color: theme.palette.text.primary,
    fontWeight: 800,
    marginBottom: theme.spacing(0.5),
  },
  emptyAction: {
    marginTop: theme.spacing(2),
  },
  listToolbar: {
    minHeight: 58,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.25, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    flexWrap: "wrap",
    "& > *": {
      minWidth: 0,
    },
    [theme.breakpoints.down("xs")]: {
      alignItems: "stretch",
      flexDirection: "column",
      "& .MuiTextField-root": {
        width: "100%",
      },
    },
  },
}));

export const SectionPanel = ({ title, description, action, children, dense = false }) => {
  const classes = useStyles();

  return (
    <Paper variant="outlined" className={classes.sectionPanel}>
      {(title || description || action) && (
        <div className={classes.sectionHeader}>
          <div>
            {title && <Typography variant="h6" className={classes.sectionTitle}>{title}</Typography>}
            {description && <Typography variant="body2" className={classes.sectionDescription}>{description}</Typography>}
          </div>
          {action}
        </div>
      )}
      <div className={dense ? classes.sectionBodyDense : classes.sectionBody}>
        {children}
      </div>
    </Paper>
  );
};

export const MetricCard = ({ label, value, helper, icon: Icon, tone = "primary" }) => {
  const classes = useStyles();
  const toneStyle = tones[tone] || tones.primary;

  return (
    <Paper variant="outlined" className={classes.metricCard}>
      <div className={classes.metricTop}>
        <div>
          <Typography className={classes.metricLabel}>{label}</Typography>
          <Typography component="div" className={classes.metricValue}>{value}</Typography>
        </div>
        {Icon && (
          <div className={classes.metricIcon} style={{ backgroundColor: toneStyle.bg, color: toneStyle.color }}>
            <Icon fontSize="small" />
          </div>
        )}
      </div>
      {helper && <Typography className={classes.metricHelper}>{helper}</Typography>}
    </Paper>
  );
};

export const EmptyState = ({ icon: Icon = AddIcon, title, description, actionLabel, onAction }) => {
  const classes = useStyles();

  return (
    <div className={classes.emptyState}>
      <div className={classes.emptyIcon}>
        <Icon />
      </div>
      <Typography variant="subtitle1" className={classes.emptyTitle}>{title}</Typography>
      {description && <Typography variant="body2">{description}</Typography>}
      {actionLabel && onAction && (
        <Button className={classes.emptyAction} color="primary" variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const ListToolbar = ({ children, className = "" }) => {
  const classes = useStyles();
  return <div className={`${classes.listToolbar} ${className}`.trim()}>{children}</div>;
};
