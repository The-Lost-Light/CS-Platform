import type { DesignTab } from "@modules/c4-editor";
import { useI18n } from "@modules/i18n";
import { isProjectOverdue, parseProjectDueDate, type Project } from "@modules/projects";
import { Button, Card, FeedbackBanner, LoadingPanel, PageContainer } from "@shared/ui";
import { useEffect, useState } from "react";

import type { WorkspaceTab } from "../hooks/useProjectWorkspace";
import { useStudentWorkspaces, useWorkspaceSnapshot } from "../hooks/useWorkspaceData";
import {
  filterStudentWorkspaces,
  sortStudentWorkspaces,
  type StudentStatusFilter,
} from "../model/studentList";
import { ProjectWorkspace, type StudentNavigation } from "./ProjectWorkspace";
import { StudentWorkspaceList } from "./StudentWorkspaceList";

export function PersonalProject({
  project,
  accountId,
  isAdmin = false,
  initialShowStudentList = false,
  initialStudentId = "",
  onStudentChange,
  onWorkspaceSaved,
}: {
  project: Project;
  accountId: string;
  isAdmin?: boolean;
  initialShowStudentList?: boolean;
  initialStudentId?: string;
  onStudentChange?: (studentId: string) => void;
  onWorkspaceSaved?: (projectId: string, updatedAt: number) => void;
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

  const [selfTab, setSelfTab] = useState<WorkspaceTab>("assignment");
  const [studentTab, setStudentTab] = useState<WorkspaceTab>("design");
  const [designTab, setDesignTab] = useState<DesignTab>("readme");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentStatusFilter>("all");
  const [now, setNow] = useState(() => Date.now());
  const [serverDeadlineLocked, setServerDeadlineLocked] = useState(false);

  const viewingStudent = activeView.mode === "student" && Boolean(activeView.studentId);
  const showingList = isAdmin && activeView.mode === "list";
  const targetAccountId = viewingStudent ? activeView.studentId : accountId;
  const dueTimestamp = parseProjectDueDate(project.dueDate);

  useEffect(() => {
    if (isAdmin || viewingStudent || dueTimestamp === null || now > dueTimestamp) return;
    const remaining = dueTimestamp - Date.now();
    const timer = setTimeout(
      () => setNow(Date.now()),
      remaining <= 0 ? 0 : Math.min(remaining + 50, 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [isAdmin, viewingStudent, dueTimestamp, now]);

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
        search={studentSearch}
        onSearchChange={setStudentSearch}
        statusFilter={studentStatusFilter}
        onStatusFilterChange={setStudentStatusFilter}
        now={now}
      />
    );
  }

  const sortedStudents = sortStudentWorkspaces(studentList.students);
  const selectedStudent = viewingStudent
    ? sortedStudents.find((student) => student.id === activeView.studentId)
    : undefined;
  const filteredStudents = filterStudentWorkspaces(sortedStudents, {
    search: studentSearch,
    status: studentStatusFilter,
    dueDate: project.dueDate,
    now,
  });

  let studentNavigation: StudentNavigation | undefined;
  if (viewingStudent) {
    const navList = filteredStudents.some((student) => student.id === activeView.studentId)
      ? filteredStudents
      : sortedStudents;
    const currentIndex = navList.findIndex((student) => student.id === activeView.studentId);
    if (currentIndex >= 0) {
      const prevStudent = currentIndex > 0 ? navList[currentIndex - 1] : undefined;
      const nextStudent = currentIndex < navList.length - 1 ? navList[currentIndex + 1] : undefined;
      studentNavigation = {
        currentIndex,
        total: navList.length,
        previousName: prevStudent?.name,
        nextName: nextStudent?.name,
        onPrevious: prevStudent ? () => handleSelectStudent(prevStudent.id) : undefined,
        onNext: nextStudent ? () => handleSelectStudent(nextStudent.id) : undefined,
      };
    }
  }

  const deadlineLocked =
    !isAdmin && !viewingStudent && (serverDeadlineLocked || isProjectOverdue(project.dueDate, now));

  if (error)
    return (
      <PageContainer variant="workspace">
        <Card as="div" className="p-6 space-y-4">
          <FeedbackBanner
            kind="error"
            action={
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outlined" onClick={retry}>
                  {t("auth.retry")}
                </Button>
                {viewingStudent && (
                  <Button variant="outlined" onClick={() => handleSelectStudent("")}>
                    {t("workspace.backToStudentList")}
                  </Button>
                )}
              </div>
            }
          >
            <span>{t("draft.loadError")}</span>
          </FeedbackBanner>
        </Card>
      </PageContainer>
    );
  if (!snapshot) return <LoadingPanel label={t("common.loading")} />;
  return (
    <ProjectWorkspace
      key={`${project.id}/${snapshot.accountId}`}
      project={project}
      snapshot={snapshot}
      initialActiveTab={viewingStudent ? studentTab : selfTab}
      initialDesignTab={designTab}
      readOnly={viewingStudent}
      deadlineLocked={deadlineLocked}
      onDeadlineLocked={() => setServerDeadlineLocked(true)}
      onWorkspaceSaved={onWorkspaceSaved}
      studentName={selectedStudent?.name}
      studentNavigation={studentNavigation}
      closeHref={
        viewingStudent ? `/projects/${encodeURIComponent(project.id)}?students=1` : undefined
      }
      onClose={viewingStudent ? () => handleSelectStudent("") : undefined}
      onActiveTabChange={viewingStudent ? setStudentTab : setSelfTab}
      onDesignTabChange={setDesignTab}
      now={now}
    />
  );
}
