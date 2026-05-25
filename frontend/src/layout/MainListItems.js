import React, { useContext, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useLocation } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import { Badge, Collapse, Typography } from "@material-ui/core";
import DashboardOutlinedIcon from "@material-ui/icons/DashboardOutlined";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SyncAltIcon from "@material-ui/icons/SyncAlt";
import SettingsOutlinedIcon from "@material-ui/icons/SettingsOutlined";
import PeopleAltOutlinedIcon from "@material-ui/icons/PeopleAltOutlined";
import ContactPhoneOutlinedIcon from "@material-ui/icons/ContactPhoneOutlined";
import AccountTreeOutlinedIcon from "@material-ui/icons/AccountTreeOutlined";
import QuestionAnswerOutlinedIcon from "@material-ui/icons/QuestionAnswerOutlined";
import EventNoteOutlinedIcon from "@material-ui/icons/EventNoteOutlined";
import SecurityOutlinedIcon from "@material-ui/icons/SecurityOutlined";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";

import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import { Can } from "../components/Can";

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(1, 1.25, 2),
  },
  groupLabel: {
    margin: theme.spacing(2, 1.5, 0.75),
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.4,
    color: "#94A3B8",
  },
  item: {
    minHeight: 42,
    margin: theme.spacing(0.25, 0),
    padding: theme.spacing(0.75, 1.25),
    borderRadius: 8,
    color: "#FFFFFF",
    borderLeft: "3px solid transparent",
    "&:hover": {
      background: "rgba(37, 99, 235, 0.12)",
      color: "#FFFFFF",
    },
    "& .MuiListItemIcon-root": {
      minWidth: 38,
      color: "#FFFFFF",
    },
    "& .MuiSvgIcon-root": {
      color: "#FFFFFF",
    },
    "& .MuiBadge-root .MuiSvgIcon-root": {
      color: "#FFFFFF",
    },
    "& .MuiListItemText-primary": {
      fontSize: 14,
      fontWeight: 700,
      color: "#FFFFFF",
    },
  },
  activeItem: {
    background: "rgba(37, 99, 235, 0.20)",
    color: "#FFFFFF",
    borderLeftColor: "#38BDF8",
  },
  submenu: {
    marginLeft: theme.spacing(1),
    paddingLeft: theme.spacing(1),
    borderLeft: "1px solid rgba(148, 163, 184, 0.14)",
  },
  sectionButton: {
    marginTop: theme.spacing(1),
  },
}));

function ListItemLink(props) {
  const { icon, primary, to, className, activeClassName } = props;
  const location = useLocation();
  const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  return (
    <li>
      <ListItem button component={renderLink} className={`${className || ""} ${active ? activeClassName || "" : ""}`}>
        {icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
        <ListItemText primary={primary} />
      </ListItem>
    </li>
  );
}

const MainListItems = (props) => {
  const { drawerClose } = props;
  const classes = useStyles();
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (whatsApps.length > 0) {
        const offlineWhats = whatsApps.filter((whats) => {
          return (
            whats.status === "qrcode" ||
            whats.status === "PAIRING" ||
            whats.status === "DISCONNECTED" ||
            whats.status === "TIMEOUT" ||
            whats.status === "OPENING"
          );
        });
        if (offlineWhats.length > 0) {
          setConnectionWarning(true);
        } else {
          setConnectionWarning(false);
        }
      }
    }, 2000);
    return () => clearTimeout(delayDebounceFn);
  }, [whatsApps]);

  return (
    <div onClick={drawerClose} className={classes.root}>
      <Typography className={classes.groupLabel}>ATENDIMENTO</Typography>
      <ListItemLink
        to="/tickets"
        primary="Atendimentos"
        icon={<WhatsAppIcon />}
        className={classes.item}
        activeClassName={classes.activeItem}
      />
      <ListItemLink
        to="/contacts"
        primary={i18n.t("mainDrawer.listItems.contacts")}
        icon={<ContactPhoneOutlinedIcon />}
        className={classes.item}
        activeClassName={classes.activeItem}
      />

      <Typography className={classes.groupLabel}>GESTAO</Typography>
      <ListItemLink
        to="/"
        primary="Dashboard"
        icon={<DashboardOutlinedIcon />}
        className={classes.item}
        activeClassName={classes.activeItem}
      />

      <Typography className={classes.groupLabel}>AUTOMACAO</Typography>
      <ListItemLink
        to="/quickAnswers"
        primary={i18n.t("mainDrawer.listItems.quickAnswers")}
        icon={<QuestionAnswerOutlinedIcon />}
        className={classes.item}
        activeClassName={classes.activeItem}
      />
      <ListItemLink
        to="/campaigns-schedules"
        primary="Agendamentos e campanhas"
        icon={<EventNoteOutlinedIcon />}
        className={classes.item}
        activeClassName={classes.activeItem}
      />
      <Can
        role={user.profile}
        perform="drawer-admin-items:view"
        yes={() => (
          <>
            <Typography className={classes.groupLabel}>CONFIGURACOES</Typography>
            <ListItem
              button
              className={`${classes.item} ${classes.sectionButton}`}
              onClick={event => {
                event.stopPropagation();
                setAdminOpen(prev => !prev);
              }}
            >
              <ListItemIcon>
                <SecurityOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary={i18n.t("mainDrawer.listItems.administration")} />
              {adminOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={adminOpen} timeout="auto" unmountOnExit className={classes.submenu}>
              <ListItemLink
                to="/connections"
                primary={i18n.t("mainDrawer.listItems.connections")}
                icon={
                  <Badge badgeContent={connectionWarning ? "!" : 0} color="error">
                    <SyncAltIcon />
                  </Badge>
                }
                className={classes.item}
                activeClassName={classes.activeItem}
              />
              <ListItemLink
                to="/users"
                primary={i18n.t("mainDrawer.listItems.users")}
                icon={<PeopleAltOutlinedIcon />}
                className={classes.item}
                activeClassName={classes.activeItem}
              />
              <ListItemLink
                to="/queues"
                primary={i18n.t("mainDrawer.listItems.queues")}
                icon={<AccountTreeOutlinedIcon />}
                className={classes.item}
                activeClassName={classes.activeItem}
              />
              <ListItemLink
                to="/settings"
                primary={i18n.t("mainDrawer.listItems.settings")}
                icon={<SettingsOutlinedIcon />}
                className={classes.item}
                activeClassName={classes.activeItem}
              />
            </Collapse>
          </>
        )}
      />
    </div>
  );
};

export default MainListItems;

