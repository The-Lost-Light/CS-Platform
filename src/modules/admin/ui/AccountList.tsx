import { useI18n, type MessageKey } from "@modules/i18n";
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
    <section className="ui-card p-5 space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
        <h2 className="text-lg font-bold">
          {t(editing ? "admin.editAccount" : "admin.allAccounts", { count })}
        </h2>
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
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-40"
          >
            {t("admin.add")}
          </button>
        )}
      </header>
      {saved && <p role="status">{t("admin.saved")}</p>}
      {error && (
        <div role="alert">
          {t(accountErrors.get(error) ?? "admin.operationFailed")}{" "}
          <button type="button" disabled={pending} onClick={reload}>
            {t("auth.retry")}
          </button>
        </div>
      )}
      {editing ? (
        <div key={editing.id} className="space-y-4 max-w-lg">
          <form onSubmit={submit}>
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
              <button type="button" className="px-5 py-2" onClick={cancelEdit}>
                {t("admin.cancel")}
              </button>
            </fieldset>
          </form>
        </div>
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
              onCancel={cancelDelete}
              onConfirm={confirmDelete}
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
                          onClick={() => edit(user)}
                        >
                          {t("admin.edit")}
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 disabled:opacity-40"
                          disabled={user.id === selfId || !!deleting}
                          title={user.id === selfId ? t("admin.protectedAccount") : undefined}
                          onClick={() => requestDelete(user)}
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
