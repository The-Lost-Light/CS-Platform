import { usePageNavigation } from "@app/usePageNavigation";
import { useAuth } from "@modules/auth";
import { HomeDashboard } from "@modules/catalog";

export default function HomePage() {
  const { currentUser, logout } = useAuth();
  const { projects, openProject } = usePageNavigation();
  return (
    currentUser && (
      <HomeDashboard
        projects={projects}
        onOpenProject={openProject}
        currentUser={currentUser}
        onLogout={logout}
      />
    )
  );
}
