import type { AuthenticatedSession } from "@modules/auth";
import { usePageNavigation } from "./usePageNavigation";
import { Navbar } from "./Navbar";
import type { ReactNode } from "react";

export function WorkSpace({
  currentUser,
  logout,
  children,
}: AuthenticatedSession & { children?: ReactNode }) {
  const { activeView, selectedProject, navigateHome, navigateProject, projects } =
    usePageNavigation();

  return (
    <>
      <Navbar
        activeView={activeView}
        hasProjects={projects.length > 0}
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
