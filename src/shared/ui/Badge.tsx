import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes } from "react";

import { cn } from "./cn";

export type IconBadgeTone = "primary" | "tonal" | "secondary" | "success" | "warning" | "danger";
export type IconBadgeSize = "xs" | "sm" | "md" | "lg";

const badgeToneClasses: Record<IconBadgeTone, string> = {
  primary: "ui-icon-badge",
  tonal: "ui-icon-badge-tonal",
  secondary: "ui-icon-badge-secondary",
  success: "ui-icon-badge-success",
  warning: "ui-icon-badge-warning",
  danger: "ui-icon-badge-danger",
};

const badgeBoxSizes: Record<IconBadgeSize, string> = {
  xs: "w-7 h-7 rounded-lg",
  sm: "w-8 h-8",
  md: "w-9 h-9",
  lg: "w-11 h-11 rounded-xl",
};

const badgeIconSizes: Record<IconBadgeSize, string> = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export interface IconBadgeProps {
  icon: LucideIcon;
  tone?: IconBadgeTone;
  size?: IconBadgeSize;
  as?: "div" | "span";
  className?: string;
  iconClassName?: string;
}

export function IconBadge({
  icon: Icon,
  tone = "primary",
  size = "md",
  as: Tag = "div",
  className,
  iconClassName,
}: IconBadgeProps) {
  return (
    <Tag className={cn(badgeToneClasses[tone], badgeBoxSizes[size], className)}>
      <Icon aria-hidden="true" className={cn(badgeIconSizes[size], iconClassName)} />
    </Tag>
  );
}

export type ChipVariant =
  | "primary"
  | "secondary"
  | "neutral"
  | "success"
  | "danger"
  | "code"
  | "outline";

export type ChipSize = "sm" | "md";

const chipVariants: Record<ChipVariant, string> = {
  primary: "ui-chip-primary",
  secondary: "ui-chip-secondary",
  neutral: "ui-chip-neutral",
  success: "ui-chip-success",
  danger: "ui-chip-danger",
  code: "ui-code-badge",
  outline:
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated text-primary text-xs font-bold border border-primary-outline shrink-0",
};

const chipSizes: Record<ChipSize, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "",
};

export interface ChipProps extends HTMLAttributes<HTMLElement> {
  variant?: ChipVariant;
  size?: ChipSize;
  mono?: boolean;
  icon?: LucideIcon;
  iconClassName?: string;
  as?: "span" | "li" | "div";
}

export function Chip({
  variant = "neutral",
  size = "md",
  mono = false,
  icon: Icon,
  iconClassName,
  as: Tag = "span",
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <Tag
      className={cn(chipVariants[variant], chipSizes[size], mono && "font-mono", className)}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className={cn("w-3.5 h-3.5 shrink-0", iconClassName)} />}
      {children}
    </Tag>
  );
}

export interface AvatarBadgeProps {
  name?: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function AvatarBadge({ name, size = "md", className }: AvatarBadgeProps) {
  return (
    <span className={cn("ui-avatar", size === "sm" ? "w-7 h-7" : "w-8 h-8", className)}>
      {name?.slice(0, 1) || "?"}
    </span>
  );
}
