import { useState } from "react";
import { useI18n } from "@i18n";
import { AccountManagement } from "@pages/admin/AccountManagement";
import { CreateProject } from "@pages/admin/CreateProject";
import { ProjectList } from "@pages/admin/ProjectList";
import { AccountList } from "@pages/admin/AccountList";
export default function AdminPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"projects" | "accounts">("projects");
  const [projectMode, setProjectMode] = useState<"create" | "view">("view");
  const [accountMode, setAccountMode] = useState<"create" | "view">("view");
  const [revision, setRevision] = useState(0);
  return (
    <section className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="ui-card p-5 space-y-4">
        <h1 className="text-xl font-bold">{t("admin.mode")}</h1>
        <p className="text-sm text-on-muted">{t("admin.description")}</p>
        <div className="flex flex-wrap gap-2" aria-label={t("admin.mode")}>
          {(["projects", "accounts"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              className={
                "px-4 py-2 rounded-full text-sm font-semibold " +
                (tab === value
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-muted")
              }
            >
              {t(value === "projects" ? "admin.projects.title" : "admin.title")}
            </button>
          ))}
        </div>
      </div>
      <div hidden={tab !== "projects"} className="space-y-4">
        <div className="flex gap-2" aria-label={t("admin.projects.title")}>
          {(["create", "view"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={projectMode === mode}
              onClick={() => setProjectMode(mode)}
              className={
                "px-4 py-2 rounded-full text-sm font-semibold " +
                (projectMode === mode
                  ? "bg-secondary text-on-secondary"
                  : "bg-surface-container text-on-muted")
              }
            >
              {t(mode === "create" ? "admin.addTab" : "admin.viewTab")}
            </button>
          ))}
        </div>
        <div hidden={projectMode !== "create"}>
          <CreateProject />
        </div>
        <div hidden={projectMode !== "view"}>
          <ProjectList />
        </div>
      </div>
      <div hidden={tab !== "accounts"} className="space-y-4">
        <div className="flex gap-2" aria-label={t("admin.title")}>
          {(["create", "view"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={accountMode === mode}
              onClick={() => setAccountMode(mode)}
              className={
                "px-4 py-2 rounded-full text-sm font-semibold " +
                (accountMode === mode
                  ? "bg-secondary text-on-secondary"
                  : "bg-surface-container text-on-muted")
              }
            >
              {t(mode === "create" ? "admin.addTab" : "admin.viewTab")}
            </button>
          ))}
        </div>
        <div hidden={accountMode !== "create"} className="ui-card">
          <AccountManagement onCreated={() => setRevision((value) => value + 1)} />
        </div>
        <div hidden={accountMode !== "view"}>
          <AccountList revision={revision} />
        </div>
      </div>
    </section>
  );
}
