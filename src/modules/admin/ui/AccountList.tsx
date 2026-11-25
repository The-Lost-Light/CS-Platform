import { EditAccountDialog } from "@modules/accounts";
import { useI18n, type MessageKey } from "@modules/i18n";
import { AvatarBadge, Chip } from "@shared/ui";
import { Users } from "lucide-react";
import type { Ref } from "react";

import { useAccountList, type AccountListNotice } from "../hooks/useAccountList";
import { AccountManagement } from "./AccountManagement";
import { ManagementRowActions, ManagementSection } from "./ManagementListControls";
import type { ManagementListHandle } from "./ManagementListHandle";

const accountErrors = new Map<string, MessageKey>([
  ["self", "admin.protectedAccount"],
  ["protected", "admin.protectedAccount"],
]);

export function AccountList({
  ref,
  initialNotice = null,
}: {
  ref: Ref<ManagementListHandle>;
  initialNotice?: AccountListNotice | null;
}) {
  const { t } = useI18n();
  const {
    count,
    visible,
    selfId,
    pending,
    notice,
    error,
    loading,
    creating,
    editing,
    deleting,
    search,
    setSearch,
    openCreate,
    cancelCreate,
    finishCreate,
    edit,
    cancelEdit,
    finishEdit,
    requestDelete,
    cancelDelete,
    confirmDelete,
    resetDialogs,
    reload,
  } = useAccountList(initialNotice);

  const errorMessage = error ? t(accountErrors.get(error) ?? "admin.operationFailed") : null;

  return (
    <ManagementSection
      ref={ref}
      onResetDialogs={resetDialogs}
      title={t("admin.allAccounts", { count })}
      icon={Users}
      notice={notice}
      onAdd={openCreate}
      search={search}
      onSearchChange={setSearch}
      errorMessage={errorMessage}
      onRetry={reload}
      pending={pending}
      loading={loading}
      headers={[
        t("auth.nameLabel"),
        t("auth.accountLabel"),
        t("auth.roleLabel"),
        t("admin.actions"),
      ]}
      isEmpty={visible.length === 0}
      deleteConfirm={
        deleting
          ? {
              name: `${deleting.name} (${deleting.email})`,
              account: true,
              onCancel: cancelDelete,
              onConfirm: () => {
                void confirmDelete();
              },
            }
          : undefined
      }
      dialogs={
        <>
          {creating && <AccountManagement onCreated={finishCreate} onDismiss={cancelCreate} />}
          {editing && (
            <EditAccountDialog
              key={editing.id}
              account={editing}
              management={{ id: editing.id, role: editing.role, isSelf: editing.id === selfId }}
              onDismiss={cancelEdit}
              onSaved={finishEdit}
            />
          )}
        </>
      }
    >
      {visible.map((user) => (
        <tr key={user.id}>
          <td>
            <div className="flex flex-wrap items-center gap-2">
              <AvatarBadge name={user.name} size="sm" />
              <span className="font-semibold text-on-surface">{user.name}</span>
              {user.id === selfId && (
                <Chip variant="secondary" size="sm">
                  {t("admin.you")}
                </Chip>
              )}
              {user.banned && (
                <Chip variant="danger" size="sm">
                  {t("admin.banned")}
                </Chip>
              )}
            </div>
          </td>
          <td className="font-mono text-xs text-on-muted">{user.email}</td>
          <td>
            <Chip variant={user.role === "admin" ? "primary" : "neutral"}>
              {t(user.role === "admin" ? "admin.role" : "auth.roles.student")}
            </Chip>
          </td>
          <ManagementRowActions
            disabled={!!deleting}
            deleteDisabledReason={user.id === selfId ? t("admin.protectedAccount") : undefined}
            onEdit={() => edit(user)}
            onDelete={() => requestDelete(user)}
          />
        </tr>
      ))}
    </ManagementSection>
  );
}
