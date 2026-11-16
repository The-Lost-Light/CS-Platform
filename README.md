# CodePulse Edu — 課程專案平台

使用 React 19、TypeScript、Vite 8、Tailwind CSS 4 與 pnpm 開發的課程專案平台，整合 C4 架構圖設計、專案設計文件與 GitHub 倉庫瀏覽。

## 核心功能

- **專案總覽首頁**：單欄顯示所有專案與專案數量，點擊專案即可進入工作區。導覽列提供首頁與專案切換。
- **C4 架構設計**：使用 React Flow 編輯架構節點與關係，設定預期的 GitHub 檔案路徑，並撰寫專案設計文件。
- **GitHub 儀表板**：載入倉庫資訊、分支、語言佔比、檔案樹與 Commit Diff，支援 Unified / Split 檢視及內建教學倉庫快照。
- **介面設定**：支援繁體中文、English，以及自動、淺色、深色主題。

## 專案結構

```text
src/
├── main.tsx                         # 組合 Provider 與應用畫面入口
├── auth/                            # 登入型別、服務、狀態與 useLoginForm
├── hooks/
│   ├── usePageNavigation.ts         # 首頁／專案導覽狀態
│   └── useProjectWorkspace.ts       # 專案草稿、語言更新與倉庫載入
├── data/                            # 專案題庫、翻譯與草稿語言更新
├── i18n/                            # 翻譯內容與語言狀態
├── theme/                           # 主題狀態與偏好儲存
├── utils/                           # C4 模型、GitHub 服務、Diff 與檔案樹處理
└── pages/                           # 所有畫面元件與樣式
    ├── Workspace.tsx                # 首頁／專案畫面組合
    ├── auth/                       # AuthGate、登入頁、表單與示範帳號選擇
    ├── layout/                     # 導覽列、語言與主題切換
    ├── home/                       # 專案總覽首頁
    ├── advanced/                   # 專案工作區、C4 與 GitHub 畫面
    └── styles/                     # 全域樣式、主題色彩與字型
```

## 開發與驗證

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

`pnpm build` 包含 TypeScript strict 型別檢查與正式建置；`pnpm preview` 可預覽建置結果。Tailwind CSS 4 透過 `@tailwindcss/vite` 整合，主題定義於 `src/pages/styles/index.css`。

## 登入與身分驗證模組

`src/auth/` 管理身分資料與登入狀態。`AuthService` 定義登入請求與結果，`demoAuthService` 負責帳號／密碼必填檢查與使用者資料正規化；錯誤以代碼回傳，由介面翻譯。`AuthProvider` 統一管理 `currentUser`、`login`、`logout`，元件透過 `useAuth()` 存取；可用 `service` 屬性注入其他符合介面的實作。共用的 `src/types.ts` 保留 `User` 型別轉出。

`src/pages/auth/` 負責畫面：`LoginView` 組合版面、`LoginForm` 顯示欄位、`DemoAccountPicker` 顯示示範帳號。`src/auth/useLoginForm.ts` 管理欄位、密碼顯示與錯誤訊息。`AuthGate` 根據 Provider 狀態顯示登入頁或應用內容；登出時卸載工作區，讓下一次登入從首頁開始。`main.tsx` 組合 Provider、`AuthGate` 與 `pages/Workspace`，導覽狀態由 `hooks/usePageNavigation` 管理。

畫面與樣式集中於 `pages`；共用狀態、服務、資料處理與可重用 hooks 放在畫面目錄外，且不依賴 `pages`。僅供畫面使用的互動狀態（例如分頁、選單、畫布選取）可留在元件內。

目前維持前端示範模式：任意非空白帳號與密碼皆可登入，角色由表單選擇，沒有後端密碼驗證或權限控管。登入狀態僅存在記憶體，重新整理後需再次登入，密碼不會放入使用者狀態或瀏覽器儲存空間。串接真實後端時，需另外設計非同步服務、伺服器端驗證與工作階段管理。

## 多國語言

登入頁與導覽列提供自動、繁體中文與 English 選單；自動模式依瀏覽器語言選擇，無支援語言時使用繁體中文。語言偏好儲存於 `localStorage` 的 `codepulse.languagePreference`。

翻譯集中於 `src/i18n/`：`ui.*.ts` 為介面、`courses.*.ts` 為專案題庫、`runtime.*.ts` 為分析與系統提示，各自提供 `zh-TW` 與 `en` 語系檔。元件使用語意化 key，例如 `useI18n().t('auth.title')`；帶參數的文案使用 `t('home.projectCount', { count: projects.length })`。繁體中文與英文文案只存放於語系檔，不作為查找鍵。

`MessageKey` 由繁體中文語系檔推導，`t()` 會在編譯時拒絕不存在的 key 或直接傳入的文本；英文語系檔也會檢查 key 是否完整對應。新增文案時，請在對應分類的兩個語系檔加入相同 key，並維持插值參數一致。專案範本透過 `titleKey`、`labelKey` 等欄位引用翻譯。

切換語言會更新未修改的專案範本，保留自訂節點、已修改欄位、刪除狀態、路徑與位置；姓名及 GitHub 原始提交訊息保留原文。`src/data/localizedAssignments.ts` 管理題庫翻譯與草稿更新。

測試涵蓋語言判定、翻譯參數、專案路徑、草稿保留、首頁專案列表、各畫面渲染，以及 C4 節點行為。
