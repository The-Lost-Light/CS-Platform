import { useI18n } from "@modules/i18n";
import { FolderGit2, ShieldCheck, Users } from "lucide-react";
import { useRef, useState } from "react";

import { AccountList } from "./AccountList";
import type { ManagementListHandle } from "./ManagementListHandle";
import { ProjectList } from "./ProjectList";

export default function AdminPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"projects" | "accounts">("projects");
  const projects = useRef<ManagementListHandle>(null);
  const accounts = useRef<ManagementListHandle>(null);

  function showList(section: typeof tab) {
    const list = section === "projects" ? projects : accounts;
    list.current?.showList();
    setTab(section);
  }
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="ui-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="ui-icon-badge w-11 h-11 rounded-xl">
            <ShieldCheck aria-hidden="true" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              {t("admin.mode")}
            </h1>
            <p className="text-sm text-on-muted mt-0.5">{t("admin.description")}</p>
          </div>
        </div>
        <div
          className="ui-pill-group self-start sm:self-auto shrink-0"
          aria-label={t("admin.mode")}
        >
          {(
            [
              ["projects", "admin.projects.title", FolderGit2],
              ["accounts", "admin.title", Users],
            ] as const
          ).map(([value, labelKey, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => showList(value)}
              className={`ui-pill-item px-4 py-2 ${
                tab === value ? "ui-pill-item-active" : "ui-pill-item-idle"
              }`}
            >
              <Icon aria-hidden="true" className="w-3.5 h-3.5" />
              <span>{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>
      <div hidden={tab !== "projects"}>
        <ProjectList ref={projects} />
      </div>
      <div hidden={tab !== "accounts"}>
        <AccountList ref={accounts} />
      </div>
    </section>
  );
}
