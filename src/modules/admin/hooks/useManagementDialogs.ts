import { useTransientNotice } from "@shared/transientNotice";
import { useState } from "react";

export function useManagementDialogs<T, N>({
  initialNotice = null,
  onClearError,
}: {
  initialNotice?: N | null;
  onClearError: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [search, setSearch] = useState("");
  const { notice, show: showNotice, clear: clearNotice } = useTransientNotice<N>(initialNotice);

  return {
    creating,
    editing,
    deleting,
    search,
    setSearch,
    notice,
    showNotice,
    clearNotice,
    openCreate: () => {
      clearNotice();
      onClearError();
      setCreating(true);
    },
    cancelCreate: () => {
      setCreating(false);
      onClearError();
    },
    finishCreate: (createdNotice: N) => {
      setCreating(false);
      onClearError();
      showNotice(createdNotice);
    },
    edit: (item: T) => {
      setEditing(item);
      clearNotice();
      onClearError();
    },
    cancelEdit: () => {
      setEditing(null);
      onClearError();
    },
    finishEdit: (savedNotice: N) => {
      setEditing(null);
      onClearError();
      showNotice(savedNotice);
    },
    requestDelete: (item: T) => {
      setDeleting(item);
      clearNotice();
      onClearError();
    },
    cancelDelete: () => {
      setDeleting(null);
      onClearError();
    },
    completeDelete: (savedNotice: N) => {
      setDeleting(null);
      showNotice(savedNotice);
    },
    resetDialogs: () => {
      setCreating(false);
      setEditing(null);
      setDeleting(null);
      onClearError();
    },
  };
}
