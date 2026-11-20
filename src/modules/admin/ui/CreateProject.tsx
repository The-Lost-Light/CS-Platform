import { useI18n } from "@modules/i18n";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_CONTENT_LENGTH,
  type Project,
} from "@modules/projects";
import { FormDialog, FormDialogActions } from "@shared/ui/FormDialog";
import { AlertCircle, FolderPlus, Pencil } from "lucide-react";

import { useProjectForm } from "../hooks/useProjectForm";

export function CreateProject({
  project: original,
  onSaved,
  onCancel,
}: {
  project?: Project;
  onSaved: (project: Project) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const { pending, error, submit, attachments, addFiles, removeFile } = useProjectForm(
    original,
    onSaved,
  );
  return (
    <FormDialog
      title={t(original ? "admin.editProject" : "admin.projects.create")}
      icon={original ? Pencil : FolderPlus}
      closeLabel={t("common.close")}
      onDismiss={onCancel}
      pending={pending}
      wide
    >
      {!original && <p className="ui-field-help">{t("admin.projects.description")}</p>}
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="ui-field-label">
              {t("admin.projects.name")} *
              <input
                name="title"
                defaultValue={original?.title}
                required
                maxLength={120}
                className="ui-input mt-1.5"
              />
            </label>
            <label className="ui-field-label">
              {t("admin.projects.code")} *
              <input
                name="codeName"
                defaultValue={original?.codeName}
                required
                maxLength={30}
                pattern={"[A-Za-z0-9][A-Za-z0-9_\\-]{0,29}"}
                placeholder="PROJ-03"
                className="ui-input mt-1.5 font-mono"
              />
              <span className="ui-field-help">{t("admin.projects.codeHelp")}</span>
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="ui-field-label">
              {t("admin.projects.dueDate")}
              <input
                type="datetime-local"
                name="dueDate"
                defaultValue={original?.dueDate.replace(" ", "T")}
                className="ui-input mt-1.5"
              />
              <span className="ui-field-help">{t("admin.projects.timezone")}</span>
            </label>
            <label className="ui-field-label">
              {t("admin.projects.points")}
              <input
                type="number"
                name="points"
                required
                defaultValue={original?.points ?? 100}
                min={0}
                max={10000}
                step={1}
                className="ui-input mt-1.5 font-mono"
              />
            </label>
          </div>
          <label className="ui-field-label">
            {t("admin.projects.tags")}
            <input
              name="tags"
              defaultValue={original?.tags.join(", ")}
              maxLength={500}
              className="ui-input mt-1.5"
            />
          </label>
          <label className="ui-field-label">
            {t("admin.projects.content")}
            <textarea
              name="content"
              defaultValue={original?.content}
              rows={10}
              maxLength={MAX_CONTENT_LENGTH}
              className="ui-input mt-1.5 font-mono"
            />
          </label>
          <div className="space-y-2.5">
            <label className="ui-field-label">
              {t("project.attachments")}
              <input
                type="file"
                multiple
                name="attachments"
                className="ui-input mt-1.5"
                aria-describedby="project-attachment-help"
                onChange={(event) => {
                  addFiles(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <p id="project-attachment-help" className="ui-field-help">
              {t("admin.projects.attachmentLimit", {
                count: MAX_ATTACHMENTS,
                size: MAX_ATTACHMENT_BYTES / 1024 / 1024,
              })}
            </p>
            {attachments.length > 0 && (
              <ul className="ui-panel divide-y divide-outline-subtle px-4">
                {attachments.map((file, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="break-all text-on-surface">{file.name}</span>
                    <button
                      type="button"
                      className="ui-btn-danger-tonal shrink-0"
                      aria-label={t("admin.projects.removeAttachment", { name: file.name })}
                      onClick={() => removeFile(index)}
                    >
                      {t("admin.remove")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && (
            <div role="alert" className="ui-banner-danger">
              <div className="flex items-center gap-2">
                <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>
                  {error === "attachments"
                    ? t("admin.projects.attachmentLimit", {
                        count: MAX_ATTACHMENTS,
                        size: MAX_ATTACHMENT_BYTES / 1024 / 1024,
                      })
                    : t(
                        error === "duplicate"
                          ? "admin.projects.duplicate"
                          : error === "invalid"
                            ? "admin.projects.invalid"
                            : "admin.projects.failed",
                      )}
                </span>
              </div>
            </div>
          )}
          <FormDialogActions
            cancelLabel={t("admin.cancel")}
            submitLabel={t(
              pending ? "common.loading" : original ? "admin.save" : "admin.projects.create",
            )}
            onDismiss={onCancel}
          />
        </fieldset>
      </form>
    </FormDialog>
  );
}
