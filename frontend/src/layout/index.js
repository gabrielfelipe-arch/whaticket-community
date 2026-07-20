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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  InputAdornment,
} from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import AccountCircle from "@material-ui/icons/AccountCircle";
import Brightness4Icon from "@material-ui/icons/Brightness4";
import LockOutlinedIcon from "@material-ui/icons/LockOutlined";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import CheckCircle from "@material-ui/icons/CheckCircle";
import RadioButtonUnchecked from "@material-ui/icons/RadioButtonUnchecked";
import { toast } from "react-toastify";

import MainListItems from "./MainListItems";
import NotificationsPopOver from "../components/NotificationsPopOver";
import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";
import { i18n } from "../translate/i18n";
import { useThemeContext } from "../context/DarkMode";
import { useBranding } from "../context/Branding";
import api from "../services/api";
import toastError from "../errors/toastError";
import { getBackendUrl } from "../config";
import MobileNavigation from "../components/MobileNavigation";
import rocketLogo from "../assets/rocketservice-logo.png";

const drawerWidth = 268;
const drawerClosedWidth = 76;
const SIDEBAR_STORAGE_KEY = "rocketserviceSidebarOpen";
const rocketIcon = "/android-chrome-192x192.png";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "100vh",
    background: theme.palette.background.default,
    [theme.breakpoints.down("sm")]: {
      height: "100vh",
    },
  },
  toolbar: {
    paddingRight: theme.spacing(2),
    minHeight: 64,
    gap: theme.spacing(1),
    color: theme.palette.text.primary,
    [theme.breakpoints.down("xs")]: {
      minHeight: 56,
      paddingRight: theme.spacing(1),
      gap: theme.spacing(0.5),
    },
    "& .MuiSvgIcon-root": {
      color: `${theme.palette.text.primary} !important`,
      fill: "currentColor !important",
    },
    "& .MuiIconButton-root": {
      color: theme.palette.text.primary,
    },
    "& .MuiTypography-root": {
      color: theme.palette.text.primary,
    },
  },
  toolbarIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    padding: theme.spacing(1.25, 1.25, 1.25, 1.5),
    minHeight: 76,
    background: theme.custom.sidebarStrong,
    overflow: "hidden",
  },
  toolbarIconClosed: {
    justifyContent: "center",
    minHeight: 72,
    padding: theme.spacing(1, 0),
  },
  sidebarBrand: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    gap: theme.spacing(1),
    flex: 1,
  },
  sidebarLogoFrame: {
    width: 150,
    height: 50,
    borderRadius: 8,
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sidebarLogo: {
    width: "100%",
    height: "100%",
    padding: 4,
    objectFit: "contain",
    objectPosition: "center",
    transform: "scale(1.42)",
    transformOrigin: "center",
  },
  sidebarIconLogo: {
    width: 44,
    height: 44,
    objectFit: "contain",
    display: "block",
    filter: "drop-shadow(0 8px 16px rgba(56, 189, 248, 0.28))",
  },
  sidebarBrandFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    color: "#FFFFFF",
    background: `linear-gradient(135deg, ${theme.custom.sidebarSoft} 0%, ${theme.palette.secondary.main} 100%)`,
  },
  collapseButton: {
    color: "#FFFFFF",
    background: "rgba(255,255,255,0.08)",
    "&:hover": {
      background: "rgba(255,255,255,0.14)",
    },
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    boxShadow: "none",
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  appBarShiftCollapsed: {
    marginLeft: drawerClosedWidth,
    width: `calc(100% - ${drawerClosedWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarMobile: {
    marginLeft: 0,
    width: "100%",
  },
  menuButton: {
    marginRight: theme.spacing(1),
    color: theme.palette.text.primary,
  },
  menuButtonHidden: {
    display: "none",
  },
  title: {
    flexGrow: 1,
    color: theme.palette.text.primary,
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
    backgroundColor: theme.custom.sidebar,
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
    width: drawerClosedWidth,
    [theme.breakpoints.up("sm")]: {
      width: drawerClosedWidth,
    },
  },
  appBarSpacer: {
    minHeight: 64,
    [theme.breakpoints.down("xs")]: {
      minHeight: 56,
    },
  },
  content: {
    flex: 1,
    overflow: "auto",
    background: theme.palette.background.default,
    paddingBottom: 0,
    [theme.breakpoints.down("sm")]: {
      paddingBottom: 72,
    },
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
    color: theme.palette.text.primary,
  },
  userPill: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(0.25, 0.5),
      gap: theme.spacing(0.25),
    },
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
    color: theme.palette.text.secondary,
  },
  themeSwitchContainer: {
    display: "flex",
    alignItems: "center",
  },
  themeIcon: {
    color: theme.palette.text.secondary,
  },
  statusChip: {
    height: 22,
    color: theme.palette.text.primary,
    fontWeight: 800,
    [theme.breakpoints.down("xs")]: {
      display: "none",
    },
  },
  passwordField: {
    marginBottom: theme.spacing(2),
  },
  passwordRules: {
    display: "grid",
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(0.5),
  },
  passwordRule: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: 13,
  },
  passwordRuleValid: {
    color: theme.palette.text.primary,
  },
  validIcon: {
    color: "#22C55E",
    fontSize: 18,
  },
  invalidIcon: {
    color: theme.palette.text.disabled,
    fontSize: 18,
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

const initialPasswordChange = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

const getPasswordRules = values => [
  { key: "length", label: "Minimo de 8 caracteres", valid: values.newPassword.length >= 8 },
  { key: "letter", label: "Tem pelo menos uma letra", valid: /[A-Za-z]/.test(values.newPassword) },
  { key: "number", label: "Tem pelo menos um numero", valid: /\d/.test(values.newPassword) },
  { key: "special", label: "Tem caractere especial", valid: /[^A-Za-z0-9]/.test(values.newPassword) },
  { key: "confirm", label: "Confirmacao igual a nova senha", valid: values.confirmPassword.length > 0 && values.newPassword === values.confirmPassword }
];

const LoggedInLayout = ({ children }) => {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordChange, setPasswordChange] = useState(initialPasswordChange);
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const { handleLogout, loading, user } = useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return stored === null ? document.body.offsetWidth > 600 : stored === "true";
    } catch (err) {
      return document.body.offsetWidth > 600;
    }
  });
  const [drawerVariant, setDrawerVariant] = useState("permanent");
  const { darkMode, toggleTheme } = useThemeContext();
  const branding = useBranding();
  const backendUrl = getBackendUrl() || "http://localhost:8085";
  const brandName = branding.brandName || "Rocket Service";
  const sidebarLogo = branding.brandLogo ? `${backendUrl}${branding.brandLogo}` : rocketLogo;
  const lastActivityRef = useRef(Date.now());
  const lastTouchRef = useRef(0);
  const returningOnlineRef = useRef(false);
  const [inactivitySettings, setInactivitySettings] = useState({});

  useEffect(() => {
    const updateVariant = () => {
      const mobile = window.innerWidth < 960;
      setDrawerVariant(mobile ? "temporary" : "permanent");
      if (mobile) {
        setDrawerOpen(false);
        return;
      }

      try {
        const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
        setDrawerOpen(stored === null ? true : stored === "true");
      } catch (err) {
        setDrawerOpen(true);
      }
    };

    updateVariant();
    window.addEventListener("resize", updateVariant);
    return () => window.removeEventListener("resize", updateVariant);
  }, []);

  useEffect(() => {
    if (drawerVariant !== "permanent") return;
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(drawerOpen));
    } catch (err) {
      // Keep state in memory when storage is unavailable.
    }
  }, [drawerOpen, drawerVariant]);

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
      if (user.operationalStatus === "away" && !returningOnlineRef.current) {
        returningOnlineRef.current = true;
        try {
          await api.put(`/users/${user.id}/status`, {
            status: "online",
            reason: "activity_return"
          });
        } finally {
          returningOnlineRef.current = false;
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

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuOpen(false);
  };

  const handleOpenPasswordModal = () => {
    setPasswordChange(initialPasswordChange);
    setPasswordModalOpen(true);
    handleCloseMenu();
  };

  const handleClosePasswordModal = (force = false) => {
    if (passwordSubmitting && !force) return;
    setPasswordModalOpen(false);
    setPasswordChange(initialPasswordChange);
    setShowPasswords(false);
  };

  const handlePasswordChangeInput = event => {
    const { name, value } = event.target;
    setPasswordChange(current => ({
      ...current,
      [name]: value
    }));
  };

  const passwordRules = getPasswordRules(passwordChange);
  const canSubmitPasswordChange = passwordRules.every(rule => rule.valid) && passwordChange.currentPassword.length > 0;

  const handlePasswordChangeSubmit = async event => {
    event.preventDefault();
    if (!canSubmitPasswordChange) return;

    setPasswordSubmitting(true);
    try {
      await api.post("/users/change-password", {
        currentPassword: passwordChange.currentPassword,
        newPassword: passwordChange.newPassword
      });
      toast.success("Senha alterada com sucesso.");
      handleClosePasswordModal(true);
    } catch (err) {
      toastError(err);
    } finally {
      setPasswordSubmitting(false);
    }
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
    if (drawerVariant !== "permanent") {
      setDrawerOpen(false);
    }
  };

  const toggleDrawer = () => {
    setDrawerOpen(current => !current);
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
        <div className={clsx(classes.toolbarIcon, !drawerOpen && classes.toolbarIconClosed)}>
          {drawerOpen ? (
            <>
              <div className={classes.sidebarBrand}>
                {sidebarLogo ? (
                  <div className={classes.sidebarLogoFrame}>
                    <img
                      src={sidebarLogo}
                      alt={brandName}
                      className={classes.sidebarLogo}
                      style={branding.brandLogo ? {
                        objectFit: branding.brandLogoFit || "contain",
                        objectPosition: `${branding.brandLogoPositionX || 50}% ${branding.brandLogoPositionY || 50}%`,
                        transform: `scale(${Number(branding.brandLogoScale || 1)})`
                      } : undefined}
                    />
                  </div>
                ) : (
                  <div className={classes.sidebarBrandFallback}>
                    {brandName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <Tooltip title="Recolher menu">
                <IconButton
                  onClick={toggleDrawer}
                  className={classes.collapseButton}
                  aria-label="Recolher menu"
                >
                  <ChevronLeftIcon />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <img src={rocketIcon} alt={brandName} className={classes.sidebarIconLogo} />
          )}
        </div>
        <List>
          <MainListItems drawerClose={drawerClose} drawerOpen={drawerOpen} />
        </List>
      </Drawer>
      <AppBar
        position="absolute"
        className={clsx(
          classes.appBar,
          drawerVariant === "permanent" && drawerOpen && classes.appBarShift,
          drawerVariant === "permanent" && !drawerOpen && classes.appBarShiftCollapsed,
          drawerVariant !== "permanent" && classes.appBarMobile
        )}
      >
        <Toolbar variant="dense" className={classes.toolbar}>
          <IconButton
            edge="start"
            aria-label="open drawer"
            onClick={toggleDrawer}
            className={clsx(
              classes.menuButton,
              drawerVariant === "permanent" && drawerOpen && classes.menuButtonHidden
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
            {drawerVariant !== "permanent" ? brandName : ""}
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
              <MenuItem onClick={handleOpenPasswordModal}>
                Alterar senha
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
      <Dialog
        open={passwordModalOpen}
        onClose={handleClosePasswordModal}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handlePasswordChangeSubmit}>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
              Altere apenas a senha do seu proprio acesso.
            </Typography>
            <TextField
              className={classes.passwordField}
              label="Senha atual"
              name="currentPassword"
              value={passwordChange.currentPassword}
              onChange={handlePasswordChangeInput}
              type={showPasswords ? "text" : "password"}
              variant="outlined"
              fullWidth
              required
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon />
                  </InputAdornment>
                )
              }}
            />
            <TextField
              className={classes.passwordField}
              label="Nova senha"
              name="newPassword"
              value={passwordChange.newPassword}
              onChange={handlePasswordChangeInput}
              type={showPasswords ? "text" : "password"}
              variant="outlined"
              fullWidth
              required
              autoComplete="new-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      type="button"
                      onClick={() => setShowPasswords(current => !current)}
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showPasswords ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              className={classes.passwordField}
              label="Confirmar nova senha"
              name="confirmPassword"
              value={passwordChange.confirmPassword}
              onChange={handlePasswordChangeInput}
              type={showPasswords ? "text" : "password"}
              variant="outlined"
              fullWidth
              required
              autoComplete="new-password"
            />
            <div className={classes.passwordRules}>
              {passwordRules.map(rule => (
                <div
                  key={rule.key}
                  className={clsx(classes.passwordRule, rule.valid && classes.passwordRuleValid)}
                >
                  {rule.valid ? (
                    <CheckCircle className={classes.validIcon} />
                  ) : (
                    <RadioButtonUnchecked className={classes.invalidIcon} />
                  )}
                  <span>{rule.label}</span>
                </div>
              ))}
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePasswordModal} disabled={passwordSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              color="primary"
              variant="contained"
              disabled={!canSubmitPasswordChange || passwordSubmitting}
            >
              Salvar senha
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <main className={classes.content}>
        <div className={classes.appBarSpacer} />
        {children ? children : null}
      </main>
      <MobileNavigation />
    </div>
  );
};

export default LoggedInLayout;
