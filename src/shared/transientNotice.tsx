import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Chip } from "./ui/Badge";
import { cn } from "./ui/cn";
import type { FeedbackKind } from "./ui/FeedbackBanner";

export const TRANSIENT_NOTICE_DURATION_MS = 3500;

interface NoticeEntry<T> {
  value: T;
  id: number;
}

const noticeStyles = {
  error: {
    role: "alert",
    variant: "danger",
    icon: AlertCircle,
    borderClassName: "border-danger-outline",
  },
  warning: {
    role: "status",
    variant: "warning",
    icon: AlertTriangle,
    borderClassName: "border-warning-outline",
  },
  success: {
    role: "status",
    variant: "success",
    icon: CheckCircle2,
    borderClassName: "border-success-outline",
  },
} as const;

export function useTransientNotice<T>(initialValue: T | null = null) {
  const [entry, setEntry] = useState<NoticeEntry<T> | null>(() =>
    initialValue !== null ? { value: initialValue, id: 1 } : null,
  );

  useEffect(() => {
    if (!entry) return;
    const timer = setTimeout(() => {
      setEntry((current) => (current?.id === entry.id ? null : current));
    }, TRANSIENT_NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [entry]);

  return {
    notice: entry?.value ?? null,
    show: (value: T) => {
      setEntry((previous) => ({
        value,
        id: (previous?.id ?? 0) + 1,
      }));
    },
    clear: () => setEntry(null),
  };
}

export function TransientNotice({
  kind = "success",
  message,
  className,
}: {
  kind?: FeedbackKind;
  message?: ReactNode;
  className?: string;
}) {
  if (!message) return null;
  const { role, variant, icon, borderClassName } = noticeStyles[kind];
  return (
    <Chip
      variant={variant}
      icon={icon}
      role={role}
      className={cn(
        "max-w-full sm:max-w-sm px-3.5 py-1.5 border transition-colors",
        borderClassName,
        className,
      )}
    >
      <span>{message}</span>
    </Chip>
  );
}
