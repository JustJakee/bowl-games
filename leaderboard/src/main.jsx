// CONFIG — APP — REACT
// Provider order makes routing, authentication, scoreboard data, and player data available to every page.
import React from "react";
import ReactDOM from "react-dom/client";
import "@aws-amplify/ui-react/styles.css";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import "./index.css";
import App from "./App.jsx";
import { ScoreboardProvider } from "./context/NCAAFDataContext";
import { AuthProvider } from "./auth/AuthContext";
import { AppDataProvider } from "./app/AppDataContext.jsx";
import theme from "./theme/theme";
import { InstallProvider } from "./pwa/InstallContext.jsx";
import { registerServiceWorker } from "./pwa/registerServiceWorker.js";

registerServiceWorker();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <InstallProvider>
          <AuthProvider>
            <ScoreboardProvider>
              <AppDataProvider>
                <App />
              </AppDataProvider>
            </ScoreboardProvider>
          </AuthProvider>
        </InstallProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
