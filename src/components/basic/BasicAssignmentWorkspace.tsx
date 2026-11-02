import { useI18n } from '../../i18n';
import type { BasicAssignment, ChangeRecord } from '../../types';
import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Terminal,
  FileCode,
  Activity,
  ClipboardCheck,
  SlidersHorizontal,
  ArrowLeft,
  Code2,
  BookOpen,
} from 'lucide-react';
import {
  computeTextChangeRecord,
  summarizeChangeRecords,
} from '../../utils/changeTracker';
import {
  ensurePyodideLoaded,
  executePythonWithInput,
} from '../../utils/pyodideRunner';
import { FloatingChangeTrackerModal } from './FloatingChangeTrackerModal';
import { AiTutorChatWidget } from './AiTutorChatWidget';

/**
 * 將內嵌之 Markdown 語法（粗體 `**`、行內程式碼 `` ` ``、LaTeX 數學式 `$...$`）轉為 React 元素
 */
function renderInlineMarkdown(text: string) {
  if (!text) return null;

  // 先把常見 LaTeX 符號正規化，避免顯示原始反斜線
  const cleanMath = (expr: string) =>
    expr
      .replace(/\\ge\b/g, '≥')
      .replace(/\\le\b/g, '≤')
      .replace(/\\ne\b/g, '≠')
      .replace(/\\times\b/g, '×')
      .replace(/\\dots\b/g, '…');

  // 切分 `code`、**bold**、$math$
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\$[^$]+\$)/g;
  const parts = String(text).split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-[#E8F0FE] dark:bg-[#282A2F] text-[#0B57D0] dark:text-[#A8C7FA] border border-[#D3E3FD] dark:border-[#33353A] font-mono text-[13px] font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong
          key={idx}
          className="font-bold text-[#1F1F1F] dark:text-white"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
      return (
        <span
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-[#F0F4F9] dark:bg-[#282A2F] text-[#0B57D0] dark:text-[#A8C7FA] font-serif italic font-semibold text-[14px]"
        >
          {cleanMath(part.slice(1, -1))}
        </span>
      );
    }
    return <React.Fragment key={idx}>{cleanMath(part)}</React.Fragment>;
  });
}

/**
 * 題目專用結構化 Markdown 渲染器 (支援標題 ###、無序清單 -、有序清單 1.、段落與行內程式碼/公式)
 */
