/* Praise Kier */
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ConnectionGate } from "./components/ConnectionGate";
import { App } from "./App";
import "./styles/index.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ConnectionGate>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ConnectionGate>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
