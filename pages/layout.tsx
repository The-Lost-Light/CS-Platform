import { AuthProvider, AuthGate } from "@modules/auth";
import { I18nProvider } from "@modules/i18n";
import "@app/styles/fonts.css";
import "@app/styles/index.css";
import { WorkSpace } from "@app/Workspace";
import { ThemeProvider } from "@modules/theme";
import "@xyflow/react/dist/style.css";
import type { ReactNode } from "react";
import { ProjectCatalogProvider } from "@modules/catalog";

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
