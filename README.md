# CodePulse Edu — 課程專案平台

使用 React 19、TypeScript、Vite 8、Tailwind CSS 4 與 pnpm 開發的課程專案平台，整合 C4 架構圖設計、專案設計文件與 GitHub 架構比對。

## 核心功能

- **專案總覽首頁**：單欄顯示所有專案與專案數量，點擊專案即可進入工作區。導覽列提供首頁與專案切換。
- **C4 架構設計**：使用 React Flow 編輯架構節點與關係，設定預期的 GitHub 檔案路徑，並撰寫專案設計文件。
- **GitHub 儀表板**：載入倉庫資訊、分支、語言佔比、檔案樹與 Commit Diff，支援 Unified / Split 檢視及內建教學倉庫快照。
- **架構比對**：比對規劃節點、文字規格與實際檔案結構，計算契合度並提供模組、測試及文件的改進建議。
- **介面設定**：支援繁體中文、English，以及自動、淺色、深色主題。

## 專案結構

```text
src/
├── App.tsx                          # 登入狀態與首頁／專案切換
├── data/
│   ├── assignmentsData.ts           # 專案題庫與架構設計範本
│   └── localizedAssignments.ts      # 專案翻譯與草稿語言更新
├── i18n/                            # 介面、題庫與診斷訊息翻譯
├── utils/
│   ├── c4Model.ts                   # C4 節點與層級模型
│   ├── githubService.ts             # GitHub API 與教學快照
│   └── architectureAnalyzer.ts      # 架構契合度分析
└── components/
    ├── auth/LoginView.tsx
    ├── layout/                      # 導覽列與語言選單
    ├── home/HomeDashboard.tsx        # 專案總覽首頁
    └── advanced/                    # 專案工作區（沿用既有目錄名稱）
        ├── AdvancedProjectWorkspace.tsx
        ├── C4Architect.tsx
        ├── ArchitectureComparisonPanel.tsx
        └── GitHubRepoDashboard.tsx
```

## 開發與驗證

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

`pnpm build` 包含 TypeScript strict 型別檢查與正式建置；`pnpm preview` 可預覽建置結果。Tailwind CSS 4 透過 `@tailwindcss/vite` 整合，主題定義於 `src/index.css`。

## 多國語言

登入頁與導覽列提供自動、繁體中文與 English 選單；自動模式依瀏覽器語言選擇，無支援語言時使用繁體中文。語言偏好儲存於 `localStorage` 的 `codepulse.languagePreference`。

翻譯集中於 `src/i18n/`：`ui.*.ts` 為介面、`courses.*.ts` 為專案題庫、`runtime.*.ts` 為分析與系統提示，各自提供 `zh-TW` 與 `en` 語系檔。元件使用語意化 key，例如 `useI18n().t('auth.title')`；帶參數的文案使用 `t('home.projectCount', { count: projects.length })`。繁體中文與英文文案只存放於語系檔，不作為查找鍵。

`MessageKey` 由繁體中文語系檔推導，`t()` 會在編譯時拒絕不存在的 key 或直接傳入的文本；英文語系檔也會檢查 key 是否完整對應。新增文案時，請在對應分類的兩個語系檔加入相同 key，並維持插值參數一致。專案範本透過 `titleKey`、`labelKey` 等欄位引用翻譯。

切換語言會更新未修改的專案範本，保留自訂節點、已修改欄位、刪除狀態、路徑與位置；姓名及 GitHub 原始提交訊息保留原文。`src/data/localizedAssignments.ts` 管理題庫翻譯與草稿更新。

測試涵蓋語言判定、翻譯參數、專案路徑、草稿保留、首頁專案列表、各畫面渲染，以及 C4 節點與架構比對行為。
