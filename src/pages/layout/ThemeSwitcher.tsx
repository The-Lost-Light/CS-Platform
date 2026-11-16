import { Monitor, Sun, Moon } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useTheme, type ThemeMode } from '../../theme';

export function ThemeSwitcher({
  size = 'sm',
}: {
  size?: 'xs' | 'sm';
}) {
  const { t } = useI18n();
  const { mode, setMode } = useTheme();
  const textSize = size === 'xs' ? 'text-[11px]' : 'text-xs';

  const options: { value: ThemeMode; label: string; title: string; Icon: typeof Monitor }[] = [
    { value: 'system', label: t('common.auto'), title: t('theme.systemDescription'), Icon: Monitor },
    { value: 'light', label: t('theme.light'), title: t('theme.lightDescription'), Icon: Sun },
    { value: 'dark', label: t('theme.dark'), title: t('theme.darkDescription'), Icon: Moon },
  ];

  return (
    <div
      className="ui-pill-group"
      role="group"
      aria-label={t('theme.label')}
    >
      {options.map(({ value, label, title, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setMode(value)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${textSize} font-bold transition ${
            mode === value
              ? 'bg-secondary-container text-on-secondary-container shadow-2xs'
              : 'text-on-muted hover:text-on-surface'
          }`}
          title={title}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
