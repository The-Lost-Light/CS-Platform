import type { ReactNode } from "react";

import { cn } from "./cn";

export interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
  align?: "center" | "responsive-start";
  role?: "tooltip" | null;
  as?: "span" | "div";
  className?: string;
}

export function Tooltip({
  label,
  children,
  tone = "default",
  align = "center",
  role = "tooltip",
  as: Tag = "span",
  className,
}: TooltipProps) {
  return (
    <Tag className={cn("relative inline-flex items-center shrink-0 group", className)}>
      {children}
      <span
        role={role ?? undefined}
        aria-hidden="true"
        className={cn(
          "ui-tooltip",
          align === "center"
            ? "left-1/2 -translate-x-1/2"
            : "left-0 lg:left-1/2 lg:-translate-x-1/2",
          tone === "danger"
            ? "bg-surface-elevated border-danger-outline text-danger"
            : "bg-surface-elevated border-outline-subtle text-on-surface",
        )}
      >
        {label}
      </span>
    </Tag>
  );
}
