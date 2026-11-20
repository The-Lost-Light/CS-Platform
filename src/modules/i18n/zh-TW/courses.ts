import type source from "../en/courses";

export default {
  "courses.fullstack.title": "期中軟體工程專題：模組化全端專案架構設計與 GitHub 開發檢核",
  "courses.fullstack.content":
    "## 作業說明\n\n- 繪製包含至少 5 個核心模組節點的專案架構 C4 架構圖，並標註各節點預期對應的檔案或資料夾路徑。\n- 撰寫專案架構設計說明（含核心解決問題、技術棧選型、資料流向與測試策略）。\n- 連結您的 GitHub 專案網址，透過平台自動抓取分支、Commits、程式碼變更 Diff 與檔案結構樹。\n- 執行「原計畫 C4 架構圖 vs. GitHub 實際開發」比對分析，根據系統診斷建議補強缺失模組（如單元測試或文件）。\n\n## 1. 專案目標與核心價值\n本專題旨在開發一個支援即時程式評測與學習歷程分析的課程作業平台，透過前端 WebAssembly 沙盒降低伺服器負擔，並紀錄學生的細粒度編輯行為（Insert / Delete / Replace）。\n\n## 2. 系統模組分層規劃\n- **前端展示層 (src/)**：採用 React + TypeScript + Tailwind CSS，包含 `src/App.tsx` 主框架與 `src/components/CodeEditor.tsx` 編輯元件。\n- **後端服務層 (server/)**：提供 RESTful API (`server/routes/submissions.ts`) 與 AI 助教提示服務 (`server/services/aiTutor.ts`)。\n- **資料持久層 (prisma/)**：透過 `prisma/schema.prisma` 管理作業題庫與提交紀錄。\n- **品質保證與測試 (tests/)**：規劃撰寫 `tests/submissions.test.ts` 確保評分邏輯正確無誤。\n\n## 3. 開發里程碑計畫\n1. **Milestone 1 (第 1-2 週)**：完成專案初始化、資料庫 Schema 與前端主頁面骨架。\n2. **Milestone 2 (第 3-4 週)**：完成程式碼編輯器與後端作業提交 API 串接。\n3. **Milestone 3 (第 5 週)**：補齊 AI 診斷服務模組與單元測試覆蓋率達 80%。",
  "courses.react.title": "期末專題：開源大型專案架構逆向工程與演進分析 (React / Next.js)",
  "courses.react.content":
    "## 作業說明\n\n- 建立目標專案的核心模組 C4 架構圖（例如 Compiler、Reconciler、DevTools、Server Actions、Tests）。\n- 利用 GitGraph 觀察該專案的分支合併策略（Squash & Merge、Merge Commit 或 Rebase）。\n- 比對您設計的模組 C4 架構圖與實際 GitHub 專案目錄樹，撰寫架構演進分析報告。\n\n## 1. 專題研究目標\n深入剖析 React 19 與 React Compiler 的核心原始碼結構，將我們的理解繪製為 C4 架構圖，並與 `facebook/react` 官方倉庫進行自動化路徑與近期 Commit 修改比對。\n\n## 2. 關鍵子系統追蹤清單\n- **React Compiler (`compiler/packages/babel-plugin-react-compiler`)**：重點觀察 `PruneScopes.ts` 如何處理 Server Actions。\n- **Fiber Reconciler (`packages/react-reconciler`)**：追蹤 `ReactFiberCommitWork.js` 中的 Suspense 與 ViewTransition 清理機制。\n- **DevTools Flight (`packages/react-devtools-shared`)**：檢視 `parseFlightStack.js` 對 RSC 的支援。\n- **架構文件 (`docs/ARCHITECTURE.md`)**：檢查是否具備獨立架構文件。",
} satisfies Record<keyof typeof source, string>;
