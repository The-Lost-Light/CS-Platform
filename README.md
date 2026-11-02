# CodePulse Edu — 課程作業平台 (React + pnpm + Vite 模組化架構)

本專案整合先前的兩個核心 Demo（**基礎作業平台：Pyodide + 編輯行為追蹤** 與 **進階作業平台：GitPulse GitHub Repo 數據與 Diff 分析**），採用 **React 19 + Vite 8 + Tailwind CSS 4 + pnpm** 模組化架構開發。

## ✨ 核心功能模組

### 1. 作業總覽首頁 (`src/components/home/HomeDashboard.tsx`)

- 一覽所有課程作業，清晰區分為 **「基礎程式作業 (Basic Coding Assignments)」** 與 **「進階專題作業 (Advanced Capstone Projects)」**。
- 支援分類切換、關鍵字即時搜尋、截止時間與已記錄編輯次數統計，點擊任意卡片即可進入對應工作區。

### 2. 基礎作業工作區 (`src/components/basic/`)

- **左半邊題目說明區**：完整顯示題目敘述、標準輸入/輸出格式、限制條件與範例測資（支援一鍵將範例測資帶入右側自訂測資區）。
- **右半邊程式碼編輯區 + Pyodide + 自訂測資 (`src/utils/pyodideRunner.ts`)**：
  - 內建行號顯示、Tab 縮排與 `Ctrl + Enter` 快捷鍵執行。
  - 整合 **Pyodide (Python WebAssembly)**，支援下方「自訂測資輸入區 (Custom Stdin)」注入 `sys.stdin` 執行並即時檢視 `stdout` / `stderr`，亦可一鍵批次驗證所有範例測資。
- **右上方插入/刪除/替換計數器與浮動改動視窗 (`FloatingChangeTrackerModal.tsx` & `src/utils/changeTracker.ts`)**：
  - 即時統計學生在編輯器內的 **插入 (`Insert`)**、**刪除 (`Delete`)**、**替換 (`Replace`)** 三種操作次數。
  - 點擊右上方計數器即可開啟**浮動畫面 (Modal)**，顯示每筆改動的具體位置 (`Line / Col`)、時間戳記與刪除/新增 Diff 內容，並支援類型過濾、關鍵字搜尋、點擊跳轉至該行與匯出 JSON / CSV。
- **右下角 AI 程式助教對話窗 (`AiTutorChatWidget.tsx`)**：
  - 常駐於右下角的浮動聊天視窗，能結合當前作業題目、學生的程式碼、Pyodide 錯誤輸出與編輯統計提供解題提示、錯誤診斷與邊界測資建議。

### 3. 進階專題作業工作區 (`src/components/advanced/`)

- **互動式心智圖與文字架構設計器 (`MindMapArchitect.tsx`)**：
  - 提供視覺化 SVG 心智圖畫布，學生可新增、編輯、移動或刪除架構節點，設定各模組的架構分層與預期對應之 GitHub 檔案路徑 (`expectedPath`)。
  - 下方配備「專案架構設計與開發計畫書」文字編輯區，支援以反引號標註預期檔案與里程碑。
- **GitHub Repo 數據儀表板與檔案結構/Diff 檢視器 (`GitHubRepoDashboard.tsx` & `src/utils/githubService.ts`)**：
  - 輸入 GitHub Repo 網址即可抓取 Stars、Forks、Issues、Branches、語言佔比、實際檔案結構樹 (`fileTree`) 與 Commit 程式碼修改 Diff (支援 Unified / Split 模式)。
- **原計畫架構 vs. GitHub 實際開發比對分析引擎 (`ArchitectureComparisonPanel.tsx` & `src/utils/architectureAnalyzer.ts`)**：
  - 自動計算 **計畫契合度分數 (Alignment Score)**。
  - 逐一比對心智圖節點與 GitHub 倉庫實際檔案結構（標示「已完整實作 ✅」、「路徑偏移 ⚠️」、「尚未實作 ❌」）及近期 Commit 修改次數，並檢測未納入心智圖的額外檔案。
  - 自動生成按優先級排序的 **AI 架構師診斷建議與後續改進方向**。

## 📂 專案模組目錄結構

