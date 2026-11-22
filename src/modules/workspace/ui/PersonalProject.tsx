import type { DesignTab } from "@modules/c4-editor";
import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { LoadingPanel } from "@shared/ui/LoadingPanel";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

import type { WorkspaceTab } from "../hooks/useProjectWorkspace";
import { useStudentWorkspaces } from "../hooks/useStudentWorkspaces";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";
import { ProjectWorkspace } from "./ProjectWorkspace";
import { StudentWorkspaceList } from "./StudentWorkspaceList";

export function PersonalProject({
  project,
  accountId,
  isAdmin = false,
  initialShowStudentList = false,
  initialStudentId = "",
  onStudentChange,
}: {
  project: Project;
  accountId: string;
  isAdmin?: boolean;
  initialShowStudentList?: boolean;
  initialStudentId?: string;
  onStudentChange?: (studentId: string) => void;
}) {
  const { t } = useI18n();
  const urlKey = `${initialShowStudentList}:${initialStudentId}`;
  const [viewOverride, setViewOverride] = useState<{
    base: string;
    mode: "self" | "list" | "student";
    studentId: string;
  } | null>(null);
  const defaultMode: "self" | "list" | "student" = !isAdmin
    ? "self"
    : initialStudentId
      ? "student"
      : initialShowStudentList
        ? "list"
        : "self";
  const activeView =
    isAdmin && viewOverride && viewOverride.base === urlKey
      ? viewOverride
      : { mode: defaultMode, studentId: isAdmin ? initialStudentId : "" };

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("assignment");
  const [designTab, setDesignTab] = useState<DesignTab>("readme");

  const viewingStudent = activeView.mode === "student" && Boolean(activeView.studentId);
  const showingList = isAdmin && activeView.mode === "list";
  const targetAccountId = viewingStudent ? activeView.studentId : accountId;
  const { snapshot, error, retry } = useWorkspaceSnapshot(
    project.id,
    targetAccountId,
    viewingStudent,
    !showingList,
  );
  const studentList = useStudentWorkspaces(project.id, isAdmin && (showingList || viewingStudent));

  function handleSelectStudent(nextStudentId: string) {
    setViewOverride({
      base: urlKey,
      mode: nextStudentId ? "student" : "list",
      studentId: nextStudentId,
    });
    onStudentChange?.(nextStudentId);
  }

  if (showingList) {
    return (
      <StudentWorkspaceList
        project={project}
        students={studentList.students}
        onSelectStudent={handleSelectStudent}
        loading={studentList.loading}
        error={studentList.error}
        onRetry={studentList.retry}
      />
    );
  }

  const selectedStudent = viewingStudent
    ? studentList.students.find((student) => student.id === activeView.studentId)
    : undefined;

  if (error)
    return (
      <div className="w-[80%] mx-auto py-4">
        <div className="ui-card p-6 space-y-4">
          <div className="ui-banner-danger" role="alert">
            <div className="flex items-center gap-2.5">
              <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
              <span>{t("draft.loadError")}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" className="ui-btn-outlined" onClick={retry}>
                {t("auth.retry")}
              </button>
              {viewingStudent && (
                <button
                  type="button"
                  className="ui-btn-outlined"
                  onClick={() => handleSelectStudent("")}
                >
                  {t("workspace.backToStudentList")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  if (!snapshot) return <LoadingPanel label={t("common.loading")} />;
  return (
    <ProjectWorkspace
      key={`${project.id}/${snapshot.accountId}`}
      project={project}
      snapshot={snapshot}
      initialActiveTab={activeTab}
      initialDesignTab={designTab}
      readOnly={viewingStudent}
      studentName={selectedStudent?.name}
      closeHref={
        viewingStudent ? `/projects/${encodeURIComponent(project.id)}?students=1` : undefined
      }
      onClose={viewingStudent ? () => handleSelectStudent("") : undefined}
      onActiveTabChange={setActiveTab}
      onDesignTabChange={setDesignTab}
    />
  );
}
