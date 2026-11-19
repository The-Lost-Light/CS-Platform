import { useI18n } from "@modules/i18n";
import { Link } from "@void/react";
import { AlertCircle, CheckCircle2, FolderGit2, Plus, Search } from "lucide-react";
import { useImperativeHandle, useState, type Ref } from "react";

import { useProjectList } from "../hooks/useProjectList";
import { ConfirmDelete } from "./ConfirmDelete";
import { CreateProject } from "./CreateProject";
import type { ManagementListHandle } from "./ManagementListHandle";

export function ProjectList({ ref }: { ref: Ref<ManagementListHandle> }) {
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
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
  useImperativeHandle(ref, () => ({
    showList() {
      setCreating(false);
      cancelEdit();
      cancelDelete();
    },
  }));
  if (creating) return <CreateProject onCancel={() => setCreating(false)} />;
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
    <section className="ui-card overflow-hidden">
      <header className="ui-card-header flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="ui-icon-badge w-9 h-9">
            <FolderGit2 aria-hidden="true" className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-on-primary-container truncate">
            {t("admin.allProjects", { count })}
          </h2>
        </div>
        <button
          type="button"
          disabled={!!deleting}
          onClick={() => setCreating(true)}
          className="ui-btn-primary px-4 py-2 text-xs sm:text-sm shrink-0"
        >
          <Plus aria-hidden="true" className="w-4 h-4" />
          {t("admin.add")}
        </button>
      </header>

      <div className="p-5 sm:p-6 space-y-4">
        <label className="ui-field-label">
          {t("admin.search")}
          <div className="relative mt-1.5">
            <Search
              aria-hidden="true"
              className="w-4 h-4 text-on-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="search"
              className="ui-input pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </label>

        {saved && (
          <div role="status" className="ui-banner-success">
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />
              <span>{t("admin.saved")}</span>
            </div>
          </div>
        )}
        {error && (
          <div role="alert" className="ui-banner-danger">
            <div className="flex items-center gap-2">
              <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
              <span>{t("admin.operationFailed")}</span>
            </div>
          </div>
        )}

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

        {visible.length > 0 ? (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t("admin.projects.code")}</th>
                  <th>{t("admin.projects.name")}</th>
                  <th>{t("admin.projects.dueDate")}</th>
                  <th>{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <span className="ui-code-badge">{project.codeName}</span>
                    </td>
                    <td>
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-semibold text-on-surface hover:text-primary underline decoration-outline underline-offset-4 transition-colors"
                      >
                        {project.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap font-mono text-xs text-on-muted">
                      {project.dueDate || "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!!deleting}
                          className="ui-btn-tonal px-3 py-1.5"
                          onClick={() => edit(project)}
                        >
                          {t("admin.edit")}
                        </button>
                        <button
                          type="button"
                          disabled={!!deleting}
                          className="ui-btn-danger-tonal px-3 py-1.5"
                          onClick={() => requestDelete(project)}
                        >
                          {t("admin.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ui-empty">{t("admin.empty")}</p>
        )}
      </div>
    </section>
  );
}
