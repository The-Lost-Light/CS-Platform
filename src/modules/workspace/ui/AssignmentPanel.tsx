import { useI18n } from "@modules/i18n";
import { getDeadlineState, toDueDateIsoString, type Project } from "@modules/projects";
import { Card, CardHeader, Chip, MarkdownContent } from "@shared/ui";
import {
  AlertCircle,
  Award,
  CalendarClock,
  Clock,
  Download,
  FileText,
  Paperclip,
} from "lucide-react";
import { useState } from "react";

export function AssignmentPanel({ project, now }: { project: Project; now?: number }) {
  const { t } = useI18n();
  const [defaultNow] = useState(() => Date.now());
  const deadlineState = getDeadlineState(project.dueDate, now ?? defaultNow);
  return (
    <Card overflowHidden>
      <CardHeader
        icon={FileText}
        title={t("workspace.tabs.assignment")}
        truncateTitle={false}
        layoutClassName="flex flex-wrap items-center justify-between gap-3"
        actions={
          <dl className="ml-auto flex flex-wrap items-center justify-end gap-2 text-xs">
            <div className="ui-meta-pill">
              <dt className="flex items-center gap-1.5 font-semibold text-on-muted">
                <CalendarClock aria-hidden="true" className="w-3.5 h-3.5 text-secondary" />
                <span>{t("project.deadline")}</span>
              </dt>
              <dd className="flex flex-wrap items-center gap-1.5 font-semibold text-on-surface">
                {project.dueDate ? (
                  <time dateTime={toDueDateIsoString(project.dueDate)}>
                    {project.dueDate} (UTC+8)
                  </time>
                ) : (
                  t("project.noDeadline")
                )}
                {(deadlineState === "overdue" || deadlineState === "dueSoon") && (
                  <Chip
                    variant={deadlineState === "overdue" ? "danger" : "warning"}
                    size="sm"
                    icon={deadlineState === "overdue" ? AlertCircle : Clock}
                  >
                    <span>
                      {t(deadlineState === "overdue" ? "project.overdue" : "project.dueSoon")}
                    </span>
                  </Chip>
                )}
              </dd>
            </div>

            <div className="ui-meta-pill">
              <dt className="flex items-center gap-1.5 font-semibold text-on-muted">
                <Award aria-hidden="true" className="w-3.5 h-3.5 text-primary" />
                <span>{t("admin.projects.points")}</span>
              </dt>
              <dd className="font-mono font-bold text-primary">{project.points}</dd>
            </div>
          </dl>
        }
      />

      <div className="px-5 sm:px-8 py-6">
        {project.content.trim() ? (
          <MarkdownContent>{project.content}</MarkdownContent>
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
                  className="ui-attachment-link"
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
    </Card>
  );
}
