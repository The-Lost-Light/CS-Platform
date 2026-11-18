import { usePageNavigation } from "@hooks/usePageNavigation";
import { LoadingPanel } from "@pages/layout/LoadingPanel";
import { useAuth } from "@auth/AuthProvider";
import { PersonalProject } from "@pages/project/PersonalProject";

export default function ProjectPage() {
  const { selectedProject } = usePageNavigation();
  const { currentUser } = useAuth();
  if (!selectedProject || !currentUser?.id) return <LoadingPanel />;
  return (
    <PersonalProject
      key={currentUser.id + "/" + selectedProject.id}
      project={selectedProject}
      accountId={currentUser.id}
    />
  );
}
