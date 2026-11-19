# CodePulse Edu — 課程專案平台

使用 React 19、TypeScript、Vite+、Tailwind CSS 4 與 pnpm 開發的課程專案平台，透過 Void 部署至 Cloudflare Workers，整合 C4 架構圖設計、專案設計文件與 GitHub 倉庫瀏覽。

## 核心功能

- **專案總覽首頁**：單欄顯示所有專案與專案數量，點擊專案即可進入工作區。導覽列提供首頁與專案切換。
- **C4 架構設計**：使用 React Flow 編輯架構節點與關係，設定預期的 GitHub 檔案路徑，並撰寫專案設計文件。
- **GitHub 儀表板**：透過 GitHub API 載入倉庫資訊、分支、語言佔比、檔案樹與 Commit Diff，支援 Unified / Split 檢視。
- **介面設定**：支援繁體中文、English，以及自動、淺色、深色主題。

## 專案結構

```text
pages/                   # Void 頁面、layout 與 loader
routes/api/              # Void HTTP handlers
server/                  # accounts、projects、workspaces 的 D1 讀寫與交易
db/                      # D1 schema 與 migrations
src/
├── app/                 # Void 導覽、應用外框與全站樣式
├── modules/
│   ├── auth/            # 登入、工作階段與登入表單
│   ├── projects/        # 專案資料契約、題庫、輸入驗證與清單合併
│   ├── catalog/         # 瀏覽器端專案清單與首頁
│   ├── workspace/       # 個人草稿載入、自動儲存與工作區畫面
│   ├── c4-model/        # C4 領域規則與檔案格式
│   ├── c4-editor/       # React Flow 畫布、屬性面板與 README 編輯器
│   ├── repository/      # GitHub API、檔案樹、提交與 Diff
│   ├── admin/           # 專案與帳號管理
│   ├── i18n/            # 翻譯、語言偏好與語言選單
│   └── theme/           # 主題規則、偏好與切換元件
└── shared/              # 通用 UI 與 HTTP 工具
```

跨功能使用 `@modules/<名稱>` 匯入模組根目錄的 `index.ts`，模組內使用相對路徑。頁面使用 `@app/*` 匯入應用外框、導覽與樣式，通用工具使用 `@shared/*`。Void 路由以 `@server/*` 呼叫伺服器功能，D1 資料表由 `@db/schema` 匯入。這些別名定義於 `tsconfig.json` 的 `compilerOptions.paths`，Vite+ 建置與測試共用同一份設定。

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
- `pnpm build`：先執行 strict 型別檢查，再透過 `vp build` 產生 `.cloudflare/output/` 的 Worker 與前端資產。

