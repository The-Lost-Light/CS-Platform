import { usePageNavigation } from "@hooks/usePageNavigation";
import { ProjectWorkspace } from "@pages/project/ProjectWorkspace";
import { LoadingPanel } from "@pages/layout/LoadingPanel";

export default function ProjectPage() {
  const { selectedProject } = usePageNavigation();
  if (!selectedProject) return <LoadingPanel />;
  return <ProjectWorkspace key={selectedProject.id} project={selectedProject} />;
}
