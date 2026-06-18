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

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <ScoreboardProvider>
            <AppDataProvider>
              <App />
            </AppDataProvider>
          </ScoreboardProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
