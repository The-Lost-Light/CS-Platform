import { Download } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";

export function AssignmentPanel({ project }: { project: Project }) {
  const { t } = useI18n();
  return (
    <section className="ui-card mt-5 px-5 py-6 sm:px-8 space-y-6">
      <header className="space-y-3">
        <h2 className="text-lg font-bold">{t("workspace.tabs.assignment")}</h2>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-on-muted">{t("project.deadline")}</dt>
            <dd>
              {project.dueDate ? (
                <time dateTime={project.dueDate.replace(" ", "T") + ":00+08:00"}>
                  {project.dueDate} (UTC+8)
                </time>
              ) : (
                t("project.noDeadline")
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-on-muted">{t("admin.projects.points")}</dt>
            <dd>{project.points}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-on-muted">{t("project.deliverables")}</dt>
            <dd>{t("project.studentWork")}</dd>
          </div>
        </dl>
        {project.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-surface-container px-3 py-1 text-xs break-all"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>
      {project.content.trim() ? (
        <article className="ui-markdown border-t border-outline pt-5">
          <Markdown remarkPlugins={[remarkGfm]}>{project.content}</Markdown>
        </article>
      ) : (
        <p className="text-sm text-on-muted">{t("project.noContent")}</p>
      )}
      <section className="border-t border-outline pt-4">
        <h3 className="text-sm font-bold">{t("project.attachments")}</h3>
        {project.attachments.length ? (
          <ul className="mt-2 space-y-1">
            {project.attachments.map((file) => (
              <li key={file.id}>
                <a
                  className="inline-flex items-center gap-2 py-1 text-sm text-primary underline"
                  download={file.name}
                  href={`/api/projects/${encodeURIComponent(project.id)}/attachments/${encodeURIComponent(file.id)}`}
                >
                  <Download aria-hidden="true" className="w-4 h-4 shrink-0" />
                  <span className="break-all">{file.name}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-on-muted">{t("project.noAttachments")}</p>
        )}
      </section>
    </section>
  );
}
