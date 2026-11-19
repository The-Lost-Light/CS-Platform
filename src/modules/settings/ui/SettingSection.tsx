import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { useRef, type ReactNode, type Ref } from "react";

export function SettingSection({
  id,
  panelId,
  sectionRef,
  icon: Icon,
  title,
  description,
  valueContent,
  valueTone = "default",
  expanded,
  onToggle,
  children,
}: {
  id: string;
  panelId: string;
  sectionRef?: Ref<HTMLElement>;
  icon: LucideIcon;
  title: string;
  description: string;
  valueContent: ReactNode;
  valueTone?: "default" | "success";
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const pillClass = expanded
    ? "ui-setting-value-pill-active"
    : valueTone === "success"
      ? "ui-setting-value-pill-success"
      : "";

  return (
    <section
      ref={sectionRef}
      aria-labelledby={id}
      className={`ui-setting-section ${expanded ? "border-primary-outline/70" : ""}`}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="ui-setting-trigger"
      >
        <span className="flex items-center gap-3 min-w-0 min-h-10">
          <span className="ui-icon-badge-tonal w-9 h-9 rounded-xl">
            <Icon aria-hidden="true" className="w-4 h-4" />
          </span>
          <span className="min-w-0">
            <span id={id} className="block text-sm font-semibold text-on-surface leading-snug">
              {title}
            </span>
            <span className="block text-xs text-on-muted leading-snug mt-0.5">{description}</span>
          </span>
        </span>
        <span className="ui-setting-value-cell">
          <span className={`ui-setting-value-pill ${pillClass}`}>{valueContent}</span>
          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 text-on-subtle self-center shrink-0 transition-transform duration-200 ${
              expanded ? "rotate-180 text-primary" : ""
            }`}
          />
        </span>
      </button>
      <div id={panelId} hidden={!expanded}>
        <div className="px-4 pb-4 pt-3.5 border-t border-outline-subtle">{children}</div>
      </div>
    </section>
  );
}

export interface SettingChoiceOption<T extends string> {
  value: T;
  label: string;
  lang?: string;
  hint?: string;
  tag?: string;
  leading: ReactNode;
}

export function SettingChoiceGroup<T extends string>({
  labelledBy,
  value,
  onChange,
  options,
  columns = 3,
}: {
  labelledBy: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SettingChoiceOption<T>[];
  columns?: 2 | 3;
}) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const gridClass =
    columns === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
      : "grid grid-cols-1 sm:grid-cols-3 gap-2";

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={gridClass}
      onKeyDown={(event) => {
        if (
          !["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)
        ) {
          return;
        }
        event.preventDefault();
        const currentIndex = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);
        const baseIndex = currentIndex >= 0 ? currentIndex : Math.max(selectedIndex, 0);
        const nextIndex =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? options.length - 1
              : (baseIndex +
                  (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1) +
                  options.length) %
                options.length;
        itemRefs.current[nextIndex]?.focus();
        onChange(options[nextIndex].value);
      }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const focusable = selected || (selectedIndex < 0 && index === 0);
        return (
          <button
            key={option.value}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={focusable ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`ui-choice-card ${selected ? "ui-choice-card-active" : "ui-choice-card-idle"}`}
          >
            {option.leading}
            <span className="min-w-0 flex-1">
              <span className="block truncate" lang={option.lang}>
                {option.label}
              </span>
              {option.hint && (
                <span className="block truncate text-[11px] font-normal opacity-75">
                  {option.hint}
                </span>
              )}
            </span>
            {option.tag && (
              <span className="rounded-md bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold text-on-muted shrink-0">
                {option.tag}
              </span>
            )}
            {selected && <Check aria-hidden="true" className="w-4 h-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
