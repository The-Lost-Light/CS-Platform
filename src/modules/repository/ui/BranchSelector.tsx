import { useI18n } from "@modules/i18n";
import { Button, Menu, MenuItem, cn } from "@shared/ui";
import { Check, ChevronDown, GitBranch, LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { RepoBranch } from "../model/repository";

interface BranchSelectorProps {
  defaultBranch: string;
  branches: RepoBranch[];
  totalBranches: number;
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  isLoading?: boolean;
  hasMoreBranches?: boolean;
  isLoadingMoreBranches?: boolean;
  onLoadMoreBranches?: () => void;
  initialOpen?: boolean;
}

export function BranchSelector({
  defaultBranch,
  branches,
  totalBranches,
  selectedBranch,
  onBranchChange,
  isLoading = false,
  hasMoreBranches = false,
  isLoadingMoreBranches = false,
  onLoadMoreBranches,
  initialOpen = false,
}: BranchSelectorProps) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(initialOpen);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const branchNames = Array.from(
    new Set([defaultBranch || "main", ...branches.map((b) => b.name), selectedBranch]),
  );
  const selectedIndex = Math.max(0, branchNames.indexOf(selectedBranch));
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  useEffect(() => {
    if (!open) return;
    items.current[selectedIndexRef.current]?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  function choose(name: string) {
    setOpen(false);
    trigger.current?.focus();
    if (name !== selectedBranch) onBranchChange(name);
  }

  const loadedCount = branches.length.toLocaleString(locale);
  const exactTotal = Math.max(totalBranches, branches.length).toLocaleString(locale);

  return (
    <div ref={root} className="relative min-w-0 max-w-full">
      <button
        ref={trigger}
        type="button"
        disabled={isLoading}
        aria-label={`${t("github.branchLabel")}${selectedBranch}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "ui-chip-success border font-mono text-[11px] font-bold min-w-0 max-w-full transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-70",
          open
            ? "border-success ring-2 ring-success/25 shadow-m3-1"
            : "border-success-outline/60 hover:border-success-outline hover:shadow-m3-1",
        )}
      >
        <GitBranch aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
        <span className="shrink-0">{t("github.branchLabel")}</span>
        <span className="truncate">{selectedBranch}</span>
        {isLoading ? (
          <LoaderCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0 animate-spin" />
        ) : (
          <ChevronDown
            aria-hidden="true"
            className={cn("w-3.5 h-3.5 shrink-0 transition-transform", open && "rotate-180")}
          />
        )}
      </button>

      {open && (
        <Menu
          id={menuId}
          aria-label={t("github.branches")}
          className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-2xl p-2"
          onKeyDown={(event) => {
            const menuItems = items.current.slice(0, branchNames.length);
            const index = menuItems.indexOf(document.activeElement as HTMLButtonElement);
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && menuItems.length) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? menuItems.length - 1
                    : index === -1
                      ? 0
                      : (index + (event.key === "ArrowDown" ? 1 : -1) + menuItems.length) %
                        menuItems.length;
              menuItems[next]?.focus();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              trigger.current?.focus();
            }
          }}
        >
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 mb-1 border-b border-outline-subtle text-[11px] font-semibold text-on-muted">
            <span className="truncate">{t("github.branches")}</span>
            <span className="font-mono shrink-0 text-on-subtle">
              {hasMoreBranches ? `${loadedCount} / ${exactTotal}` : exactTotal}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-0.5 pr-0.5">
            {branchNames.map((name, index) => {
              const isSelected = name === selectedBranch;
              return (
                <MenuItem
                  key={name}
                  ref={(element) => {
                    items.current[index] = element;
                  }}
                  role="menuitemradio"
                  selected={isSelected}
                  tabIndex={-1}
                  title={name}
                  icon={GitBranch}
                  iconClassName={isSelected ? "text-on-primary-container" : "text-success"}
                  onClick={() => choose(name)}
                  className="min-h-9 rounded-xl"
                >
                  <span className="flex-1 min-w-0 truncate font-mono">{name}</span>
                  {isSelected && <Check aria-hidden="true" className="w-4 h-4 shrink-0" />}
                </MenuItem>
              );
            })}
            {hasMoreBranches && onLoadMoreBranches && (
              <Button
                variant="tonal"
                size="sm"
                loading={isLoadingMoreBranches}
                disabled={isLoadingMoreBranches}
                onClick={onLoadMoreBranches}
                className="mt-1 w-full py-2"
              >
                <span>
                  {isLoadingMoreBranches ? t("common.loading") : t("github.loadMoreBranches")}
                </span>
              </Button>
            )}
          </div>
        </Menu>
      )}
    </div>
  );
}
