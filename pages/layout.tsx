import { WorkSpace } from "@app/Workspace";
import { AuthProvider, AuthGate, useAuth } from "@modules/auth";

import "@app/styles/fonts.css";
import "@app/styles/index.css";
import { ProjectCatalogProvider } from "@modules/catalog";
import { I18nProvider } from "@modules/i18n";
import { SettingsDialog, SettingsProvider } from "@modules/settings";

import "@xyflow/react/dist/style.css";
import { ThemeProvider } from "@modules/theme";
import type { ReactNode } from "react";

function SettingsShell({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const accountScope = currentUser ? (currentUser.id ?? currentUser.studentId) : null;

  return (
    <SettingsProvider accountScope={accountScope}>
      <div className="min-h-screen flex flex-col bg-canvas text-on-surface transition-colors duration-200">
        <AuthGate>
          {(session) => (
            <ProjectCatalogProvider>
              <WorkSpace {...session}>{children}</WorkSpace>
            </ProjectCatalogProvider>
          )}
        </AuthGate>
      </div>
      <SettingsDialog showGithubToken={Boolean(currentUser)} />
    </SettingsProvider>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <SettingsShell>{children}</SettingsShell>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
