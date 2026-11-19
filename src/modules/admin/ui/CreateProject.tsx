import { useI18n } from "@modules/i18n";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_CONTENT_LENGTH,
  type Project,
} from "@modules/projects";
import { Link } from "@void/react";

import { useProjectForm } from "../hooks/useProjectForm";

export function CreateProject({
  project: original,
  onSaved,
  onCancel,
}: {
  project?: Project;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const { pending, created, error, submit, attachments, addFiles, removeFile } = useProjectForm(
    original,
    onSaved,
  );
  return (
    <section className="ui-card p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold">
          {t(original ? "admin.editProject" : "admin.projects.create")}
        </h2>
        <p className="text-sm text-on-muted mt-1">{t("admin.projects.description")}</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm font-semibold">
              {t("admin.projects.name")} *
              <input
                name="title"
                defaultValue={original?.title}
                required
                maxLength={120}
                className="ui-input mt-1 p-2.5"
              />
            </label>
            <label className="block text-sm font-semibold">
              {t("admin.projects.code")} *
              <input
                name="codeName"
                defaultValue={original?.codeName}
                required
                maxLength={30}
                pattern={"[A-Za-z0-9][A-Za-z0-9_\\-]{0,29}"}
                placeholder="PROJ-03"
                className="ui-input mt-1 p-2.5"
              />
              <span className="text-xs text-on-muted">{t("admin.projects.codeHelp")}</span>
            </label>
          </div>
          <label className="block text-sm font-semibold">
            {t("admin.projects.summary")} *
            <textarea
              name="summary"
              defaultValue={original?.summary}
              required
              maxLength={2000}
              rows={3}
              className="ui-input mt-1 p-2.5"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm font-semibold">
              {t("admin.projects.dueDate")}
              <input
                type="datetime-local"
                name="dueDate"
                defaultValue={original?.dueDate.replace(" ", "T")}
                className="ui-input mt-1 p-2.5"
              />
              <span className="text-xs text-on-muted">{t("admin.projects.timezone")}</span>
            </label>
            <label className="block text-sm font-semibold">
              {t("admin.projects.points")}
              <input
                type="number"
                name="points"
                required
                defaultValue={original?.points ?? 100}
                min={0}
                max={10000}
                step={1}
                className="ui-input mt-1 p-2.5"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            {t("admin.projects.tags")}
            <input
              name="tags"
              defaultValue={original?.tags.join(", ")}
              maxLength={500}
              className="ui-input mt-1 p-2.5"
            />
          </label>
          <label className="block text-sm font-semibold">
            {t("admin.projects.content")}
            <textarea
              name="content"
              defaultValue={original?.content}
              rows={10}
              maxLength={MAX_CONTENT_LENGTH}
              className="ui-input mt-1 p-2.5 font-mono"
            />
          </label>
          <div className="space-y-2">
            <label className="block text-sm font-semibold">
              {t("project.attachments")}
              <input
                type="file"
                multiple
                name="attachments"
                className="ui-input mt-1 p-2.5"
                aria-describedby="project-attachment-help"
                onChange={(event) => {
                  addFiles(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <p id="project-attachment-help" className="text-xs text-on-muted">
              {t("admin.projects.attachmentLimit", {
                count: MAX_ATTACHMENTS,
                size: MAX_ATTACHMENT_BYTES / 1024 / 1024,
              })}
            </p>
            {attachments.length > 0 && (
              <ul className="divide-y divide-outline">
                {attachments.map((file, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 py-1.5 text-sm"
                  >
                    <span className="break-all">{file.name}</span>
                    <button
                      type="button"
                      className="ui-btn-tonal shrink-0"
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
          <button
            className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-semibold"
            type="submit"
          >
            {t(pending ? "common.loading" : original ? "admin.save" : "admin.projects.create")}
          </button>
          {onCancel && (
            <button type="button" className="px-5 py-2.5" onClick={onCancel}>
              {t(original ? "admin.cancel" : "admin.backToList")}
            </button>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="text-on-danger-container bg-danger-container rounded-xl p-3">
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
          </p>
        )}
        {created && (
          <div
            role="status"
            className="rounded-xl bg-primary-container text-on-primary-container p-3"
          >
            {t("admin.projects.success")}{" "}
            <Link href={"/projects/" + created.id} className="underline font-semibold">
              {t("admin.projects.open")} — {created.title}
            </Link>
          </div>
        )}
      </form>
    </section>
  );
}
