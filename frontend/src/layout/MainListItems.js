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
import AssignmentIndOutlinedIcon from "@material-ui/icons/AssignmentIndOutlined";
import ContactPhoneOutlinedIcon from "@material-ui/icons/ContactPhoneOutlined";
import AccountTreeOutlinedIcon from "@material-ui/icons/AccountTreeOutlined";
import QuestionAnswerOutlinedIcon from "@material-ui/icons/QuestionAnswerOutlined";
import EventNoteOutlinedIcon from "@material-ui/icons/EventNoteOutlined";
import SecurityOutlinedIcon from "@material-ui/icons/SecurityOutlined";
import ExtensionIcon from "@material-ui/icons/Extension";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";

import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import useTickets from "../hooks/useTickets";
import openSocket from "../services/socket-io";

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(1.25, 1.5, 2),
    background: theme.custom.sidebar,
    color: "#FFFFFF",
  },
  rootCollapsed: {
    padding: theme.spacing(1.25, 0.75, 2),
  },
  groupLabel: {
    margin: theme.spacing(2.5, 0.25, 1),
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0,
    color: "#93C5FD",
    opacity: 1,
    textTransform: "uppercase",
  },
  item: {
    minHeight: 44,
    margin: theme.spacing(0.5, 0),
    padding: theme.spacing(0.75, 1.25),
    borderRadius: 8,
    color: "#FFFFFF",
    borderLeft: "3px solid transparent",
    overflow: "hidden",
    "&:hover": {
      background: "rgba(255, 255, 255, 0.10)",
      color: "#FFFFFF",
    },
    "& .MuiListItemIcon-root": {
      minWidth: 44,
      color: "#FFFFFF",
      opacity: 1,
    },
    "& .MuiListItemIcon-root svg, & .MuiListItemIcon-root .MuiSvgIcon-root, & svg.MuiSvgIcon-root": {
      color: "#FFFFFF !important",
      fill: "#FFFFFF !important",
      fontSize: 23,
    },
    "& .MuiBadge-root svg, & .MuiBadge-root .MuiSvgIcon-root": {
      color: "#FFFFFF !important",
      fill: "#FFFFFF !important",
    },
    "& .MuiListItemText-primary": {
      fontSize: 16,
      fontWeight: 800,
      color: "#FFFFFF",
      opacity: 1,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
  },
  itemCollapsed: {
    justifyContent: "center",
    padding: theme.spacing(0.75),
    "& .MuiListItemIcon-root": {
      minWidth: 0,
      justifyContent: "center",
    },
  },
  itemTwoLine: {
    minHeight: 52,
    "& .MuiListItemText-primary": {
      whiteSpace: "normal !important",
      overflow: "visible",
      textOverflow: "clip",
      lineHeight: 1.15,
      fontSize: 14,
    },
  },
  twoLineLabel: {
    display: "block",
    lineHeight: 1.15,
  },
  activeItem: {
    background: theme.palette.type === "dark" ? "#12306A" : "rgba(255, 255, 255, 0.16)",
    color: "#FFFFFF",
    borderLeftColor: "#38BDF8",
    boxShadow: "inset 0 0 0 1px rgba(96, 165, 250, 0.08)",
    "& .MuiListItemIcon-root, & .MuiSvgIcon-root, & .MuiListItemText-primary": {
      color: "#FFFFFF",
    },
  },
  submenu: {
    marginLeft: theme.spacing(0.75),
    paddingLeft: theme.spacing(0.75),
    borderLeft: "1px solid rgba(148, 163, 184, 0.14)",
  },
  submenuCollapsed: {
    marginLeft: 0,
    paddingLeft: 0,
    borderLeft: 0,
  },
  sectionButton: {
    marginTop: theme.spacing(0.5),
  },
}));

function ListItemLink(props) {
  const { icon, primary, to, className, activeClassName, collapsed, collapsedClassName, badgeContent = 0 } = props;
  const location = useLocation();
  const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
  const showBadge = Number(badgeContent) > 0;

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  return (
    <li>
      <ListItem
        button
        component={renderLink}
        title={collapsed ? primary : undefined}
        className={`${className || ""} ${collapsed ? collapsedClassName || "" : ""} ${active ? activeClassName || "" : ""}`}
      >
        {icon ? (
          <ListItemIcon style={{ color: "#FFFFFF" }}>
            {showBadge ? (
              <Badge badgeContent={badgeContent} color="secondary">
                {React.cloneElement(icon, {
                  style: { ...(icon.props?.style || {}), color: "#FFFFFF", fill: "#FFFFFF" },
                  htmlColor: "#FFFFFF"
                })}
              </Badge>
            ) : (
              React.cloneElement(icon, {
                style: { ...(icon.props?.style || {}), color: "#FFFFFF", fill: "#FFFFFF" },
                htmlColor: "#FFFFFF"
              })
            )}
          </ListItemIcon>
        ) : null}
        {!collapsed && <ListItemText primary={primary} />}
      </ListItem>
    </li>
  );
}

