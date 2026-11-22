import { useI18n } from "@modules/i18n";
import { Card, Chip, DataTable, FeedbackBanner } from "@shared/ui";
import { Link } from "@void/react";
import { FolderGit2 } from "lucide-react";
import { useImperativeHandle, useState, type Ref } from "react";

import { useProjectList } from "../hooks/useProjectList";
import { ConfirmDelete } from "./ConfirmDelete";
import { CreateProject } from "./CreateProject";
import {
  ManagementListHeader,
  ManagementRowActions,
  ManagementSearch,
} from "./ManagementListControls";
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
    finishCreate,
    cancelDelete,
  } = useProjectList();
  useImperativeHandle(ref, () => ({
    showList() {
      setCreating(false);
      cancelEdit();
      cancelDelete();
    },
  }));
  return (
    <Card overflowHidden>
      <ManagementListHeader
        className="flex flex-wrap items-center justify-between gap-3"
        title={t("admin.allProjects", { count })}
        icon={FolderGit2}
        disabled={!!deleting}
        onAdd={() => setCreating(true)}
      />

      <div className="p-5 sm:p-6 space-y-4">
        <ManagementSearch value={search} onChange={setSearch} />

        {saved && (
          <FeedbackBanner kind="success">
            {saved === "updated" ? (
              <span>{t("admin.saved")}</span>
            ) : (
              <>
                <span>{t("admin.projects.success")}</span>
                <Link href={`/projects/${saved.id}`} className="underline font-semibold">
                  {t("admin.projects.open")} — {saved.title}
                </Link>
              </>
            )}
          </FeedbackBanner>
        )}
        {error && (
          <FeedbackBanner kind="error">
            <span>{t("admin.operationFailed")}</span>
          </FeedbackBanner>
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

        <DataTable
          headers={[
            t("admin.projects.code"),
            t("admin.projects.name"),
            t("admin.projects.dueDate"),
            t("admin.actions"),
          ]}
          isEmpty={visible.length === 0}
          emptyMessage={t("admin.empty")}
        >
          {visible.map((project) => (
            <tr key={project.id}>
              <td>
                <Chip variant="code">{project.codeName}</Chip>
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
              <ManagementRowActions
                disabled={!!deleting}
                onEdit={() => edit(project)}
                onDelete={() => requestDelete(project)}
              />
            </tr>
          ))}
        </DataTable>
      </div>
      {creating && (
        <CreateProject
          onCancel={() => setCreating(false)}
          onSaved={(project) => {
            setCreating(false);
            finishCreate(project);
          }}
        />
      )}
      {editing && (
        <CreateProject
          key={editing.id}
          project={editing}
          onCancel={cancelEdit}
          onSaved={finishEdit}
        />
      )}
    </Card>
  );
}
