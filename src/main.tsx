import { AuthProvider } from "@/auth/AuthProvider";
import { I18nProvider } from "@/i18n";
import { AuthGate } from "@/pages/auth/AuthGate";
import "@/pages/styles/fonts.css";
import "@/pages/styles/index.css";
import { WorkSpace } from "@/pages/Workspace";
import { ThemeProvider } from "@/theme";
import "@xyflow/react/dist/style.css";
import React from "react";
import ReactDOM from "react-dom/client";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-canvas text-on-surface transition-colors duration-200">
            <AuthGate>{(session) => <WorkSpace {...session} />}</AuthGate>
          </div>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