const whiteIcon = icon =>
  React.cloneElement(icon, {
    style: { ...(icon.props?.style || {}), color: "#FFFFFF", fill: "#FFFFFF" },
    htmlColor: "#FFFFFF"
  });

const MainListItems = (props) => {
  const { drawerClose, drawerOpen = true } = props;
  const classes = useStyles();
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);
  const { tickets: unreadTickets } = useTickets({ withUnreadMessages: "true" });
  const [unreadTicketIds, setUnreadTicketIds] = useState(new Set());
  const ticketsBadgeCount = unreadTicketIds.size;
  const isAdmin = user?.profile === "admin";
  const isSupervisor = user?.profile === "supervisor";
  const hasPermission = permission => user?.permissions?.[permission] === true;
  const hasSpecialSettingsAccess = Boolean(
    user?.specialPermissions?.accessUra ||
    user?.specialPermissions?.accessForms ||
    user?.specialPermissions?.accessAi
  );
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
  const canSeeTickets = hasPermission("tickets.view") || isAdmin || isSupervisor || user?.profile === "user";
  const canSeeContacts = hasPermission("contacts.view") || isAdmin || isSupervisor || user?.profile === "user";
  const canSeeDashboard = hasPermission("dashboard.view") || isAdmin || isSupervisor;
  const canSeeQuickAnswers = hasPermission("quickAnswers.view") || isAdmin || isSupervisor || user?.profile === "user";
  const canSeeSchedules = hasPermission("scheduledMessages.view") || hasPermission("campaigns.view") || isAdmin || isSupervisor;
  const canSeeConnections = hasPermission("connections.view") || isAdmin || isSupervisor;
  const canSeeUsers = hasPermission("users.view") || isAdmin || isSupervisor;
  const canSeeQueues = hasPermission("queues.view") || isAdmin;
  const canSeeSettings = hasSettingsPermission || isAdmin || isSupervisor || hasSpecialSettingsAccess;
  const canSeeIntegrations = hasPermission("integrations.view") || hasPermission("glpi.view") || hasPermission("whatsapp_provider.view") || isAdmin;
  const canSeeProfiles = hasPermission("profiles.manage") || isAdmin;
  const canSeeAdminSection = canSeeSettings || canSeeConnections || canSeeUsers || canSeeQueues || canSeeIntegrations || canSeeProfiles;

  useEffect(() => {
    setUnreadTicketIds(new Set(unreadTickets.map(ticket => Number(ticket.id))));
  }, [unreadTickets]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("connect", () => socket.emit("joinNotification"));

    socket.on("appMessage", data => {
      if (
        data.action === "create" &&
        !data.message.read &&
        (data.ticket.userId === user?.id || !data.ticket.userId)
      ) {
        setUnreadTicketIds(prevIds => {
          const nextIds = new Set(prevIds);
          nextIds.add(Number(data.ticket.id));
          return nextIds;
        });
      }
    });

    socket.on("ticket", data => {
      if (data.action === "updateUnread" || data.action === "delete") {
        setUnreadTicketIds(prevIds => {
          const nextIds = new Set(prevIds);
          nextIds.delete(Number(data.ticketId));
          return nextIds;
        });
      }
    });

    return () => socket.disconnect();
  }, [user?.id]);

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
    <div onClick={drawerClose} className={`${classes.root} ${!drawerOpen ? classes.rootCollapsed : ""}`}>
      {drawerOpen && <Typography className={classes.groupLabel}>ATENDIMENTO</Typography>}
      {canSeeTickets && (
        <ListItemLink
          to="/tickets"
          primary="Atendimentos"
          icon={<WhatsAppIcon />}
          className={classes.item}
          activeClassName={classes.activeItem}
          collapsed={!drawerOpen}
          collapsedClassName={classes.itemCollapsed}
          badgeContent={ticketsBadgeCount}
        />
      )}
      {canSeeContacts && (
        <ListItemLink
          to="/contacts"
          primary={i18n.t("mainDrawer.listItems.contacts")}
          icon={<ContactPhoneOutlinedIcon />}
          className={classes.item}
          activeClassName={classes.activeItem}
          collapsed={!drawerOpen}
          collapsedClassName={classes.itemCollapsed}
        />
      )}

      {drawerOpen && <Typography className={classes.groupLabel}>GESTAO</Typography>}
      {canSeeDashboard && (
        <ListItemLink
          to="/"
          primary="Painel"
          icon={<DashboardOutlinedIcon />}
          className={classes.item}
          activeClassName={classes.activeItem}
          collapsed={!drawerOpen}
          collapsedClassName={classes.itemCollapsed}
        />
      )}

      {drawerOpen && <Typography className={classes.groupLabel}>AUTOMACAO</Typography>}
      {canSeeQuickAnswers && (
        <ListItemLink
          to="/quickAnswers"
          primary="Respostas rapidas"
          icon={<QuestionAnswerOutlinedIcon />}
          className={classes.item}
          activeClassName={classes.activeItem}
          collapsed={!drawerOpen}
          collapsedClassName={classes.itemCollapsed}
        />
      )}
      {canSeeSchedules && (
        <ListItemLink
          to="/campaigns-schedules"
          primary={<span className={classes.twoLineLabel}>Mensagens<br />programadas</span>}
          icon={<EventNoteOutlinedIcon />}
          className={`${classes.item} ${classes.itemTwoLine}`}
          activeClassName={classes.activeItem}
          collapsed={!drawerOpen}
          collapsedClassName={classes.itemCollapsed}
        />
      )}
      {canSeeAdminSection && (
          <>
            {drawerOpen && <Typography className={classes.groupLabel}>CONFIGURACOES</Typography>}
            <ListItem
              button
              title={!drawerOpen ? i18n.t("mainDrawer.listItems.administration") : undefined}
              className={`${classes.item} ${classes.sectionButton} ${!drawerOpen ? classes.itemCollapsed : ""}`}
              onClick={event => {
                event.stopPropagation();
                setAdminOpen(prev => !prev);
              }}
            >
              <ListItemIcon>
                {whiteIcon(<SecurityOutlinedIcon />)}
              </ListItemIcon>
              {drawerOpen && <ListItemText primary={i18n.t("mainDrawer.listItems.administration")} />}
              {drawerOpen && (adminOpen ? whiteIcon(<ExpandLess />) : whiteIcon(<ExpandMore />))}
            </ListItem>
            <Collapse
              in={adminOpen}
              timeout="auto"
              unmountOnExit
              className={`${classes.submenu} ${!drawerOpen ? classes.submenuCollapsed : ""}`}
            >
              {(canSeeUsers || canSeeConnections) && (
                <>
                  {canSeeConnections && (
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
                      collapsed={!drawerOpen}
                      collapsedClassName={classes.itemCollapsed}
                    />
                  )}
                  {canSeeUsers && (
                    <ListItemLink
                      to="/users"
                      primary={i18n.t("mainDrawer.listItems.users")}
                      icon={<PeopleAltOutlinedIcon />}
                      className={classes.item}
                      activeClassName={classes.activeItem}
                      collapsed={!drawerOpen}
                      collapsedClassName={classes.itemCollapsed}
                    />
                  )}
                </>
              )}
              {canSeeQueues && (
                <ListItemLink
                  to="/queues"
                  primary={i18n.t("mainDrawer.listItems.queues")}
                  icon={<AccountTreeOutlinedIcon />}
                  className={classes.item}
                  activeClassName={classes.activeItem}
                  collapsed={!drawerOpen}
                  collapsedClassName={classes.itemCollapsed}
                />
              )}
              {canSeeProfiles && (
                <ListItemLink
                  to="/profiles"
                  primary="Perfis"
                  icon={<AssignmentIndOutlinedIcon />}
                  className={classes.item}
                  activeClassName={classes.activeItem}
                  collapsed={!drawerOpen}
                  collapsedClassName={classes.itemCollapsed}
                />
              )}
              {canSeeSettings && (
                <ListItemLink
                  to="/settings"
                  primary={i18n.t("mainDrawer.listItems.settings")}
                  icon={<SettingsOutlinedIcon />}
                  className={classes.item}
                  activeClassName={classes.activeItem}
                  collapsed={!drawerOpen}
                  collapsedClassName={classes.itemCollapsed}
                />
              )}
              {canSeeIntegrations && (
                <ListItemLink
                  to="/integrations"
                  primary="Integrações"
                  icon={<ExtensionIcon />}
                  className={classes.item}
                  activeClassName={classes.activeItem}
                  collapsed={!drawerOpen}
                  collapsedClassName={classes.itemCollapsed}
                />
              )}
            </Collapse>
          </>
      )}
    </div>
  );
};

export default MainListItems;

