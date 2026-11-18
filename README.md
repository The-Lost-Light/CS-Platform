# CodePulse Edu — 課程專案平台

使用 React 19、TypeScript、Vite+、Tailwind CSS 4 與 pnpm 開發的課程專案平台，透過 Void 部署至 Cloudflare Workers，整合 C4 架構圖設計、專案設計文件與 GitHub 倉庫瀏覽。

## 核心功能

- **專案總覽首頁**：單欄顯示所有專案與專案數量，點擊專案即可進入工作區。導覽列提供首頁與專案切換。
- **C4 架構設計**：使用 React Flow 編輯架構節點與關係，設定預期的 GitHub 檔案路徑，並撰寫專案設計文件。
- **GitHub 儀表板**：透過 GitHub API 載入倉庫資訊、分支、語言佔比、檔案樹與 Commit Diff，支援 Unified / Split 檢視。
- **介面設定**：支援繁體中文、English，以及自動、淺色、深色主題。

## 專案結構

```text
src/
├── main.tsx                         # 組合 Provider 與應用畫面入口
├── auth/                            # 登入型別、服務、狀態與 useLoginForm
├── domain/                          # 專案／倉庫型別、C4 規則與檔案格式、Diff、檔案樹
├── services/
│   ├── github/                     # URL 解析、HTTP、快照與備援策略
│   └── c4Download.ts               # 瀏覽器下載介面
├── hooks/
│   ├── usePageNavigation.ts         # 首頁／專案導覽狀態
│   ├── useProjectDraft.ts           # 專案草稿與語言更新生命週期
│   ├── useRepository.ts             # 倉庫輸入、載入、錯誤與 Token 狀態
│   └── useProjectWorkspace.ts       # 組合草稿、倉庫與分頁狀態
├── data/                            # 專案題庫、翻譯與草稿語言更新
├── i18n/                            # 翻譯內容與語言狀態
├── theme/                           # 純主題規則 model.ts、Provider 與偏好儲存
└── pages/                           # 所有畫面元件與樣式
    ├── Workspace.tsx                # 首頁／專案畫面組合
    ├── auth/                       # AuthGate、登入頁、表單與示範帳號選擇
    ├── layout/                     # 導覽列、語言與主題切換
    ├── home/                       # 專案總覽首頁
    ├── project/                    # 專案工作區與畫面組合
    │   ├── c4/                     # 編輯控制器、畫布、屬性面板、README 與 Flow 型別
    │   └── github/                 # 倉庫連線、統計、語言、檔案樹與提交紀錄
    └── styles/                     # index 組合 tokens/base/components/c4/scrollbars 與字型
```

模組匯入統一使用 `@auth/*`、`@data/*`、`@domain/*`、`@hooks/*`、`@i18n/*`、`@pages/*`、`@services/*` 與 `@theme/*`；`@i18n`、`@theme` 可直接匯入各自的入口。別名同步設定於 `tsconfig.json` 與 `vite.config.ts`，並保留 `@/*` 作為 `src/*` 的通用別名。

## 開發與驗證

