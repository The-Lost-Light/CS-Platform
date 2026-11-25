import { EditAccountDialog } from "@modules/accounts";
import { useI18n, type MessageKey } from "@modules/i18n";
import {
  AvatarBadge,
  Button,
  Card,
  Chip,
  DataTable,
  FeedbackBanner,
  LoadingPanel,
} from "@shared/ui";
import { Users } from "lucide-react";
import { useImperativeHandle, useState, type Ref } from "react";

import { useAccountList, type AccountListNotice } from "../hooks/useAccountList";
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

export function AccountList({
  ref,
  initialNotice = null,
}: {
  ref: Ref<ManagementListHandle>;
  initialNotice?: AccountListNotice | null;
}) {
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const {
    count,
    visible,
    selfId,
    pending,
    notice,
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
  } = useAccountList(initialNotice);
  useImperativeHandle(ref, () => ({
    showList() {
      setCreating(false);
      if (editing) cancelEdit();
      cancelDelete();
    },
  }));
  return (
    <Card overflowHidden>
      <ManagementListHeader
        title={t("admin.allAccounts", { count })}
        icon={Users}
        disabled={!!deleting}
        notice={notice}
        onAdd={() => setCreating(true)}
      />

      <div className="p-5 sm:p-6 space-y-4">
        {error && !deleting && (
          <FeedbackBanner
            kind="error"
            action={
              <Button variant="outlined" disabled={pending} onClick={reload} className="shrink-0">
                {t("auth.retry")}
              </Button>
            }
          >
            <span>{t(accountErrors.get(error) ?? "admin.operationFailed")}</span>
          </FeedbackBanner>
        )}

        <ManagementSearch value={search} onChange={setSearch} />
        {loading ? (
          <LoadingPanel label={t("common.loading")} />
        ) : (
          <DataTable
            headers={[
              t("auth.nameLabel"),
              t("auth.accountLabel"),
              t("auth.roleLabel"),
              t("admin.actions"),
            ]}
            isEmpty={visible.length === 0}
            emptyMessage={t("admin.empty")}
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
                  deleteDisabledReason={
                    user.id === selfId ? t("admin.protectedAccount") : undefined
                  }
                  onEdit={() => edit(user)}
                  onDelete={() => requestDelete(user)}
                />
              </tr>
            ))}
          </DataTable>
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
      {deleting && (
        <ConfirmDelete
          name={`${deleting.name} (${deleting.email})`}
          account
          pending={pending}
          error={error ? t(accountErrors.get(error) ?? "admin.operationFailed") : null}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
    </Card>
  );
}
