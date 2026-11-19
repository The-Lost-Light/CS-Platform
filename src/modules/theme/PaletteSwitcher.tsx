import { useI18n } from "@modules/i18n";
import { Check, ChevronDown, Palette } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { THEME_PALETTE_SWATCHES, type ThemePalette } from "./model";
import { useTheme } from "./ThemeProvider";

export function PaletteSwitcher() {
  const { t } = useI18n();
  const { palette, setPalette, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const selectedIndex = THEME_PALETTE_SWATCHES.findIndex((item) => item.value === palette);
  const selected = selectedIndex >= 0 ? selectedIndex : 0;
  const activeSwatch = THEME_PALETTE_SWATCHES[selected];

  useEffect(() => {
    if (!open) return;
    items.current[selected]?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, selected]);

  function choose(value: ThemePalette) {
    setPalette(value);
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div
      ref={root}
      className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={t("theme.palette.label")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          open
            ? "border-primary-outline bg-primary-container text-on-primary-container"
            : "border-outline-subtle bg-surface-container text-on-muted hover:bg-surface-hover hover:text-on-surface"
        }`}
      >
        <Palette className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full ring-1 ring-black/10 dark:ring-white/20 shrink-0"
          style={{ backgroundColor: isDark ? activeSwatch.darkPrimary : activeSwatch.primary }}
        />
        <span>{t(`theme.palette.${activeSwatch.value}`)}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("theme.palette.label")}
          className="ui-menu absolute right-0 top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)]"
          onKeyDown={(event) => {
            const index = items.current.indexOf(document.activeElement as HTMLButtonElement);
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? THEME_PALETTE_SWATCHES.length - 1
                    : (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        THEME_PALETTE_SWATCHES.length) %
                      THEME_PALETTE_SWATCHES.length;
              items.current[next]?.focus();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              trigger.current?.focus();
            }
          }}
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-on-subtle">
            {t("theme.palette.label")}
          </div>
          {THEME_PALETTE_SWATCHES.map((item, index) => (
            <button
              key={item.value}
              ref={(element) => {
                items.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={palette === item.value}
              tabIndex={-1}
              onClick={() => choose(item.value)}
              className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer focus:outline-hidden ${
                palette === item.value
                  ? "bg-primary-container text-on-primary-container font-semibold"
                  : "text-on-surface hover:bg-surface-hover focus:bg-surface-hover font-medium"
              }`}
            >
              <span aria-hidden="true" className="inline-flex items-center -space-x-1 shrink-0">
                <span
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                  style={{ backgroundColor: isDark ? item.darkPrimary : item.primary }}
                />
                <span
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                  style={{ backgroundColor: isDark ? item.darkTint : item.tint }}
                />
              </span>
              <span className="flex-1 truncate">{t(`theme.palette.${item.value}`)}</span>
              {item.isDefault && (
                <span className="rounded-md bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold text-on-muted">
                  {t("theme.palette.default")}
                </span>
              )}
              {palette === item.value && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
