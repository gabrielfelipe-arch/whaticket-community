import React, { useState, useEffect } from "react";
import axios from "axios";
import Routes from "./routes";
import "react-toastify/dist/ReactToastify.css";

import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import { ptBR } from "@material-ui/core/locale";
import { CssBaseline } from "@material-ui/core";
import { BrandingProvider } from "./context/Branding";
import { getBackendUrl } from "./config";
import openSocket from "./services/socket-io";

const brandingKeys = [
  "brandName",
  "brandLogo",
  "brandLogoFit",
  "brandLogoPositionX",
  "brandLogoPositionY",
  "brandLogoScale",
  "companyFantasyName",
  "companyLegalName",
  "companyCnpj",
  "companyAddress",
  "companyPhone",
  "companyEmail",
  "companyWebsite"
];

const App = () => {
  const [locale, setLocale] = useState();
  const [branding, setBranding] = useState({
    brandName: "WhaTicket",
    brandLogo: "",
    brandLogoFit: "contain",
    brandLogoPositionX: "50",
    brandLogoPositionY: "50",
    brandLogoScale: "1",
    companyFantasyName: "",
    companyLegalName: "",
    companyCnpj: "",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    companyWebsite: ""
  });

  const theme = createTheme(
    {
      scrollbarStyles: {
        "&::-webkit-scrollbar": {
          width: "8px",
          height: "8px",
        },
        "&::-webkit-scrollbar-thumb": {
          boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
          backgroundColor: "#e8e8e8",
        },
      },
      palette: {
        primary: { main: "#2563EB" },
        secondary: { main: "#38BDF8" },
      },
    },
    locale
  );

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const { data } = await axios.get(`${getBackendUrl() || "http://localhost:8085"}/public-settings`);
        const nextBranding = { ...branding };
        data.forEach(setting => {
          nextBranding[setting.key] = setting.value;
        });
        setBranding(nextBranding);
      } catch (err) {
        // Keep default branding if the backend is still starting.
      }
    };

    loadBranding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = openSocket();

    socket.on("settings", data => {
      if (data.action === "update" && brandingKeys.includes(data.setting?.key)) {
        setBranding(prev => ({
          ...prev,
          [data.setting.key]: data.setting.value
        }));
      }
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const i18nlocale = localStorage.getItem("i18nextLng");
    const browserLocale =
      i18nlocale.substring(0, 2) + i18nlocale.substring(3, 5);

    if (browserLocale === "ptBR") {
      setLocale(ptBR);
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrandingProvider value={branding}>
        <Routes />
      </BrandingProvider>
    </ThemeProvider>
  );
};

export default App;
