import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./cn";

const bannerStyles = {
  error: { role: "alert", className: "ui-banner-danger", icon: AlertCircle },
  warning: { role: "status", className: "ui-banner-warning", icon: AlertTriangle },
  success: { role: "status", className: "ui-banner-success", icon: CheckCircle2 },
} as const;

export function FeedbackBanner({
  kind,
  children,
  action,
  className,
}: {
  kind: "error" | "success" | "warning";
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { role, className: kindClassName, icon: Icon } = bannerStyles[kind];
  return (
    <div role={role} className={cn(kindClassName, className)}>
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="w-4 h-4 shrink-0" />
        {children}
      </div>
      {action}
    </div>
  );
}
