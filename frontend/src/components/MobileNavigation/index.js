import React, { useContext } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  makeStyles
} from "@material-ui/core";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import ContactPhoneOutlinedIcon from "@material-ui/icons/ContactPhoneOutlined";
import DashboardOutlinedIcon from "@material-ui/icons/DashboardOutlined";
import SettingsOutlinedIcon from "@material-ui/icons/SettingsOutlined";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";

import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
  root: {
    display: "none",
    [theme.breakpoints.down("sm")]: {
      display: "block",
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: theme.zIndex.appBar + 2,
      paddingBottom: "env(safe-area-inset-bottom)",
      borderTop: `1px solid ${theme.custom.border}`,
      background: theme.palette.background.paper,
      boxShadow: theme.palette.type === "dark"
        ? "0 -14px 32px rgba(0, 0, 0, 0.30)"
        : "0 -12px 28px rgba(15, 23, 42, 0.10)",
    },
  },
  navigation: {
    height: 64,
    background: theme.palette.background.paper,
  },
  action: {
    minWidth: 0,
    color: theme.palette.text.secondary,
    "&.Mui-selected": {
      color: theme.palette.primary.main,
    },
    "& .MuiBottomNavigationAction-label": {
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 1.15,
      whiteSpace: "nowrap",
    },
  },
}));

const routeValue = pathname => {
  if (pathname.startsWith("/tickets")) return "/tickets";
  if (pathname.startsWith("/contacts")) return "/contacts";
  if (pathname === "/") return "/";
  if (pathname.startsWith("/settings")) return "/settings";
  return "/more";
};

const MobileNavigation = () => {
  const classes = useStyles();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.profile === "admin";
  const isSupervisor = user?.profile === "supervisor";
  const hasPermission = permission => user?.permissions?.[permission] === true;
  const canSeeTickets = hasPermission("tickets.view") || isAdmin || isSupervisor || user?.profile === "user";
  const canSeeContacts = hasPermission("contacts.view") || isAdmin || isSupervisor || user?.profile === "user";
  const canSeeDashboard = hasPermission("dashboard.view") || isAdmin || isSupervisor;
  const hasSettingsPermission = [
    "settings.view",
    "settings.manage",
    "settings.logo",
    "settings.categories",
    "settings.categories.view",
    "settings.categories.create",
    "settings.categories.edit",
    "settings.categories.delete",
    "settings.closing_reasons",
    "settings.closing_reasons.view",
    "settings.closing_reasons.create",
    "settings.closing_reasons.edit",
    "settings.closing_reasons.delete",
    "settings.satisfaction",
    "settings.satisfaction.view",
    "settings.satisfaction.create",
    "settings.satisfaction.edit",
    "settings.satisfaction.delete",
    "settings.audit_logs",
    "settings.ura",
    "settings.ura_flows",
    "settings.ura_options",
    "settings.forms",
    "settings.form_builder",
    "settings.form_responses",
    "settings.form_reports",
    "settings.ai",
    "settings.ai_agents",
    "settings.knowledge_base",
    "settings.ai_contexts",
    "settings.ai_leads",
    "settings.ai_tools",
    "settings.ai_calendar",
    "tags.view",
    "tags.create",
    "tags.edit",
    "tags.delete"
  ].some(hasPermission);
  const hasSettingsAccess = Boolean(
    isAdmin ||
    isSupervisor ||
    hasSettingsPermission ||
    user?.specialPermissions?.accessUra ||
    user?.specialPermissions?.accessForms ||
    user?.specialPermissions?.accessAi
  );

  return (
    <Paper className={classes.root} elevation={0}>
      <BottomNavigation value={routeValue(location.pathname)} showLabels className={classes.navigation}>
        {canSeeTickets && (
          <BottomNavigationAction
            className={classes.action}
            label="Atendimentos"
            value="/tickets"
            icon={<WhatsAppIcon />}
            component={RouterLink}
            to="/tickets"
          />
        )}
        {canSeeContacts && (
          <BottomNavigationAction
            className={classes.action}
            label="Contatos"
            value="/contacts"
            icon={<ContactPhoneOutlinedIcon />}
            component={RouterLink}
            to="/contacts"
          />
        )}
        {canSeeDashboard && (
          <BottomNavigationAction
            className={classes.action}
            label="Painel"
            value="/"
            icon={<DashboardOutlinedIcon />}
            component={RouterLink}
            to="/"
          />
        )}
        {hasSettingsAccess ? (
          <BottomNavigationAction
            className={classes.action}
            label="Ajustes"
            value="/settings"
            icon={<SettingsOutlinedIcon />}
            component={RouterLink}
            to="/settings"
          />
        ) : (
          <BottomNavigationAction
            className={classes.action}
            label="Mais"
            value="/more"
            icon={<MoreHorizIcon />}
            component={RouterLink}
            to="/quickAnswers"
          />
        )}
      </BottomNavigation>
    </Paper>
  );
};

export default MobileNavigation;
