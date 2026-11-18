import { useState, type FormEvent } from "react";
import { useI18n } from "@i18n";

export default function AdminPage() {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setStatus(null);
    try {
      const response = await fetch("/api/auth/admin/create-user", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          name: data.get("name"),
          password: data.get("password"),
          role: data.get("role"),
        }),
      });
      if (!response.ok) throw new Error("Create failed");
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">{t("admin.title")}</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          {t("auth.accountLabel")}
          <input className="ui-input" name="email" type="email" autoComplete="off" required />
        </label>
        <label className="block">
          {t("auth.nameLabel")}
          <input className="ui-input" name="name" required maxLength={100} />
        </label>
        <label className="block">
          {t("auth.passwordLabel")}
          <input
            className="ui-input"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <label className="block">
          {t("auth.roleLabel")}
          <select className="ui-input" name="role">
            <option value="user">{t("auth.roles.student")}</option>
            <option value="admin">{t("admin.role")}</option>
          </select>
        </label>
        <p>{t("admin.passwordHelp")}</p>
        <button className="ui-input" disabled={pending}>
          {t(pending ? "common.loading" : "admin.create")}
        </button>
      </form>
      {status && <p role="status">{t(status === "success" ? "admin.success" : "admin.error")}</p>}
    </section>
  );
}
