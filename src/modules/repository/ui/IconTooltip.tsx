import type { ReactNode } from "react";

export function IconTooltip({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex items-center shrink-0 group ${className}`}>
      {children}
      <span
        role="tooltip"
        aria-hidden="true"
        className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 w-max max-w-64 rounded-xl px-3 py-1.5 text-xs font-semibold leading-snug shadow-m3-3 border border-outline-subtle bg-surface-elevated text-on-surface backdrop-blur-xl"
      >
        {label}
      </span>
    </span>
  );
}
