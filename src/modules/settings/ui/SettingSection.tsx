import { IconBadge, cn, getRovingFocusIndex } from "@shared/ui";
import { Check, ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";

function SettingRowLead({
  icon,
  title,
  titleId,
  description,
  truncateDescription = false,
}: {
  icon: LucideIcon;
  title: string;
  titleId?: string;
  description: string;
  truncateDescription?: boolean;
}) {
  return (
    <span className="flex items-center gap-3 min-w-0 flex-1">
      <IconBadge as="span" tone="tonal" icon={icon} className="rounded-xl" />
      <span className="min-w-0 flex-1">
        <span id={titleId} className="block text-sm font-semibold text-on-surface leading-snug">
          {title}
        </span>
        <span
          className={cn(
            "block text-xs text-on-muted leading-snug mt-0.5",
            truncateDescription && "truncate",
          )}
        >
          {description}
        </span>
      </span>
    </span>
  );
}

export function SettingActionRow({
  icon,
  title,
  description,
  onAction,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onAction: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="ui-setting-section">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onAction}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-hover cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <SettingRowLead icon={icon} title={title} description={description} truncateDescription />
        <ChevronRight aria-hidden="true" className="w-4 h-4 text-on-subtle shrink-0" />
      </button>
      {children}
    </div>
  );
}

export function SettingSection({
  id,
  panelId,
  icon,
  title,
  description,
  valueContent,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  panelId: string;
  icon: LucideIcon;
  title: string;
  description: string;
  valueContent: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("ui-setting-section", expanded && "border-primary-outline/70")}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="ui-setting-trigger"
      >
        <span className="flex items-center min-w-0 min-h-10">
          <SettingRowLead icon={icon} title={title} titleId={id} description={description} />
        </span>
        <span className="ui-setting-value-cell">
          <span className={cn("ui-setting-value-pill", expanded && "ui-setting-value-pill-active")}>
            {valueContent}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "w-4 h-4 text-on-subtle self-center shrink-0 transition-transform duration-200",
              expanded && "rotate-180 text-primary",
            )}
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

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn("grid grid-cols-1 gap-2", columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}
      onKeyDown={(event) => {
        const currentIndex = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);
        const nextIndex = getRovingFocusIndex(event.key, currentIndex, options.length, {
          horizontal: true,
          fallbackIndex: Math.max(selectedIndex, 0),
        });
        if (nextIndex === null) return;
        event.preventDefault();
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
            className={cn(
              "ui-choice-card",
              selected ? "ui-choice-card-active" : "ui-choice-card-idle",
            )}
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
