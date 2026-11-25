import { ChevronRight, type LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode, Ref } from "react";

import { IconBadge, type IconBadgeSize, type IconBadgeTone } from "./Badge";
import { cn } from "./cn";

export interface PageContainerProps {
  as?: "div" | "section";
  variant?: "default" | "workspace";
  className?: string;
  children: ReactNode;
}

export function PageContainer({
  as: Tag = "div",
  variant = "default",
  className,
  children,
}: PageContainerProps) {
  return (
    <Tag
      className={cn(variant === "workspace" ? "ui-workspace-shell" : "ui-page-shell", className)}
    >
      {children}
    </Tag>
  );
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "aside";
  overflowHidden?: boolean;
  padded?: boolean;
  ref?: Ref<HTMLDivElement & HTMLElement>;
}

export function Card({
  as: Tag = "section",
  overflowHidden = false,
  padded = false,
  className,
  children,
  ref,
  ...props
}: CardProps) {
  return (
    <Tag
      ref={ref}
      className={cn(
        "ui-card",
        overflowHidden && "overflow-hidden",
        padded && "p-5 sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export interface CardHeaderProps {
  as?: "header" | "div";
  icon?: LucideIcon;
  iconTone?: IconBadgeTone;
  iconSize?: IconBadgeSize;
  iconClassName?: string;
  title?: ReactNode;
  titleId?: string;
  headingAs?: "h2" | "h3" | "h4";
  truncateTitle?: boolean;
  titleClassName?: string;
  actions?: ReactNode;
  children?: ReactNode;
  layoutClassName?: string;
  className?: string;
}

export function CardHeader({
  as: Tag = "div",
  icon,
  iconTone,
  iconSize = "md",
  iconClassName,
  title,
  titleId,
  headingAs: HeadingTag = "h2",
  truncateTitle = true,
  titleClassName,
  actions,
  children,
  layoutClassName = "flex items-center justify-between gap-3",
  className,
}: CardHeaderProps) {
  const iconGap = iconSize === "xs" || iconSize === "sm" ? "gap-2.5" : "gap-3";

  return (
    <Tag className={cn("ui-card-header", layoutClassName, className)}>
      {(icon || title) && (
        <div className={cn("flex items-center min-w-0", iconGap)}>
          {icon && (
            <IconBadge icon={icon} tone={iconTone} size={iconSize} className={iconClassName} />
          )}
          {title && (
            <HeadingTag
              id={titleId}
              className={cn(
                "text-base font-bold text-on-primary-container",
                truncateTitle && "truncate",
                titleClassName,
              )}
            >
              {title}
            </HeadingTag>
          )}
        </div>
      )}
      {children}
      {actions}
    </Tag>
  );
}

export interface PageHeaderCardProps {
  as?: "section" | "div";
  icon: LucideIcon;
  title: string;
  titleAttr?: string;
  description?: ReactNode;
  actions?: ReactNode;
  actionsClassName?: string;
  children?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function PageHeaderCard({
  as: Tag = "section",
  icon,
  title,
  titleAttr,
  description,
  actions,
  actionsClassName,
  children,
  compact = false,
  className,
}: PageHeaderCardProps) {
  const headerContent = (
    <>
      <div className="flex items-center gap-3.5 min-w-0">
        <IconBadge icon={icon} size="lg" />
        <div className="min-w-0">
          <h1
            title={titleAttr}
            className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface truncate"
          >
            {title}
          </h1>
          {description && <p className="text-xs sm:text-sm text-on-muted mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && (
        <div className={cn("flex flex-wrap items-center gap-2.5 shrink-0", actionsClassName)}>
          {actions}
        </div>
      )}
    </>
  );

  return (
    <Tag
      className={cn(
        "ui-card",
        compact ? "px-5 sm:px-6 py-5" : "p-6 sm:p-7",
        !children && "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        className,
      )}
    >
      {children ? (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {headerContent}
          </div>
          {children}
        </>
      ) : (
        headerContent
      )}
    </Tag>
  );
}

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "ul" | "section";
}

export function Panel({ as: Tag = "div", className, children, ...props }: PanelProps) {
  return (
    <Tag className={cn("ui-panel", className)} {...props}>
      {children}
    </Tag>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("ui-empty", className)}>{children}</p>;
}

export function CardList({
  isEmpty,
  emptyMessage,
  children,
  className,
}: {
  isEmpty: boolean;
  emptyMessage: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  if (isEmpty) {
    return (
      <div className="p-5 sm:p-6">
        <EmptyState>{emptyMessage}</EmptyState>
      </div>
    );
  }
  return <div className={cn("divide-y divide-outline-subtle", className)}>{children}</div>;
}

export function ChevronIndicator({
  label,
  onClick,
  className,
}: {
  label?: string;
  onClick?: () => void;
  className?: string;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={cn(
          "ui-chevron-indicator cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          className,
        )}
      >
        <ChevronRight aria-hidden="true" className="w-4 h-4" />
      </button>
    );
  }
  return (
    <span className={cn("ui-chevron-indicator", className)}>
      <ChevronRight aria-hidden="true" className="w-4 h-4" />
    </span>
  );
}
