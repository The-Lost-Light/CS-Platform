import { useI18n } from "@modules/i18n";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_PROJECT_POINTS,
  PROJECT_FIELD_LIMITS,
  type Project,
} from "@modules/projects";
import {
  Button,
  FeedbackBanner,
  FormDialog,
  FormDialogActions,
  FormField,
  Panel,
  TextArea,
  TextInput,
} from "@shared/ui";
import { FolderPlus, Pencil } from "lucide-react";

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
  const attachmentHelp = t("admin.projects.attachmentLimit", {
    count: MAX_ATTACHMENTS,
    size: MAX_ATTACHMENT_BYTES / 1024 / 1024,
  });
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
          <FormField label={`${t("admin.projects.name")} *`}>
            <TextInput
              name="title"
              defaultValue={original?.title}
              required
              maxLength={PROJECT_FIELD_LIMITS.title}
            />
          </FormField>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label={t("admin.projects.dueDate")} help={t("admin.projects.timezone")}>
              <TextInput
                type="datetime-local"
                name="dueDate"
                defaultValue={original?.dueDate.replace(" ", "T")}
              />
            </FormField>
            <FormField label={t("admin.projects.points")}>
              <TextInput
                type="number"
                name="points"
                required
                defaultValue={original?.points ?? 100}
                min={0}
                max={MAX_PROJECT_POINTS}
                step={1}
                mono
              />
            </FormField>
          </div>
          <FormField label={t("admin.projects.content")}>
            <TextArea
              name="content"
              defaultValue={original?.content}
              rows={10}
              maxLength={PROJECT_FIELD_LIMITS.content}
              mono
            />
          </FormField>
          <div className="space-y-2.5">
            <FormField
              label={t("project.attachments")}
              help={attachmentHelp}
              helpId="project-attachment-help"
              externalHelp
            >
              <TextInput
                type="file"
                multiple
                name="attachments"
                aria-describedby="project-attachment-help"
                onChange={(event) => {
                  addFiles(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
            </FormField>
            {attachments.length > 0 && (
              <Panel as="ul" className="divide-y divide-outline-subtle px-4">
                {attachments.map((file, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="break-all text-on-surface">{file.name}</span>
                    <Button
                      variant="danger-tonal"
                      className="shrink-0"
                      aria-label={t("admin.projects.removeAttachment", { name: file.name })}
                      onClick={() => removeFile(index)}
                    >
                      {t("admin.remove")}
                    </Button>
                  </li>
                ))}
              </Panel>
            )}
          </div>
          {error && (
            <FeedbackBanner kind="error">
              <span>
                {error === "attachments"
                  ? attachmentHelp
                  : t(error === "invalid" ? "admin.projects.invalid" : "admin.projects.failed")}
              </span>
            </FeedbackBanner>
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
