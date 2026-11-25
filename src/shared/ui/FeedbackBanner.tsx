import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { isValidElement, type ReactNode } from "react";

import { Button } from "./Button";
import { cn } from "./cn";

export type FeedbackKind = "error" | "success" | "warning";

export interface FeedbackBannerProps {
  kind: FeedbackKind;
  children: ReactNode;
  action?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  className?: string;
}

const bannerStyles = {
  error: { role: "alert", className: "ui-banner-danger", icon: AlertCircle },
  warning: { role: "status", className: "ui-banner-warning", icon: AlertTriangle },
  success: { role: "status", className: "ui-banner-success", icon: CheckCircle2 },
} as const;

export function FeedbackBanner({
  kind,
  children,
  action,
  retryLabel,
  onRetry,
  retryDisabled = false,
  className,
}: FeedbackBannerProps) {
  const { role, className: kindClassName, icon: Icon } = bannerStyles[kind];
  const content =
    isValidElement(children) && children.type === "span" ? children : <span>{children}</span>;
  const resolvedAction =
    action ??
    (onRetry && retryLabel ? (
      <Button variant="outlined" disabled={retryDisabled} onClick={onRetry} className="shrink-0">
        {retryLabel}
      </Button>
    ) : undefined);

  return (
    <div role={role} className={cn(kindClassName, className)}>
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="w-4 h-4 shrink-0" />
        {content}
      </div>
      {resolvedAction}
    </div>
  );
}