需要 Node.js `^24.22.0 || >=26.12.0`（符合 Void 的執行環境需求）與 `devEngines.packageManager` 指定的 pnpm 12.21.0。專案已安裝本地 Vite+ 與 Void CLI，不需全域安裝。

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
pnpm typecheck
pnpm build
pnpm preview
```

所有工具指令由 Vite+ 統一執行，設定集中於 `vite.config.ts`：

- `pnpm dev` / `pnpm preview`：啟動開發伺服器／預覽正式建置。
- `pnpm check`：以 Oxfmt、Oxlint 與 Vite+ 型別檢查器執行格式、含型別資訊的 lint 和 TypeScript strict 檢查。
- `pnpm fmt` / `pnpm lint`：格式化專案／單獨執行 lint；`pnpm exec vp check --fix` 可格式化並套用安全的 lint 修正。
- `pnpm typecheck`：使用 `vp check --no-fmt --no-lint` 單獨檢查型別。
- `pnpm test` / `pnpm test:watch`：透過 Vite+ 內建 Vitest 執行全部測試／監看模式。測試使用 `vite-plus/test`，保留 Node strict assertions，並共用應用的模組別名與 React Compiler 設定。
- `pnpm build`：先執行 strict 型別檢查，再透過 `vp build` 產生 `dist/`。

Vite+ 版本與 Vite 相容別名由 `pnpm-workspace.yaml` catalog 管理，`vite` 指向 Vite+ core，讓 React 與 Tailwind 外掛共用同一份建置引擎；Vitest override 對齊 Vite+ 內建版本。`pnpm-lock.yaml` 納入版本控制，CI 或乾淨環境請執行 `pnpm install --frozen-lockfile`、`pnpm check`、`pnpm test` 與 `pnpm build`。升級時依 [Vite+ 官方遷移指南](https://viteplus.dev/guide/migrate) 執行目標版本的 migrator，並重新驗證上述指令。

React Compiler 透過 `@rolldown/plugin-babel` 與 `reactCompilerPreset` 整合；外掛由 `lazyPlugins` 延後載入，避免格式與 lint 指令啟動建置外掛。Tailwind CSS 4 透過 `@tailwindcss/vite` 整合，主題定義於 `src/pages/styles/tokens.css`，樣式統一從 `index.css` 載入。

`pnpm clean --lockfile` 可清除 `node_modules/`、`.vite/`、`.vite-plus/`、`.vitest/`、`void.lock.json` 與 `.void/`，並重新安裝依賴。

`pnpm up --latest --interactive` 可互動式升級依賴，`pnpm up --latest --interactive vite-plus` 可升級 Vite+。升級後請重新執行 `pnpm check`、`pnpm test` 與 `pnpm build`。

`pnpm runtime set node lts -g` 可在本機設定 Node.js LTS 版本，或使用 `pnpm exec node -v` 驗證目前版本。CI 可使用 `pnpm exec vp env doctor` 檢查 Node、pnpm、Vite+ 與 Void CLI 版本，並確認 `CLOUDFLARE_API_TOKEN` 是否設定。

## Void / Cloudflare 部署

正式網站：[CodePulse Edu](https://course-assignment-platform.mono-lts.workers.dev)。

採用 [Void 的 SPA 部署模式](https://void.cloud/guide/app-types)，由 Vite+ 建置前端，再由 Void 將 `dist/` 上傳至 Cloudflare Workers Assets。`void.config.ts` 明確指定 `spa`、輸出目錄與 `pnpm build`，讓每次部署先通過型別檢查。此模式不需要 `voidPlugin()`；`src/pages/` 仍是 React 畫面元件目錄。

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm deploy
```

`pnpm deploy` 執行 `void deploy --platform cloudflare`；首次使用時會開啟瀏覽器登入 Cloudflare 並選擇帳號，成功後印出部署網址。Worker 名稱為 `course-assignment-platform`，可在 `void.config.ts` 的 `cloudflare.name` 修改。後續部署沿用已連結的帳號；如需先完成登入，可執行 `pnpm exec void connect --platform cloudflare`。

Cloudflare 帳號必須先在 [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) 完成 `workers.dev` 子網域設定；在帳號總覽找到 **Your subdomain**，選擇 **Change** 設定名稱後，重新執行 `pnpm deploy`。若 CLI 提供的 `/workers/onboarding` 連結顯示 404，請改用上述 Workers & Pages 入口。設定方式見 [Cloudflare 官方文件](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)。

`pnpm-lock.yaml` 與部署後產生的 `void.lock.json` 應納入版本控制；`.void/`、`.void-wrangler.jsonc`、`.wrangler/` 和本機 `.env` 檔不納入。CI 需設定 `CLOUDFLARE_API_TOKEN`；Token 可存取多個帳號時另設 `CLOUDFLARE_ACCOUNT_ID`，再執行上述驗證與部署指令。憑證不放入前端 `VITE_*` 變數。

