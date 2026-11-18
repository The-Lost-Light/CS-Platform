import type { AuthenticatedSession } from "@auth/types";
import { usePageNavigation } from "@hooks/usePageNavigation";
import { Navbar } from "@pages/layout/Navbar";
import type { ReactNode } from "react";

export function WorkSpace({
  currentUser,
  logout,
  children,
}: AuthenticatedSession & { children?: ReactNode }) {
  const { activeView, selectedProject, navigateHome, navigateProject } = usePageNavigation();

  return (
    <>
      <Navbar
        activeView={activeView}
        selectedProject={activeView === "project" ? (selectedProject ?? null) : null}
        onNavigateHome={navigateHome}
        onSelectProjectDefault={navigateProject}
        currentUser={currentUser}
        onLogout={async () => {
          await logout();
          navigateHome();
        }}
      />

      <main className="flex-1">{children}</main>
    </>
  );
}
