import { WorkSpace } from "@app/Workspace";
import { AuthProvider, AuthGate } from "@modules/auth";

import "@app/styles/fonts.css";
import "@app/styles/index.css";
import { ProjectCatalogProvider } from "@modules/catalog";
import { I18nProvider } from "@modules/i18n";

import "@xyflow/react/dist/style.css";
import { ThemeProvider } from "@modules/theme";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-canvas text-on-surface transition-colors duration-200">
            <AuthGate>
              {(session) => (
                <ProjectCatalogProvider>
                  <WorkSpace {...session}>{children}</WorkSpace>
                </ProjectCatalogProvider>
              )}
            </AuthGate>
          </div>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
