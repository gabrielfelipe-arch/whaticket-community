import React, { createContext, useState, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { createMuiTheme, ThemeProvider as MUIThemeProvider } from "@material-ui/core/styles";
import { CssBaseline } from "@material-ui/core";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  const theme = useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: darkMode ? "dark" : "light",
          primary: {
            main: "#2563EB",
            dark: "#1D4ED8",
            light: "#60A5FA",
            contrastText: "#FFFFFF",
          },
          secondary: {
            main: "#38BDF8",
            dark: "#0284C7",
            light: "#BAE6FD",
            contrastText: "#08111F",
          },
          background: {
            default: darkMode ? "#0B1220" : "#F5F7FB",
            paper: darkMode ? "#111A2E" : "#FFFFFF",
          },
          text: {
            primary: darkMode ? "#E2E8F0" : "#0F172A",
            secondary: darkMode ? "#94A3B8" : "#64748B",
          },
          divider: darkMode ? "#1E293B" : "#E2E8F0",
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
          sidebar: "#08111F",
          sidebarSoft: "#0B1B33",
          border: darkMode ? "#1E293B" : "#E2E8F0",
          cardShadow: darkMode
            ? "0 18px 42px rgba(0, 0, 0, 0.24)"
            : "0 14px 38px rgba(15, 23, 42, 0.08)",
          status: {
            ai: { bg: "#E0F2FE", color: "#0369A1" },
            waiting: { bg: "#FEF3C7", color: "#92400E" },
            open: { bg: "#DCFCE7", color: "#166534" },
            closed: { bg: "#E2E8F0", color: "#334155" },
            error: { bg: "#FEE2E2", color: "#991B1B" },
          },
        },
        overrides: {
          MuiButton: {
            root: {
              borderRadius: 8,
              minHeight: 36,
              boxShadow: "none",
            },
            contained: {
              boxShadow: "0 10px 22px rgba(37, 99, 235, 0.18)",
              "&:hover": {
                boxShadow: "0 12px 26px rgba(37, 99, 235, 0.24)",
              },
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
          MuiTab: {
            root: {
              textTransform: "none",
              fontWeight: 700,
            },
          },
          MuiOutlinedInput: {
            root: {
              borderRadius: 8,
              backgroundColor: darkMode ? "#0B1220" : "#FFFFFF",
              "&:hover $notchedOutline": {
                borderColor: "#93C5FD",
              },
              "&$focused $notchedOutline": {
                borderColor: "#2563EB",
                borderWidth: 1,
              },
            },
            notchedOutline: {
              borderColor: darkMode ? "#1E293B" : "#CBD5E1",
            },
          },
          MuiTableCell: {
            head: {
              color: darkMode ? "#CBD5E1" : "#475569",
              fontWeight: 800,
              backgroundColor: darkMode ? "#0F172A" : "#F8FAFC",
              borderBottom: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`,
            },
            body: {
              borderBottom: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`,
            },
          },
          MuiTableRow: {
            root: {
              "&:hover": {
                backgroundColor: darkMode ? "rgba(56, 189, 248, 0.08)" : "#F8FAFC",
              },
            },
          },
          MuiDialog: {
            paper: {
              borderRadius: 8,
              border: `1px solid ${darkMode ? "#1E293B" : "#E2E8F0"}`,
            },
          },
        },
      }),
    [darkMode]
  );

  const contextValue = useMemo(() => ({ darkMode, toggleTheme }), [darkMode]);

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
