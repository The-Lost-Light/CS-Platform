import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

export function FeedbackBanner({
  kind,
  children,
  action,
  className = "",
}: {
  kind: "error" | "success";
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const error = kind === "error";
  const Icon = error ? AlertCircle : CheckCircle2;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`${error ? "ui-banner-danger" : "ui-banner-success"} ${className}`.trim()}
    >
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="w-4 h-4 shrink-0" />
        {children}
      </div>
      {action}
    </div>
  );
}
