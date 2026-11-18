import type { AuthenticatedSession } from "@auth/types";
import { usePageNavigation } from "@hooks/usePageNavigation";
import { Navbar } from "@pages/layout/Navbar";
import { Link } from "@void/react";
import { useI18n } from "@i18n";
import type { ReactNode } from "react";

export function WorkSpace({
  currentUser,
  logout,
  children,
}: AuthenticatedSession & { children?: ReactNode }) {
  const { activeView, selectedProject, navigateHome, navigateProject } = usePageNavigation();

  const { t } = useI18n();
  return (
    <>
      <Navbar
        activeView={activeView}
        selectedProject={activeView === "project" ? selectedProject : null}
        onNavigateHome={navigateHome}
        onSelectProjectDefault={navigateProject}
        currentUser={currentUser}
        onLogout={async () => {
          await logout();
          navigateHome();
        }}
      />

      <main className="flex-1">
        {currentUser.role === "admin" && (
          <div className="px-4 py-2">
            <Link href="/admin">{t("admin.title")}</Link>
          </div>
        )}
        {children}
      </main>
    </>
  );
}
