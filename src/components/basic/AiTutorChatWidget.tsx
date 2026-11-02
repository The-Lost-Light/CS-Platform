import { useI18n } from '../../i18n';
import type { BasicAssignment, ChangeStats } from '../../types';
import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Minimize2,
  Maximize2,
  MessageSquare,
  Lightbulb,
  Bug,
  HelpCircle,
} from 'lucide-react';

export function AiTutorChatWidget({
  assignment,
  currentCode = '',
  lastExecutionResult = null,
  changeStats = { total: 0, insert: 0, delete: 0, replace: 0 },
}: { assignment: BasicAssignment; currentCode?: string; lastExecutionResult?: import('../../utils/pyodideRunner').ExecutionResult | null; changeStats?: ChangeStats }) {
  const { t, locale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMsg, setInputMsg] = useState('');
  const [messages, setMessages] = useState<{ id: string; role: string; timestamp: string; text: string }[]>([]);
  const welcomeMessage = {
    id: `welcome-${assignment.id}`,
    role: 'assistant',
    timestamp: '',
    text: t("已切換至 **{p0}：{p1}** 的專屬 AI 助教頻道！\n需要提示、分析目前程式碼錯誤，或產生自訂邊界測資嗎？可點選下方快捷問題或直接輸入。", { p0: assignment.codeName, p1: assignment.title }),
  };

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Reset welcome banner when switching assignments
  useEffect(() => {
    setMessages([]);
  }, [assignment?.id]);

  const generateContextualAiReply = (userQuestion: string) => {
    const q = userQuestion.toLowerCase();
    const hints = assignment?.aiHints || [];

    // 1. 檢查是否在詢問錯誤或 Debug
    if (q.includes('錯') || q.includes('error') || q.includes('bug') || q.includes('為什麼') || q.includes('診斷')) {
      if (lastExecutionResult && lastExecutionResult.stderr) {
        return t("我檢查了你剛剛在 Pyodide 執行的錯誤輸出：\n```\n{p0}\n```\n**修正建議**：\n1. 請檢查變數型別轉換（例如 `int(raw_input)` 是否遇到空字串或非數字字元）。\n2. 你目前已進行了 **{p1}** 次編輯（插入 {p2} / 刪除 {p3} / 替換 {p4}），建議可點擊右上角計數器檢視最近一次替換或刪除是否誤刪了縮排或冒號。", { p0: lastExecutionResult.stderr, p1: changeStats.total, p2: changeStats.insert, p3: changeStats.delete, p4: changeStats.replace });
      }
      return t("我掃描了你目前的 Python 程式碼（共 **{p0}** 行，累計編輯 **{p1}** 次）：\n- 語法結構看起來完整，且無明顯語法錯誤。\n- **重點檢查**：{p2}", { p0: currentCode.split('\n').length, p1: changeStats.total, p2: hints[0] || t("請確認極端邊界輸入（如 n=1 或空輸入）時是否符合題目輸出格式。") });
    }

    // 2. 詢問提示或解法思路
    if (q.includes('提示') || q.includes('hint') || q.includes('怎麼寫') || q.includes('思路')) {
      const hintList = hints.map((h, i) => `${i + 1}. ${h}`).join('\n');
      return t("針對 **{p0}** 的解題核心提示：\n{p1}\n\n💡 **時間與空間複雜度提醒**：\n{p2}", { p0: assignment?.title, p1: hintList, p2: (assignment?.constraints || []).join('\n') });
    }

    // 3. 詢問推薦自訂測資
    if (q.includes('測資') || q.includes('test') || q.includes('邊界')) {
      const sample = assignment?.sampleCases?.[assignment.sampleCases.length - 1];
      return t("建議你可以在右側「**自訂測資 (Custom Stdin)**」區塊測試以下邊界情境：\n1. **最小邊界輸入**：\n```\n{p0}\n```\n預期輸出：\n```\n{p1}\n```\n2. **壓力/多筆資料測試**：嘗試將輸入數值放大 3 倍，觀察 Pyodide 執行耗時是否維持在 20ms 以內。", { p0: sample?.input || '1', p1: sample?.expectedOutput || '[0]' });
    }

    // 4. 詢問編輯紀錄分析
    if (q.includes('紀錄') || q.includes('修改') || q.includes('次數') || /history|edit|change|record/.test(q)) {
      return t("根據右上角的 Change Tracker 統計，你在本題目已完成：\n- **插入 (Insert)**：{p0} 次\n- **刪除 (Delete)**：{p1} 次\n- **替換 (Replace)**：{p2} 次\n\n你的修改節奏相當穩定！點擊右上角計數器即可打開浮動視窗匯出 JSON/CSV 學習歷程。", { p0: changeStats.insert, p1: changeStats.delete, p2: changeStats.replace });
    }

    // 預設智慧回答
    return t("收到你的問題：「{p0}」\n\n結合你目前的程式碼（{p1} 行）與題目要求：\n- {p2}\n- {p3}", { p0: userQuestion, p1: currentCode.split('\n').length, p2: hints[0] || t("請確保標準輸出格式與範例測資完全一致（注意大小寫與冒號後的空白）。"), p3: hints[1] || t("可先點選「載入範例測資」並按下「執行與驗證」確認基礎邏輯無誤。") });
  };

  const handleSendMessage = (customText?: string) => {
    const textToSend = (customText ?? inputMsg).trim();
    if (!textToSend) return;

    const timeNow = new Date().toISOString();

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      timestamp: timeNow,
      text: textToSend,
    };

    const aiMsg = {
      id: `ai-${Date.now() + 1}`,
      role: 'assistant',
      timestamp: timeNow,
      text: generateContextualAiReply(textToSend),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    if (!customText) setInputMsg('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      {/* Chat Window Panel */}
      {isOpen && (
        <div
          className={`mb-3 bg-white dark:bg-[#1E1F23] backdrop-blur-md border border-indigo-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            isExpanded
              ? 'w-[92vw] sm:w-[520px] h-[560px]'
              : 'w-[88vw] sm:w-[390px] h-[440px]'
          }`}
        >
          {/* Chat Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#0B57D0] to-[#0842A0] border-b border-slate-200 dark:border-[#33353A] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[#0B57D0]">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t("AI 程式助教")}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-[#444746] dark:text-[#C4C7C5]">{t("已連結編輯器與 Pyodide 輸出狀態")}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-[#444746] dark:text-[#C4C7C5] hover:text-white hover:bg-[#F0F4F9] dark:bg-[#282A2F] transition"
                title={isExpanded ? t("縮小視窗") : t("放大視窗")}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-1 rounded-lg text-xs text-[#444746] dark:text-[#C4C7C5] hover:text-white hover:bg-[#F0F4F9] dark:bg-[#282A2F] transition"
              >{t("收合")}</button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-[#F8FAFD] dark:bg-[#121316] border-b border-slate-200 dark:border-[#33353A] flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSendMessage(t("請給我這題的解題思路與提示"))}
              className="px-2.5 py-1 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 text-[#0B57D0] border border-indigo-500/30 text-[11px] flex items-center gap-1 transition"
            >
              <Lightbulb className="w-3 h-3" />
              <span>{t("解題提示")}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(t("幫我診斷目前的程式碼與執行結果"))}
              className="px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-[#0D652D] border border-emerald-500/30 text-[11px] flex items-center gap-1 transition"
            >
              <Bug className="w-3 h-3" />
              <span>{t("診斷目前程式碼")}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(t("請推薦自訂邊界測資"))}
              className="px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-[#B06000] border border-amber-500/30 text-[11px] flex items-center gap-1 transition"
            >
              <HelpCircle className="w-3 h-3" />
              <span>{t("推薦邊界測資")}</span>
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#F8FAFD] dark:bg-[#121316]">
            {[welcomeMessage, ...messages].map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#0B57D0] text-white rounded-br-sm'
                      : 'bg-white dark:bg-[#1E1F23] border border-slate-200 dark:border-[#33353A] text-[#1F1F1F] dark:text-[#E3E2E6] rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-[#5E5E5E] dark:text-[#8E918F] mt-1 px-1">{m.timestamp ? new Date(m.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }) : t('剛剛')}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white dark:bg-[#1E1F23] border-t border-slate-200 dark:border-[#33353A] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={t("詢問 AI 助教關於題目、語法或測資問題...")}
              className="flex-1 px-3 py-2 bg-[#F0F4F9] dark:bg-[#282A2F] border border-slate-300 dark:border-[#444746] rounded-xl text-xs text-[#1F1F1F] dark:text-[#E3E2E6] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-[#0B57D0] hover:bg-[#0842A0] text-white transition shrink-0"
              title={t("傳送訊息")}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Bottom-Right Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-xs shadow-indigo-600/30 border border-indigo-400/30 transition-all"
      >
        <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span>{isOpen ? t("隱藏 AI 助教對話窗") : t("AI 程式助教對話")}</span>
        <span className="px-1.5 py-0.5 rounded-full bg-white dark:bg-[#1E1F23]/20 text-[10px] font-mono">
          {t('線上')}
        </span>
      </button>
    </div>
  );
}
