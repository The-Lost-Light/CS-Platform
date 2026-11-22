import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: LucideIcon;
  id?: string;
  ariaControls?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  role?: "tablist";
  size?: "sm" | "md";
  className?: string;
  itemClassName?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  role,
  size = "md",
  className,
  itemClassName,
}: SegmentedControlProps<T>) {
  const isTablist = role === "tablist";

  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={cn("ui-pill-group", size === "sm" && "text-[11px]", className)}
    >
      {options.map((option) => {
        const active = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            id={option.id}
            role={isTablist ? "tab" : undefined}
            aria-controls={option.ariaControls}
            aria-selected={isTablist ? active : undefined}
            aria-pressed={isTablist ? undefined : active}
            onClick={() => onChange(option.value)}
            className={cn(
              "ui-pill-item",
              size === "sm" ? "px-3 py-1" : "px-3 sm:px-4",
              active ? "ui-pill-item-active" : "ui-pill-item-idle",
              itemClassName,
            )}
          >
            {Icon && <Icon aria-hidden="true" className="w-3.5 h-3.5" />}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
