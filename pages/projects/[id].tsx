import { useI18n } from "@modules/i18n";
import { usePageNavigation } from "@app/usePageNavigation";
import { LoadingPanel } from "@shared/ui/LoadingPanel";
import { useAuth } from "@modules/auth";
import { PersonalProject } from "@modules/workspace";

export default function ProjectPage() {
  const { t } = useI18n();
  const { selectedProject } = usePageNavigation();
  const { currentUser } = useAuth();
  if (!selectedProject || !currentUser?.id) return <LoadingPanel label={t("common.loading")} />;
  return (
    <PersonalProject
      key={currentUser.id + "/" + selectedProject.id}
      project={selectedProject}
      accountId={currentUser.id}
    />
  );
}
