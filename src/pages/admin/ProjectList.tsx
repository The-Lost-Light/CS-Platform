import { useState } from "react";
import { Link } from "@void/react";
import { useProjectCatalog } from "@hooks/ProjectCatalog";
import { useI18n } from "@i18n";
import type { Project } from "@domain/project";
import { CreateProject } from "@pages/admin/CreateProject";
import { ConfirmDelete } from "@pages/admin/ConfirmDelete";

export function ProjectList() {
  const { t } = useI18n();
  const { projects, removeProject } = useProjectCatalog();
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  async function remove() {
    if (!deleting || pending) return;
    setPending(true);
    setError(false);
    setSaved(false);
    try {
      const response = await fetch(`/api/projects/${deleting.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error("Delete failed");
      removeProject(deleting.id);
      setDeleting(null);
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  if (editing)
    return (
      <CreateProject
        key={editing.id}
        project={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setSaved(true);
        }}
      />
    );
  const visible = projects.filter((project) =>
    `${project.codeName} ${project.title}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="ui-card p-5 space-y-4">
      <h2 className="text-lg font-bold">{t("admin.allProjects", { count: projects.length })}</h2>
      <label className="block">
        {t("admin.search")}
        <input
          type="search"
          className="ui-input p-2 mt-1"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {saved && <p role="status">{t("admin.saved")}</p>}
      {error && <p role="alert">{t("admin.operationFailed")}</p>}
      {deleting && (
        <ConfirmDelete
          name={deleting.title}
          pending={pending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            void remove();
          }}
        />
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr>
              <th className="p-3">{t("admin.projects.code")}</th>
              <th className="p-3">{t("admin.projects.name")}</th>
              <th className="p-3">{t("admin.projects.dueDate")}</th>
              <th className="p-3">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((project) => (
              <tr key={project.id} className="border-t border-outline">
                <td className="p-3 font-mono">{project.codeName}</td>
                <td className="p-3">
                  <Link href={`/projects/${project.id}`} className="underline">
                    {project.title}
                  </Link>
                </td>
                <td className="p-3 whitespace-nowrap">{project.dueDate || "—"}</td>
                <td className="p-3 whitespace-nowrap">
                  <button
                    type="button"
                    disabled={!!deleting}
                    className="px-3 py-2"
                    onClick={() => {
                      setEditing(project);
                      setSaved(false);
                      setError(false);
                    }}
                  >
                    {t("admin.edit")}
                  </button>
                  <button
                    type="button"
                    disabled={!!deleting}
                    className="px-3 py-2"
                    onClick={() => {
                      setDeleting(project);
                      setSaved(false);
                      setError(false);
                    }}
                  >
                    {t("admin.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && <p>{t("admin.empty")}</p>}
    </section>
  );
}