Vite+ 版本與 Vite 相容別名由 `pnpm-workspace.yaml` catalog 管理，`vite` 指向 Vite+ core，讓 React 與 Tailwind 外掛共用同一份建置引擎；Vitest override 對齊 Vite+ 內建版本。`pnpm-lock.yaml` 納入版本控制，CI 或乾淨環境請執行 `pnpm install --frozen-lockfile`、`pnpm check`、`pnpm test` 與 `pnpm build`。升級時依 [Vite+ 官方遷移指南](https://viteplus.dev/guide/migrate) 執行目標版本的 migrator，並重新驗證上述指令。

React Compiler 透過 `@rolldown/plugin-babel` 與 `reactCompilerPreset` 整合；外掛由 `lazyPlugins` 延後載入，避免格式與 lint 指令啟動建置外掛。Tailwind CSS 4 透過 `@tailwindcss/vite` 整合，主題定義於 `src/app/styles/tokens.css`，樣式統一從 `index.css` 載入。

`pnpm clean --lockfile` 可清除 `node_modules/`、`.vite/`、`.vite-plus/`、`.vitest/`、`void.lock.json` 與 `.void/`，並重新安裝依賴。

`pnpm up --latest --interactive` 可互動式升級依賴，`pnpm up --latest --interactive vite-plus` 可升級 Vite+。升級後請重新執行 `pnpm check`、`pnpm test` 與 `pnpm build`。

`pnpm runtime set node lts -g` 可在本機設定 Node.js LTS 版本，或使用 `pnpm exec node -v` 驗證目前版本。CI 可使用 `pnpm exec vp env doctor` 檢查 Node、pnpm、Vite+ 與 Void CLI 版本，並確認 `CLOUDFLARE_API_TOKEN` 是否設定。

## Void / Cloudflare 部署

正式網站：[CodePulse Edu](https://course-assignment-platform.mono-lts.workers.dev)。

採用 [Void Pages 檔案式路由](https://void.cloud/guide/pages-routing/overview)，透過 `voidPlugin()` 與 `voidReact()` 建置 Cloudflare Worker 與前端資產。根目錄 `pages/index.tsx` 對應 `/`，`pages/projects/[id].tsx` 對應 `/projects/:id`；專案 loader 驗證 ID，不存在時回傳 404。`pages/layout.tsx` 保留登入、語言、主題與共用導覽列，`src/modules/` 保存各功能的畫面元件。頁面設定 `ssr = false`，維持瀏覽器端渲染；Void 負責頁面載入、網址更新和上一頁／下一頁導覽。未登入時開啟專案網址會導回首頁登入。

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm deploy
```

`pnpm deploy` 執行 `void deploy --platform cloudflare`；首次使用時會開啟瀏覽器登入 Cloudflare 並選擇帳號，成功後印出部署網址。Worker 名稱為 `cap`，可在 `void.config.ts` 的 `cloudflare.name` 修改。後續部署沿用已連結的帳號；如需先完成登入，可執行 `pnpm exec void connect --platform cloudflare`。

Cloudflare 帳號必須先在 [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) 完成 `workers.dev` 子網域設定；在帳號總覽找到 **Your subdomain**，選擇 **Change** 設定名稱後，重新執行 `pnpm deploy`。若 CLI 提供的 `/workers/onboarding` 連結顯示 404，請改用上述 Workers & Pages 入口。設定方式見 [Cloudflare 官方文件](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)。

`pnpm-lock.yaml` 與部署後產生的 `void.lock.json` 應納入版本控制；`.void/`、`.void-wrangler.jsonc`、`.wrangler/` 和本機 `.env` 檔不納入。CI 需設定 `CLOUDFLARE_API_TOKEN`；Token 可存取多個帳號時另設 `CLOUDFLARE_ACCOUNT_ID`，再執行上述驗證與部署指令。憑證不放入前端 `VITE_*` 變數。

登入已改用 Void 的伺服器驗證與 D1；部署會需要建立資料庫並套用驗證資料表 migration。詳細帳號設定與部署行為見 [Void 官方部署文件](https://void.cloud/guide/deployment)。

## 模組邊界與驗證

React 畫面透過各自功能的 hooks 取得狀態與操作。工作區的儲存佇列依序送出修改並沿用上一筆成功寫入的 revision。C4 的檔案驗證與畫布座標轉換可獨立測試。GitHub 服務可注入 HTTP 傳輸，在測試中使用本地 fixture。

`tests/architecture.test.tsx` 檢查公開入口、共用層依賴方向，以及檔案和模組之間的循環相依。跨功能測試位於 `tests/`，需要驗證私有實作的測試可放在功能自己的 `__tests__/`。

## 登入、資料庫與權限

使用 Void 內建 Better Auth 與 Cloudflare D1。密碼由 Better Auth 雜湊保存，登入工作階段存於資料庫並使用 HttpOnly cookie；重新整理後會透過 /api/session 恢復登入，登出會撤銷伺服器工作階段。正式環境由 Void 管理 BETTER_AUTH_SECRET，請持續保留同一個 secret。

- 公開註冊已關閉。登入使用電子郵件與密碼；使用者不能在登入表單指定姓名或角色。
- 一般使用者（user）可查看所有課程專案；專案 loader 使用 requireAuth，未登入導回首頁登入。
- 管理者（admin）可透過導覽列的「管理模式」進入 /admin，內含「專案管理」與「帳號管理」兩個區塊，各自提供「新增」與「檢視」分頁。檢視分頁列出所有資料並支援搜尋、編輯與刪除。管理頁與 Better Auth 管理 API 分別檢查權限；隱藏連結不是安全邊界。
- 在「帳號管理 → 檢視 → 編輯」可修改姓名、電子郵件、角色或密碼。
- 停止編輯約 0.75 秒後，工作區會自動將 README.md、完整 C4 模型與 Repo 網址一併存入 D1。每位學生在每個專案各有一份作業，首次進入時 README.md、C4 模型與 Repo 網址皆為空白。看到「已儲存至你的帳號」後即可離開，下次登入會載回個人內容。GitHub Token 僅存於當次畫面的記憶體。

### 本機啟動

本機 Cloudflare 帳號設定可參考 `cloudflare.env.example`，Void 會從根目錄的 `.env` 載入設定。

執行 pnpm install --frozen-lockfile、pnpm exec void prepare、pnpm exec void db migrate，再執行 pnpm dev。db/migrations/ 內包含完整的驗證資料表 SQL 與 metadata。不要用 void db seed 初始化現有帳號資料，該指令會重設本機資料庫。

### 第一個管理者

第一次啟動沒有預設帳號或預設密碼。在自己的終端機設定 ADMIN_EMAIL、ADMIN_PASSWORD（8–16 字元）與選填 ADMIN_NAME，執行：

```sh
node scripts/prepare-admin.mjs
pnpm exec void db execute --file .void/bootstrap-admin.sql
```

工具只產生含雜湊密碼的 SQL，不會自行修改資料庫。套用後刪除 .void/bootstrap-admin.sql，並清除上述環境變數。電子郵件必須尚未存在；不要重複套用同一份 SQL。登入後可在「帳號管理」建立其他帳號。請透過安全管道交付初始密碼。

正式環境先部署 migration，再由具備 Cloudflare 資料庫管理權限的人員以 pnpm exec void db execute --remote --file .void/bootstrap-admin.sql 建立第一個管理者。部署與正式帳號建立不會在本機測試時自動執行。

### 驗證

啟動本機開發伺服器後，執行 `pnpm exec node scripts/test-personal-workspace.mjs` 可驗證個人工作區。測試預設使用連接埠 5173，可透過 `WORKSPACE_TEST_PORT` 指定。它會建立兩個臨時一般帳號，驗證資料隔離、重新登入、大型 C4 模型及同時儲存，並在結束時清除測試帳號與其資料。

pnpm check、pnpm test 與 pnpm build 檢查程式、單元測試與 Worker 建置。scripts/test-auth.mjs 是本機整合測試，固定連線 127.0.0.1:5177，需先用上述工具建立一次性 ADMIN_EMAIL / ADMIN_PASSWORD 測試帳號；會建立 student- 前綴的測試使用者。測試後刪除兩個測試帳號。涵蓋禁止註冊、錯誤密碼、工作階段、HttpOnly cookie、專案保護、管理者建立帳號、學生越權、跨來源請求與登出撤銷。

## 多國語言

登入頁與導覽列提供自動、English 與繁體中文 選單；自動模式依瀏覽器語言選擇，無支援語言時使用英文。語言偏好儲存於 `localStorage` 的 `codepulse.languagePreference`。

翻譯集中於 `src/modules/i18n/`：`ui.ts` 為介面、`courses.ts` 為專案題庫、`runtime.ts` 為分析與系統提示，各自置於 `en/` 與 `zh-TW/` 語言資料夾。元件使用語意化 key，例如 `useI18n().t('auth.title')`；帶參數的文案使用 `t('home.projectCount', { count: projects.length })`。英文與繁體中文文案只存放於語系檔，不作為查找鍵。

`MessageKey` 由英文語系檔推導，`t()` 會在編譯時拒絕不存在的 key 或直接傳入的文本；繁體中文語系檔透過 `satisfies` 檢查 key 是否完整對應英文。新增文案時，請在對應分類的兩個語系檔加入相同 key，並維持插值參數一致。內建專案的名稱、摘要與 Markdown 題目使用各語系的翻譯。

切換語言會更新內建題目與介面文字，學生已撰寫的 README.md、C4 模型與 Repo 網址會保留原樣。

測試涵蓋語言判定、翻譯參數、專案路徑、草稿保留、首頁專案列表、各畫面渲染，以及 C4 節點行為。

## 管理模式與新增專案

管理員在「管理模式 → 專案管理」可填寫專案名稱、唯一代碼、摘要、截止時間（台北時間，選填）、配分、標籤、Markdown 專案內容與附加文件。附件最多 8 個，合計 5 MiB。學生開啟專案時會先看到「題目」，可閱讀內容並下載附件，再到「設計架構」編輯 README.md、C4 模型，到「Repo」填寫自己的倉庫網址。

GET /api/projects 只允許登入者讀取完整專案列表（內建題庫、覆寫版本與新增專案，排除已刪除項目）；POST /api/projects 只允許管理員且需同來源 Origin。伺服器驗證欄位、拒絕既有題庫代碼，並以資料庫唯一約束避免重複代碼。新專案沿用 /projects/:id 路由。

新增 migration 後執行 pnpm exec void db migrate 更新本機資料庫。scripts/test-auth.mjs 現在會建立一個暫存測試專案；清理測試資料時，先依測試管理員的 user.id 刪除 course_project.created_by 對應資料，再刪除測試帳號。

### 檢視、編輯與刪除

專案列表合併所有內建題庫與 D1 新增專案。編輯內建題庫會儲存 D1 覆寫版本，保留原 ID 與學生的個人作業；刪除會記錄 removed_project，避免題庫在重新載入後復活。刪除後首頁不再列出，專案網址回傳 404。編輯後的專案內容使用管理員儲存時的語言，未修改題庫仍隨語言切換。內建題庫的原始代碼保留給原專案，不能由其他專案重用。

編輯帳號時，按「修改密碼」可開啟獨立視窗。輸入該帳號的原密碼及 8–16 個字元的新密碼，再按「儲存新密碼」。既有超過 16 個字元的密碼仍可用於登入及驗證。姓名、電子郵件與角色由編輯畫面的「儲存修改」另行儲存。

帳號列表只回傳 ID、姓名、電子郵件、角色與停權狀態。儲存帳號資料或密碼後會撤銷該帳號所有工作階段。變更電子郵件也會重設驗證狀態。刪除帳號會一併清除其憑證與工作階段。禁止自我刪除與自我降權，資料庫修改條件同時檢查操作者仍是管理員及其他可用管理員存在，避免並行操作造成失去管理員。原 Better Auth 的 update-user、set-user-password、set-role、remove-user、ban-user 管理端點已停用。帳號資料由 `/api/admin/accounts/:id` 更新，密碼由 `/api/admin/accounts/:id/password` 更新。

專案與帳號刪除都先顯示名稱與不可復原提示，確認後才送出 DELETE；所有修改 API 檢查管理員角色及同來源 Origin。請先套用最新 migration，再部署。安裝後 prepare 會產生 Void 的驗證資料表型別。
