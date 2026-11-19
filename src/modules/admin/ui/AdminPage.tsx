import { useRef, useState } from "react";
import { useI18n } from "@modules/i18n";
import { ProjectList } from "./ProjectList";
import { AccountList } from "./AccountList";
import type { ManagementListHandle } from "./ManagementListHandle";
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
              onClick={() => showList(value)}
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
      <div hidden={tab !== "projects"}>
        <ProjectList ref={projects} />
      </div>
      <div hidden={tab !== "accounts"}>
        <AccountList ref={accounts} />
      </div>
    </section>
  );
}
