import React from "react";
import ReactDOM from "react-dom/client";
import "@aws-amplify/ui-react/styles.css";
import "./index.css";
import App from "./App.jsx";
import { ScoreboardProvider } from "./context/NCAAFDataContext";
import { AuthProvider } from "./auth/AuthContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ScoreboardProvider>
        <App />
      </ScoreboardProvider>
    </AuthProvider>
  </React.StrictMode>
);
