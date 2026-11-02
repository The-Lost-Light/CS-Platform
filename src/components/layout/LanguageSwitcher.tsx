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
    ? t('自動（{language}）', { language: currentLanguage })
    : t('自動');
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
      <button ref={trigger} type="button" aria-label={t('語言')} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } }}
        className={`inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B57D0] dark:focus-visible:ring-[#A8C7FA] ${open ? 'border-[#0B57D0] bg-[#D3E3FD] text-[#041E49] dark:border-[#A8C7FA] dark:bg-[#004A77] dark:text-[#C2E7FF]' : 'border-[#747775] bg-transparent text-[#444746] hover:bg-[#1F1F1F]/[0.08] dark:border-[#8E918F] dark:text-[#C4C7C5] dark:hover:bg-white/[0.08]'}`}>
        <Languages className="h-4 w-4" aria-hidden="true" />
        <span>{options[selected].label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={t('語言')}
          className="absolute right-0 top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl bg-[#F0F4F9] py-2 text-[#1F1F1F] shadow-lg shadow-black/20 ring-1 ring-black/5 dark:bg-[#282A2F] dark:text-[#E3E2E6] dark:ring-white/10"
          onKeyDown={event => {
            const index = items.current.indexOf(document.activeElement as HTMLButtonElement);
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
              items.current[next]?.focus();
            } else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
          }}>
          {options.map((option, index) => (
            <button key={option.value} ref={element => { items.current[index] = element; }} type="button" role="menuitemradio" aria-checked={preference === option.value} tabIndex={-1}
              onClick={() => choose(option.value)}
              className={`flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm transition-colors focus:outline-none focus:bg-[#1F1F1F]/[0.12] hover:bg-[#1F1F1F]/[0.08] dark:focus:bg-white/[0.12] dark:hover:bg-white/[0.08] ${preference === option.value ? 'bg-[#D3E3FD] text-[#041E49] dark:bg-[#004A77] dark:text-[#C2E7FF]' : ''}`}>
              {option.value === 'auto' ? <Monitor className="h-5 w-5 shrink-0" aria-hidden="true" /> : <Languages className="h-5 w-5 shrink-0" aria-hidden="true" />}
              <span className="flex-1" lang={option.value === 'auto' ? undefined : option.value}>{option.label}</span>
              {preference === option.value && <Check className="h-5 w-5 shrink-0" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
