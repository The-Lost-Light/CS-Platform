import { languageDistribution } from "../model/languages";
import type { RepoBundle } from "../model/repository";
import { useI18n } from "@modules/i18n";
const LANG_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function RepositoryLanguages({ languages }: Pick<RepoBundle, "languages">) {
  const { t } = useI18n();
  const distribution = languageDistribution(languages);
  return (
    <>
      {distribution.length > 0 && (
        <div className="ui-card p-5 space-y-2.5">
          <div className="text-xs font-bold text-on-surface">
            {t("github.languageDistribution")}
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface-high overflow-hidden flex">
            {distribution.map(({ name: lang, barWidth: pct }, idx) => {
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
            {distribution.map(({ name: lang, percent }) => (
              <span key={lang} className="font-mono">
                <strong className="text-on-surface">{lang}</strong>: {percent}%
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
