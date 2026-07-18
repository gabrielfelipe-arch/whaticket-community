import React, { useEffect, useState } from "react";
import {
  Button,
  IconButton,
  Snackbar,
  makeStyles
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import CloudOffIcon from "@material-ui/icons/CloudOff";
import SystemUpdateAltIcon from "@material-ui/icons/SystemUpdateAlt";
import GetAppIcon from "@material-ui/icons/GetApp";

import { applyServiceWorkerUpdate } from "../../pwa";

const INSTALL_PROMPT_DISMISSED_KEY = "rocketservicePwaInstallDismissedAt";

const useStyles = makeStyles(theme => ({
  snackbar: {
    [theme.breakpoints.down("sm")]: {
      bottom: "calc(76px + env(safe-area-inset-bottom))",
    },
  },
  content: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    fontWeight: 700,
  },
  action: {
    color: "#FFFFFF",
    borderColor: "rgba(255,255,255,0.38)",
  },
}));

const wasInstallPromptRecentlyDismissed = () => {
  try {
    const dismissedAt = Number(localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) || 0);
    if (!dismissedAt) return false;
    return Date.now() - dismissedAt < 1000 * 60 * 60 * 24 * 14;
  } catch (err) {
    return true;
  }
};

const isMobileInstallSurface = () => {
  if (typeof window === "undefined") return false;

  const hasSmallViewport = window.matchMedia("(max-width: 900px)").matches;
  const hasTouchPointer = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

  return hasSmallViewport && hasTouchPointer;
};

const PwaStatus = () => {
  const classes = useStyles();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installVisible, setInstallVisible] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    const handleBeforeInstallPrompt = event => {
      event.preventDefault();
      if (!isMobileInstallSurface()) return;
      if (wasInstallPromptRecentlyDismissed()) return;
      setInstallPrompt(event);
      setInstallVisible(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("rocketservice:update-available", handleUpdateAvailable);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("rocketservice:update-available", handleUpdateAvailable);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleReload = async () => {
    await applyServiceWorkerUpdate();
    window.location.reload();
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    setInstallVisible(false);
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  };

  const dismissInstall = () => {
    try {
      localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, String(Date.now()));
    } catch (err) {
      // No-op.
    }
    setInstallVisible(false);
  };

  return (
    <>
      <Snackbar
        className={classes.snackbar}
        open={!online}
        message={(
          <span className={classes.content}>
            <CloudOffIcon fontSize="small" />
            Sem conexão. Algumas ações foram pausadas até a internet voltar.
          </span>
        )}
      />
      <Snackbar
        className={classes.snackbar}
        open={updateAvailable}
        message={(
          <span className={classes.content}>
            <SystemUpdateAltIcon fontSize="small" />
            Nova versão disponível.
          </span>
        )}
        action={(
          <Button size="small" variant="outlined" className={classes.action} onClick={handleReload}>
            Atualizar
          </Button>
        )}
      />
      <Snackbar
        className={classes.snackbar}
        open={installVisible}
        message={(
          <span className={classes.content}>
            <GetAppIcon fontSize="small" />
            Instalar Rocket Service neste dispositivo?
          </span>
        )}
        action={(
          <>
            <Button size="small" variant="outlined" className={classes.action} onClick={handleInstall}>
              Instalar
            </Button>
            <IconButton size="small" color="inherit" onClick={dismissInstall} aria-label="Dispensar instalação">
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        )}
      />
    </>
  );
};

export default PwaStatus;
