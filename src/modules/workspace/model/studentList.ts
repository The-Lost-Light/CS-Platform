import { isProjectOverdue, isWorkspaceLate } from "@modules/projects";

import type { StudentWorkspaceSummary } from "./personalWorkspace";

export type StudentStatusFilter = "all" | "submitted" | "empty" | "late";

export function isStudentOverdue(
  student: Pick<StudentWorkspaceSummary, "hasWorkspace" | "updatedAt">,
  dueDate: string,
  now = Date.now(),
): boolean {
  return (
    isWorkspaceLate(dueDate, student.updatedAt) ||
    (!student.hasWorkspace && isProjectOverdue(dueDate, now))
  );
}

export function sortStudentWorkspaces(
  students: readonly StudentWorkspaceSummary[],
): StudentWorkspaceSummary[] {
  return [...students].sort(
    (a, b) =>
      Number(b.hasWorkspace) - Number(a.hasWorkspace) ||
      a.name.localeCompare(b.name) ||
      a.email.localeCompare(b.email),
  );
}

export function filterStudentWorkspaces(
  students: readonly StudentWorkspaceSummary[],
  options: { search: string; status: StudentStatusFilter; dueDate: string; now?: number },
): StudentWorkspaceSummary[] {
  const query = options.search.trim().toLowerCase();
  return students.filter((student) => {
    if (query && !`${student.name} ${student.email}`.toLowerCase().includes(query)) {
      return false;
    }
    switch (options.status) {
      case "submitted":
        return student.hasWorkspace;
      case "empty":
        return !student.hasWorkspace;
      case "late":
        return isStudentOverdue(student, options.dueDate, options.now);
      case "all":
        return true;
    }
  });
}
