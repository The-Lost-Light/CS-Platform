import App from "@/App";
import "@/fonts.css";
import { I18nProvider } from "@/i18n";
import "@/index.css";
import { ThemeProvider } from "@/theme";
import "@xyflow/react/dist/style.css";
import React from "react";
import ReactDOM from "react-dom/client";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
