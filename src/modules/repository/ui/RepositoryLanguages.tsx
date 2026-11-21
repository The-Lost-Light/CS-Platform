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
  const distribution = languageDistribution(languages);
  if (distribution.length === 0) return null;
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
      <div className="w-full lg:flex-1 h-3 rounded-full bg-surface-highest overflow-hidden flex gap-0.5">
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
      <div className="flex flex-wrap items-center gap-2 shrink-0">
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
  );
}
