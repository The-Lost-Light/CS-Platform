import { Chip } from "@shared/ui";

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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 min-w-0">
      <div className="h-3 basis-56 min-w-[min(100%,14rem)] flex-1 rounded-full bg-surface-highest overflow-hidden flex gap-0.5">
        {distribution.map(({ name: lang, percent, barWidth: pct }, idx) => (
          <div
            key={lang}
            style={{
              width: `${pct}%`,
              backgroundColor: LANG_CHART_COLORS[idx % LANG_CHART_COLORS.length],
            }}
            title={`${lang}: ${percent}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
        {distribution.map(({ name: lang, percent }, idx) => (
          <Chip key={lang} variant="neutral" mono className="min-w-0 max-w-full">
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
              style={{
                backgroundColor: LANG_CHART_COLORS[idx % LANG_CHART_COLORS.length],
              }}
            />
            <strong className="text-on-surface truncate">{lang}</strong>
            <span className="shrink-0">{percent}%</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}
