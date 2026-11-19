import { useI18n, type MessageKey } from "@modules/i18n";
import { LoadingPanel } from "@shared/ui/LoadingPanel";
import { AlertCircle, CheckCircle2, Info, Plus, Search, Users } from "lucide-react";
import { useImperativeHandle, useState, type Ref } from "react";

import { useAccountList } from "../hooks/useAccountList";
import { AccountManagement } from "./AccountManagement";
import { ChangeAccountPassword } from "./ChangeAccountPassword";
import { ConfirmDelete } from "./ConfirmDelete";
import type { ManagementListHandle } from "./ManagementListHandle";

const accountErrors = new Map<string, MessageKey>([
  ["duplicate", "admin.duplicateEmail"],
  ["self", "admin.protectedAccount"],
  ["protected", "admin.protectedAccount"],
  ["invalid", "admin.invalidAccount"],
]);

export function AccountList({ ref }: { ref: Ref<ManagementListHandle> }) {
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const {
    count,
    visible,
    selfId,
    pending,
    saved,
    error,
    loading,
    editing,
    deleting,
    search,
    setSearch,
    submit,
    edit,
    requestDelete,
    reload,
    cancelEdit,
    cancelDelete,
    confirmDelete,
  } = useAccountList();
  useImperativeHandle(ref, () => ({
    showList() {
      setCreating(false);
      if (editing) cancelEdit();
      cancelDelete();
    },
  }));
  if (creating) return <AccountManagement onCreated={reload} onBack={() => setCreating(false)} />;
  return (
    <section className="ui-card overflow-hidden">
      <header className="ui-card-header grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="ui-icon-badge w-9 h-9">
            <Users aria-hidden="true" className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-on-primary-container truncate">
            {t(editing ? "admin.editAccount" : "admin.allAccounts", { count })}
          </h2>
        </div>
        {editing ? (
          <ChangeAccountPassword
            key={editing.id}
            accountId={editing.id}
            email={editing.email}
            isSelf={editing.id === selfId}
            disabled={pending}
          />
        ) : (
          <button
            type="button"
            disabled={!!deleting}
            onClick={() => setCreating(true)}
            className="ui-btn-primary px-4 py-2 text-xs sm:text-sm shrink-0"
          >
            <Plus aria-hidden="true" className="w-4 h-4" />
            {t("admin.add")}
          </button>
        )}
      </header>

      <div className="p-5 sm:p-6 space-y-4">
        {saved && (
          <div role="status" className="ui-banner-success">
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />
              <span>{t("admin.saved")}</span>
            </div>
          </div>
        )}
        {error && (
          <div role="alert" className="ui-banner-danger">
            <div className="flex items-center gap-2">
              <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
              <span>{t(accountErrors.get(error) ?? "admin.operationFailed")}</span>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={reload}
              className="ui-btn-outlined shrink-0"
            >
              {t("auth.retry")}
            </button>
          </div>
        )}

        {editing ? (
          <div key={editing.id} className="space-y-4 max-w-lg">
            <form onSubmit={submit}>
              <fieldset disabled={pending} className="space-y-4">
                <label className="ui-field-label">
                  {t("auth.nameLabel")}
                  <input
                    className="ui-input mt-1.5"
                    name="name"
                    required
                    maxLength={100}
                    defaultValue={editing.name}
                  />
                </label>
                <label className="ui-field-label">
                  {t("auth.accountLabel")}
                  <input
                    className="ui-input mt-1.5"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    defaultValue={editing.email}
                  />
                </label>
                <label className="ui-field-label">
                  {t("auth.roleLabel")}
                  <select
                    className="ui-input mt-1.5"
                    name="role"
                    defaultValue={editing.role ?? "user"}
                  >
                    <option value="user" disabled={editing.id === selfId}>
                      {t("auth.roles.student")}
                    </option>
                    <option value="admin">{t("admin.role")}</option>
                  </select>
                </label>
                <div className="ui-banner-neutral">
                  <div className="flex items-center gap-2">
                    <Info aria-hidden="true" className="w-4 h-4 shrink-0 text-primary" />
                    <span>{t("admin.accountEditHelp")}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button type="submit" className="ui-btn-primary">
                    {t(pending ? "common.loading" : "admin.save")}
                  </button>
                  <button type="button" className="ui-btn-text-muted" onClick={cancelEdit}>
                    {t("admin.cancel")}
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        ) : (
          <>
            <label className="ui-field-label">
              {t("admin.search")}
              <div className="relative mt-1.5">
                <Search
                  aria-hidden="true"
                  className="w-4 h-4 text-on-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  className="ui-input pl-10"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </label>
            {deleting && (
              <ConfirmDelete
                name={`${deleting.name} (${deleting.email})`}
                account
                pending={pending}
                onCancel={cancelDelete}
                onConfirm={confirmDelete}
              />
            )}
            {loading ? (
              <LoadingPanel label={t("common.loading")} />
            ) : visible.length > 0 ? (
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>{t("auth.nameLabel")}</th>
                      <th>{t("auth.accountLabel")}</th>
                      <th>{t("auth.roleLabel")}</th>
                      <th>{t("admin.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container text-xs font-bold inline-flex items-center justify-center shrink-0">
                              {user.name?.slice(0, 1) || "?"}
                            </span>
                            <span className="font-semibold text-on-surface">{user.name}</span>
                            {user.id === selfId && (
                              <span className="ui-chip-secondary px-2 py-0.5 text-[11px]">
                                {t("admin.you")}
                              </span>
                            )}
                            {user.banned && (
                              <span className="ui-chip-danger px-2 py-0.5 text-[11px]">
                                {t("admin.banned")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="font-mono text-xs text-on-muted">{user.email}</td>
                        <td>
                          <span
                            className={
                              user.role === "admin" ? "ui-chip-primary" : "ui-chip-neutral"
                            }
                          >
                            {t(user.role === "admin" ? "admin.role" : "auth.roles.student")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!!deleting}
                              className="ui-btn-tonal px-3 py-1.5"
                              onClick={() => edit(user)}
                            >
                              {t("admin.edit")}
                            </button>
                            <button
                              type="button"
                              className="ui-btn-danger-tonal px-3 py-1.5"
                              disabled={user.id === selfId || !!deleting}
                              title={user.id === selfId ? t("admin.protectedAccount") : undefined}
                              onClick={() => requestDelete(user)}
                            >
                              {t("admin.delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="ui-empty">{t("admin.empty")}</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
