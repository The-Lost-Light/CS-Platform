import { useTransientNotice } from "@shared/transientNotice";
import { useEffect, useState } from "react";

export type AccountListNotice = "admin.saved" | "admin.success";

interface Account {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
}

export function useAccountList(initialNotice: AccountListNotice | null = null) {
  const [users, setUsers] = useState<Account[]>([]);
  const [selfId, setSelfId] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    notice,
    show: showNotice,
    clear: clearNotice,
  } = useTransientNotice<AccountListNotice>(initialNotice);
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
  }, [attempt]);

  function reload() {
    setAttempt((current) => current + 1);
  }

  function finishEdit() {
    setEditing(null);
    setError(null);
    showNotice("admin.saved");
    reload();
  }

  async function confirmDelete() {
    if (!deleting || pending) return;
    setPending(true);
    setError(null);
    clearNotice();
    try {
      const response = await fetch(`/api/admin/accounts/${encodeURIComponent(deleting.id)}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "failed");
        return;
      }
      setDeleting(null);
      showNotice("admin.saved");
      reload();
    } catch {
      setError("failed");
    } finally {
      setPending(false);
    }
  }
  const visible = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  function edit(user: Account) {
    setEditing(user);
    setError(null);
    clearNotice();
  }
  function requestDelete(user: Account) {
    setDeleting(user);
    setError(null);
    clearNotice();
  }
  return {
    count: users.length,
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
    finishCreate: () => {
      setError(null);
      showNotice("admin.success");
      reload();
    },
    edit,
    requestDelete,
    reload,
    cancelEdit: () => {
      setEditing(null);
      setError(null);
    },
    cancelDelete: () => {
      setDeleting(null);
      setError(null);
    },
    confirmDelete,
  };
}
