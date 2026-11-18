import type { RepoBundle } from "@domain/repository";
import { useI18n } from "@i18n";
const LANG_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function RepositoryLanguages({ languages }: Pick<RepoBundle, "languages">) {
  const { t } = useI18n();
  const langEntries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const totalBytes = langEntries.reduce((acc, [, b]) => acc + b, 0) || 1;
  return (
    <>
      {langEntries.length > 0 && (
        <div className="ui-card p-5 space-y-2.5">
          <div className="text-xs font-bold text-on-surface">
            {t("github.languageDistribution")}
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface-high overflow-hidden flex">
            {langEntries.map(([lang, bytes], idx) => {
              const pct = Math.max(2, (bytes / totalBytes) * 100).toFixed(1);
              return (
                <div
                  key={lang}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: LANG_CHART_COLORS[idx % LANG_CHART_COLORS.length],
                  }}
                  title={`${lang}: ${pct}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-on-muted pt-1">
            {langEntries.map(([lang, bytes]) => (
              <span key={lang} className="font-mono">
                <strong className="text-on-surface">{lang}</strong>:{" "}
                {((bytes / totalBytes) * 100).toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
