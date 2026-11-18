import { Link } from "@void/react";
import { useI18n } from "@modules/i18n";
import { CreateProject } from "./CreateProject";
import { ConfirmDelete } from "./ConfirmDelete";

import { useProjectList } from "../hooks/useProjectList";

export function ProjectList() {
  const { t } = useI18n();
  const {
    count,
    visible,
    search,
    setSearch,
    saved,
    pending,
    editing,
    deleting,
    error,
    remove,
    edit,
    requestDelete,
    cancelEdit,
    finishEdit,
    cancelDelete,
  } = useProjectList();
  if (editing)
    return (
      <CreateProject
        key={editing.id}
        project={editing}
        onCancel={cancelEdit}
        onSaved={finishEdit}
      />
    );

  return (
    <section className="ui-card p-5 space-y-4">
      <h2 className="text-lg font-bold">{t("admin.allProjects", { count })}</h2>
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
          onCancel={cancelDelete}
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
                    onClick={() => edit(project)}
                  >
                    {t("admin.edit")}
                  </button>
                  <button
                    type="button"
                    disabled={!!deleting}
                    className="px-3 py-2"
                    onClick={() => requestDelete(project)}
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
