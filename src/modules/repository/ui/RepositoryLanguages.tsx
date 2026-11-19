import { useI18n } from "@modules/i18n";

import { languageDistribution } from "../model/languages";
import type { RepoBundle } from "../model/repository";
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
        <div className="ui-card p-5 sm:p-6 space-y-3">
          <div className="text-xs font-bold text-on-surface">
            {t("github.languageDistribution")}
          </div>
          <div className="w-full h-3 rounded-full bg-surface-highest overflow-hidden flex gap-0.5">
            {distribution.map(({ name: lang, barWidth: pct }, idx) => (
              <div
                key={lang}
                style={{
                  width: `${pct}%`,
                  backgroundColor: LANG_CHART_COLORS[idx % LANG_CHART_COLORS.length],
                }}
                title={`${lang}: ${pct}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {distribution.map(({ name: lang, percent }, idx) => (
              <span key={lang} className="ui-chip-neutral font-mono">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{
                    backgroundColor: LANG_CHART_COLORS[idx % LANG_CHART_COLORS.length],
                  }}
                />
                <strong className="text-on-surface">{lang}</strong>
                <span>{percent}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
