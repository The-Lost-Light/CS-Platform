import { useProjectCatalog } from "@modules/catalog";
import type { Project } from "@modules/projects";
import { useParams, useRouter } from "@void/react";

export function usePageNavigation() {
  const { projects } = useProjectCatalog();
  const router = useRouter();
  const { id } = useParams();
  const selectedProject = id ? projects.find((project) => project.id === id) : undefined;
  const showingStudentList = router.query.get("students") === "1";
  const selectedStudentId = router.query.get("student") ?? "";

  const openProject = (project: Project) => {
    void router.visit(`/projects/${encodeURIComponent(project.id)}`);
  };

  const openStudentProjects = (project: Project) => {
    void router.visit(`/projects/${encodeURIComponent(project.id)}?students=1`);
  };

  const selectStudent = (studentId: string) => {
    if (!id) return;
    const base = `/projects/${encodeURIComponent(id)}`;
    const url = studentId
      ? `${base}?student=${encodeURIComponent(studentId)}`
      : `${base}?students=1`;
    void router.visit(url, { replace: true, preserveState: true, preserveScroll: true });
  };

  return {
    projects,
    selectedProject,
    showingStudentList,
    selectedStudentId,
    openProject,
    openStudentProjects,
    selectStudent,
  };
}