目前登入仍為下方說明的前端示範模式，部署不會新增伺服器身分驗證、資料庫或持久化儲存。詳細帳號設定與部署行為見 [Void 官方部署文件](https://void.cloud/guide/deployment)。

## 模組邊界與重構分析

原本的主要耦合點是：C4Architect 同時處理畫布渲染、編輯狀態、檔案 I/O 與表單；GitHubRepoDashboard 同時包含所有儀表板區塊；useProjectWorkspace 同時管理草稿與遠端資料；共用型別由題庫與快照 JSON 推導。這些責任已拆分，原有登入、導覽、翻譯及小型畫面模組保留既有設計。

- `domain` 管理資料契約與純資料轉換，不依賴 React、畫面、服務或示範資料。倉庫型別明確定義，不再由快照推導；合併方式的翻譯 key 保留型別限制。
- `services` 管理外部 I/O。GitHub 的 `createGitHubService({ fetch })` 可注入 HTTP 傳輸；所有倉庫一律讀取 GitHub API，載入失敗時回報錯誤，不替換成範例資料。測試使用 `tests/fixtures/repository.ts` 的獨立資料。
- `hooks` 管理應用狀態。`useProjectWorkspace(project, loadRepository?)` 組合草稿與倉庫 hook，可替換載入服務。語言切換只合併未修改的題庫欄位；更換專案才重設草稿與載入倉庫，Token 不落地儲存。
- `pages` 負責畫面與畫面專用互動。`useC4Editor` 保留在 C4 畫面模組，管理 React Flow 轉換、選取、導覽與匯入狀態；畫布尺寸量測留在 C4Canvas。README 模式由父層保存，切換分頁不重設。GitHub 分支、搜尋、展開提交與 Diff 模式也仍由原本父層持有。
- 程式與測試直接匯入所屬模組：專案型別使用 `domain/project`、倉庫型別使用 `domain/repository`、使用者型別使用 `auth/types`；C4、Diff 與檔案樹使用 `domain` 中的模組，GitHub 服務使用 `services/github`。舊的 `src/utils/*`、`src/types.ts` 及 `projectsData` 的型別轉出已移除；`projectsData` 僅保留題庫資料與建立函式。

`tests/architecture.test.tsx` 檢查相對路徑、`@/` 與各模組別名匯入的分層邊界、路徑解析及循環相依；`tests/githubService.test.tsx` 以注入的 HTTP 實作驗證授權標頭、分支編碼、250 筆檔案上限、部分端點失敗與快照備援，不發出真實網路請求。既有測試繼續涵蓋登入、多語系、草稿保留、C4 編輯規則與檔案往返、Diff 及畫面渲染。

本次重構另以 Git 原始版本進行 24 組初始畫面的 HTML 逐字比對，涵蓋兩種語言、淺深色主題、所有專案、首頁、登入、GitHub 與空資料狀態。此比對驗證初始渲染一致，不取代瀏覽器中的拖曳、縮放與檔案選取互動測試。

## 登入與身分驗證模組

`src/auth/` 管理身分資料與登入狀態。`AuthService` 定義登入請求與結果，`demoAuthService` 負責帳號／密碼必填檢查與使用者資料正規化；錯誤以代碼回傳，由介面翻譯。`AuthProvider` 統一管理 `currentUser`、`login`、`logout`，元件透過 `useAuth()` 存取；可用 `service` 屬性注入其他符合介面的實作。共用的 `src/types.ts` 保留 `User` 型別轉出。

`src/pages/auth/` 負責畫面：`LoginView` 組合版面、`LoginForm` 顯示欄位、`DemoAccountPicker` 顯示示範帳號。`src/auth/useLoginForm.ts` 管理欄位、密碼顯示與錯誤訊息。`AuthGate` 根據 Provider 狀態顯示登入頁或應用內容；登出時卸載工作區，讓下一次登入從首頁開始。`main.tsx` 組合 Provider、`AuthGate` 與 `pages/Workspace`，導覽狀態由 `hooks/usePageNavigation` 管理。

畫面與樣式集中於 `pages`；共用狀態、服務、資料處理與可重用 hooks 放在畫面目錄外，且不依賴 `pages`。僅供畫面使用的互動狀態（例如分頁、選單、畫布選取）可留在元件內。

目前維持前端示範模式：任意非空白帳號與密碼皆可登入，角色由表單選擇，沒有後端密碼驗證或權限控管。登入狀態僅存在記憶體，重新整理後需再次登入，密碼不會放入使用者狀態或瀏覽器儲存空間。串接真實後端時，需另外設計非同步服務、伺服器端驗證與工作階段管理。

## 多國語言

登入頁與導覽列提供自動、English 與繁體中文 選單；自動模式依瀏覽器語言選擇，無支援語言時使用英文。語言偏好儲存於 `localStorage` 的 `codepulse.languagePreference`。

翻譯集中於 `src/i18n/`：`ui.ts` 為介面、`courses.ts` 為專案題庫、`runtime.ts` 為分析與系統提示，各自置於 `en/` 與 `zh-TW/` 語言資料夾。元件使用語意化 key，例如 `useI18n().t('auth.title')`；帶參數的文案使用 `t('home.projectCount', { count: projects.length })`。英文與繁體中文文案只存放於語系檔，不作為查找鍵。

`MessageKey` 由英文語系檔推導，`t()` 會在編譯時拒絕不存在的 key 或直接傳入的文本；繁體中文語系檔透過 `satisfies` 檢查 key 是否完整對應英文。新增文案時，請在對應分類的兩個語系檔加入相同 key，並維持插值參數一致。專案範本透過 `titleKey`、`labelKey` 等欄位引用翻譯。

切換語言會更新未修改的專案範本，保留自訂節點、已修改欄位、刪除狀態、路徑與位置；姓名及 GitHub 原始提交訊息保留原文。`src/data/localizedProjects.ts` 管理題庫翻譯與草稿更新。

測試涵蓋語言判定、翻譯參數、專案路徑、草稿保留、首頁專案列表、各畫面渲染，以及 C4 節點行為。
