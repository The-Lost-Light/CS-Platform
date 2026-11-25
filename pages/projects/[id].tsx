import { usePageNavigation } from "@app/usePageNavigation";
import { useAuth } from "@modules/auth";
import { useI18n } from "@modules/i18n";
import { PersonalProject } from "@modules/workspace";
import { LoadingPanel } from "@shared/ui";

export default function ProjectPage() {
  const { t } = useI18n();
  const {
    selectedProject,
    showingStudentList,
    selectedStudentId,
    selectStudent,
    markWorkspaceSaved,
  } = usePageNavigation();
  const { currentUser } = useAuth();
  if (!selectedProject || !currentUser?.id) return <LoadingPanel label={t("common.loading")} />;
  return (
    <PersonalProject
      key={currentUser.id + "/" + selectedProject.id}
      project={selectedProject}
      accountId={currentUser.id}
      isAdmin={currentUser.role === "admin"}
      initialShowStudentList={showingStudentList}
      initialStudentId={selectedStudentId}
      onStudentChange={selectStudent}
      onWorkspaceSaved={markWorkspaceSaved}
    />
  );
}
