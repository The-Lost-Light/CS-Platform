import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Languages, Monitor } from 'lucide-react';
import { SUPPORTED_LOCALES, useI18n, type LanguagePreference } from '../../i18n';

export function LanguageSwitcher() {
  const { locale, preference, setPreference, t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const currentLanguage = SUPPORTED_LOCALES.find(language => language.value === locale)!.label;
  const autoLabel = preference === 'auto'
    ? t('language.autoDetected', { language: currentLanguage })
    : t('common.auto');
  const options = [{ value: 'auto' as const, label: autoLabel }, ...SUPPORTED_LOCALES];
  const selected = options.findIndex(option => option.value === preference);
  useEffect(() => {
    if (!open) return;
    items.current[selected]?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open, selected]);
  function choose(value: LanguagePreference) {
    setPreference(value);
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div ref={root} className="relative shrink-0" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button
        ref={trigger}
        type="button"
        aria-label={t('language.label')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary ${
          open
            ? 'border-secondary bg-secondary-container text-on-secondary-container shadow-2xs'
            : 'border-outline bg-surface-container text-on-muted hover:bg-surface-hover hover:text-on-surface'
        }`}
      >
        <Languages className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
        <span>{options[selected].label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('language.label')}
          className="absolute right-0 top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-outline bg-surface p-1.5 text-on-surface shadow-xl"
          onKeyDown={event => {
            const index = items.current.indexOf(document.activeElement as HTMLButtonElement);
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
              items.current[next]?.focus();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              trigger.current?.focus();
            }
          }}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={element => { items.current[index] = element; }}
              type="button"
              role="menuitemradio"
              aria-checked={preference === option.value}
              tabIndex={-1}
              onClick={() => choose(option.value)}
              className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-left text-xs font-semibold transition-colors focus:outline-hidden ${
                preference === option.value
                  ? 'bg-secondary-container text-on-secondary-container font-bold'
                  : 'text-on-muted hover:bg-surface-high focus:bg-surface-high'
              }`}
            >
              {option.value === 'auto' ? (
                <Monitor className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
              ) : (
                <Languages className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              )}
              <span className="flex-1" lang={option.value === 'auto' ? undefined : option.value}>
                {option.label}
              </span>
              {preference === option.value && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