```text
course-assignment-platform/
├── index.html
├── package.json
├── pnpm-workspace.yaml
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── data/
    │   └── assignmentsData.ts            # 基礎與進階作業題庫資料集
    ├── utils/
    │   ├── changeTracker.ts              # 插入/刪除/替換差異計算與 JSON/CSV 匯出
    │   ├── pyodideRunner.ts              # Pyodide WebAssembly 載入與自訂測資執行器
    │   ├── githubService.ts              # GitHub REST API 與內建專題倉庫快照服務
    │   └── architectureAnalyzer.ts       # 心智圖/文字規格 vs GitHub 檔案結構比對引擎
    └── components/
        ├── layout/
        │   └── Navbar.tsx                # 頂部導覽列與作業切換器
        ├── home/
        │   └── HomeDashboard.tsx         # 首頁作業總覽（基礎作業 & 進階專題）
        ├── basic/
        │   ├── BasicAssignmentWorkspace.tsx     # 基礎作業左右分欄主工作區
        │   ├── FloatingChangeTrackerModal.tsx   # 右上方計數器觸發之具體改動浮動視窗
        │   └── AiTutorChatWidget.tsx            # 右下角 AI 助教對話視窗
        └── advanced/
            ├── AdvancedProjectWorkspace.tsx     # 進階專題主工作區
            ├── MindMapArchitect.tsx             # 互動式心智圖與文字架構編輯器
            ├── ArchitectureComparisonPanel.tsx  # 原計畫 vs GitHub 檔案結構比對與建議面板
            └── GitHubRepoDashboard.tsx          # GitHub 專案數據、檔案樹與 Commit Diff 檢視器
```

Tailwind CSS 4 透過 `@tailwindcss/vite` 整合；字型主題與 `.dark` 深色模式定義於 `src/index.css`，不需要額外的 PostCSS 或 Autoprefixer 設定。

## 🚀 使用 pnpm 啟動方式

```bash
# 1. 安裝依賴套件
pnpm install

# 2. 啟動開發伺服器
pnpm dev

# 3. 打包正式環境版本
pnpm build
```

## 多國語言

登入頁與導覽列提供 MD3 樣式的 **自動 / 繁體中文 / English** 選單，預設為「自動」，透過瀏覽器提供的系統偏好語言偵測，並監聽語言變更；無支援語言時使用繁體中文。偏好儲存於 `localStorage` 的 `codepulse.languagePreference`，重新整理後沿用（自動模式不會固定成偵測結果）。選單支援方向鍵、Home / End、Enter、Escape 與點擊外側關閉。儲存空間不可用時仍可在當次使用期間切換。

- 介面、題目、範例說明、助教新回覆、架構診斷及系統提示皆支援兩種語言；頁面標題、HTML `lang` 與日期／數字格式一併更新。
- 切換語言保留作答、測資、評測結果、編輯紀錄與專題草稿。未修改的程式碼註解／專題範本會更新語言；已修改內容、姓名、歷史聊天及 GitHub 原始提交訊息保留原文。
- 翻譯集中於 `src/i18n/`：`ui.en.ts`（介面）、`courses.en.ts`（題庫）、`runtime.en.ts`（執行環境與分析）。繁體中文原文作為查找鍵，元件使用 `useI18n().t()`，變數以參數傳入。新增語言時擴充 `Locale`、`SUPPORTED_LOCALES`、語言判定與字典選擇。
- `src/data/localizedAssignments.ts` 產生顯示用題庫，保留作業 ID、路徑、測資與預期輸出；請勿將使用者輸入交由題庫翻譯流程處理。
- 執行 `pnpm test` 驗證翻譯覆蓋、參數、題目契約、草稿保留及各畫面渲染；`pnpm build` 包含 TypeScript 檢查與正式建置。

## TypeScript 與 CDN Pyodide

使用 pnpm install 安裝依賴、pnpm dev 開發、pnpm build 建置。pnpm typecheck 執行型別檢查，已啟用 strict 模式。

Pyodide 固定為 0.26.4，不安裝 npm / pnpm 的 `pyodide` 套件。瀏覽器直接動態匯入 `https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs`，再呼叫 `loadPyodide`，將 `indexURL` 設為同版本的 CDN 目錄。版本集中設定於 `src/utils/pyodideRunner.ts` 的 `pyodideVersion`。

動態匯入使用 `@vite-ignore`，由瀏覽器直接載入 CDN 模組。Python runtime、Wasm、標準函式庫、套件索引與 `loadPackagesFromImports` 所需的支援套件也從 CDN 下載。不需要複製檔案到 `public/pyodide` 或額外設定 Vite。首次載入需要網路連線；載入失敗會回報錯誤，並允許下次執行時重試。
