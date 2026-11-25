import { Link } from "@void/react";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

import { cn } from "./cn";

export type ButtonVariant = "primary" | "tonal" | "outlined" | "ghost" | "danger" | "danger-tonal";

export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "ui-btn-primary",
  tonal: "ui-btn-tonal",
  outlined: "ui-btn-outlined",
  ghost: "ui-btn-text-muted",
  danger: "ui-btn-danger",
  "danger-tonal": "ui-btn-danger-tonal",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "",
  lg: "py-3 text-sm",
};

function renderButtonContent({
  icon: Icon,
  trailingIcon: TrailingIcon,
  iconClassName,
  size = "md",
  loading = false,
  children,
}: {
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  iconClassName?: string;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
}) {
  const defaultIconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const LeadingIcon = loading && !Icon ? LoaderCircle : Icon;

  return (
    <>
      {LeadingIcon && (
        <LeadingIcon
          aria-hidden="true"
          className={cn(defaultIconSize, "shrink-0", loading && "animate-spin", iconClassName)}
        />
      )}
      {children}
      {TrailingIcon && (
        <TrailingIcon
          aria-hidden="true"
          className={cn(defaultIconSize, "shrink-0", iconClassName)}
        />
      )}
    </>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  iconClassName?: string;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  iconClassName,
  loading = false,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {renderButtonContent({ icon, trailingIcon, iconClassName, size, loading, children })}
    </button>
  );
}

type LinkProps = ComponentProps<typeof Link>;

export interface ButtonLinkProps extends Omit<LinkProps, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  iconClassName?: string;
  className?: string;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  iconClassName,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(variantClasses[variant], sizeClasses[size], className)} {...props}>
      {renderButtonContent({ icon, trailingIcon, iconClassName, size, children })}
    </Link>
  );
}

export type IconButtonSize = "sm" | "md";
export type IconButtonVariant = "ghost" | "surface";

const iconButtonSizes: Record<IconButtonSize, string> = {
  sm: "w-7 h-7",
  md: "w-8 h-8",
};

const iconButtonVariants: Record<IconButtonVariant, string> = {
  ghost: "ui-btn-icon",
  surface:
    "ui-btn-icon rounded-lg bg-surface-container hover:bg-primary-container text-on-muted hover:text-on-primary-container border border-outline-subtle",
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  withTitle?: boolean;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  iconClassName?: string;
}

export function IconButton({
  icon: Icon,
  label,
  withTitle = false,
  size = "md",
  variant = "ghost",
  iconClassName,
  type = "button",
  title,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={title ?? (withTitle ? label : undefined)}
      className={cn(iconButtonVariants[variant], iconButtonSizes[size], "shrink-0", className)}
      {...props}
    >
      <Icon aria-hidden="true" className={cn("w-4 h-4", iconClassName)} />
    </button>
  );
}

export interface IconLinkProps extends Omit<LinkProps, "className"> {
  icon: LucideIcon;
  label: string;
  withTitle?: boolean;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  iconClassName?: string;
  className?: string;
}

export function IconLink({
  icon: Icon,
  label,
  withTitle = false,
  size = "md",
  variant = "ghost",
  iconClassName,
  title,
  className,
  ...props
}: IconLinkProps) {
  return (
    <Link
      aria-label={label}
      title={title ?? (withTitle ? label : undefined)}
      className={cn(iconButtonVariants[variant], iconButtonSizes[size], "shrink-0", className)}
      {...props}
    >
      <Icon aria-hidden="true" className={cn("w-4 h-4", iconClassName)} />
    </Link>
  );
}
