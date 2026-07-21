import React, { createContext, useState, useContext, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { createMuiTheme, ThemeProvider as MUIThemeProvider } from "@material-ui/core/styles";
import { CssBaseline } from "@material-ui/core";

const ThemeContext = createContext();
const THEME_STORAGE_KEY = "rocketserviceDarkMode";

const lightTokens = {
  surface: "#FFFFFF",
  surfaceSoft: "#F8FAFC",
  appBackground: "#F4F7FB",
  sidebar: "#0B3B7A",
  sidebarStrong: "#082A59",
  sidebarSoft: "#0E4A95",
  header: "#FFFFFF",
  border: "#DCE5F2",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  primary: "#2563EB",
  primarySoft: "#DBEAFE",
  accent: "#38BDF8",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
};

const darkTokens = {
  surface: "#111A2E",
  surfaceSoft: "#0F172A",
  appBackground: "#0B1220",
  sidebar: "#08111F",
  sidebarStrong: "#050B14",
  sidebarSoft: "#0B1B33",
  header: "#0B1220",
  border: "#1E293B",
  textPrimary: "#E2E8F0",
  textSecondary: "#94A3B8",
  primary: "#60A5FA",
  primarySoft: "rgba(96, 165, 250, 0.14)",
  accent: "#38BDF8",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#F87171",
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === "true";
    } catch (err) {
      return false;
    }
  });

  const toggleTheme = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, String(darkMode));
    } catch (err) {
      // Ignore storage errors and keep the in-memory theme.
    }
  }, [darkMode]);

  const tokens = darkMode ? darkTokens : lightTokens;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", darkMode ? "dark" : "light");
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(`--rs-${key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}`, value);
    });

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", tokens.header);
    }
  }, [darkMode, tokens]);

  const theme = useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: darkMode ? "dark" : "light",
          primary: {
            main: tokens.primary,
            dark: darkMode ? "#3B82F6" : "#1D4ED8",
            light: darkMode ? "#93C5FD" : "#60A5FA",
            contrastText: "#FFFFFF",
          },
          secondary: {
            main: tokens.accent,
            dark: "#0284C7",
            light: "#BAE6FD",
            contrastText: "#08111F",
          },
          background: {
            default: tokens.appBackground,
            paper: tokens.surface,
          },
          text: {
            primary: tokens.textPrimary,
            secondary: tokens.textSecondary,
          },
          divider: tokens.border,
        },
        shape: {
          borderRadius: 8,
        },
        typography: {
          fontFamily:
            '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h6: {
            fontWeight: 700,
            letterSpacing: 0,
          },
          h4: {
            fontSize: "1.75rem",
            lineHeight: 1.2,
            fontWeight: 800,
            letterSpacing: 0,
          },
          h5: {
            fontSize: "1.35rem",
            lineHeight: 1.25,
            fontWeight: 800,
            letterSpacing: 0,
          },
          button: {
            textTransform: "none",
            fontWeight: 700,
          },
        },
        scrollbarStyles: {
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: darkMode ? "#334155" : "#CBD5E1",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
        },
        custom: {
          tokens,
          sidebar: tokens.sidebar,
          sidebarStrong: tokens.sidebarStrong,
          sidebarSoft: tokens.sidebarSoft,
          header: tokens.header,
          border: tokens.border,
          surfaceSoft: tokens.surfaceSoft,
          cardShadow: darkMode
            ? "0 18px 42px rgba(0, 0, 0, 0.24)"
            : "0 14px 38px rgba(15, 23, 42, 0.07)",
          status: {
            ai: { bg: darkMode ? "rgba(56, 189, 248, 0.16)" : "#E0F2FE", color: darkMode ? "#BAE6FD" : "#0369A1" },
            waiting: { bg: darkMode ? "rgba(245, 158, 11, 0.16)" : "#FEF3C7", color: darkMode ? "#FCD34D" : "#92400E" },
            open: { bg: darkMode ? "rgba(34, 197, 94, 0.16)" : "#DCFCE7", color: darkMode ? "#86EFAC" : "#166534" },
            closed: { bg: darkMode ? "rgba(148, 163, 184, 0.16)" : "#E2E8F0", color: darkMode ? "#CBD5E1" : "#334155" },
            error: { bg: darkMode ? "rgba(248, 113, 113, 0.16)" : "#FEE2E2", color: darkMode ? "#FCA5A5" : "#991B1B" },
          },
        },
        props: {
          MuiTooltip: {
            arrow: true,
            placement: "top",
            enterDelay: 250,
            enterNextDelay: 100,
          },
        },
        overrides: {
          MuiButton: {
            root: {
              borderRadius: 8,
              minHeight: 40,
              boxShadow: "none",
              letterSpacing: 0,
              paddingLeft: 16,
              paddingRight: 16,
            },
            contained: {
              boxShadow: "0 10px 22px rgba(37, 99, 235, 0.18)",
              "&:hover": {
                boxShadow: "0 12px 26px rgba(37, 99, 235, 0.24)",
              },
            },
            outlined: {
              borderColor: darkMode ? "#334155" : "#CBD5E1",
            },
          },
          MuiPaper: {
            root: {
              backgroundImage: "none",
            },
            rounded: {
              borderRadius: 8,
            },
            outlined: {
              borderColor: darkMode ? "#1E293B" : "#E2E8F0",
            },
          },
          MuiChip: {
            root: {
              borderRadius: 999,
              fontWeight: 700,
            },
          },
          MuiTooltip: {
            tooltip: {
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              maxWidth: 280,
              lineHeight: 1.4,
              backgroundColor: darkMode ? "#E2E8F0" : "#0F172A",
              color: darkMode ? "#0F172A" : "#FFFFFF",
            },
            arrow: {
              color: darkMode ? "#E2E8F0" : "#0F172A",
            },
          },
          MuiTab: {
            root: {
              textTransform: "none",
              fontWeight: 700,
              letterSpacing: 0,
              minHeight: 44,
              transition: "color 180ms ease, background-color 180ms ease",
            },
          },
          MuiFormControl: {
            marginDense: {
              marginTop: 8,
              marginBottom: 8,
            },
          },
          MuiFormHelperText: {
            root: {
              marginLeft: 0,
              lineHeight: 1.35,
            },
          },
          MuiInputLabel: {
            outlined: {
              color: tokens.textSecondary,
              fontWeight: 600,
            },
          },
          MuiOutlinedInput: {
            root: {
              borderRadius: 8,
              backgroundColor: darkMode ? "#0B1220" : "#FFFFFF",
              minHeight: 40,
              transition: "border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
              "&:hover $notchedOutline": {
                borderColor: "#93C5FD",
              },
              "&$focused $notchedOutline": {
                borderColor: tokens.primary,
                borderWidth: 1,
              },
            },
            notchedOutline: {
              borderColor: darkMode ? tokens.border : "#CBD5E1",
            },
          },
          MuiTableCell: {
            root: {
              borderBottom: `1px solid ${tokens.border}`,
            },
            head: {
              color: darkMode ? "#CBD5E1" : "#475569",
              fontWeight: 800,
              backgroundColor: tokens.surfaceSoft,
              borderBottom: `1px solid ${tokens.border}`,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            },
            body: {
              borderBottom: `1px solid ${tokens.border}`,
            },
          },
          MuiTableRow: {
            root: {
              transition: "background-color 120ms ease",
              "&:hover": {
                backgroundColor: darkMode ? "rgba(56, 189, 248, 0.08)" : "#F8FAFC",
              },
            },
          },
          MuiDialog: {
            paper: {
              borderRadius: 8,
              border: `1px solid ${tokens.border}`,
              boxShadow: darkMode
                ? "0 24px 70px rgba(0, 0, 0, 0.5)"
                : "0 24px 70px rgba(15, 23, 42, 0.18)",
            },
          },
          MuiDialogTitle: {
            root: {
              borderBottom: `1px solid ${tokens.border}`,
              padding: "18px 24px",
              "& .MuiTypography-root": {
                fontWeight: 800,
              },
            },
          },
          MuiDialogContent: {
            root: {
              padding: "20px 24px",
            },
          },
          MuiDialogActions: {
            root: {
              borderTop: `1px solid ${tokens.border}`,
              padding: "14px 24px",
              gap: 8,
            },
          },
        },
      }),
    [darkMode, tokens]
  );

  const contextValue = useMemo(() => ({ darkMode, toggleTheme, tokens }), [darkMode, tokens]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useThemeContext = () => useContext(ThemeContext);
