import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "./cn";

export interface MenuProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
}

export function Menu({ ref, className, children, ...props }: MenuProps) {
  return (
    <div ref={ref} role="menu" className={cn("ui-menu", className)} {...props}>
      {children}
    </div>
  );
}

export interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  icon?: LucideIcon;
  iconClassName?: string;
  tone?: "default" | "danger";
  selected?: boolean;
  role?: "menuitem" | "menuitemradio";
}

export function MenuItem({
  ref,
  icon: Icon,
  iconClassName,
  tone = "default",
  selected = false,
  role = "menuitem",
  type = "button",
  className,
  children,
  ...props
}: MenuItemProps) {
  return (
    <button
      ref={ref}
      type={type}
      role={role}
      aria-checked={role === "menuitemradio" ? selected : undefined}
      className={cn(
        "ui-menu-item",
        selected && "ui-menu-item-active",
        tone === "danger" && "ui-menu-item-danger",
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className={cn("w-3.5 h-3.5 shrink-0", iconClassName)} />}
      {children}
    </button>
  );
}

export function getRovingFocusIndex(
  key: string,
  currentIndex: number,
  count: number,
  options?: { horizontal?: boolean; fallbackIndex?: number },
): number | null {
  if (count <= 0) return null;
  const horizontal = options?.horizontal ?? false;
  const isNext = key === "ArrowDown" || (horizontal && key === "ArrowRight");
  const isPrev = key === "ArrowUp" || (horizontal && key === "ArrowLeft");
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (!isNext && !isPrev) return null;
  if (currentIndex < 0) {
    return options?.fallbackIndex !== undefined
      ? (options.fallbackIndex + (isNext ? 1 : -1) + count) % count
      : 0;
  }
  return (currentIndex + (isNext ? 1 : -1) + count) % count;
}
