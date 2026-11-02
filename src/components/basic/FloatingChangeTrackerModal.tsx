import { useI18n } from '../../i18n';
import type { ChangeRecord } from '../../types';
import { useState } from 'react';
import {
  X,
  Search,
  Trash2,
  Pause,
  Play,
  FileSpreadsheet,
  FileJson,
  Activity,
} from 'lucide-react';
import {
  summarizeChangeRecords,
  exportChangesAsJSON,
  exportChangesAsCSV,
} from '../../utils/changeTracker';

export function FloatingChangeTrackerModal({
  isOpen,
  onClose,
  records = [],
  isTrackingPaused = false,
  onTogglePause,
  onClearRecords,
  onSelectRecordLine,
  assignmentCodeName = 'HW-01',
}: { isOpen: boolean; onClose: () => void; records?: ChangeRecord[]; isTrackingPaused?: boolean; onTogglePause: () => void; onClearRecords: () => void; onSelectRecordLine: (record: ChangeRecord) => void; assignmentCodeName?: string }) {
  const { t, locale } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'insert' | 'delete' | 'replace'

  if (!isOpen) return null;

  const stats = summarizeChangeRecords(records);

  const filteredRecords = records.filter((r) => {
    if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const matchIns = r.inserted && r.inserted.toLowerCase().includes(q);
    const matchDel = r.removed && r.removed.toLowerCase().includes(q);
    const matchPos = `l${r.line}:c${r.column}`.includes(q);
    return matchIns || matchDel || matchPos;
  });

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(locale, {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (_) {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-start justify-end p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1E1F23] border border-slate-300 dark:border-[#444746] rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#F0F4F9] dark:bg-[#282A2F] border-b border-slate-200 dark:border-[#33353A] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-[#0B57D0]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t("程式碼編輯行為追蹤明細 (Change Tracker)")}</h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                    isTrackingPaused
                      ? 'bg-[#FEF7E0] text-[#B06000] border-[#FDD663]'
                      : 'bg-[#CEEAD6] text-[#0D652D] border-[#81C995]'
                  }`}
                >
                  {isTrackingPaused ? t("已暫停監聽") : t("即時監聽中")}
                </span>
              </div>
              <p className="text-xs text-[#444746] dark:text-[#C4C7C5] mt-0.5">{t("完整記錄學生在編輯器內的每一次插入 (Insert)、刪除 (Delete) 與替換 (Replace) 具體改動")}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-slate-200 text-[#303030] dark:text-[#C4C7C5] hover:text-white transition"
            title={t("關閉浮動視窗")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-4 gap-2.5 p-4 bg-white dark:bg-[#1E1F23] border-b border-slate-200 dark:border-[#33353A]">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={`p-3 rounded-xl border text-center transition ${
              typeFilter === 'ALL'
                ? 'bg-[#0B57D0]/20 border-indigo-500 text-white'
                : 'bg-[#F8FAFD] dark:bg-[#121316] border-slate-200 dark:border-[#33353A] text-[#303030] dark:text-[#C4C7C5] hover:border-slate-300 dark:border-[#444746]'
            }`}
          >
            <div className="text-lg font-bold font-mono text-[#1F1F1F] dark:text-[#E3E2E6]">{stats.total}</div>
            <div className="text-[11px] text-[#444746] dark:text-[#C4C7C5] mt-0.5">{t("總變更次數")}</div>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('insert')}
            className={`p-3 rounded-xl border text-center transition ${
              typeFilter === 'insert'
                ? 'bg-emerald-500/20 border-emerald-500 text-[#0D652D]'
                : 'bg-[#F8FAFD] dark:bg-[#121316] border-slate-200 dark:border-[#33353A] text-[#303030] dark:text-[#C4C7C5] hover:border-emerald-500/40'
            }`}
          >
            <div className="text-lg font-bold font-mono text-[#137333]">{stats.insert}</div>
            <div className="text-[11px] text-[#444746] dark:text-[#C4C7C5] mt-0.5">{t("插入 (Insert)")}</div>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('delete')}
            className={`p-3 rounded-xl border text-center transition ${
              typeFilter === 'delete'
                ? 'bg-rose-500/20 border-rose-500 text-[#B3261E]'
                : 'bg-[#F8FAFD] dark:bg-[#121316] border-slate-200 dark:border-[#33353A] text-[#303030] dark:text-[#C4C7C5] hover:border-rose-500/40'
            }`}
          >
            <div className="text-lg font-bold font-mono text-[#C5221F]">{stats.delete}</div>
            <div className="text-[11px] text-[#444746] dark:text-[#C4C7C5] mt-0.5">{t("刪除 (Delete)")}</div>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('replace')}
            className={`p-3 rounded-xl border text-center transition ${
              typeFilter === 'replace'
                ? 'bg-amber-500/20 border-amber-500 text-[#B06000]'
                : 'bg-[#F8FAFD] dark:bg-[#121316] border-slate-200 dark:border-[#33353A] text-[#303030] dark:text-[#C4C7C5] hover:border-amber-500/40'
            }`}
          >
            <div className="text-lg font-bold font-mono text-[#B06000]">{stats.replace}</div>
            <div className="text-[11px] text-[#444746] dark:text-[#C4C7C5] mt-0.5">{t("替換 (Replace)")}</div>
          </button>
        </div>

        {/* Filter & Export Controls Bar */}
        <div className="px-4 py-2.5 bg-[#F8FAFD] dark:bg-[#121316] border-b border-slate-200 dark:border-[#33353A] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#5E5E5E] dark:text-[#8E918F] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("搜尋新增或刪除的程式碼片段、行號...")}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#1E1F23] border border-slate-300 dark:border-[#444746] rounded-lg text-xs text-[#1F1F1F] dark:text-[#E3E2E6] placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#1E1F23] border border-slate-300 dark:border-[#444746] rounded-lg text-xs text-[#1F1F1F] dark:text-[#E3E2E6] focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">{t("全部類型 (")}{stats.total})</option>
              <option value="insert">{t("插入 Insert (")}{stats.insert})</option>
              <option value="delete">{t("刪除 Delete (")}{stats.delete})</option>
              <option value="replace">{t("替換 Replace (")}{stats.replace})</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePause}
              className="px-2.5 py-1.5 rounded-lg bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD] text-[#1F1F1F] dark:text-[#E3E2E6] border border-slate-300 dark:border-[#444746] text-xs font-medium inline-flex items-center gap-1 transition"
            >
              {isTrackingPaused ? <Play className="w-3.5 h-3.5 text-[#137333]" /> : <Pause className="w-3.5 h-3.5 text-[#B06000]" />}
              <span>{isTrackingPaused ? t("恢復紀錄") : t("暫停")}</span>
            </button>

            <button
              type="button"
              onClick={() => exportChangesAsJSON(records, `${assignmentCodeName}_changes.json`)}
              className="px-2.5 py-1.5 rounded-lg bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD] text-[#1F1F1F] dark:text-[#E3E2E6] border border-slate-300 dark:border-[#444746] text-xs font-medium inline-flex items-center gap-1 transition"
              title={t("匯出 JSON")}
            >
              <FileJson className="w-3.5 h-3.5 text-[#0B57D0]" />
              <span>JSON</span>
            </button>

            <button
              type="button"
              onClick={() => exportChangesAsCSV(records, `${assignmentCodeName}_changes.csv`)}
              className="px-2.5 py-1.5 rounded-lg bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD] text-[#1F1F1F] dark:text-[#E3E2E6] border border-slate-300 dark:border-[#444746] text-xs font-medium inline-flex items-center gap-1 transition"
              title={t("匯出 CSV")}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#137333]" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={onClearRecords}
              className="px-2.5 py-1.5 rounded-lg bg-[#FAD2CF] hover:bg-[#F28B82]/50 text-[#B3261E] border border-rose-500/30 text-xs font-medium inline-flex items-center gap-1 transition"
              title={t("清空紀錄")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t("清空")}</span>
            </button>
          </div>
        </div>

        {/* Change Records Stream */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 bg-[#F8FAFD] dark:bg-[#121316]">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="text-2xl">⌨️</div>
              <p className="text-sm font-medium text-[#303030] dark:text-[#C4C7C5]">
                {records.length === 0
                  ? t("目前尚無編輯改動紀錄，請在程式碼編輯區輸入、刪除或修改程式碼！")
                  : t("查無符合目前篩選條件的改動紀錄")}
              </p>
              <p className="text-xs text-[#5E5E5E] dark:text-[#8E918F]">{t("每次打字、貼上、刪除或選取覆蓋文字，都會自動歸類為 Insert / Delete / Replace 並顯示具體位置與內容")}</p>
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const badgeColor =
                rec.type === 'insert'
                  ? 'bg-[#CEEAD6] text-[#0D652D] border-[#81C995] border-l-emerald-500'
                  : rec.type === 'delete'
                  ? 'bg-[#FAD2CF] text-[#B3261E] border-[#F28B82] border-l-rose-500'
                  : 'bg-[#FEF7E0] text-[#B06000] border-[#FDD663] border-l-amber-500';

              const typeText =
                rec.type === 'insert' ? t("插入 INSERT") : rec.type === 'delete' ? t("刪除 DELETE") : t("替換 REPLACE");

              return (
                <div
                  key={rec.id}
                  onClick={() => onSelectRecordLine?.(rec)}
                  className={`cursor-pointer rounded-xl bg-white dark:bg-[#1E1F23] hover:bg-[#F0F4F9] dark:bg-[#282A2F]/90 border border-slate-200 dark:border-[#33353A] border-l-4 p-3 transition ${
                    rec.type === 'insert'
                      ? 'border-l-emerald-500'
                      : rec.type === 'delete'
                      ? 'border-l-rose-500'
                      : 'border-l-amber-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${badgeColor}`}>
                        {typeText}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#D3E3FD] text-[#041E49] font-bold font-mono text-[11px]">
                        Line {rec.line}, Col {rec.column}
                      </span>
                      <span className="text-[#444746] dark:text-[#C4C7C5] font-mono text-[11px]">{rec.file}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#5E5E5E] dark:text-[#8E918F]">
                      #{rec.id} · {formatTime(rec.timestamp)}
                    </span>
                  </div>

                  {/* Concrete Modification Diff Preview */}
                  <div className="mt-2 p-2.5 rounded-lg bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-200 dark:border-[#33353A] font-mono text-xs space-y-1 overflow-x-auto">
                    {(rec.type === 'delete' || rec.type === 'replace') && (
                      <div className="flex items-start gap-2 text-[#B3261E] bg-rose-500/10 px-2 py-1 rounded">
                        <span className="font-bold select-none shrink-0">{t("- 移除：")}</span>
                        <span className="whitespace-pre-wrap break-all line-through">
                          {rec.removed === '\n' ? t("↵ (換行符號)") : rec.removed}
                        </span>
                      </div>
                    )}
                    {(rec.type === 'insert' || rec.type === 'replace') && (
                      <div className="flex items-start gap-2 text-[#0D652D] bg-emerald-500/10 px-2 py-1 rounded">
                        <span className="font-bold select-none shrink-0">{t("+ 新增：")}</span>
                        <span className="whitespace-pre-wrap break-all">
                          {rec.inserted === '\n' ? t("↵ (換行符號)") : rec.inserted}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
