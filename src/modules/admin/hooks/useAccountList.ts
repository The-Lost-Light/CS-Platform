import { useEffect, useState, type FormEvent } from "react";

interface Account {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
}

export function useAccountList(revision: number) {
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

  function edit(user: Account) {
    setEditing(user);
    setError(null);
    setSaved(false);
  }
  function requestDelete(user: Account) {
    setDeleting(user);
    setError(null);
    setSaved(false);
  }
  return {
    count: users.length,
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
    retry: () => setAttempt((current) => current + 1),
    cancelEdit: () => {
      setEditing(null);
      setError(null);
    },
    cancelDelete: () => setDeleting(null),
    confirmDelete: () => {
      if (deleting) void mutate(deleting.id, "DELETE");
    },
  };
}