type MarkdownList = { type: 'ul'; items: string[]; key: string } | { type: 'ol'; items: { num: string; text: string }[]; key: string };
type MarkdownBlock = MarkdownList | { type: 'heading'; level: number; text: string; key: string } | { type: 'paragraph'; text: string; key: string };
function ProblemMarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;
  const lines = String(content).split('\n');
  const blocks: MarkdownBlock[] = [];
  let currentList: MarkdownList | null = null;

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    // 標題 ### / ## / #
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
        key: `h-${index}`,
      });
      return;
    }

    // 無序清單 - / *
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [], key: `ul-${index}` };
      }
      currentList.items.push(ulMatch[1]);
      return;
    }

    // 有序清單 1. / 2.
    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [], key: `ol-${index}` };
      }
      currentList.items.push({ num: olMatch[1], text: olMatch[2] });
      return;
    }

    // 一般段落
    flushList();
    blocks.push({
      type: 'paragraph',
      text: line,
      key: `p-${index}`,
    });
  });

  flushList();

  return (
    <div className="space-y-2.5 text-sm text-[#1F1F1F] dark:text-[#E3E2E6] leading-relaxed">
      {blocks.map((block) => {
        if (block.type === 'heading') {
          return (
            <h3
              key={block.key}
              className="text-base font-bold text-[#0B57D0] dark:text-[#A8C7FA] flex items-center gap-2 pt-1 pb-0.5 border-b border-slate-200/80 dark:border-[#33353A]"
            >
              <span className="w-1.5 h-4 rounded-full bg-[#0B57D0] dark:bg-[#A8C7FA]" />
              <span>{renderInlineMarkdown(block.text)}</span>
            </h3>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul
              key={block.key}
              className="space-y-1.5 pl-2 py-1 bg-white dark:bg-[#1E1F23] rounded-lg border border-slate-200/70 dark:border-[#33353A] p-2.5"
            >
              {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-[#0B57D0] dark:text-[#A8C7FA] font-bold mt-0.5">
                    •
                  </span>
                  <span className="flex-1">{renderInlineMarkdown(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol
              key={block.key}
              className="space-y-1.5 bg-white dark:bg-[#1E1F23] rounded-lg border border-slate-200/70 dark:border-[#33353A] p-2.5"
            >
              {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF] font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {item.num}
                  </span>
                  <span className="flex-1">{renderInlineMarkdown(item.text)}</span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={block.key} className="text-sm leading-relaxed">
            {renderInlineMarkdown(block.text)}
          </p>
        );
      })}
    </div>
  );
}

export function BasicAssignmentWorkspace({
  assignment,
  allBasicAssignments = [],
  onSelectAssignment,
  onBackHome,
  records = [],
  onUpdateRecords,
}: { assignment: BasicAssignment; allBasicAssignments?: BasicAssignment[]; onSelectAssignment: (item: BasicAssignment) => void; onBackHome: () => void; records?: ChangeRecord[]; onUpdateRecords: (records: ChangeRecord[]) => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState(assignment.starterCode || '');
  const [customStdin, setCustomStdin] = useState(
    assignment.sampleCases?.[0]?.input || ''
  );
  const [pyodideState, setPyodideState] = useState('loading');
  const [pyodideLabel, setPyodideLabel] = useState('Pyodide 準備中...');
  const [isRunning, setIsRunning] = useState(false);
  const [execResult, setExecResult] = useState<import("../../utils/pyodideRunner").ExecutionResult | null>(null);
  const [testSuiteResults, setTestSuiteResults] = useState<(BasicAssignment["sampleCases"][number] & { actualOutput: string; stderr: string; durationMs: number; passed: boolean })[]>([]);

  // 左側題目區分頁：'description' (題目說明與格式) | 'samples' (範例測資)
  const [leftTab, setLeftTab] = useState('description');
  // 右側工作區分頁：'code-editor' (程式碼編輯區) | 'custom-stdin' (自訂測資與執行輸出) | 'autograde' (範例測資評測結果)
  const [activeBottomTab, setActiveBottomTab] = useState('code-editor');

  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [isTrackingPaused, setIsTrackingPaused] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  const counterRef = useRef(records.length);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previousAssignment = useRef(assignment);

  // 切換作業時同步初始狀態
  useEffect(() => {
    const previous = previousAssignment.current;
    previousAssignment.current = assignment;
    if (previous.id === assignment.id) {
      // Language changes update only an untouched starter, without recording an edit.
      setCode(current => current === previous.starterCode ? assignment.starterCode : current);
      return;
    }
    setCode(assignment.starterCode || '');
    setCustomStdin(assignment.sampleCases?.[0]?.input || '');
    setExecResult(null);
    setTestSuiteResults([]);
    setHighlightedLine(null);
    setActiveBottomTab('code-editor');
    setLeftTab('description');
  }, [assignment]);

  // 預先載入 Pyodide WebAssembly
  useEffect(() => {
    ensurePyodideLoaded((st, label) => {
      setPyodideState(st);
      setPyodideLabel(label);
    }).catch(() => { /* Status callback displays the error. */ });
  }, []);

  const changeStats = summarizeChangeRecords(records);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextCode = e.target.value;
    if (!isTrackingPaused) {
      counterRef.current += 1;
      const record = computeTextChangeRecord(
        code,
        nextCode,
        `${assignment.codeName.toLowerCase()}.py`,
        counterRef.current
      );
      if (record) {
        onUpdateRecords([record, ...records].slice(0, 500));
      }
    }
    setCode(nextCode);
  };

  // 支援 Tab 縮排與 Ctrl+Enter 快捷鍵執行
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCustomCode();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const nextCode = code.substring(0, start) + '    ' + code.substring(end);
      if (!isTrackingPaused) {
        counterRef.current += 1;
        const record = computeTextChangeRecord(
          code,
          nextCode,
          `${assignment.codeName.toLowerCase()}.py`,
          counterRef.current
        );
        if (record) {
          onUpdateRecords([record, ...records].slice(0, 500));
        }
      }
      setCode(nextCode);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      }, 0);
    }
  };

  // 快速模擬插入/替換/刪除測試按鈕
  const triggerSampleTrackedEdit = (editType: string) => {
    let nextCode = code;
    if (editType === 'insert') {
      nextCode = code + t("\n# [測試插入] 新增除錯輸出\n");
    } else if (editType === 'replace') {
      if (code.includes('10')) {
        nextCode = code.replace('10', '12');
      } else {
        nextCode =
          t("# [測試替換] 已更新標頭註解\n") + code.split('\n').slice(1).join('\n');
      }
    } else if (editType === 'delete') {
      const lines = code.split('\n');
      if (lines.length > 2) {
        nextCode = lines.slice(0, -1).join('\n');
      }
    }
    if (nextCode !== code) {
      counterRef.current += 1;
      const record = computeTextChangeRecord(
        code,
        nextCode,
        `${assignment.codeName.toLowerCase()}.py`,
        counterRef.current
      );
      if (record) {
        onUpdateRecords([record, ...records].slice(0, 500));
      }
      setCode(nextCode);
    }
  };

  const handleRunCustomCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveBottomTab('custom-stdin');
    const res = await executePythonWithInput(code, customStdin, (st, label) => {
      setPyodideState(st);
      setPyodideLabel(label);
    });
    setExecResult(res);
    setIsRunning(false);
  };

  const handleRunSampleTestSuite = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveBottomTab('autograde');
    const results = [];
    for (const sample of assignment.sampleCases || []) {
      const res = await executePythonWithInput(code, sample.input);
      const actualTrimmed = (res.stdout || '').trim();
      const expectedTrimmed = (sample.expectedOutput || '').trim();
      const passed = res.success && actualTrimmed === expectedTrimmed;
      results.push({
        ...sample,
        actualOutput: actualTrimmed,
        stderr: res.stderr,
        durationMs: res.durationMs,
        passed,
      });
    }
    setTestSuiteResults(results);
    setIsRunning(false);
  };

  const handleJumpToRecordLine = (rec: ChangeRecord) => {
    setIsTrackerModalOpen(false);
    setActiveBottomTab('code-editor');
    setHighlightedLine(rec.line);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
    setTimeout(() => setHighlightedLine(null), 2200);
  };

  const codeLines = code.split('\n');

  return (
    <div className="w-full px-2 sm:px-3 py-2 flex flex-col gap-2">
      {/* Compact Top Control Bar: Minimal padding so workspace gets maximum screen space */}
      <div className="bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs transition-colors">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD] dark:hover:bg-[#33353A] text-[#1F1F1F] dark:text-[#E3E2E6] text-xs font-semibold border border-slate-200 dark:border-[#444746] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t("返回首頁")}</span>
          </button>

          <div className="flex items-center gap-1">
            {allBasicAssignments.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectAssignment(item)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                  item.id === assignment.id
                    ? 'bg-[#137333] dark:bg-[#81C995] text-white dark:text-[#072711] shadow-2xs'
                    : 'bg-[#F8FAFD] dark:bg-[#121316] hover:bg-[#E8F0FE] dark:hover:bg-[#282A2F] text-[#444746] dark:text-[#C4C7C5] border border-slate-200 dark:border-[#33353A]'
                }`}
              >
                {item.codeName}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Pyodide Status + Clickable Top-Right Counter for Insert/Delete/Replace */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] text-xs flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                pyodideState === 'ready'
                  ? 'bg-emerald-500'
                  : pyodideState === 'running'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-sky-500 animate-pulse'
              }`}
            />
            <span className="text-[#303030] dark:text-[#C4C7C5] font-medium">
              {t(pyodideLabel)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsTrackerModalOpen(true)}
            className="group px-3 py-1 rounded-lg bg-[#F8FAFD] dark:bg-[#121316] hover:bg-[#D3E3FD]/50 dark:hover:bg-[#282A2F] border border-[#0B57D0]/40 dark:border-[#A8C7FA]/40 transition flex flex-wrap items-center gap-2 shadow-2xs"
            title={t("點擊開啟浮動視窗檢視具體改動明細")}
          >
            <div className="flex items-center gap-1 text-xs font-bold text-[#0B57D0] dark:text-[#A8C7FA]">
              <Activity className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>{t("編輯追蹤計數器：")}</span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="px-1.5 py-0.5 rounded bg-[#CEEAD6] dark:bg-[#0F5223] text-[#0D652D] dark:text-[#C4EED0] font-bold">{t("插入 +")}{changeStats.insert}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#FAD2CF] dark:bg-[#8C1D18] text-[#B3261E] dark:text-[#F2B8B5] font-bold">{t("刪除 -")}{changeStats.delete}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#FEF7E0] dark:bg-[#7A4F01] text-[#B06000] dark:text-[#FCE8B2] font-bold">{t("替換 ~")}{changeStats.replace}
              </span>
            </div>

            <span className="text-[11px] font-semibold text-[#0B57D0] dark:text-[#A8C7FA] underline underline-offset-2">{t("檢視具體改動 (")}{changeStats.total})
            </span>
          </button>
        </div>
      </div>

      {/* Equal-Height Full-Bleed Split Workspace: Minimal gap & padding, fills viewport height */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch lg:h-[calc(100vh-106px)] lg:min-h-[600px]">
        {/* LEFT HALF (5 cols): Strictly h-full card with compact padding & rich Markdown rendering */}
        <section className="lg:col-span-5 h-[560px] lg:h-full bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-xl flex flex-col overflow-hidden shadow-xs transition-colors">
          {/* Compact Left Header & Sub-Tabs */}
          <div className="px-3.5 py-2.5 bg-[#F8FAFD] dark:bg-[#121316] border-b border-slate-200 dark:border-[#33353A] shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-2 py-0.5 rounded bg-[#CEEAD6] dark:bg-[#0F5223] text-[#0D652D] dark:text-[#C4EED0] font-mono text-xs font-bold shrink-0">
                  {assignment.codeName}
                </span>
                <h1 className="text-sm sm:text-base font-bold text-[#1F1F1F] dark:text-[#E3E2E6] truncate">
                  {assignment.title}
                </h1>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF] text-xs font-bold shrink-0">
                {assignment.points}{t(" 分")}</span>
            </div>

            {/* Left Panel Sub-Tabs */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLeftTab('description')}
                className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition ${
                  leftTab === 'description'
                    ? 'bg-[#0B57D0] dark:bg-[#A8C7FA] text-white dark:text-[#041E49]'
                    : 'bg-white dark:bg-[#1E1F23] text-[#444746] dark:text-[#C4C7C5] border border-slate-200 dark:border-[#33353A]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{t("題目說明與格式")}</span>
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('samples')}
                className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition ${
                  leftTab === 'samples'
                    ? 'bg-[#0B57D0] dark:bg-[#A8C7FA] text-white dark:text-[#041E49]'
                    : 'bg-white dark:bg-[#1E1F23] text-[#444746] dark:text-[#C4C7C5] border border-slate-200 dark:border-[#33353A]'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{t("範例測資 (")}{assignment.sampleCases?.length || 0})</span>
              </button>
            </div>
          </div>

          {/* Left Scrollable Body with Tighter Padding & Proper Markdown Renderer */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3">
            {leftTab === 'description' ? (
              <>
                <div className="bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] rounded-xl p-3.5">
                  <ProblemMarkdownRenderer content={assignment.description} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] space-y-1">
                    <div className="text-xs font-bold text-[#0D652D] dark:text-[#81C995]">{t("📥 輸入格式 (Input)")}</div>
                    <p className="text-xs sm:text-sm text-[#303030] dark:text-[#C4C7C5] leading-relaxed">
                      {renderInlineMarkdown(assignment.inputFormat)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] space-y-1">
                    <div className="text-xs font-bold text-[#0B57D0] dark:text-[#A8C7FA]">{t("📤 輸出格式 (Output)")}</div>
                    <p className="text-xs sm:text-sm text-[#303030] dark:text-[#C4C7C5] leading-relaxed">
                      {renderInlineMarkdown(assignment.outputFormat)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#444746] dark:text-[#C4C7C5]">{t("限制條件與評分標準")}</h3>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-[#303030] dark:text-[#C4C7C5] bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] rounded-xl p-3">
                    {(assignment.constraints || []).map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#0B57D0] dark:text-[#A8C7FA] font-bold">•</span>
                        <span>{renderInlineMarkdown(c)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="space-y-2.5">
                {(assignment.sampleCases || []).map((tc) => (
                  <div
                    key={tc.id}
                    className="rounded-xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">
                        {tc.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomStdin(tc.input);
                          setActiveBottomTab('custom-stdin');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF] text-xs font-bold transition"
                      >{t("帶入自訂測資分頁 →")}</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs sm:text-[13px]">
                      <div>
                        <div className="text-[11px] text-[#5E5E5E] dark:text-[#8E918F] mb-1">{t("輸入 (Input):")}</div>
                        <pre className="p-2 rounded bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] text-[#0D652D] dark:text-[#81C995] overflow-x-auto">
                          {tc.input}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[11px] text-[#5E5E5E] dark:text-[#8E918F] mb-1">{t("預期輸出 (Expected):")}</div>
                        <pre className="p-2 rounded bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] text-[#0B57D0] dark:text-[#A8C7FA] overflow-x-auto">
                          {tc.expectedOutput}
                        </pre>
                      </div>
                    </div>
                    {tc.explanation && (
                      <p className="text-xs text-[#444746] dark:text-[#C4C7C5]">{t("💡 說明：")}{tc.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT HALF (7 cols): Strictly h-full Tabbed Card with minimal padding */}
        <section className="lg:col-span-7 h-[560px] lg:h-full bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] rounded-xl flex flex-col overflow-hidden shadow-xs transition-colors">
          {/* Unified Top Tab Bar & Execution Actions */}
          <div className="px-3 py-2 bg-[#F8FAFD] dark:bg-[#121316] border-b border-slate-200 dark:border-[#33353A] flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* 3 Workspace Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveBottomTab('code-editor')}
                className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition ${
                  activeBottomTab === 'code-editor'
                    ? 'bg-[#0B57D0] dark:bg-[#A8C7FA] text-white dark:text-[#041E49] shadow-2xs'
                    : 'bg-white dark:bg-[#1E1F23] text-[#444746] dark:text-[#C4C7C5] border border-slate-200 dark:border-[#33353A]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{t("程式碼編輯區 (")}{assignment.codeName.toLowerCase()}.py)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBottomTab('custom-stdin')}
                className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition ${
                  activeBottomTab === 'custom-stdin'
                    ? 'bg-[#0B57D0] dark:bg-[#A8C7FA] text-white dark:text-[#041E49] shadow-2xs'
                    : 'bg-white dark:bg-[#1E1F23] text-[#444746] dark:text-[#C4C7C5] border border-slate-200 dark:border-[#33353A]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{t("自訂測資與執行輸出")}</span>
                {execResult && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      execResult.success
                        ? 'bg-[#CEEAD6] text-[#0D652D]'
                        : 'bg-[#FAD2CF] text-[#B3261E]'
                    }`}
                  >
                    {execResult.durationMs}ms
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveBottomTab('autograde')}
                className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition ${
                  activeBottomTab === 'autograde'
                    ? 'bg-[#0B57D0] dark:bg-[#A8C7FA] text-white dark:text-[#041E49] shadow-2xs'
                    : 'bg-white dark:bg-[#1E1F23] text-[#444746] dark:text-[#C4C7C5] border border-slate-200 dark:border-[#33353A]'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>{t("範例測資評測 (")}{testSuiteResults.filter((r) => r.passed).length}/
                  {assignment.sampleCases?.length || 0})
                </span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRunCustomCode}
                disabled={isRunning}
                className="px-3 py-1 rounded-full bg-[#137333] hover:bg-[#0D652D] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isRunning ? t("執行中...") : t("執行自訂測資 (Run)")}</span>
              </button>

              <button
                type="button"
                onClick={handleRunSampleTestSuite}
                disabled={isRunning}
                className="px-3 py-1 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>{t("批次驗證範例測資")}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Code Editor View */}
          {activeBottomTab === 'code-editor' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 bg-white dark:bg-[#1E1F23] border-b border-slate-200 dark:border-[#33353A] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#5E5E5E] dark:text-[#C4C7C5]">{t("快速測試編輯追蹤：")}</span>
                  <button
                    type="button"
                    onClick={() => triggerSampleTrackedEdit('insert')}
                    className="px-2 py-0.5 rounded bg-[#CEEAD6] text-[#0D652D] text-[11px] font-mono font-bold"
                  >{t("+模擬插入")}</button>
                  <button
                    type="button"
                    onClick={() => triggerSampleTrackedEdit('replace')}
                    className="px-2 py-0.5 rounded bg-[#FEF7E0] text-[#B06000] text-[11px] font-mono font-bold"
                  >{t("~模擬替換")}</button>
                  <button
                    type="button"
                    onClick={() => triggerSampleTrackedEdit('delete')}
                    className="px-2 py-0.5 rounded bg-[#FAD2CF] text-[#B3261E] text-[11px] font-mono font-bold"
                  >{t("-模擬刪除")}</button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextCode = assignment.starterCode || '';
                    if (nextCode !== code) {
                      counterRef.current += 1;
                      const rec = computeTextChangeRecord(
                        code,
                        nextCode,
                        `${assignment.codeName.toLowerCase()}.py`,
                        counterRef.current
                      );
                      if (rec) onUpdateRecords([rec, ...records].slice(0, 500));
                      setCode(nextCode);
                    }
                  }}
                  className="px-2.5 py-0.5 rounded-lg bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD] text-[#1F1F1F] dark:text-[#E3E2E6] text-xs font-semibold inline-flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t("重設程式碼")}</span>
                </button>
              </div>

              {/* Scrollable Code Editor Body with larger 14px font */}
              <div className="flex-1 flex bg-[#F8FAFD] dark:bg-[#121316] font-mono text-[13.5px] sm:text-[14px] leading-6 overflow-hidden">
                <div
                  aria-hidden="true"
                  className="w-11 py-2.5 bg-[#F0F4F9] dark:bg-[#1A1C20] border-r border-slate-200 dark:border-[#33353A] text-right pr-2.5 select-none text-[#5E5E5E] dark:text-[#8E918F] font-mono overflow-hidden"
                >
                  {codeLines.map((_, idx) => {
                    const lineNum = idx + 1;
                    const isHighlighted = highlightedLine === lineNum;
                    return (
                      <div
                        key={lineNum}
                        className={
                          isHighlighted
                            ? 'bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF] font-bold'
                            : ''
                        }
                      >
                        {lineNum}
                      </div>
                    );
                  })}
                </div>

                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={handleCodeChange}
                  onKeyDown={handleEditorKeyDown}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  className="flex-1 p-2.5 bg-transparent text-[#1F1F1F] dark:text-[#E3E2E6] font-mono resize-none focus:outline-hidden leading-6 overflow-y-auto"
                  placeholder={t("在此輸入 Python 3 程式碼...")}
                />
              </div>
            </div>
          )}

          {/* TAB 2: Custom Test Case Input & Live Pyodide Console Output */}
          {activeBottomTab === 'custom-stdin' && (
            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 bg-white dark:bg-[#1E1F23]">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t("📥 自訂測試資料輸入 (Custom Stdin — 將透過 sys.stdin 傳入程式)：")}</span>
                  <div className="flex items-center gap-1">
                    {(assignment.sampleCases || []).map((sc, i) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setCustomStdin(sc.input)}
                        className="px-2 py-0.5 rounded bg-[#F0F4F9] dark:bg-[#282A2F] hover:bg-[#D3E3FD] text-[#1F1F1F] dark:text-[#E3E2E6] text-xs font-semibold border border-slate-200 dark:border-[#33353A] transition"
                      >{t("載入範例 ")}{i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={customStdin}
                  onChange={(e) => setCustomStdin(e.target.value)}
                  rows={3}
                  placeholder={t("在此輸入自訂測資 (stdin)...")}
                  className="w-full p-2.5 rounded-xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-300 dark:border-[#444746] font-mono text-sm text-[#0D652D] dark:text-[#81C995] focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]"
                />

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveBottomTab('code-editor')}
                    className="text-xs font-semibold text-[#0B57D0] dark:text-[#A8C7FA] hover:underline"
                  >{t("← 返回程式碼編輯區")}</button>
                  <button
                    type="button"
                    onClick={handleRunCustomCode}
                    disabled={isRunning}
                    className="px-4 py-1 rounded-full bg-[#137333] hover:bg-[#0D652D] text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t("立即以自訂測資執行")}</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 rounded-xl bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] p-3 font-mono text-xs sm:text-sm overflow-y-auto">
                <div className="flex items-center justify-between text-xs text-[#444746] dark:text-[#C4C7C5] border-b border-slate-200 dark:border-[#33353A] pb-2 mb-2.5">
                  <span className="font-bold flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#0B57D0] dark:text-[#A8C7FA]" />
                    <span>{t("Pyodide 執行輸出 (Console Output)")}</span>
                  </span>
                  {execResult && (
                    <span
                      className={
                        execResult.success
                          ? 'text-[#137333] dark:text-[#81C995] font-bold'
                          : 'text-[#C5221F] dark:text-[#F2B8B5] font-bold'
                      }
                    >
                      {execResult.success ? t("✓ 執行成功") : t("✗ 發生錯誤")} ({execResult.durationMs}{' '}
                      ms)
                    </span>
                  )}
                </div>

                {!execResult ? (
                  <div className="py-8 text-center text-[#5E5E5E] dark:text-[#8E918F]">{t("點擊上方「▶ 執行自訂測資 (Run)」即可在此檢視標準輸出與執行結果！")}</div>
                ) : (
                  <div className="space-y-2.5">
                    {execResult.stdout && (
                      <div>
                        <div className="text-[11px] font-bold text-[#137333] dark:text-[#81C995] mb-1">{t("標準輸出 (stdout):")}</div>
                        <pre className="p-2.5 rounded-lg bg-white dark:bg-[#1E1F23] border border-[#81C995] dark:border-[#137333] text-[#0D652D] dark:text-[#C4EED0] overflow-x-auto whitespace-pre-wrap">
                          {execResult.stdout}
                        </pre>
                      </div>
                    )}

                    {execResult.stderr && (
                      <div>
                        <div className="text-[11px] font-bold text-[#C5221F] dark:text-[#F2B8B5] mb-1">{t("錯誤追蹤 (stderr / Traceback):")}</div>
                        <pre className="p-2.5 rounded-lg bg-[#FCE8E6] dark:bg-[#8C1D18]/30 border border-[#F28B82] text-[#B3261E] dark:text-[#F2B8B5] overflow-x-auto whitespace-pre-wrap">
                          {execResult.stderr}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Sample Test Cases Auto-Grading View */}
          {activeBottomTab === 'autograde' && (
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-white dark:bg-[#1E1F23]">
              {testSuiteResults.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <p className="text-sm text-[#444746] dark:text-[#C4C7C5]">{t("點擊右上角「批次驗證範例測資」可自動比對所有範例測資與您的程式輸出！")}</p>
                  <button
                    type="button"
                    onClick={handleRunSampleTestSuite}
                    className="px-5 py-2 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold"
                  >{t("立即執行批次評測")}</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {testSuiteResults.map((res) => (
                    <div
                      key={res.id}
                      className={`p-3 rounded-xl border text-xs sm:text-sm ${
                        res.passed
                          ? 'bg-[#E6F4EA] dark:bg-[#0F5223]/30 border-[#81C995]'
                          : 'bg-[#FCE8E6] dark:bg-[#8C1D18]/30 border-[#F28B82]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold">
                          {res.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-[#137333] dark:text-[#81C995]" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#C5221F] dark:text-[#F2B8B5]" />
                          )}
                          <span className="text-[#1F1F1F] dark:text-[#E3E2E6]">
                            {assignment.sampleCases.find(sample => sample.id === res.id)?.name ?? res.name}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-[#444746] dark:text-[#C4C7C5]">
                          {res.passed ? t("通過 (AC)") : t("輸出不符 (WA)")} · {res.durationMs}ms
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-mono text-xs">
                        <div>
                          <span className="text-[#5E5E5E] dark:text-[#C4C7C5]">{t("預期輸出：")}</span>
                          <pre className="p-2 rounded bg-white dark:bg-[#121316] text-[#0B57D0] dark:text-[#A8C7FA] mt-0.5 overflow-x-auto">
                            {res.expectedOutput}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[#5E5E5E] dark:text-[#C4C7C5]">{t("您的實際輸出：")}</span>
                          <pre className="p-2 rounded bg-white dark:bg-[#121316] text-[#0D652D] dark:text-[#81C995] mt-0.5 overflow-x-auto">
                            {res.actualOutput || res.stderr || t("(無輸出)")}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Top-Right Triggered Floating Change Tracker Modal */}
      <FloatingChangeTrackerModal
        isOpen={isTrackerModalOpen}
        onClose={() => setIsTrackerModalOpen(false)}
        records={records}
        isTrackingPaused={isTrackingPaused}
        onTogglePause={() => setIsTrackingPaused(!isTrackingPaused)}
        onClearRecords={() => onUpdateRecords([])}
        onSelectRecordLine={handleJumpToRecordLine}
        assignmentCodeName={assignment.codeName}
      />

      {/* Bottom-Right AI Tutor Chat Window */}
      <AiTutorChatWidget
        assignment={assignment}
        currentCode={code}
        lastExecutionResult={execResult}
        changeStats={changeStats}
      />
    </div>
  );
}
