import { useI18n } from '../../i18n';
import type { Analysis } from '../../types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Compass,
  FolderCheck,
  FileWarning,
  GitCommit,
  Sparkles,
} from 'lucide-react';

export function ArchitectureComparisonPanel({ analysis }: { analysis: Analysis | null }) {
  const { t } = useI18n();
  if (!analysis) return null;

  const {
    alignmentScore,
    implementedCount,
    partialCount,
    missingCount,
    totalNodes,
    nodeEvaluations = [],
    docPathAudit = [],
    unplannedFiles = [],
    recommendations = [],
  } = analysis;

  return (
    <div className="space-y-6">
      {/* Top Scorecard Banner */}
      <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-[24px] p-6 shadow-xs transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 flex items-center gap-5">
            <div className="w-24 h-24 rounded-2xl bg-[#F3EDF7] dark:bg-[#4F378B]/40 border-2 border-[#6750A4] dark:border-[#D0BCFF] flex flex-col items-center justify-center shrink-0 shadow-xs">
              <span className="text-3xl font-extrabold text-[#1F1F1F] dark:text-[#E3E2E6] font-mono">
                {alignmentScore}%
              </span>
              <span className="text-[10px] text-[#6750A4] dark:text-[#D0BCFF] font-bold mt-0.5">{t('comparison.alignment')}</span>
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('comparison.title')}</span>
              </div>
              <h3 className="text-lg font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">
                {alignmentScore >= 80
                  ? t('comparison.summary.high')
                  : alignmentScore >= 55
                  ? t('comparison.summary.medium')
                  : t('comparison.summary.low')}
              </h3>
              <p className="text-xs text-[#444746] dark:text-[#C4C7C5] leading-relaxed">
                {t('comparison.descriptionStart')}
                <strong className="text-[#1F1F1F] dark:text-[#E3E2E6]">{totalNodes}</strong>
                {t('comparison.descriptionMiddle')}
                <strong className="text-[#1F1F1F] dark:text-[#E3E2E6]">{analysis.actualFileCount}</strong>
                {t('comparison.descriptionEnd')}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-3 gap-3">
            <div className="bg-[#F8FAFD] dark:bg-[#121316] border border-[#81C995]/60 dark:border-[#137333] rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-[#137333] dark:text-[#81C995] font-mono">
                {implementedCount} / {analysis.mappedNodeCount}
              </div>
              <div className="text-xs text-[#1F1F1F] dark:text-[#E3E2E6] font-semibold mt-1">{t('comparison.implemented')}</div>
              <div className="text-[11px] text-[#5E5E5E] dark:text-[#8E918F] mt-0.5">{t('comparison.exactMatch')}</div>
            </div>

            <div className="bg-[#F8FAFD] dark:bg-[#121316] border border-[#FDD663]/80 dark:border-[#B06000] rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-[#B06000] dark:text-[#FDD663] font-mono">
                {partialCount}
              </div>
              <div className="text-xs text-[#1F1F1F] dark:text-[#E3E2E6] font-semibold mt-1">{t('comparison.partial')}</div>
              <div className="text-[11px] text-[#5E5E5E] dark:text-[#8E918F] mt-0.5">{t('comparison.filenameMatch')}</div>
            </div>

            <div className="bg-[#F8FAFD] dark:bg-[#121316] border border-[#F28B82]/70 dark:border-[#8C1D18] rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-[#C5221F] dark:text-[#F2B8B5] font-mono">
                {missingCount}
              </div>
              <div className="text-xs text-[#1F1F1F] dark:text-[#E3E2E6] font-semibold mt-1">{t('comparison.missing')}</div>
              <div className="text-[11px] text-[#5E5E5E] dark:text-[#8E918F] mt-0.5">{t('comparison.missingInTree')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mind Map Node <-> GitHub File Structure Comparison Table */}
      <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-[24px] overflow-hidden shadow-xs transition-colors">
        <div className="px-6 py-4 bg-[#F3EDF7] dark:bg-[#4F378B]/40 border-b border-[#EADDFF] dark:border-[#6750A4]/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] flex items-center justify-center shadow-2xs">
              <FolderCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#4F378B] dark:text-[#EADDFF]">{t('comparison.table.title')}</h3>
          </div>
          <span className="text-xs text-[#444746] dark:text-[#C4C7C5]">{t('comparison.table.description')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFD] dark:bg-[#121316] text-[#444746] dark:text-[#C4C7C5] border-b border-slate-200 dark:border-[#33353A]">
                <th className="py-3 px-4 font-semibold">{t('comparison.table.module')}</th>
                <th className="py-3 px-4 font-semibold">{t('comparison.table.expectedPath')}</th>
                <th className="py-3 px-4 font-semibold">{t('comparison.table.status')}</th>
                <th className="py-3 px-4 font-semibold">{t('comparison.table.matches')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('comparison.table.commits')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#33353A]">
              {nodeEvaluations.map((node) => (
                <tr key={node.id} className="hover:bg-[#F3EDF7]/40 dark:hover:bg-[#282A2F] transition">
                  <td className="py-3 px-4 font-semibold text-[#1F1F1F] dark:text-[#E3E2E6]">
                    <div>{node.label}</div>
                    <div className="text-[11px] text-[#444746] dark:text-[#C4C7C5] font-normal">
                      {node.description}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#0B57D0] dark:text-[#A8C7FA]">
                    {node.expectedPath}
                  </td>
                  <td className="py-3 px-4">
                    {node.status === 'implemented' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#CEEAD6] dark:bg-[#0F5223]/50 text-[#0D652D] dark:text-[#C4EED0] border border-[#81C995] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{node.statusLabel}</span>
                      </span>
                    ) : node.status === 'partial' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEF7E0] dark:bg-[#594300]/50 text-[#B06000] dark:text-[#FCE8B2] border border-[#FDD663] font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{node.statusLabel}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAD2CF] dark:bg-[#8C1D18]/40 text-[#B3261E] dark:text-[#F2B8B5] border border-[#F28B82] font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{node.statusLabel}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#444746] dark:text-[#C4C7C5]">
                    {node.matchedFiles.length > 0 ? (
                      <div className="space-y-0.5">
                        {node.matchedFiles.map((f) => (
                          <div key={f} className="text-[#0D652D] dark:text-[#81C995]">
                            ✓ {f}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#C5221F] dark:text-[#F2B8B5]">{t('comparison.noMatchingFiles')}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {node.commitTouchCount > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF] font-bold">
                        {t('comparison.commitCount', { count: node.commitTouchCount })}
                      </span>
                    ) : (
                      <span className="text-[#5E5E5E] dark:text-[#8E918F]">{t('comparison.zeroCommits')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Written Spec Path Audit & Unplanned Extra Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-[24px] p-5 space-y-3 shadow-xs transition-colors">
          <div className="text-xs font-bold text-[#0B57D0] dark:text-[#A8C7FA] flex items-center gap-2">
            <GitCommit className="w-4 h-4" />
            <span>{t('comparison.docPathsStart')}{docPathAudit.length}{t('comparison.itemsEnd')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {docPathAudit.map((item) => (
              <span
                key={item.path}
                className={`px-2.5 py-1 rounded-xl font-mono text-xs border flex items-center gap-1.5 ${
                  item.existsInRepo
                    ? 'bg-[#CEEAD6]/60 dark:bg-[#0F5223]/40 border-[#81C995] text-[#0D652D] dark:text-[#C4EED0]'
                    : 'bg-[#FAD2CF]/60 dark:bg-[#8C1D18]/40 border-[#F28B82] text-[#B3261E] dark:text-[#F2B8B5]'
                }`}
              >
                {item.existsInRepo ? '✓' : '✗'} {item.path}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-[24px] p-5 space-y-3 shadow-xs transition-colors">
          <div className="text-xs font-bold text-[#B06000] dark:text-[#FDD663] flex items-center gap-2">
            <FileWarning className="w-4 h-4" />
            <span>{t('comparison.unplannedFilesStart')}{unplannedFiles.length}{t('comparison.itemsEnd')}</span>
          </div>
          {unplannedFiles.length === 0 ? (
            <p className="text-xs text-[#444746] dark:text-[#C4C7C5]">{t('comparison.allFilesCovered')}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {unplannedFiles.map((f) => (
                <span
                  key={f}
                  className="px-2.5 py-1 rounded-xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] font-mono text-xs text-[#B06000] dark:text-[#FDD663]"
                >
                  + {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Concrete Suggestions & Improvement Directions */}
      <div className="bg-white dark:bg-[#1E1F23] border border-slate-200/90 dark:border-[#33353A] rounded-[24px] p-6 space-y-4 shadow-xs transition-colors">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-[#33353A] pb-3.5">
          <div className="w-8 h-8 rounded-xl bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] flex items-center justify-center shadow-2xs">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t('comparison.recommendations.title')}</h3>
            <p className="text-xs text-[#444746] dark:text-[#C4C7C5]">{t('comparison.recommendations.description')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] p-4 space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EADDFF] dark:bg-[#4F378B] text-[#4F378B] dark:text-[#EADDFF] text-xs font-bold">
                    {rec.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                      rec.priority === 'HIGH'
                        ? 'bg-[#FAD2CF] dark:bg-[#8C1D18]/40 text-[#B3261E] dark:text-[#F2B8B5] border-[#F28B82]'
                        : rec.priority === 'MEDIUM'
                        ? 'bg-[#FEF7E0] dark:bg-[#594300]/50 text-[#B06000] dark:text-[#FCE8B2] border-[#FDD663]'
                        : 'bg-[#CEEAD6] dark:bg-[#0F5223]/50 text-[#0D652D] dark:text-[#C4EED0] border-[#81C995]'
                    }`}
                  >
                    {t('comparison.priorityLabel')}
                    {t(rec.priority === 'HIGH' ? 'common.priority.high' : rec.priority === 'MEDIUM' ? 'common.priority.medium' : 'common.priority.low')}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{rec.title}</h4>
                <p className="text-xs text-[#444746] dark:text-[#C4C7C5] leading-relaxed">{rec.detail}</p>
              </div>

              <div className="pt-2.5 border-t border-slate-200 dark:border-[#33353A] space-y-1">
                <div className="text-[11px] font-bold text-[#0B57D0] dark:text-[#A8C7FA]">{t('comparison.actions')}</div>
                <ul className="space-y-1 text-xs text-[#444746] dark:text-[#C4C7C5]">
                  {(rec.actionItems || []).map((act, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-[#B06000] dark:text-[#FDD663] shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
