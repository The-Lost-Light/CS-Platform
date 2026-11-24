import { useI18n } from "@modules/i18n";
import { Card, Chip, DataTable, FeedbackBanner } from "@shared/ui";
import { Link } from "@void/react";
import { FolderGit2, GripVertical } from "lucide-react";
import { useImperativeHandle, useState, type DragEvent, type Ref } from "react";

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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
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
    canReorder,
    remove,
    reorder,
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

  const draggingIndex = draggingId ? visible.findIndex((item) => item.id === draggingId) : -1;

  function handleDrop(targetId: string, event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
    const sourceId = draggingId || event.dataTransfer?.getData("text/plain");
    setDraggingId(null);
    setDragOverId(null);
    if (!canReorder || !sourceId || sourceId === targetId) return;
    const fromIndex = visible.findIndex((item) => item.id === sourceId);
    const toIndex = visible.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const nextIds = visible.map((item) => item.id);
    nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, sourceId);
    void reorder(nextIds);
  }

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
            t("admin.projects.index"),
            t("admin.projects.name"),
            t("admin.projects.dueDate"),
            t("admin.actions"),
          ]}
          isEmpty={visible.length === 0}
          emptyMessage={t("admin.empty")}
        >
          {visible.map((project, index) => {
            const isDragging = draggingId === project.id;
            const isDropTarget =
              dragOverId === project.id && draggingIndex !== -1 && draggingIndex !== index;
            const dropLineClass = isDropTarget
              ? draggingIndex > index
                ? "bg-primary-container/25 shadow-[inset_0_2px_0_0_var(--color-primary)]"
                : "bg-primary-container/25 shadow-[inset_0_-2px_0_0_var(--color-primary)]"
              : "";
            return (
              <tr
                key={project.id}
                draggable={canReorder}
                title={canReorder ? t("admin.projects.dragHint") : undefined}
                onDragStart={(event) => {
                  if (!canReorder) {
                    event.preventDefault();
                    return;
                  }
                  setDraggingId(project.id);
                  setDragOverId(null);
                  if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", project.id);
                  }
                }}
                onDragOver={(event) => {
                  if (!canReorder) return;
                  event.preventDefault();
                  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
                  if (dragOverId !== project.id) setDragOverId(project.id);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  setDragOverId((current) => (current === project.id ? null : current));
                }}
                onDrop={(event) => handleDrop(project.id, event)}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragOverId(null);
                }}
                className={[
                  canReorder ? "cursor-grab active:cursor-grabbing" : "",
                  isDragging ? "opacity-50" : "",
                  dropLineClass,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <td>
                  <div className="inline-flex items-center gap-2">
                    <GripVertical
                      aria-hidden="true"
                      className={`w-4 h-4 text-on-subtle shrink-0 ${canReorder ? "" : "opacity-35"}`}
                    />
                    <Chip variant="code">{project.index}</Chip>
                  </div>
                </td>
                <td>
                  <Link
                    href={`/projects/${project.id}`}
                    draggable={false}
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
            );
          })}
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
