import { EditAccountDialog } from "@modules/accounts";
import { useI18n, type MessageKey } from "@modules/i18n";
import { FeedbackBanner } from "@shared/ui/FeedbackBanner";
import { LoadingPanel } from "@shared/ui/LoadingPanel";
import { Users } from "lucide-react";
import { useImperativeHandle, useState, type Ref } from "react";

import { useAccountList } from "../hooks/useAccountList";
import { AccountManagement } from "./AccountManagement";
import { ConfirmDelete } from "./ConfirmDelete";
import {
  ManagementListHeader,
  ManagementRowActions,
  ManagementSearch,
} from "./ManagementListControls";
import type { ManagementListHandle } from "./ManagementListHandle";

const accountErrors = new Map<string, MessageKey>([
  ["self", "admin.protectedAccount"],
  ["protected", "admin.protectedAccount"],
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
    finishEdit,
    finishCreate,
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
  return (
    <section className="ui-card overflow-hidden">
      <ManagementListHeader
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2"
        title={t("admin.allAccounts", { count })}
        icon={Users}
        disabled={!!deleting}
        onAdd={() => setCreating(true)}
      />

      <div className="p-5 sm:p-6 space-y-4">
        {saved && (
          <FeedbackBanner kind="success">
            <span>{t(saved)}</span>
          </FeedbackBanner>
        )}
        {error && (
          <FeedbackBanner
            kind="error"
            action={
              <button
                type="button"
                disabled={pending}
                onClick={reload}
                className="ui-btn-outlined shrink-0"
              >
                {t("auth.retry")}
              </button>
            }
          >
            <span>{t(accountErrors.get(error) ?? "admin.operationFailed")}</span>
          </FeedbackBanner>
        )}

        <ManagementSearch value={search} onChange={setSearch} />
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
                        className={user.role === "admin" ? "ui-chip-primary" : "ui-chip-neutral"}
                      >
                        {t(user.role === "admin" ? "admin.role" : "auth.roles.student")}
                      </span>
                    </td>
                    <ManagementRowActions
                      disabled={!!deleting}
                      deleteDisabledReason={
                        user.id === selfId ? t("admin.protectedAccount") : undefined
                      }
                      onEdit={() => edit(user)}
                      onDelete={() => requestDelete(user)}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ui-empty">{t("admin.empty")}</p>
        )}
      </div>
      {creating && (
        <AccountManagement
          onCreated={() => {
            setCreating(false);
            finishCreate();
          }}
          onDismiss={() => setCreating(false)}
        />
      )}
      {editing && (
        <EditAccountDialog
          key={editing.id}
          account={editing}
          management={{ id: editing.id, role: editing.role, isSelf: editing.id === selfId }}
          onDismiss={cancelEdit}
          onSaved={finishEdit}
        />
      )}
    </section>
  );
}
