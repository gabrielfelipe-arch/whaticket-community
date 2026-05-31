import React, { useState, useContext, useEffect, useRef } from "react";
import clsx from "clsx";
import {
  makeStyles,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  MenuItem,
  IconButton,
  Menu,
  Switch,
  Chip,
} from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import AccountCircle from "@material-ui/icons/AccountCircle";
import Brightness4Icon from "@material-ui/icons/Brightness4";

import MainListItems from "./MainListItems";
import NotificationsPopOver from "../components/NotificationsPopOver";
import UserModal from "../components/UserModal";
import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";
import { i18n } from "../translate/i18n";
import { useThemeContext } from "../context/DarkMode";
import { useBranding } from "../context/Branding";
import api from "../services/api";
import toastError from "../errors/toastError";

const drawerWidth = 268;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "100vh",
    background: theme.palette.background.default,
    [theme.breakpoints.down("sm")]: {
      height: "calc(100vh - 56px)",
    },
  },
  toolbar: {
    paddingRight: 24,
    minHeight: 72,
    gap: theme.spacing(1),
    color: "#FFFFFF",
    "& .MuiSvgIcon-root": {
      color: "#FFFFFF !important",
      fill: "#FFFFFF !important",
    },
    "& .MuiIconButton-root": {
      color: "#FFFFFF",
    },
    "& .MuiTypography-root": {
      color: "#FFFFFF",
    },
  },
  toolbarIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1.5, 1.75),
    minHeight: 64,
    background: "#08111F",
  },
  sidebarTitle: {
    color: "#FFFFFF",
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: 0,
  },
  brandBox: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    gap: theme.spacing(1.5),
  },
  brandLogo: {
    width: 136,
    height: 48,
    borderRadius: 8,
    objectFit: "contain",
    background: "rgba(255,255,255,0.10)",
    padding: 6,
    [theme.breakpoints.down("xs")]: {
      width: 104,
      height: 40,
    },
  },
  brandFallback: {
    width: 64,
    height: 44,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    color: "#FFFFFF",
    background: "linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)",
  },
  brandName: {
    color: "#FFFFFF",
    fontWeight: 800,
    fontSize: 18,
    lineHeight: 1.1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    [theme.breakpoints.down("xs")]: {
      fontSize: 15,
    },
  },
  collapseButton: {
    color: "#94A3B8",
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    backgroundColor: "#0B1220",
    color: "#FFFFFF",
    borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
    boxShadow: "0 10px 28px rgba(2, 6, 23, 0.20)",
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: theme.spacing(1),
    color: "#FFFFFF",
  },
  menuButtonHidden: {
    display: "none",
  },
  title: {
    flexGrow: 1,
    color: "#FFFFFF",
    fontWeight: 800,
    letterSpacing: 0,
  },
  drawerPaper: {
    position: "relative",
    whiteSpace: "nowrap",
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    backgroundColor: "#08111F",
    borderRight: "1px solid rgba(148, 163, 184, 0.16)",
    color: "#FFFFFF",
    "& .MuiListItemIcon-root": {
      color: "#FFFFFF !important",
    },
    "& .MuiSvgIcon-root": {
      color: "#FFFFFF !important",
      fill: "#FFFFFF !important",
    },
    "& .MuiListItemText-primary": {
      color: "#FFFFFF",
    },
    "& .MuiTypography-root": {
      color: "#FFFFFF",
    },
  },
  drawerPaperClose: {
    overflowX: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing(8),
    [theme.breakpoints.up("sm")]: {
      width: theme.spacing(9),
    },
  },
  appBarSpacer: {
    minHeight: 72,
  },
  content: {
    flex: 1,
    overflow: "auto",
    background: theme.palette.background.default,
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
  switch: {
    transform: "scale(0.8)",
  },
  iconButton: {
    color: "#FFFFFF",
  },
  userPill: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    borderRadius: 8,
    border: "1px solid rgba(148, 163, 184, 0.22)",
    background: "rgba(255, 255, 255, 0.06)",
    color: "#FFFFFF",
  },
  userText: {
    display: "flex",
    flexDirection: "column",
    lineHeight: 1.1,
    [theme.breakpoints.down("xs")]: {
      display: "none",
    },
  },
  userName: {
    fontSize: 12,
    fontWeight: 800,
  },
  userProfile: {
    fontSize: 11,
    color: "#CBD5E1",
  },
  themeSwitchContainer: {
    display: "flex",
    alignItems: "center",
  },
  themeIcon: {
    color: "#FFFFFF",
  },
  statusChip: {
    height: 22,
    color: "#FFFFFF",
    fontWeight: 800,
  },
}));

