import { useState, type FormEvent } from "react";
import { Link } from "@void/react";
import { useI18n } from "@i18n";
import { useProjectCatalog } from "@hooks/ProjectCatalog";
import type { Project } from "@domain/project";
export function CreateProject() {
  const { t } = useI18n();
  const { addProject } = useProjectCatalog();
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<Project | null>(null);
  const [error, setError] = useState<"duplicate" | "invalid" | "failed" | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = { ...Object.fromEntries(data), points: Number(data.get("points")) };
    setPending(true);
    setError(null);
    setCreated(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        setError(
          response.status === 409 ? "duplicate" : response.status === 400 ? "invalid" : "failed",
        );
        return;
      }
      const { project } = (await response.json()) as { project: Project };
      addProject(project);
      setCreated(project);
      form.reset();
    } catch {
      setError("failed");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="ui-card p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold">{t("admin.projects.create")}</h2>
        <p className="text-sm text-on-muted mt-1">{t("admin.projects.description")}</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm font-semibold">
              {t("admin.projects.name")} *
              <input name="title" required maxLength={120} className="ui-input mt-1 p-2.5" />
            </label>
            <label className="block text-sm font-semibold">
              {t("admin.projects.code")} *
              <input
                name="codeName"
                required
                maxLength={30}
                pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,29}"
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
              required
              maxLength={2000}
              rows={3}
              className="ui-input mt-1 p-2.5"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm font-semibold">
              {t("admin.projects.dueDate")}
              <input type="datetime-local" name="dueDate" className="ui-input mt-1 p-2.5" />
              <span className="text-xs text-on-muted">{t("admin.projects.timezone")}</span>
            </label>
            <label className="block text-sm font-semibold">
              {t("admin.projects.points")}
              <input
                type="number"
                name="points"
                required
                defaultValue={100}
                min={0}
                max={10000}
                step={1}
                className="ui-input mt-1 p-2.5"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            {t("admin.projects.repo")}
            <input
              name="defaultRepoUrl"
              type="url"
              maxLength={300}
              placeholder="https://github.com/owner/repository"
              className="ui-input mt-1 p-2.5"
            />
          </label>
          <label className="block text-sm font-semibold">
            {t("admin.projects.tags")}
            <input name="tags" maxLength={500} className="ui-input mt-1 p-2.5" />
          </label>
          <label className="block text-sm font-semibold">
            {t("admin.projects.requirements")}
            <textarea
              name="requirements"
              rows={4}
              maxLength={8000}
              className="ui-input mt-1 p-2.5"
            />
          </label>
          <label className="block text-sm font-semibold">
            {t("admin.projects.designDoc")}
            <textarea
              name="initialDesignDoc"
              rows={6}
              maxLength={20000}
              className="ui-input mt-1 p-2.5 font-mono"
            />
          </label>
          <button
            className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-semibold"
            type="submit"
          >
            {t(pending ? "common.loading" : "admin.projects.create")}
          </button>
        </fieldset>
        {error && (
          <p role="alert" className="text-on-danger-container bg-danger-container rounded-xl p-3">
            {t(
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
