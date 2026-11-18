import { usePageNavigation } from "@hooks/usePageNavigation";
import { ProjectWorkspace } from "@pages/project/ProjectWorkspace";

export default function ProjectPage() {
  const { selectedProject } = usePageNavigation();
  return <ProjectWorkspace key={selectedProject.id} project={selectedProject} />;
}