const statusLabels = {
  online: "Online",
  away: "Ausente",
  offline: "Offline",
};

const statusColors = {
  online: "#22C55E",
  away: "#F59E0B",
  offline: "#94A3B8",
};

const LoggedInLayout = ({ children }) => {
  const classes = useStyles();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { handleLogout, loading } = useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVariant, setDrawerVariant] = useState("permanent");
  const { user } = useContext(AuthContext);
  const { darkMode, toggleTheme } = useThemeContext();
  const branding = useBranding();
  const lastActivityRef = useRef(Date.now());
  const lastTouchRef = useRef(0);
  const [inactivitySettings, setInactivitySettings] = useState({});

  useEffect(() => {
    if (document.body.offsetWidth > 600) {
      setDrawerOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await api.get("/users/inactivity-settings");
        const mapped = {};
        data.forEach(setting => {
          mapped[setting.key] = setting.value;
        });
        setInactivitySettings(mapped);
      } catch (err) {
        // Se falhar, mantem a sessao normal.
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const recordActivity = async () => {
      lastActivityRef.current = Date.now();
      if (Date.now() - lastTouchRef.current > 60000) {
        lastTouchRef.current = Date.now();
        api.post("/users/activity").catch(() => {});
      }
      if (user.operationalStatus === "away" && user.statusReason === "auto_away") {
        const shouldReturn = window.confirm("Você está Ausente por inatividade. Deseja voltar para Online?");
        if (shouldReturn) {
          handleChangeStatus("online");
        }
      }
    };

    const events = ["click", "keydown", "mousemove", "touchstart"];
    events.forEach(event => window.addEventListener(event, recordActivity, { passive: true }));

    const interval = setInterval(async () => {
      const appliesToAdmins = inactivitySettings.inactivityAppliesToAdmins === "true";
      if (user.profile === "admin" && !appliesToAdmins) return;

      const inactiveMinutes = (Date.now() - lastActivityRef.current) / 60000;
      const autoAwayEnabled = inactivitySettings.autoAwayEnabled === "true";
      const autoLogoutEnabled = inactivitySettings.autoLogoutEnabled === "true";
      const autoAwayMinutes = Number(inactivitySettings.autoAwayMinutes || 0);
      const autoLogoutMinutes = Number(inactivitySettings.autoLogoutMinutes || 0);

      if (
        autoAwayEnabled &&
        autoAwayMinutes > 0 &&
        inactiveMinutes >= autoAwayMinutes &&
        user.operationalStatus === "online"
      ) {
        await api.put(`/users/${user.id}/status`, { status: "away", reason: "auto_away" }).catch(() => {});
      }

      if (autoLogoutEnabled && autoLogoutMinutes > 0 && inactiveMinutes >= autoLogoutMinutes) {
        await api.put(`/users/${user.id}/status`, { status: "offline", reason: "auto_logout" }).catch(() => {});
        handleLogout();
      }
    }, 30000);

    return () => {
      events.forEach(event => window.removeEventListener(event, recordActivity));
      clearInterval(interval);
    };
  }, [user?.id, user?.profile, user?.operationalStatus, inactivitySettings]);

  useEffect(() => {
    if (document.body.offsetWidth < 600) {
      setDrawerVariant("temporary");
    } else {
      setDrawerVariant("permanent");
    }
  }, [drawerOpen]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuOpen(false);
  };

  const handleOpenUserModal = () => {
    setUserModalOpen(true);
    handleCloseMenu();
  };

  const handleClickLogout = () => {
    handleCloseMenu();
    handleLogout();
  };

  const handleChangeStatus = async status => {
    try {
      await api.put(`/users/${user.id}/status`, { status, reason: "manual" });
      handleCloseMenu();
    } catch (err) {
      toastError(err);
    }
  };

  const drawerClose = () => {
    if (document.body.offsetWidth < 600) {
      setDrawerOpen(false);
    }
  };

  if (loading) {
    return <BackdropLoading />;
  }

  return (
    <div className={classes.root}>
      <Drawer
        variant={drawerVariant}
        className={drawerOpen ? classes.drawerPaper : classes.drawerPaperClose}
        classes={{
          paper: clsx(
            classes.drawerPaper,
            !drawerOpen && classes.drawerPaperClose
          ),
        }}
        open={drawerOpen}
      >
        <div className={classes.toolbarIcon}>
          {drawerOpen && <Typography className={classes.sidebarTitle}>Menu</Typography>}
          <IconButton
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={classes.collapseButton}
          >
            <ChevronLeftIcon />
          </IconButton>
        </div>
        <List>
          <MainListItems drawerClose={drawerClose} drawerOpen={drawerOpen} />
        </List>
      </Drawer>
      <UserModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        userId={user?.id}
      />
      <AppBar
        position="absolute"
        className={clsx(classes.appBar, drawerOpen && classes.appBarShift)}
      >
        <Toolbar variant="dense" className={classes.toolbar}>
          <IconButton
            edge="start"
            aria-label="open drawer"
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={clsx(
              classes.menuButton,
              drawerOpen && classes.menuButtonHidden
            )}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            component="div"
            variant="h6"
            noWrap
            className={classes.title}
          >
            <div className={classes.brandBox}>
              {branding.brandLogo ? (
                <img
                  src={`http://localhost:8085${branding.brandLogo}`}
                  alt={branding.brandName}
                  className={classes.brandLogo}
                />
              ) : (
                <div className={classes.brandFallback}>
                  {(branding.brandName || "A").charAt(0).toUpperCase()}
                </div>
              )}
              <div className={classes.brandName}>
                {branding.brandName || "Atendimento"}
              </div>
            </div>
          </Typography>

          <div className={classes.themeSwitchContainer}>
            <Brightness4Icon className={classes.themeIcon} />
            <Switch
              checked={darkMode}
              onChange={toggleTheme}
              color="default"
              className={classes.switch}
            />
          </div>

          {user.id && (
            <NotificationsPopOver className={classes.iconButton} />
          )}

          <div>
            <div className={classes.userPill}>
              <div className={classes.userText}>
                <span className={classes.userName}>{user?.name || "Usuario"}</span>
                <span className={classes.userProfile}>{user?.profile || ""}</span>
              </div>
              <Chip
                size="small"
                className={classes.statusChip}
                label={statusLabels[user?.operationalStatus] || "Offline"}
                style={{ backgroundColor: statusColors[user?.operationalStatus] || statusColors.offline }}
              />
            <IconButton
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              className={classes.iconButton}
            >
              <AccountCircle />
            </IconButton>
            </div>
            <Menu
              id="menu-appbar"
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
              onClose={handleCloseMenu}
            >
              <MenuItem onClick={handleOpenUserModal}>
                {i18n.t("mainDrawer.appBar.user.profile")}
              </MenuItem>
              <MenuItem onClick={() => handleChangeStatus("online")}>
                Status: Online
              </MenuItem>
              <MenuItem onClick={() => handleChangeStatus("away")}>
                Status: Ausente
              </MenuItem>
              <MenuItem onClick={handleClickLogout}>
                {i18n.t("mainDrawer.appBar.user.logout")}
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
      <main className={classes.content}>
        <div className={classes.appBarSpacer} />
        {children ? children : null}
      </main>
    </div>
  );
};

export default LoggedInLayout;
