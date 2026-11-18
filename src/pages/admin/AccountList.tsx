import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@i18n";
import { ConfirmDelete } from "@pages/admin/ConfirmDelete";

interface Account {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
}
export function AccountList({ revision }: { revision: number }) {
  const { t } = useI18n();
  const [users, setUsers] = useState<Account[]>([]);
  const [selfId, setSelfId] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/accounts", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Load failed");
        const data = (await response.json()) as { users: Account[]; currentUserId: string };
        if (!controller.signal.aborted) {
          setUsers(data.users);
          setSelfId(data.currentUserId);
        }
      } catch {
        if (!controller.signal.aborted) setError("failed");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision, attempt]);

  async function mutate(
    id: string,
    method: "PATCH" | "DELETE",
    body?: Record<string, FormDataEntryValue>,
  ) {
    if (pending) return;
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(id)}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = (await response.json()) as { error?: string; signedOut?: boolean };
      if (!response.ok) {
        setError(result.error ?? "failed");
        return;
      }
      if (result.signedOut) {
        window.location.assign("/");
        return;
      }
      setEditing(null);
      setDeleting(null);
      setSaved(true);
      setAttempt((current) => current + 1);
    } catch {
      setError("failed");
    } finally {
      setPending(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editing)
      void mutate(editing.id, "PATCH", Object.fromEntries(new FormData(event.currentTarget)));
  }
  const visible = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="ui-card p-5 space-y-4">
      <h2 className="text-lg font-bold">
        {t(editing ? "admin.editAccount" : "admin.allAccounts", { count: users.length })}
      </h2>
      {saved && <p role="status">{t("admin.saved")}</p>}
      {error && (
        <div role="alert">
          {t(
            error === "duplicate"
              ? "admin.duplicateEmail"
              : error === "self" || error === "protected"
                ? "admin.protectedAccount"
                : error === "invalid"
                  ? "admin.invalidAccount"
                  : "admin.operationFailed",
          )}{" "}
          <button
            type="button"
            disabled={pending}
            onClick={() => setAttempt((current) => current + 1)}
          >
            {t("auth.retry")}
          </button>
        </div>
      )}
      {editing ? (
        <form key={editing.id} onSubmit={submit} className="space-y-4 max-w-lg">
          <fieldset disabled={pending} className="space-y-4">
            <label className="block">
              {t("auth.nameLabel")}
              <input
                className="ui-input mt-1 p-2.5"
                name="name"
                required
                maxLength={100}
                defaultValue={editing.name}
              />
            </label>
            <label className="block">
              {t("auth.accountLabel")}
              <input
                className="ui-input mt-1 p-2.5"
                name="email"
                type="email"
                required
                maxLength={254}
                defaultValue={editing.email}
              />
            </label>
            <label className="block">
              {t("auth.roleLabel")}
              <select
                className="ui-input mt-1 p-2.5"
                name="role"
                defaultValue={editing.role ?? "user"}
              >
                <option value="user" disabled={editing.id === selfId}>
                  {t("auth.roles.student")}
                </option>
                <option value="admin">{t("admin.role")}</option>
              </select>
            </label>
            <p className="text-sm text-on-muted">{t("admin.accountEditHelp")}</p>
            <button className="px-5 py-2 rounded-full bg-primary text-on-primary">
              {t(pending ? "common.loading" : "admin.save")}
            </button>
            <button
              type="button"
              className="px-5 py-2"
              onClick={() => {
                setEditing(null);
                setError(null);
              }}
            >
              {t("admin.cancel")}
            </button>
          </fieldset>
        </form>
      ) : (
        <>
          <label className="block">
            {t("admin.search")}
            <input
              className="ui-input mt-1 p-2"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {deleting && (
            <ConfirmDelete
              name={`${deleting.name} (${deleting.email})`}
              account
              pending={pending}
              onCancel={() => setDeleting(null)}
              onConfirm={() => {
                void mutate(deleting.id, "DELETE");
              }}
            />
          )}
          {loading ? (
            <p role="status">{t("common.loading")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr>
                    <th className="p-3">{t("auth.nameLabel")}</th>
                    <th className="p-3">{t("auth.accountLabel")}</th>
                    <th className="p-3">{t("auth.roleLabel")}</th>
                    <th className="p-3">{t("admin.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user) => (
                    <tr key={user.id} className="border-t border-outline">
                      <td className="p-3">
                        {user.name}
                        {user.id === selfId && ` (${t("admin.you")})`}
                        {user.banned && ` (${t("admin.banned")})`}
                      </td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">
                        {t(user.role === "admin" ? "admin.role" : "auth.roles.student")}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!!deleting}
                          className="px-3 py-2"
                          onClick={() => {
                            setEditing(user);
                            setError(null);
                            setSaved(false);
                          }}
                        >
                          {t("admin.edit")}
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 disabled:opacity-40"
                          disabled={user.id === selfId || !!deleting}
                          title={user.id === selfId ? t("admin.protectedAccount") : undefined}
                          onClick={() => {
                            setDeleting(user);
                            setError(null);
                            setSaved(false);
                          }}
                        >
                          {t("admin.delete")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && <p className="p-3">{t("admin.empty")}</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
