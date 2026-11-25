import { useAsyncLoad } from "@shared/useAsyncLoad";
import { useState } from "react";

import { useManagementDialogs } from "./useManagementDialogs";

export type AccountListNotice = "admin.saved" | "admin.success";

interface Account {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
}

export function useAccountList(initialNotice: AccountListNotice | null = null) {
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const dialogs = useManagementDialogs<Account, AccountListNotice>({
    initialNotice,
    onClearError: () => setActionError(null),
  });

  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useAsyncLoad<{ users: Account[]; currentUserId: string }>(
    async (signal) => {
      const response = await fetch("/api/admin/accounts", {
        signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Load failed");
      return (await response.json()) as { users: Account[]; currentUserId: string };
    },
    { preserveDataOnReload: true },
  );

  const users = data?.users ?? [];
  const selfId = data?.currentUserId ?? "";

  async function confirmDelete() {
    if (!dialogs.deleting || pending) return;
    setPending(true);
    setActionError(null);
    dialogs.clearNotice();
    try {
      const response = await fetch(
        `/api/admin/accounts/${encodeURIComponent(dialogs.deleting.id)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(result.error ?? "failed");
        return;
      }
      dialogs.completeDelete("admin.saved");
      reload();
    } catch {
      setActionError("failed");
    } finally {
      setPending(false);
    }
  }

  const visible = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(dialogs.search.toLowerCase()),
  );

  return {
    count: users.length,
    visible,
    selfId,
    pending,
    notice: dialogs.notice,
    error: actionError ?? (loadError ? "failed" : null),
    loading,
    creating: dialogs.creating,
    editing: dialogs.editing,
    deleting: dialogs.deleting,
    search: dialogs.search,
    setSearch: dialogs.setSearch,
    openCreate: dialogs.openCreate,
    cancelCreate: dialogs.cancelCreate,
    finishCreate: () => {
      dialogs.finishCreate("admin.success");
      reload();
    },
    edit: dialogs.edit,
    cancelEdit: dialogs.cancelEdit,
    finishEdit: () => {
      dialogs.finishEdit("admin.saved");
      reload();
    },
    requestDelete: dialogs.requestDelete,
    cancelDelete: dialogs.cancelDelete,
    confirmDelete,
    resetDialogs: dialogs.resetDialogs,
    reload,
  };
}
