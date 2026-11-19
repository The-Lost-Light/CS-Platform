import { useI18n } from "@modules/i18n";
import type { Project } from "@modules/projects";
import { Award, CalendarClock, Download, FileText, PackageCheck, Paperclip } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AssignmentPanel({ project }: { project: Project }) {
  const { t } = useI18n();
  return (
    <section className="ui-card overflow-hidden">
      <div className="ui-card-header flex items-center gap-3">
        <div className="ui-icon-badge w-9 h-9">
          <FileText aria-hidden="true" className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold text-on-primary-container">
          {t("workspace.tabs.assignment")}
        </h2>
      </div>

      <div className="px-5 sm:px-8 py-5 space-y-4">
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="ui-panel p-3.5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-on-muted">
              <CalendarClock aria-hidden="true" className="w-3.5 h-3.5 text-secondary" />
              <span>{t("project.deadline")}</span>
            </dt>
            <dd className="text-sm font-semibold text-on-surface">
              {project.dueDate ? (
                <time dateTime={project.dueDate.replace(" ", "T") + ":00+08:00"}>
                  {project.dueDate} (UTC+8)
                </time>
              ) : (
                t("project.noDeadline")
              )}
            </dd>
          </div>

          <div className="ui-panel p-3.5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-on-muted">
              <Award aria-hidden="true" className="w-3.5 h-3.5 text-primary" />
              <span>{t("admin.projects.points")}</span>
            </dt>
            <dd className="text-sm font-mono font-bold text-primary">{project.points}</dd>
          </div>

          <div className="ui-panel p-3.5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-on-muted">
              <PackageCheck aria-hidden="true" className="w-3.5 h-3.5 text-success" />
              <span>{t("project.deliverables")}</span>
            </dt>
            <dd className="text-sm font-medium text-on-surface">{t("project.studentWork")}</dd>
          </div>
        </dl>

        {project.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <li key={tag} className="ui-chip-neutral break-all">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-5 sm:px-8 py-6 border-t border-outline-subtle">
        {project.content.trim() ? (
          <article className="ui-markdown">
            <Markdown remarkPlugins={[remarkGfm]}>{project.content}</Markdown>
          </article>
        ) : (
          <p className="text-sm text-on-muted">{t("project.noContent")}</p>
        )}
      </div>

      <section className="px-5 sm:px-8 py-5 bg-surface-sunken/60 border-t border-outline-subtle space-y-3">
        <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
          <Paperclip aria-hidden="true" className="w-4 h-4 text-primary" />
          <span>{t("project.attachments")}</span>
        </h3>
        {project.attachments.length ? (
          <ul className="flex flex-wrap gap-2.5">
            {project.attachments.map((file) => (
              <li key={file.id}>
                <a
                  className="inline-flex items-center gap-2 rounded-full border border-outline-subtle bg-surface hover:bg-primary-container hover:border-primary-outline hover:text-on-primary-container px-4 py-2 text-sm font-medium text-on-surface transition-colors"
                  download={file.name}
                  href={`/api/projects/${encodeURIComponent(project.id)}/attachments/${encodeURIComponent(file.id)}`}
                >
                  <Download aria-hidden="true" className="w-4 h-4 shrink-0 text-primary" />
                  <span className="break-all">{file.name}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-on-muted">{t("project.noAttachments")}</p>
        )}
      </section>
    </section>
  );
}
