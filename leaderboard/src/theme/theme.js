import { createTheme, alpha } from "@mui/material/styles";

export const themeTokens = {
  appBackground: "#07111f",
  panelBackground: "#0d1b31",
  panelBackgroundElevated: "#122440",
  panelBorder: "#29415d",
  primaryText: "#f5f8ff",
  secondaryText: "#9fb2ca",
  maize: "#ffcb05",
  linkBlue: "#63a4ff",
  success: "#4caf72",
  warning: "#ffb74d",
  error: "#ef5350",
  divider: "#20344d",
};

const headingFont = '"Roboto Condensed", "Arial Narrow", "Arial", sans-serif';
const bodyFont = '"Roboto", "Arial", sans-serif';
const customShape = {
  panelRadius: 3,
  controlRadius: 4,
  scoreboardRadius: 3,
  chipRadius: 999,
};

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: themeTokens.maize,
      contrastText: "#08111f",
    },
    secondary: {
      main: themeTokens.linkBlue,
    },
    success: {
      main: themeTokens.success,
    },
    warning: {
      main: themeTokens.warning,
    },
    error: {
      main: themeTokens.error,
    },
    background: {
      default: themeTokens.appBackground,
      paper: themeTokens.panelBackground,
    },
    text: {
      primary: themeTokens.primaryText,
      secondary: themeTokens.secondaryText,
    },
    divider: themeTokens.divider,
  },
  shape: {
    borderRadius: 4,
  },
  customShape,
  typography: {
    fontFamily: bodyFont,
    h1: { fontFamily: headingFont, fontWeight: 800 },
    h2: { fontFamily: headingFont, fontWeight: 800 },
    h3: { fontFamily: headingFont, fontWeight: 800 },
    h4: { fontFamily: headingFont, fontWeight: 800 },
    h5: { fontFamily: headingFont, fontWeight: 800 },
    h6: { fontFamily: headingFont, fontWeight: 800 },
    subtitle1: { fontWeight: 700 },
    button: {
      fontFamily: headingFont,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          width: "100%",
          overflowX: "hidden",
          backgroundColor: themeTokens.appBackground,
        },
        body: {
          width: "100%",
          overflowX: "hidden",
          background:
            "radial-gradient(circle at top, #12325b 0%, #07111f 45%, #050c16 100%)",
        },
        "#root": {
          minHeight: "100vh",
        },
        a: {
          color: themeTokens.linkBlue,
        },
        "*": {
          boxSizing: "border-box",
        },
        "*::-webkit-scrollbar": {
          width: 10,
          height: 10,
        },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: alpha(themeTokens.secondaryText, 0.3),
          borderRadius: 999,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${alpha(themeTokens.panelBorder, 0.9)}`,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: customShape.controlRadius,
          minHeight: 42,
          paddingInline: 18,
        },
        containedPrimary: {
          "&:hover": {
            backgroundColor: "#ffd84a",
          },
        },
        outlined: {
          borderColor: alpha(themeTokens.primaryText, 0.22),
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          border: `1px solid ${alpha(themeTokens.panelBorder, 0.9)}`,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: alpha(themeTokens.divider, 0.9),
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderRadius: customShape.chipRadius,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: alpha(themeTokens.divider, 0.9),
        },
        head: {
          color: themeTokens.secondaryText,
          fontFamily: headingFont,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#10233d",
          border: `1px solid ${themeTokens.panelBorder}`,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(themeTokens.primaryText, 0.08),
        },
      },
    },
  },
});

export default theme;
