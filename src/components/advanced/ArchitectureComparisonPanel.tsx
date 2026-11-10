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
      <div className="ui-card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 flex items-center gap-5">
            <div className="w-24 h-24 rounded-2xl bg-surface-tonal border-2 border-primary flex flex-col items-center justify-center shrink-0 shadow-xs">
              <span className="text-3xl font-extrabold text-on-surface font-mono">
                {alignmentScore}%
              </span>
              <span className="text-[10px] text-primary font-bold mt-0.5">{t('comparison.alignment')}</span>
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('comparison.title')}</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface">
                {alignmentScore >= 80
                  ? t('comparison.summary.high')
                  : alignmentScore >= 55
                  ? t('comparison.summary.medium')
                  : t('comparison.summary.low')}
              </h3>
              <p className="text-xs text-on-muted leading-relaxed">
                {t('comparison.descriptionStart')}
                <strong className="text-on-surface">{totalNodes}</strong>
                {t('comparison.descriptionMiddle')}
                <strong className="text-on-surface">{analysis.actualFileCount}</strong>
                {t('comparison.descriptionEnd')}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-3 gap-3">
            <div className="bg-surface-sunken border border-success-outline rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-success font-mono">
                {implementedCount} / {analysis.mappedNodeCount}
              </div>
              <div className="text-xs text-on-surface font-semibold mt-1">{t('comparison.implemented')}</div>
              <div className="text-[11px] text-on-subtle mt-0.5">{t('comparison.exactMatch')}</div>
            </div>

            <div className="bg-surface-sunken border border-warning-outline rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-warning font-mono">
                {partialCount}
              </div>
              <div className="text-xs text-on-surface font-semibold mt-1">{t('comparison.partial')}</div>
              <div className="text-[11px] text-on-subtle mt-0.5">{t('comparison.filenameMatch')}</div>
            </div>

            <div className="bg-surface-sunken border border-danger-outline rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-danger font-mono">
                {missingCount}
              </div>
              <div className="text-xs text-on-surface font-semibold mt-1">{t('comparison.missing')}</div>
              <div className="text-[11px] text-on-subtle mt-0.5">{t('comparison.missingInTree')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mind Map Node <-> GitHub File Structure Comparison Table */}
      <div className="ui-card overflow-hidden">
        <div className="ui-card-header flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-2xs">
              <FolderCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-on-primary-container">{t('comparison.table.title')}</h3>
          </div>
          <span className="text-xs text-on-muted">{t('comparison.table.description')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-sunken text-on-muted border-b border-outline">
                <th className="py-3 px-4 font-semibold">{t('comparison.table.module')}</th>
                <th className="py-3 px-4 font-semibold">{t('comparison.table.expectedPath')}</th>
                <th className="py-3 px-4 font-semibold">{t('comparison.table.status')}</th>
                <th className="py-3 px-4 font-semibold">{t('comparison.table.matches')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('comparison.table.commits')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {nodeEvaluations.map((node) => (
                <tr key={node.id} className="hover:bg-surface-hover transition">
                  <td className="py-3 px-4 font-semibold text-on-surface">
                    <div>{node.label}</div>
                    <div className="text-[11px] text-on-muted font-normal">
                      {node.description}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-secondary">
                    {node.expectedPath}
                  </td>
                  <td className="py-3 px-4">
                    {node.status === 'implemented' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success-container text-on-success-container border border-success-outline font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{node.statusLabel}</span>
                      </span>
                    ) : node.status === 'partial' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning-container text-on-warning-container border border-warning-outline font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{node.statusLabel}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-danger-container text-on-danger-container border border-danger-outline font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{node.statusLabel}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-on-muted">
                    {node.matchedFiles.length > 0 ? (
                      <div className="space-y-0.5">
                        {node.matchedFiles.map((f) => (
                          <div key={f} className="text-success">
                            ✓ {f}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-danger">{t('comparison.noMatchingFiles')}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {node.commitTouchCount > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold">
                        {t('comparison.commitCount', { count: node.commitTouchCount })}
                      </span>
                    ) : (
                      <span className="text-on-subtle">{t('comparison.zeroCommits')}</span>
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
        <div className="ui-card p-5 space-y-3">
          <div className="text-xs font-bold text-secondary flex items-center gap-2">
            <GitCommit className="w-4 h-4" />
            <span>{t('comparison.docPathsStart')}{docPathAudit.length}{t('comparison.itemsEnd')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {docPathAudit.map((item) => (
              <span
                key={item.path}
                className={`px-2.5 py-1 rounded-xl font-mono text-xs border flex items-center gap-1.5 ${
                  item.existsInRepo
                    ? 'bg-success-container/60 border-success-outline text-on-success-container'
                    : 'bg-danger-container/60 border-danger-outline text-on-danger-container'
                }`}
              >
                {item.existsInRepo ? '✓' : '✗'} {item.path}
              </span>
            ))}
          </div>
        </div>

        <div className="ui-card p-5 space-y-3">
          <div className="text-xs font-bold text-warning flex items-center gap-2">
            <FileWarning className="w-4 h-4" />
            <span>{t('comparison.unplannedFilesStart')}{unplannedFiles.length}{t('comparison.itemsEnd')}</span>
          </div>
          {unplannedFiles.length === 0 ? (
            <p className="text-xs text-on-muted">{t('comparison.allFilesCovered')}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {unplannedFiles.map((f) => (
                <span
                  key={f}
                  className="px-2.5 py-1 rounded-xl bg-surface-sunken border border-outline font-mono text-xs text-warning"
                >
                  + {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Concrete Suggestions & Improvement Directions */}
      <div className="ui-card p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-outline pb-3.5">
          <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-2xs">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface">{t('comparison.recommendations.title')}</h3>
            <p className="text-xs text-on-muted">{t('comparison.recommendations.description')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="ui-panel p-4 space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container text-xs font-bold">
                    {rec.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                      rec.priority === 'HIGH'
                        ? 'bg-danger-container text-on-danger-container border-danger-outline'
                        : rec.priority === 'MEDIUM'
                        ? 'bg-warning-container text-on-warning-container border-warning-outline'
                        : 'bg-success-container text-on-success-container border-success-outline'
                    }`}
                  >
                    {t('comparison.priorityLabel')}
                    {t(rec.priority === 'HIGH' ? 'common.priority.high' : rec.priority === 'MEDIUM' ? 'common.priority.medium' : 'common.priority.low')}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface">{rec.title}</h4>
                <p className="text-xs text-on-muted leading-relaxed">{rec.detail}</p>
              </div>

              <div className="pt-2.5 border-t border-outline space-y-1">
                <div className="text-[11px] font-bold text-secondary">{t('comparison.actions')}</div>
                <ul className="space-y-1 text-xs text-on-muted">
                  {(rec.actionItems || []).map((act, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
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
