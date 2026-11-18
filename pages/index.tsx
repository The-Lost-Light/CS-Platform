import { useAuth } from "@auth/AuthProvider";
import { usePageNavigation } from "@hooks/usePageNavigation";
import { HomeDashboard } from "@pages/home/HomeDashboard";

export default function HomePage() {
  const { currentUser } = useAuth();
  const { projects, openProject } = usePageNavigation();
  return (
    currentUser && (
      <HomeDashboard projects={projects} onOpenProject={openProject} currentUser={currentUser} />
    )
  );
}
