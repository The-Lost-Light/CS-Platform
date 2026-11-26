# 課程作業平台測試清冊

**最近同步**　2026-11-27 已核對 C4 虛線框直接縮放、點擊清除編輯狀態及建立節點的手勢衝突，並新增八個縮放區域的回歸案例。本次 Vite+ 全部 24 檔、160 案通過，兩支本機 HTTP 整合腳本未執行。

`tests/` 共 30 個檔案。Vite+ 收集其中 24 個測試檔，實際登錄 **160 個案例**。另有 2 支以 HTTP 連本機服務的整合腳本，以及 4 個提供資料／資料庫的 fixture。本文逐一列出可獨立執行的具名案例。兩支腳本從頭執行到尾，另依斷言順序列出情境。架構與功能對照見 [Architecture.md](Architecture.md)。

| 範圍 | 檔案 | 案例與本次驗證 |
| --- | ---: | --- |
| `tests/*.test.ts`、`tests/*.test.tsx` | 15 | 102 案，通過。涵蓋模組邊界、驗證、資料庫、服務、領域模型與跨畫面行為。 |
| `tests/modules/**/*.test.*` | 9 | 58 案，通過。涵蓋帳號、管理、設定、C4 編輯器、倉庫與工作區。 |
| `tests/integration/*.mjs` | 2 | 已逐段核對原始碼，未執行完整本機 HTTP 流程。工作區腳本的建帳 SQL 與 migration 不相容，已獨立驗證，詳見下方。 |
| `tests/fixtures/*.ts` | 4 | 支援測試的輸入與 SQLite 工廠，未登錄獨立案例。 |

**執行方式。** 在專案根目錄安裝鎖檔依賴並完成 `pnpm run Prepare` 後，可用以下指令。`vite.config.ts` 指定 Node 環境與 `tests/**/*.test.{ts,tsx}`。測試使用 `vite-plus/test`。最近一次記錄的 `vp test run` 結果為 **24/24 檔、160/160 案通過**。UI 案例主要檢查 React 靜態輸出，部分直接呼叫事件 handler。SQLite 查詢計畫使用記憶體資料庫，GitHub 服務使用可控的 HTTP 回應。

```sh
pnpm exec vp test run
pnpm run Test:watch
pnpm exec vp test run tests/modules/workspace/saveQueue.test.tsx
```

每列保留執行器中的原始英文名稱與繁中斷言說明。點選案名可開啟原檔的測試定義。同一迴圈展開的七個翻譯測試會指向同一行。

## 查閱索引

| 功能群組 | 測試檔 | 具名案例 |
| --- | ---: | ---: |
| [跨模組、登入與帳號](#group-1) | 5 | 29 |
| [專案、期限與資料庫](#group-2) | 5 | 16 |
| [個人工作區與儲存](#group-3) | 4 | 21 |
| [C4 模型與畫布](#group-4) | 5 | 36 |
| [GitHub 服務與瀏覽介面](#group-5) | 2 | 29 |
| [語系、設定與共用元件](#group-6) | 3 | 29 |

另見[本機 HTTP 整合腳本](#local)與[共用測試資料](#fixtures)。

<a id="group-1"></a>

## 跨模組、登入與帳號

### 模組邊界（3 案）

從磁碟讀取 TypeScript 原始碼，以 tsconfig 別名、相對路徑與 index 檔解析匯入圖。範圍含 src、pages、routes、server、db、tests 與 auth.ts。 [tests/architecture.test.tsx](tests/architecture.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [cross-feature imports use the public index, including route handlers and type imports](tests/architecture.test.tsx#L54) | 逐一確認前後端功能目錄有公開 index.ts。比對每條跨功能依賴（含路由、型別與 mock）。同模組的 tests/modules 可直接引用被測實作。 |
| 2 | [shared utilities, domain rules and client features respect their layers](tests/architecture.test.tsx#L71) | 檢查 shared 的內部依賴只能指回 shared、前端不能引用 server／D1、功能模組不能依賴 app。model 不得引用 UI、hooks、services 或 React，並檢查 React Flow 例外及服務層方向。 |
| 3 | [files and features have no dependency cycles, including type imports](tests/architecture.test.tsx#L106) | 分別走訪檔案圖及壓縮後的功能模組圖，追蹤當前遞迴路徑，兩者皆須無循環，型別引用也計入。 |

### 登入與建帳（6 案）

先以伺服器端靜態渲染檢查 AuthProvider／AuthGate，再將專案的 auth.ts 配置傳給真正的 Better Auth instance，在程序內呼叫 HTTP handler 或 API。 [tests/auth.test.tsx](tests/auth.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [authentication starts signed out and can render without browser storage](tests/auth.test.tsx#L30) | 注入測試身分服務，在沒有瀏覽器儲存空間的環境渲染 SessionStatus，初始狀態應為登出。 |
| 2 | [using authentication outside its provider reports the missing boundary](tests/auth.test.tsx#L41) | 在 Provider 外渲染使用 useAuth 的元件，應拋出指明缺少 AuthProvider 的錯誤。 |
| 3 | [AuthGate initially presents login and hides authenticated navigation and dashboard](tests/auth.test.tsx#L45) | 初始 AuthGate 顯示平台標題、簡介與登入表單。首頁、登出、已登入版面的 header／main 及舊品牌文案均不出現。 |
| 4 | [Better Auth disables built-in account mutation and unused admin endpoints](tests/auth.test.tsx#L86) | 逐一檢查內建個人資料、密碼、信箱、刪帳及 callback，管理員改帳、設密碼、角色、移除、停復權、冒用、帳號／session 查詢與撤銷、權限查詢等停用路徑皆回 404（含部分尾斜線變體）。登入、登出、get-session、建帳仍在允許路徑，健康端點回 200。 |
| 5 | [POST /api/auth/admin/create-user rejects missing passwords, invalid fields, and data injection](tests/auth.test.tsx#L135) | 對建帳 handler 傳入欄位缺漏、型別錯、長度不符、無效角色或多餘欄位（含 data、id、驗證與停權標記等），皆回 400。合法的一般／管理員輸入可通過驗證，無 session 時回 401。 |
| 6 | [createUser API normalizes name/email, stores credentials, and rejects invalid payloads](tests/auth.test.tsx#L219) | 直接呼叫 createUser，姓名去空白、信箱去空白並轉小寫、保留 user 角色及未驗證狀態，隨後用密碼登入同一 ID。將帳號標記 deleted 後登入拋 APIError。無密碼、附加 data、不合法角色及空白姓名各得 400。 |

### 密碼儲存與角色規則（5 案）

模擬 void/db 的讀取與 batch，以及密碼驗證器。檢查傳回值、hash／verify 呼叫次數與更新條件。 [tests/accountPassword.test.ts](tests/accountPassword.test.ts)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [admin resetting a student password skips currentPassword and guards role in batch update](tests/accountPassword.test.ts#L109) | 管理員重設另一位學生的密碼，role 為 user 或 null 都成功。verify 呼叫 0 次、hash 1 次，執行 batch，SQL 更新條件仍要求目標為非管理員。 |
| 2 | [admin resetting a student password rejects supplied currentPassword and handles conflicts](tests/accountPassword.test.ts#L131) | 重設學生時多送 currentPassword 得 invalid，缺少目標 credential／hash 得 conflict，這兩者皆不執行 batch。更新比對後影響零列亦得 conflict。 |
| 3 | [admin changing another admin password requires and verifies currentPassword](tests/accountPassword.test.ts#L166) | 改另一位管理員的密碼時，缺舊密碼直接拒絕，錯誤舊密碼進入 verify 後拒絕。通過驗證可成功更新，SQL 不套用學生限定條件。 |
| 4 | [self password changes require currentPassword for both admin and student targets](tests/accountPassword.test.ts#L209) | 學生與管理員改自己的密碼分別驗證缺舊密碼、舊密碼不符及驗證成功的路徑，確認不會套用管理員重設學生的免驗證流程。 |
| 5 | [missing target user and invalid password lengths are rejected](tests/accountPassword.test.ts#L252) | 新密碼長度 7 或 17 回 invalid。使用合法長度但查無目標帳號時回 notFound。 |

### 帳號密碼對話框（4 案）

以靜態 HTML 及攔截子元件 props 的方式核對密碼欄位與呼叫端政策。 [tests/modules/accounts/changeAccountPassword.test.tsx](tests/modules/accounts/changeAccountPassword.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [ChangeAccountPassword omits currentPassword when requireCurrentPassword is false](tests/modules/accounts/changeAccountPassword.test.tsx#L29) | 管理員重設學生時，對話框只有必填新密碼與目標帳號說明，不產生 currentPassword 欄位。 |
| 2 | [ChangeAccountPassword requires currentPassword for self and another admin](tests/modules/accounts/changeAccountPassword.test.tsx#L50) | 編輯自己及另一位管理員時均顯示必填舊／新密碼，說明文字隨操作對象而變。 |
| 3 | [EditAccountDialog sets requireCurrentPassword only for self or admin targets](tests/modules/accounts/changeAccountPassword.test.tsx#L73) | 將不同角色與本人／他人情境傳給 EditAccountDialog，檢查子對話框得到的 isSelf、requireCurrentPassword 與預期矩陣一致。 |
| 4 | [ChangeAccountPassword renders password updated notice as a TransientNotice instead of a banner](tests/modules/accounts/changeAccountPassword.test.tsx#L120) | 待機無成功狀態訊息，已更新時以可讀的 role=status 成功 chip 呈現，並檢查成功邊框與文案。 |

### 管理介面（11 案）

以管理員／學生、不同清單長度、對話框及成功／失敗狀態渲染畫面，檢查 HTML 與顯示順序。 [tests/modules/admin/admin.test.tsx](tests/modules/admin/admin.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [only administrators have a management navigation entry on the home dashboard card](tests/modules/admin/admin.test.tsx#L37) | 僅管理員的首頁有 /admin。管理入口、設定與登出的相對順序正確，首頁不直接展開帳號管理。 |
| 2 | [each management list has an Add button in its header](tests/modules/admin/admin.test.tsx#L60) | 管理頁包含兩個管理區及返回首頁連結，清單標頭提供新增與搜尋。初始畫面未展開表單或額外檢視按鈕。 |
| 3 | [project creation opens in a cancellable dialog and constrains inputs](tests/modules/admin/admin.test.tsx#L85) | 新增專案開啟可取消的對話框，具必填標題、台北 datetime-local、Markdown、附件及配分 0–10,000。排除手填序號或學生初始作答欄。 |
| 4 | [project editor prepopulates the selected project and preserves its identifier](tests/modules/admin/admin.test.tsx#L108) | 編輯帶入正確標題與儲存／取消控制，原始 ID、排序與已淘汰欄位不成為可編輯輸入。 |
| 5 | [ProjectList renders the Index header, drag handles, and sequential index badges](tests/modules/admin/admin.test.tsx#L125) | 專案清單依原序號顯示 1、2 及拖曳把手，名稱不重排。只剩一筆時停用拖曳。 |
| 6 | [ProjectList renders create and save notices as a status chip before the Add button](tests/modules/admin/admin.test.tsx#L157) | 專案清單的新增／儲存成功各在新增按鈕前顯示正確 status chip，待機則不顯示。 |
| 7 | [AccountList renders create and save notices as a status chip before the Add button](tests/modules/admin/admin.test.tsx#L193) | 帳號清單同樣分別測試新增與編輯成功的文案、標頭位置、成功樣式，以及待機無提示。 |
| 8 | [deletion confirmation uses a modal alertdialog matching edit dialogs and explains retention](tests/modules/admin/admin.test.tsx#L228) | 帳號及專案的危險操作均使用具名 alertdialog。檢查 session 撤銷、帳號／作業保留文案、取消／刪除按鈕及送出失敗提示。 |
| 9 | [account creation places password help directly beneath password input before role](tests/modules/admin/admin.test.tsx#L272) | 新增帳號的密碼說明位於密碼欄與角色欄之間，aria-describedby 指到對應說明元素。 |
| 10 | [account editor has a password action in the header and role controls for administrators](tests/modules/admin/admin.test.tsx#L294) | 編輯帳號預填信箱與姓名，標頭可開改密碼。管理模式顯示角色控制，編輯管理員自己時停用學生選項。 |
| 11 | [only administrators see the Student projects entry for each project on HomeDashboard](tests/modules/admin/admin.test.tsx#L325) | 針對同一首頁專案，只有管理員可見學生專案控制與標籤，位置在導覽箭頭之前。 |

<a id="group-2"></a>

## 專案、期限與資料庫

### 專案欄位與附件輸入（4 案）

直接呼叫共用的 parseProjectInput，再用 FormData 與 Request 驗證後端讀取流程。 [tests/projectInput.test.tsx](tests/projectInput.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [project creation normalizes fields and preserves Markdown without accepting student data or supplied IDs](tests/projectInput.test.tsx#L11) | 合法題目去除標題兩端空白，保留 Markdown 縮排與最後換行。回傳的可寫欄位排除外部供應的 ID、序號、建立者、舊欄位、初始學生 README 與 Repo。 |
| 2 | [invalid project input cannot reach storage](tests/projectInput.test.tsx#L35) | 空白標題、不存在的日期、24:00、負分、非整數或字串配分、非文字或逾 40,000 的內容，以及非合法物件結構均回 null。 |
| 3 | [optional project fields can remain empty](tests/projectInput.test.tsx#L50) | 截止日與題目說明可同時留空，仍產生合法專案輸入並保留空字串內容。 |
| 4 | [project edits enforce the attachment limits across retained files and new uploads](tests/projectInput.test.tsx#L60) | 從已佔 5 MiB 減 1 byte 的保留檔出發，加 1 byte 及空檔至數量上限可接受。多 1 byte 或使總數超過 8 則拒絕。 |

### 台北截止時間（3 案）

以固定 epoch 和明確 +08:00 日期驗證，避免測試依賴執行機所在時區。 [tests/projectDeadline.test.tsx](tests/projectDeadline.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [parseProjectDueDate validates Taipei calendar dates and rejects invalid inputs](tests/projectDeadline.test.tsx#L14) | 有效的台北時間換算為相同 epoch。空字串、2 月 30 日及使用 T 分隔的儲存格式輸入均回 null。 |
| 2 | [deadline state helpers classify open, dueSoon, overdue, and empty deadlines](tests/projectDeadline.test.tsx#L24) | 以截止前 48 小時的前 1 ms、剛進入 48 小時、截止當下與之後 1 ms 檢查 open、dueSoon、overdue。空期限為 none 且未逾期。 |
| 3 | [isWorkspaceLate and Taipei formatters handle null and valid timestamps](tests/projectDeadline.test.tsx#L37) | 無儲存時間、無期限或剛好在期限均不算遲交，晚 1 ms 才算。核對台北顯示字串、datetime-local 值與含 +08:00 的 ISO 形式。 |

### 唯一性錯誤辨識（1 案）

聚焦於 server/errors.ts 的資料庫錯誤分類。 [tests/projectCatalog.test.tsx](tests/projectCatalog.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [unique constraint errors are detected through wrapped database causes](tests/projectCatalog.test.tsx#L4) | 用外層查詢錯誤包住內層 SQLite UNIQUE constraint failed，應辨識為唯一性衝突。連線錯誤與普通物件均回 false。 |

### Migration、索引與資料保留（4 案）

以 PRAGMA、EXPLAIN QUERY PLAN 及實際查詢結果交叉檢查 migration 產生的 SQLite 結構。 [tests/databaseIndexes.test.ts](tests/databaseIndexes.test.ts)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [migrations create expected FK and sort/filter indexes cleanly](tests/databaseIndexes.test.ts#L93) | foreign_key_check 為空。逐欄比對工作區 user_id、有效正序號的部分唯一索引、專案排序、附件涵蓋索引及兩個 user 索引。舊的全域專案序號唯一索引不應存在。 |
| 2 | [partial active index allows atomic reorders while keeping soft-deleted records](tests/databaseIndexes.test.ts#L145) | 已軟刪除專案可共用序號 0，有效正序號重複會觸發 UNIQUE。先清零再交換有效專案順序，最終為 1、2，兩筆刪除記錄仍為 0。 |
| 3 | [soft-deleting a user uses user_role_banned_deleted_idx and preserves account and workspace rows](tests/databaseIndexes.test.ts#L220) | 在可用管理員條件下執行軟刪除，計畫使用角色／停權／刪除索引。只有目標 session 被撤銷，user 標記刪除，account、工作區與分段以及另一位使用者的 session 仍在，外鍵一致。 |
| 4 | [listProjects and listAccounts use sort/deleted indexes without TEMP B-TREE](tests/databaseIndexes.test.ts#L310) | 擷取 listProjects 與 listAccounts 的實際清單查詢，在 SQLite 驗證排序與過濾結果及索引名稱。兩者均不需暫存 B-tree 排序。 |

### 教材附件與查詢計畫（4 案）

使用套用 migration 的記憶體 SQLite，配合模擬 void/db 擷取儲存層組成的查詢、批次與 SQLite 查詢計畫。 [tests/projectAttachments.test.ts](tests/projectAttachments.test.ts)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [project attachment tables enforce cascade deletes for attachment and project removal](tests/projectAttachments.test.ts#L195) | 核對分段表的四個欄位。實體刪除單一附件及整個專案，分別驗證複合外鍵與專案外鍵的級聯清除範圍。 |
| 2 | [listProjects reads attachment metadata via the covering index on project_attachment](tests/projectAttachments.test.ts#L229) | listProjects 僅發出兩個 SELECT。附件從涵蓋索引取中繼資料、按專案和名稱排序。比對跨專案分組、空清單及刪除資料的可見性，目錄不取分段內容。 |
| 3 | [saveProject soft-deletes omitted attachments, writes chunks separately, and reads back via covering index seek](tests/projectAttachments.test.ts#L312) | 編修專案時省略的舊檔標為 deleted。大檔產生一筆中繼資料及兩筆 part，空檔只產生中繼資料。檢查 part 無冗餘檔名／大小、project index 及指定專案回讀的涵蓋索引搜尋。 |
| 4 | [downloadProjectAttachment uses PK left join and hides soft-deleted attachments and projects](tests/projectAttachments.test.ts#L442) | 下載多段內容應按 part 還原，零長度檔也有成功回應與下載標頭。已刪附件／專案及不存在的附件回 null。查詢計畫核對主鍵搜尋及 LEFT JOIN。 |

<a id="group-3"></a>

## 個人工作區與儲存

### 工作區輸入驗證（4 案）

以合法草稿為基礎，變動 repoUrl、README、模型及 HTTP 本文邊界。 [tests/workspaceInput.test.tsx](tests/workspaceInput.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [readWorkspaceInput accepts empty and parseGitHubRepoUrl-compatible repository URLs](tests/workspaceInput.test.tsx#L28) | 空 Repo、去除前後空白的簡寫、GitHub 網址及子路徑均可接受。回讀 draft.repoUrl 應等於期待的字串。 |
| 2 | [readWorkspaceInput rejects repository URLs not accepted by parseGitHubRepoUrl](tests/workspaceInput.test.tsx#L45) | 缺 repo、其他網域 URL、點路徑、帶 query／fragment、內含空白或超長輸入回 {ok:false,error:"repo"}。 |
| 3 | [workspace repository URL helpers ignore incomplete or invalid edits](tests/workspaceInput.test.tsx#L68) | 驗證前端 URL helper：尚未輸完、無效或超過 300 個字元時保留 fallback，合法子路徑去空白，清空輸入可明確移除原網址。 |
| 4 | [readWorkspaceInput enforces designDoc and C4 size limits while keeping 413 for oversized payloads](tests/workspaceInput.test.tsx#L97) | README 長度 100,000 可通過，多 1 拒絕。節點、關係數量超限或節點描述／關係標籤過長回 invalid。整體 body 超過 6 MiB 回 tooLarge，供路由映射 413。 |

### 工作區分段與原子寫入（5 案）

直接測試字串切段，並以 mock D1 batch 檢查交易內的語句、順序與錯誤歸類。 [tests/workspaceStore.test.tsx](tests/workspaceStore.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [splitWorkspaceContent handles empty, small, and invalid maxBytes values](tests/workspaceStore.test.tsx#L56) | 空字串與短字串分別為一段。以無效 maxBytes（含非整數或小於 4）呼叫，應拋出 RangeError。 |
| 2 | [splitWorkspaceContent respects UTF-8 byte bounds without splitting surrogate pairs](tests/workspaceStore.test.tsx#L64) | 對混合 UTF-8 長度與代理對的字串切段，檢查每段位元組上限、無拆開的成對代理碼、重組完全一致。孤立代理碼也符合位元組限制。 |
| 3 | [splitWorkspaceContent chunks >1.2 MB CJK text below WORKSPACE_PART_MAX_BYTES](tests/workspaceStore.test.tsx#L100) | 以超過 1.2 MB 的中日韓文字迫使切出至少四段，每段不超過 WORKSPACE_PART_MAX_BYTES，串接後等於輸入。 |
| 4 | [saveWorkspace emits separate single-row part inserts bounded by UTF-8 bytes inside db.batch](tests/workspaceStore.test.tsx#L110) | saveWorkspace 只呼叫一次 batch，依序刪除前版、插入新版及多筆單列分段。所有 part 共用回傳 revision，編號連續，UTF-8 長度合規，解析重組內容等於原草稿。 |
| 5 | [saveWorkspace maps unique violations to conflict and missing project errors to missing](tests/workspaceStore.test.tsx#L168) | 模擬唯一約束失敗應回 conflict。模擬寫入例外且專案已不存在應回 missing。 |

### 自動儲存排程（2 案）

使用假時鐘、受控寫入 Promise 與 mock 回呼，刻意交錯編輯、回應及卸載。 [tests/modules/workspace/saveQueue.test.tsx](tests/modules/workspace/saveQueue.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [autosave debounces edits and flushes the newest draft after an in-flight write on unmount](tests/modules/workspace/saveQueue.test.tsx#L13) | 短時間連續更新先合併，1 秒後以 null 前版寫入。在該筆未完成時再編輯並卸載，第一筆成功後用其新 revision 補寫最新草稿。最後無待存資料，卸載後不呼叫畫面成功回呼。 |
| 2 | [transient failures retry while conflicts and deadline locks stop later writes](tests/modules/workspace/saveQueue.test.tsx#L50) | 可重試的暫時錯誤先顯示 saveError，5 秒後重送。若回 conflict 便停止後續修改與寫入。另測 deadlinePassed，同樣保持終止狀態。 |

### 工作區分頁、名單與唯讀介面（10 案）

以明確的初始分頁、角色、時間、學生快照與篩選條件渲染，另直接檢查名單排序及過濾。 [tests/modules/workspace/designToolbar.test.tsx](tests/modules/workspace/designToolbar.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [Repo tab renders the URL and sync button in the workspace header card when unconfigured](tests/modules/workspace/designToolbar.test.tsx#L21) | 未綁定倉庫的 Repo 分頁在同一張頁首卡包含 URL 欄位及同步按鈕，沒有額外的指標工具提示。 |
| 2 | [Repo header fuses repo overview and language bar once configured, and returns to URL input when edit is triggered](tests/modules/workspace/designToolbar.test.tsx#L36) | 提供已載入的倉庫時，頁首合併頭像、倉庫名稱、四項指標與語言 100.0%。切回編輯狀態重新顯示網址與同步。 |
| 3 | [design tab bar hides file actions outside C4 Model and anchors them on the right when selected](tests/modules/workspace/designToolbar.test.tsx#L81) | 作業說明不出現設計子分頁／檔案按鈕。README 無 JSON 工具。C4 分頁於頁首右側依次顯示匯入、匯出與檔案 input。 |
| 4 | [StudentWorkspaceList prioritizes submitted accounts and links back home](tests/modules/workspace/designToolbar.test.tsx#L145) | 以一位已繳、一位未繳生成雙語名單，檢查總數、已繳比例、台北更新時間、回首頁連結，並確認已交者 Alice 排在 Bob 前面。 |
| 5 | [ProjectWorkspace hides project index badge and displays student name and back-to-list link in readOnly mode](tests/modules/workspace/designToolbar.test.tsx#L200) | 本人及唯讀頁首不顯示專案序號。唯讀顯示學生姓名、回名單、僅匯出。空 README／Repo 有專用提示，已有 Repo 可看但無修改網址動作。 |
| 6 | [student list sorting and filtering handle search, submission states, and overdue status](tests/modules/workspace/designToolbar.test.tsx#L307) | 核對已交優先與姓名／信箱排序，依搜尋、已交、未交和逾期過濾。晚交及過期仍空白依期限規則列入適用集合。 |
| 7 | [StudentWorkspaceList renders search, filter pills, and late/overdue indicators](tests/modules/workspace/designToolbar.test.tsx#L359) | 雙語名單提供有 aria-label 的搜尋及含筆數的四個篩選。測試資料對應全部 2、已交 1、未交 1、逾期 2，晚交與逾期未交標籤有別。 |
| 8 | [AssignmentPanel shows overdue and due-soon badges deterministically](tests/modules/workspace/designToolbar.test.tsx#L412) | 以固定 now 渲染同一作業面板，分別核對即將截止及逾期標籤。 |
| 9 | [ProjectWorkspace locks edits when deadlineLocked and renders student navigation in read-only mode](tests/modules/workspace/designToolbar.test.tsx#L429) | 截止鎖定顯示期限、最後更新、空文件／倉庫文案並移除存檔／匯入介面。另給唯讀學生導覽，顯示晚交、2/3 及含姓名的上一位／下一位按鈕。 |
| 10 | [PersonalProject renders StudentWorkspaceList when initialShowStudentList is set for admin](tests/modules/workspace/designToolbar.test.tsx#L489) | 以管理員身分及 initialShowStudentList 進入 PersonalProject，即使初始學生清單為空仍顯示名單頁標題。 |

<a id="group-4"></a>

## C4 模型與畫布

### C4 階層與幾何規則（10 案）

使用 sampleC4Nodes 及額外構造的節點樹直接檢查領域函式。 [tests/c4.test.tsx](tests/c4.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [new nodes are placed below the full height of resized siblings](tests/c4.test.tsx#L14) | 同層已有手動調高的節點，新節點預設 y 由既有節點下緣計算，範例落在 750。 |
| 2 | [an empty node opens its own boundary and accepts its first child](tests/c4.test.tsx#L22) | 進入尚無孩子的資料庫節點，有自己的空邊界。新增第一個 component 後可在該範圍看到它。 |
| 3 | [new nodes belong to the current scope and infer their C4 level](tests/c4.test.tsx#L39) | 分別在根層、system、container 等範圍建立新節點，檢查 kind、parentId 與可見集合。不存在的範圍及 code 葉節點不可建立子項，person 可有子項。 |
| 4 | [creation preserves the requested position and stops at four levels regardless of kind](tests/c4.test.tsx#L67) | 保留指定的分數、負值座標。四層鏈即使替換其 kind 也不能建立第五層，麵包屑最多含三層父項。 |
| 5 | [drilldown hides enclosing peers by default and keeps them available for manual addition](tests/c4.test.tsx#L88) | 逐層展開只顯示直屬子節點，不重複帶入父層、同層鄰居或其他系統。核對可見節點及父層路徑。 |
| 6 | [missing or deleted scope returns to context without stale boundary or breadcrumbs](tests/c4.test.tsx#L123) | 不存在或已刪除的 scope 回到根視圖，scope 為 undefined、路徑為空，僅列出無父節點的元素。 |
| 7 | [removing a system recursively removes descendants including code elements](tests/c4.test.tsx#L129) | 刪除根系統會遞迴移除所有後代（含 code）。只刪除其中一支時，兄弟分支仍在。 |
| 8 | [nodes moved outside the scope boundary stay in their level and remain explorable](tests/c4.test.tsx#L141) | 節點拖出框線後仍是原 scope 的子節點，仍可展開它和後代，並可在其中新增子節點。 |
| 9 | [boundary movement includes partial overlaps but excludes separated nodes](tests/c4.test.tsx#L153) | 以框內與四邊部分相交、完全分離及單純觸邊的位置檢查重疊判定。只有正面積重疊會隨框一起移動。 |
| 10 | [createC4NodeInScope stops at C4_MAX_NODES](tests/c4.test.tsx#L175) | 499 個節點時可新增最後一個。達 500 節點時建立函式回 undefined。 |

### C4 JSON 檔案契約（7 案）

用模型 fixture 做序列化、剖析及逐欄變異，檢查整張圖的有效性與無損讀寫。 [tests/c4File.test.tsx](tests/c4File.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [import accepts four levels and rejects a fifth regardless of node kinds or order](tests/c4File.test.tsx#L24) | 任意 kind 的四層鏈可接受，五層鏈即使把節點排列反轉仍拋錯。 |
| 2 | [scope boundaries survive export and import](tests/c4File.test.tsx#L35) | 自訂範圍框的位置與尺寸在匯出／匯入後完整保留。非法框線尺寸會遭拒。 |
| 3 | [C4 JSON round trip preserves all levels, positions, metadata and directed relationships](tests/c4File.test.tsx#L44) | 含 BOM 的輸入能讀回完整層級、位置（含小數）、中繼資料及有向邊。空模型亦可來回轉換。 |
| 4 | [C4 import rejects malformed, incompatible and incomplete files](tests/c4File.test.tsx#L56) | 空字串、破損 JSON、錯誤頂層、版本／格式不符、座標型別錯、缺欄位、未知 kind、保留或重複 ID、缺父項、父鏈循環、缺端點、自連、重複邊 ID 均拋錯。 |
| 5 | [import strips unrelated object properties](tests/c4File.test.tsx#L105) | 輸入節點若夾帶 selected 或自訂 data，驗證結果只留下 C4 節點契約內的資料。 |
| 6 | [C4 dimensions survive export and import and omit optional sizes when absent](tests/c4File.test.tsx#L112) | 選填寬高若存在應精確保留，未提供的節點仍省略。0、負數、null、字串以及非有限值均無效。 |
| 7 | [validateC4File enforces node, relationship, and field length limits](tests/c4File.test.tsx#L126) | 分別在節點／關係數量上限及多 1 處驗證。對受限制的節點與關係文字欄位同樣比較恰好最大長度與超長值。 |

### 圖模型復原與重做（3 案）

直接對 reducer 套用編輯與歷史動作，檢查 present、past、future 及物件一致性。 [tests/modules/c4-editor/modelHistory.test.ts](tests/modules/c4-editor/modelHistory.test.ts)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [one undo restores a deleted subtree and its connections, and redo removes both](tests/modules/c4-editor/modelHistory.test.ts#L26) | 刪除子樹時移除相連邊，單次 undo 可還原整張原圖，redo 可再次刪除。無更多歷史時同動作不改狀態。 |
| 2 | [resize updates from the same gesture form one step; a new gesture gets its own step](tests/modules/c4-editor/modelHistory.test.ts#L41) | 同一手勢的多次改寬用共同 group 合併，新手勢建立新步驟。逐步 undo 可回到前一手勢與初始尺寸，再 redo 到後一手勢。 |
| 3 | [a no-op drag preserves redo and a new edge edit clears it](tests/modules/c4-editor/modelHistory.test.ts#L71) | 拖動後 undo，再傳入相同座標的空操作，原 redo 仍在。另行刪除邊會清除 future，節點集合保留。 |

### 畫布事件與座標（8 案）

以 FlowNode 與 NodeChangeset 測試事件分類、模型座標與指標手勢，並以實際 C4Canvas 的靜態輸出核對縮放區域。 [tests/modules/c4-editor/c4Canvas.test.tsx](tests/modules/c4-editor/c4Canvas.test.tsx)

本次另用無頭 Edge 在 C2 畫布逐一驗證四邊與四角。每個位置都顯示對應的縮放游標，可在未點選框的情況下直接拖曳。縮放後子節點維持原位，一次復原與重做可切換前後尺寸。另驗證框內群組拖移、建立節點模式下的框邊縮放、畫布鎖定與解鎖，以及唯讀模式停用縮放。

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [canvas measurements and selection stay local while user resizes persist](tests/modules/c4-editor/c4Canvas.test.tsx#L28) | 測量與選取只改本地節點，不形成已完成位移。使用者調整尺寸才產生可保存的 320 × 240，原模型保持原值。 |
| 2 | [node drags update the canvas immediately and persist only on completion](tests/modules/c4-editor/c4Canvas.test.tsx#L65) | 拖曳中本地座標即時改變，已完成位移清單為空。手勢結束才產生應保存的最終位置。 |
| 3 | [boundary drags keep the original overlapping group and persist its final positions](tests/modules/c4-editor/c4Canvas.test.tsx#L103) | 開始拖框時記錄完全在內及部分相交的節點。中途維持原名單且不改輸入變更集，結束時清除名單並一次輸出整組終點。 |
| 4 | [persisted geometry uses scope coordinates and leaves other levels alone](tests/modules/c4-editor/c4Canvas.test.tsx#L163) | 將 Flow 的位置／大小回寫當前 scope 的邊界與子節點座標，其他層物件與原始 scope 資料保持原值。 |
| 5 | [resizing the boundary from the left leaves nodes in place](tests/modules/c4-editor/c4Canvas.test.tsx#L186) | 從左側調整框大小即使框原點有位移，子節點畫布座標仍與調整前相同。 |
| 6 | [node drawing only starts with left click in creation mode on empty canvas or boundary](tests/modules/c4-editor/c4Canvas.test.tsx#L214) | 建立模式下，在空白畫布或虛線框內按左鍵可開始畫節點。框邊與角落的縮放區、既有節點、控制項、縮圖及選單均不觸發建點。另驗證一般模式與中／右鍵。 |
| 7 | [single left click uses default size while left drag clamps position and minimum size](tests/modules/c4-editor/c4Canvas.test.tsx#L249) | 微小位移採預設大小。向左上拖使用較小 x/y 當左上角且最小 120 × 100，向右下拖足夠距離採實際矩形尺寸。 |
| 8 | [a non-selectable boundary exposes four resize edges and four corners only while draggable](tests/modules/c4-editor/c4Canvas.test.tsx#L268) | 確認框不可選取。可拖曳時直接具備四條框邊和四個角落的縮放區域。停用拖曳後仍顯示框體，八個縮放區域均移除。 |

### C4 工具列與屬性面板（8 案）

以測試用 editor、React Flow 替身與靜態 render 取得事件回呼，直接檢查 UI 狀態轉換。 [tests/modules/c4-editor/c4FileActions.test.tsx](tests/modules/c4-editor/c4FileActions.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [C4FileActions renders import/export controls, hidden file input, and status banners](tests/modules/c4-editor/c4FileActions.test.tsx#L137) | 待機時呈現匯入／匯出與隱藏的 JSON input。匯入成功為 status、錯誤或超限為 alert，檢查雙語標籤。匯入期間兩個按鈕均停用。 |
| 2 | [C4Diagram keeps canvas controls without import/export buttons or file input](tests/modules/c4-editor/c4FileActions.test.tsx#L214) | 圖內只放建立、Undo、Redo、Help 及層級導覽，檔案動作在外層。檢查建立模式的 aria-pressed、Flow 選取／焦點設定及四層麵包屑。 |
| 3 | [only C2 and C3 show node technology in both the inspector and the canvas](tests/modules/c4-editor/c4FileActions.test.tsx#L262) | 逐層檢查節點名稱、職責及技術。C2、C3 才在面板和畫布顯示技術。關係面板顯示兩端名稱與描述，不提供節點欄位或刪除動作。 |
| 4 | [C4Diagram renders a node context menu with Edit and Delete actions](tests/modules/c4-editor/c4FileActions.test.tsx#L310) | 給定節點選單座標與項目，HTML 在指定位置渲染具有 menuitem 角色的編輯與刪除。 |
| 5 | [clicking outside the currently edited node closes the edit inspector while panning keeps it open](tests/modules/c4-editor/c4FileActions.test.tsx#L328) | 平移或點同一節點保留面板，點其他節點或空白處關閉。點虛線框會清除編輯中的節點及連線，並關閉面板與選單。右鍵節點或連線展開對應選單。 |
| 6 | [read-only C4Diagram hides editing toolbar actions, context menu, and inspector](tests/modules/c4-editor/c4FileActions.test.tsx#L535) | 唯讀空圖仍有層級、說明與空態。已有選取或右鍵目標時，建立、復原、重做、屬性面板及選單皆隱藏。在 C2 點虛線框不會觸發選取。 |
| 7 | [editor UI enforces maxLength attributes and disables Create node at C4_MAX_NODES](tests/modules/c4-editor/c4FileActions.test.tsx#L568) | 節點名稱／職責／技術、關係描述及 README 輸入都套用相應 maxLength。節點達上限時建立按鈕停用。 |
| 8 | [creating a node or connection opens C4Inspector for the new element](tests/modules/c4-editor/c4FileActions.test.tsx#L624) | 測試容器建立節點及建立連線後直接讀面板，新節點顯示預設名稱，新邊顯示兩端及預設 Uses，選取對象正確。 |

<a id="group-5"></a>

## GitHub 服務與瀏覽介面

### GitHub 服務、API 與快取（20 案）

透過可注入的 fetch、模擬 session／env、範例倉庫與真正的路由函式檢查服務。所有上游回應由測試提供，可斷言請求次數、參數、標頭及快取命中。 [tests/githubService.test.tsx](tests/githubService.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [the dashboard uses the authenticated course API and only the server supplies credentials](tests/githubService.test.tsx#L54) | 從瀏覽器 loader 經平台 API 到模擬 GitHub。檢查瀏覽器只送平台查詢，只有伺服器附 Bearer token。回應 private, no-store 且不含測試憑證。未登入或缺少 token 時不向上游讀取，授權後回正確分支與樹。 |
| 2 | [repository URL parsing retains supported URL and shorthand forms](tests/githubService.test.tsx#L105) | 標準 URL、www、.git、尾斜線、簡寫及子路徑均取得相同 owner/repo。缺 repo、其他網域、點路徑、編碼斜線、空白、query、fragment 及超長字串無效。 |
| 3 | [the server keeps authenticated redirects on the GitHub API origin](tests/githubService.test.tsx#L140) | 對模擬上游的跨來源 302，傳輸須為 manual redirect，只對原 API 發一次請求，服務以 502 拒絕。 |
| 4 | [invalid input has a translation key and performs no I/O](tests/githubService.test.tsx#L151) | 對無效倉庫字串要求回 github.errors.invalidUrl。測試傳輸一旦被呼叫即判失敗。 |
| 5 | [former teaching repository uses the GitHub API](tests/githubService.test.tsx#L162) | 對曾用作教學的 student-team/course-oj-platform，斷言實際組出對應 GitHub API 路徑，模擬 404 會得到 notFound。 |
| 6 | [live loading preserves headers, branch encoding, rate limits, full file tree and total commits without eager diff requests](tests/githubService.test.tsx#L176) | 初始同步保留認證及 API 標頭、編碼含斜線與空格的分支，讀遞迴樹、配額和提交摘要。不提早抓 diff。含分頁連結時讀得 27 筆提交的總數，回應保留 300 個樹項目。 |
| 7 | [commit detail failures report diffError without looping across pages](tests/githubService.test.tsx#L272) | 提交詳情失敗回原 SHA 與 diffError，不帶 files。再以成功資料比對 stats、files 與分頁訊號，避免函式自行追完所有頁。 |
| 8 | [commit detail pagination fetches one page by default and loads more pages on demand](tests/githubService.test.tsx#L307) | 預設只呼叫每頁 100 檔的第一頁。第一頁保留 stats 且有 hasMoreFiles。明確查第二頁才新增一次請求，末頁無更多標記。 |
| 9 | [server commit pagination and client commit detail caching work through the API route](tests/githubService.test.tsx#L362) | 透過 route 驗證提交續頁的數量與 hasMore。用戶端重讀已成功的相同 SHA／頁不增加傳輸次數，不快取失敗。第二頁內容可獨立快取。 |
| 10 | [branch history keeps the first page and estimates the total when the count request fails](tests/githubService.test.tsx#L445) | 第一頁成功但以每頁 1 筆查總數失敗，保留該頁所有提交，依末頁提示估出總數 21。 |
| 11 | [secondary endpoint failures yield empty sections without replacing live metadata](tests/githubService.test.tsx#L464) | 模擬次要 API 失敗，仍顯示真實倉庫 metadata 與 live-api 來源。分支／tag 為零，缺 PR 精確數時沿用 issues 原始值，語言等區段回空值。 |
| 12 | [branch-only snapshots fetch only commits and file tree through the API route](tests/githubService.test.tsx#L491) | 透過 scope=branch 只讀該分支的歷史與樹，有分頁時才加計數請求（例為 23）。空分支、不支援的 scope 或缺必要分支得到輸入錯誤。 |
| 13 | [repository metrics subtract open PRs from open issues and resolve exact paginated counts](tests/githubService.test.tsx#L598) | 五組統計分支涵蓋 PR 全數占用 issues、10 減 2 得 8、跨頁分支／tag／PR 精確數 100／64／45、PR 計數失敗及缺 last 連結。後兩者均不從 120 扣掉不確定的 PR 數。 |
| 14 | [branch list pagination works through the API route](tests/githubService.test.tsx#L743) | 分支每頁 30 筆，是否有下一頁取決於 Link（滿 30 也可為末頁）。用戶端能讀 5 筆的尾頁。頁碼 0 或缺必要 page 會遭拒。 |
| 15 | [switching branches rejects a failed tree or history request](tests/githubService.test.tsx#L806) | 指定分支時，分開令提交或樹回 404。任一失敗都使整次切換回 notFound。 |
| 16 | [HTTP and transport errors propagate without substituting repository data](tests/githubService.test.tsx#L824) | 對常見及未知倉庫模擬 403、404、429、500 及離線例外。404／429 保持對應狀態，其餘測試 HTTP 錯誤變 502，傳輸例外保留 offline。 |
| 17 | [private and internal repositories are rejected before secondary fetches and negative-cached across sub-endpoints](tests/githubService.test.tsx#L843) | private 及 internal 的主查詢在 metadata 後被拒絕，後續的分支、提交等子查詢共用負向快取。另檢查帶廣泛 OAuth scope 時確認可見性，以及僅讀公開內容時的請求數。 |
| 18 | [server ETag conditional caching handles 304 Not Modified while preserving Link pagination and updating rate limits](tests/githubService.test.tsx#L959) | 首次回應保存 ETag。第二次送 If-None-Match 遇 304，保留舊本文與分頁 Link（總提交仍為 27），合併新配額 4998/5000。 |
| 19 | [server commit detail cache shares immutable SHA responses across users and singleflight coalesces concurrent repo loads](tests/githubService.test.tsx#L1048) | 兩位登入者取同一不可變 SHA 只需一次上游查詢，失敗後可重新取得正常資料。同時發出相同倉庫查詢，六個上游路徑各只呼叫一次。 |
| 20 | [per-user rate limiter and concurrency limiter protect GET /api/github/repository without affecting other users](tests/githubService.test.tsx#L1120) | 以可控時鐘驗證滑動視窗、並行額度、釋放與等待秒數。路由超額回 429 和 Retry-After，無新增上游呼叫，其他帳號可使用。無效參數仍回 400，第七個同時請求被擋，釋放後恢復。 |

### 倉庫儀表板與 Diff（9 案）

以 RepoBundle、模擬上游及靜態渲染核對由分支到檔案樹、提交、patch 的呈現。 [tests/modules/repository/repoDiff.test.tsx](tests/modules/repository/repoDiff.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [split diff pairs replacements and pads unequal changes within each hunk](tests/modules/repository/repoDiff.test.tsx#L19) | 以含替換、增刪數量不等及 hunk 分隔的 patch 建左右欄。替換依序配對，短側補空，空 patch 回空陣列。 |
| 2 | [a selected branch supplies the dashboard tree, history and on-demand diff modes](tests/modules/repository/repoDiff.test.tsx#L35) | feature/dashboard 分支驅動樹及提交，核對 260 項仍可搜尋末筆。摘要不含 files，展開後可用 unified、split 顯示檔名、增刪數與正確程式碼。檢查未展開、細節載入中、有下一頁及已到末頁的畫面。 |
| 3 | [expanded commits explain missing patches, empty changes and detail failures](tests/modules/repository/repoDiff.test.tsx#L158) | 展開提交時，無變動檔案、檔案沒有文字 patch、詳情錯誤及詳情缺失各顯示對應提示。 |
| 4 | [missing newline markers stay with their respective sides](tests/modules/repository/repoDiff.test.tsx#L195) | 左右檔案的 No newline at end of file 標記分別附在自己最後一行，仍只有一列成對差異。 |
| 5 | [diff mode changes rendered layout while preserving and escaping code](tests/modules/repository/repoDiff.test.tsx#L202) | Unified 使用連續文字，Split 使用表格。兩種檢視都保留增刪符號，將尖括號程式碼轉義顯示。 |
| 6 | [repository metrics and tree display exact counts without 30+ and M3 branch selector supports loading more](tests/modules/repository/repoDiff.test.tsx#L215) | 統計能呈現 0／75 個 issues、3／45 個 PR、100 個分支及 64 個 tag。分支選單有 radio 語意、已選項、30/100 及雙語載入更多，完成後隱藏、讀取中停用。 |
| 7 | [repository languages bar wraps chips inside card bounds and displays exact percentage tooltips](tests/modules/repository/repoDiff.test.tsx#L350) | 語言 chip 與色帶容器允許換行。範例 YAML 的 tooltip 顯示實際 0.5%，不被視覺上的 2% 最小寬度影響。 |
| 8 | [RepoFileTree normalizes search queries and RepositoryTree renders filtered results with input value](tests/modules/repository/repoDiff.test.tsx#L377) | 輸入帶空白或不同大小寫的查詢可篩出 file-259.ts。未搜尋時資料夾收合。搜尋時展開命中路徑、排除其他檔、保留輸入值。穩定狀態不顯示忙碌標記。 |
| 9 | [CommitHistory renders Load more files button only when hasMoreFiles is true](tests/modules/repository/repoDiff.test.tsx#L425) | 只有展開且 hasMoreFiles 的提交呈現中／英文載入更多檔案。讀取中按鈕停用並換等待文案，已到末頁則消失。 |

<a id="group-6"></a>

## 語系、設定與共用元件

### 語言、主題與跨頁面呈現（18 案）

涵蓋翻譯函式、語系表及 React 靜態 HTML。第 11–17 案由 screens 迴圈建立，執行器各登錄一案。這七案都去除 HTML 標籤及刻意保留的「繁體中文」選項後，檢查剩餘文字無漢字。 [tests/i18n.test.tsx](tests/i18n.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [saved language takes priority; unsupported values fall back to browser languages or English](tests/i18n.test.tsx#L43) | 已儲存的支援語言優先於瀏覽器。無效偏好依序讀取瀏覽器語言，zh-Hant-TW 對應繁中，無可用項目採英文。 |
| 2 | [theme mode validation and resolution follow system preference or explicit override](tests/i18n.test.tsx#L52) | 驗證 system／light／dark 三個合法值及無效值。system 跟隨深淺色偏好，明確指定的模式優先。 |
| 3 | [theme palette validation defaults to Mist Blue and preserves Soft Lavender](tests/i18n.test.tsx#L63) | 預設色票是 blue，支援 lavender 及列舉的其餘色票。驗證器拒絕無效名稱。 |
| 4 | [semantic keys resolve in both languages and interpolation preserves literal code](tests/i18n.test.tsx#L71) | 比對雙語登入、專案數和語言名稱。插值保留參數中的程式文字，不做二次替換。缺少參數保留佔位符，明確傳 undefined 則為空字串。 |
| 5 | [unknown keys fall back safely and literal text is rejected by the typed translator](tests/i18n.test.tsx#L82) | 未知 key、constructor 或直接傳入的中文文字，在執行時原樣回傳且非合法 key。有效 key 通過。原碼亦以 @ts-expect-error 標示應由型別檢查拒絕的呼叫。 |
| 6 | [locale dictionaries have identical semantic keys and interpolation parameters](tests/i18n.test.tsx#L94) | 完整比對英／中 key 集合、語意命名格式、非空字串與每個 key 的插值參數集合。 |
| 7 | [GitHub validation exposes a key that can be translated after a language change](tests/i18n.test.tsx#L113) | 以無效 Repo 觸發服務錯誤，確認錯誤是有效訊息 key，可在切換 UI 語言後翻為正確英／中文。 |
| 8 | [dashboard lists every project and uses project-only navigation in both languages](tests/i18n.test.tsx#L130) | 兩語系首頁均列出每個 fixture 專案、標題及歡迎語。檢查只呈現專案導覽，以及移除的舊工具、摘要與分類標籤均未出現。 |
| 9 | [new workspaces show teacher handouts and start with an empty student README](tests/i18n.test.tsx#L169) | 空草稿配上有教材的專案，作業說明正確渲染 Markdown、帶檔名的下載連結。學生 README 的 textarea 初始為空。 |
| 10 | [the project editor renders a saved personal README and repository in the current UI language](tests/i18n.test.tsx#L191) | 帶已存 README／Repo 的快照在繁中 UI 顯示原文及儲存狀態。預設選作業說明，標題、期限、配分順序正確，私人筆記僅在設計區顯示。 |
| 11 | [authGate renders English UI without untranslated Chinese labels](tests/i18n.test.tsx#L259) | 以英文 AuthProvider 與 AuthGate 渲染未登入入口，檢查登入閘門產生的可見文字。 |
| 12 | [dashboard renders English UI without untranslated Chinese labels](tests/i18n.test.tsx#L259) | 以範例專案與已登入使用者渲染英文 HomeDashboard，檢查首頁的可見文字。 |
| 13 | [login renders English UI without untranslated Chinese labels](tests/i18n.test.tsx#L259) | 直接渲染英文 LoginView 與表單，檢查登入文案。 |
| 14 | [project renders English UI without untranslated Chinese labels](tests/i18n.test.tsx#L259) | 以空快照渲染英文 ProjectWorkspace，檢查專案工作區輸出的文字。 |
| 15 | [github renders English UI without untranslated Chinese labels](tests/i18n.test.tsx#L259) | 以 RepoBundle fixture 渲染英文 GitHubRepoDashboard，檢查倉庫儀表板文字。 |
| 16 | [settingsButton renders English UI without untranslated Chinese labels](tests/i18n.test.tsx#L259) | 單獨渲染英文 SettingsButton，檢查設定入口標籤。 |
| 17 | [settingsDialog renders English UI without untranslated Chinese labels](tests/i18n.test.tsx#L259) | 在 SettingsProvider 下渲染英文 SettingsDialog，檢查該元件輸出的文字。 |
| 18 | [HomeDashboard displays deadlines beneath titles and student status without index badges or points](tests/i18n.test.tsx#L275) | 以固定時間渲染學生／管理員首頁。標題下有 UTC+8 期限及即將截止／已逾期，學生有已儲存、更新時間或尚未開始，管理員見學生入口。首頁不出現序號徽章或配分。 |

### 設定視窗（3 案）

使用主題、翻譯與設定 Provider，分別渲染有帳號、無帳號及工作區入口。 [tests/modules/settings/settings.test.tsx](tests/modules/settings/settings.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [SettingsDialog renders localized language, dark mode, and palette settings for signed-in users](tests/modules/settings/settings.test.tsx#L10) | 登入者可見語言、深淺模式、配色及帳號編輯的英／中文標籤。初始三區收合，指定展開配色時只開該區。另核對選項樣式，排除個人 token、登出與多餘頁尾。 |
| 2 | [SettingsDialog shows general preferences to guests](tests/modules/settings/settings.test.tsx#L110) | 無帳號時只顯示語言、外觀與配色，個人帳號、登出和 token 欄位均不出現。 |
| 3 | [SettingsButton and ProjectWorkspace render without a personal token](tests/modules/settings/settings.test.tsx#L130) | 設定按鈕有 dialog 提示並只顯示入口名稱。工作區有 Repo 同步與回首頁連結，可在未提供個人 token 下渲染。 |

### 共用 UI 與鍵盤焦點（8 案）

使用 renderToStaticMarkup 檢查語意、可存取屬性、樣式及條件式內容。另直接測試字串、鍵盤索引工具。 [tests/sharedUi.test.tsx](tests/sharedUi.test.tsx)

| # | 原始案例名稱 | 輸入、操作與預期結果 |
| ---: | --- | --- |
| 1 | [cn joins truthy class tokens cleanly](tests/sharedUi.test.tsx#L39) | cn 連接有效 class，略過 false、null、undefined。全空輸入回空字串。 |
| 2 | [Button and IconButton apply variants, sizes, icons, and accessibility labels](tests/sharedUi.test.tsx#L44) | Button 的樣式、尺寸、載入旋轉圖示及標籤符合設定。IconButton 輸出對應尺寸、aria-label 與 title。 |
| 3 | [Badge components render IconBadge, Chip variants, and AvatarBadge fallback](tests/sharedUi.test.tsx#L66) | IconBadge 的色調與尺寸、Chip 的序號樣式與文字正確。AvatarBadge 使用姓名首字或問號作為備援。 |
| 4 | [Card, CardHeader, PageContainer, PageHeaderCard, Panel, and EmptyState compose layouts](tests/sharedUi.test.tsx#L87) | 組合頁面容器、標頭工具區、卡片、面板及空狀態，檢查工作區外框、標題層級與內容結構。 |
| 5 | [FormField, TextInput, TextArea, and SelectField support inline and external help](tests/sharedUi.test.tsx#L116) | 檢查表單標籤、內建與外接說明、輸入前後圖示／快捷提示、textarea 及 select，包括描述關聯與下拉箭頭定位。 |
| 6 | [SegmentedControl, Tooltip, DataTable, Menu, FeedbackBanner, and LoadingPanel render semantics](tests/sharedUi.test.tsx#L156) | 驗證分頁選取／按鈕 pressed 狀態、tooltip 的角色、表格空／有資料、menuitemradio 的選取、各種橫幅／短暫提示與 loading 狀態的 role 及文案。 |
| 7 | [Dialog and FormDialog render shared shell, form fieldset, error banner, and confirm mode](tests/sharedUi.test.tsx#L283) | 一般／寬版 dialog 具有標題關聯、關閉鈕及指定寬度。表單儲存中鎖住 fieldset 並顯示錯誤／等待文字。確認刪除模式使用 alertdialog 與危險操作按鈕。 |
| 8 | [ButtonLink, IconLink, CardList, ChevronIndicator, MarkdownContent, FeedbackBanner retry, and getRovingFocusIndex](tests/sharedUi.test.tsx#L349) | 檢查按鈕式連結、首頁圖示連結、清單空態／分隔、可點與靜態箭頭、Markdown 標題及重試按鈕。焦點函式涵蓋上下、水平左右、循環、Home、End、fallback 索引及忽略無關鍵。 |

<a id="local"></a>

## 本機 HTTP 整合腳本

兩支腳本使用 Node 原生 `assert`，任何一項失敗即中止後續流程。以下各列描述腳本的預期結果。它們有自己的前置資料及副作用，Vite+ 的 160 案通過數只計入上方六組。

### 身分、管理、教材與個人帳號

[tests/integration/test-auth.mjs](tests/integration/test-auth.mjs) 連到 `127.0.0.1:5177`，可以 `AUTH_TEST_PORT` 指定其他連接埠。執行前需有已套 migration 的本機 Void 服務，以及環境變數 `ADMIN_EMAIL`、`ADMIN_PASSWORD` 對應的一次性本機管理員帳號。腳本自行用隨機密碼建立衍生學生帳號。從根目錄執行 `node tests/integration/test-auth.mjs`。

腳本建立的專案寫死截止日為 **2026-12-20 23:59（台北）**。實際時間超過此日後，預期學生 PUT 成功的步驟會受到平台期限鎖定。腳本透過管理 API 軟刪除測試帳號、專案，並將新專案 ID 寫入 `.void/crud-project-ids.json`。未設全流程的 finally 清理。測試會暫時更動全體專案的排序，適用於一次性的測試資料庫。

| 原碼行 | 情境 | 操作及預期斷言 |
| --- | --- | --- |
| [17–30](tests/integration/test-auth.mjs#L17) | 訪客與管理員登入 | 未登入訪問專案回 302，session 查詢 200 且無 user。公開註冊、錯誤密碼登入遭拒。正確管理員登入回 200 並含 HttpOnly Cookie，憑該 Cookie 可開啟 /admin。 |
| [31–76](tests/integration/test-auth.mjs#L31) | 學生建帳與登入 | 以 8 與 16 字元密碼作為合法邊界，分別用 7、17 測建帳拒絕。缺密碼、空／過長姓名、過長 email、缺／錯／陣列角色及夾帶帳戶旗標等回 400。管理員建立正常學生回 200，學生可登入。 |
| [77–112](tests/integration/test-auth.mjs#L77) | 頁面、角色與來源限制 | 學生開不存在的專案回 404，開 /admin 回 403。學生請求建立管理員或變更角色均失敗。管理員 Cookie 搭配跨來源的建帳請求也失敗。 |
| [113–128](tests/integration/test-auth.mjs#L113) | 建立專案之前的驗證 | 匿名 GET 專案目錄回 401，學生 POST 回 403，跨來源管理員寫入失敗，提交負配分回 400。 |
| [129–162](tests/integration/test-auth.mjs#L129) | 兩種建案及附件下載 | multipart 建立含大型中文附件的第一個專案，JSON 建立第二個，兩者回 201。檢查標題、有效序號、學生深層連結與附件數。訪客下載回 401，學生可逐字讀回檔案。清單含新專案且序號有序。 |
| [163–197](tests/integration/test-auth.mjs#L163) | 排序授權與集合驗證 | 匿名、學生、跨來源管理員 PUT 分別回 401、403、403。缺欄位、非陣列、重複 ID、多餘欄位回 400。只送部分 ID 或加不存在的 ID 回 409。 |
| [198–224](tests/integration/test-auth.mjs#L198) | 排序生效與語系一致 | 將新專案移至第一，繁中請求回正確 ID 順序及連續 1…N。學生以英文查詢讀到相同順序。再以管理員恢復先前順序，深層連結仍有效。 |
| [225–262](tests/integration/test-auth.mjs#L225) | 學生儲存完整草稿 | 新工作區 draft 為 null，用正確帳號標頭及空前版寫入私人 README、Repo 與含節點的 C4，預期回 200。 |
| [263–287](tests/integration/test-auth.mjs#L263) | 更新教材與保留作答 | 管理員改題目、保留原附件並加新檔，附件數變為 2。重讀學生草稿與原值一致。再次 PATCH 只保留原檔，新檔下載回 404。 |
| [291–293](tests/integration/test-auth.mjs#L291) | 登出撤銷 | 登出回 200，持舊 Cookie 查 session 得 null，再訪已建立專案回 302。 |
| [299–312](tests/integration/test-auth.mjs#L299) | 管理清單的資料範圍 | 管理員能取得學生 ID 與 currentUserId，清單各列均無 password／token。訪客讀取回 401，重新登入的學生讀取回 403。 |
| [313–365](tests/integration/test-auth.mjs#L313) | 個資與密碼路由分工 | 混送個資與新密碼到任一路徑回 400。學生不能經管理端改密碼。管理員重設學生時，長度 7／17 或附上任何舊密碼皆回 400。改自己密碼卻缺／空／錯舊密碼則回 invalidCurrentPassword。失敗後原學生 session 仍有效。 |
| [366–409](tests/integration/test-auth.mjs#L366) | 管理操作的拒絕情形 | 內建設密碼端點遭拒，學生對管理端改／刪帳號皆回 403，管理員刪自己或把自己降權回 409，使用既有管理員信箱改學生資料也回 409。 |
| [410–432](tests/integration/test-auth.mjs#L410) | 停用的管理端點 | 內建更新、冒用／結束冒用、解除停權、列出／查詢使用者、列出／撤銷 session 及權限查詢逐項得到 404。 |
| [433–465](tests/integration/test-auth.mjs#L433) | 更新帳號、並行重設 | 管理員改學生姓名及信箱成功，原 session 失效。用新信箱、舊密碼可登入。同時送兩個重設，僅一次 200，另一次 409。清單資料正確，先前登入狀態撤銷，舊密碼失效。 |
| [466–502](tests/integration/test-auth.mjs#L466) | 編輯與軟刪專案 | 已撤銷 Cookie 嘗試編輯回 401。管理員 JSON 編輯可改內容、標題並保留原附件。刪除兩專案後，深層連結、附件及再修改回 404。專案消失於目錄，其餘序號連續。 |
| [503–552](tests/integration/test-auth.mjs#L503) | 學生自助修改個資 | 新密碼可登入。匿名或跨來源修改被拒。夾帶 ID／角色回 400，重複 email 回 409。內建個人資料、改密碼、改信箱與刪除 API 各回 404。合法自改資料回 signedOut，原 cookie 查無 user。 |
| [553–580](tests/integration/test-auth.mjs#L553) | 學生自助修改密碼 | 以新信箱登入，核對 session 的 ID、姓名、studentId、user 角色。舊密碼錯誤回 400，正確可更新並獲 signedOut。舊 session 失效，改後密碼可重新登入。 |
| [580–610](tests/integration/test-auth.mjs#L580) | 提升為管理員後的密碼規則 | 將學生升為 admin 並登入。另一位管理員若缺、空或送錯目標舊密碼均收到 invalidCurrentPassword，既有 session 保持有效。提供正確舊密碼可更新並撤銷該 session。 |
| [611–625](tests/integration/test-auth.mjs#L611) | 刪除目標帳號 | 先確認升權後的帳號可用新密碼登入。由原管理員刪除後，其 session 失效、無法重新登入，管理清單也查不到該 ID。 |

### 個人工作區隔離與並行

[tests/integration/test-personal-workspace.mjs](tests/integration/test-personal-workspace.mjs) 預設連到 `127.0.0.1:5173`，可用 `WORKSPACE_TEST_PORT` 調整。腳本透過 Void CLI 對本機 D1 建立兩個隨機一般帳號、兩個無期限專案。伺服器與 CLI 必須使用同一個本機資料庫。從根目錄執行 `node tests/integration/test-personal-workspace.mjs`。

**現有建帳問題。** 腳本 INSERT 的欄位未包含 `user.deleted`。現行 migration 將它定為 `NOT NULL` 且沒有資料庫預設值。以同一 migration 建立記憶體 SQLite，再使用腳本的欄位清單插入測試資料，已確認會得到 `NOT NULL constraint failed: user.deleted`。因此在此 schema 上直接執行會中止於資料準備。後續各列是腳本定義的驗證情境。[建帳 SQL](tests/integration/test-personal-workspace.mjs#L48) · [資料表定義](db/migrations/20261125030959_futuristic_reptil.sql)

| 原碼行 | 情境 | 操作及預期斷言 |
| --- | --- | --- |
| [10–68](tests/integration/test-personal-workspace.mjs#L10) | 隔離資料準備 | 產生兩組 UUID、信箱及密碼，雜湊後插入 user／credential，另建兩專案。每次 CLI 執行使用臨時 SQL 檔，finally 移除該檔。 |
| [69–81](tests/integration/test-personal-workspace.mjs#L69) | 登入與初始快照 | 兩帳號各自建立 Cookie，核對第一個帳號的 session ID。其新工作區應回該 accountId，revision、updatedAt、draft 均為 null。 |
| [82–112](tests/integration/test-personal-workspace.mjs#L82) | 超過單列大小的 Unicode 草稿 | 構造 250 個含 CJK／emoji 長描述的節點、一條有向邊、中文 README 與 Repo。首次帶任意舊 revision 回 409，改 null 後回 200，updatedAt 為正數。 |
| [113–138](tests/integration/test-personal-workspace.mjs#L113) | 超限資料與原稿完整性 | 以正確 revision 傳長度 100,001 的 README、501 個節點分別回 400。重讀後與完整原稿深度相等。 |
| [139–147](tests/integration/test-personal-workspace.mjs#L139) | 帳號／專案雙重隔離及空稿 | 同專案換另一使用者、同使用者換另一專案均讀到空稿。第二個帳號可保存空 README、空模型、空 Repo，讀回仍是該空白快照。 |
| [148–150](tests/integration/test-personal-workspace.mjs#L148) | 登出與還原 | 第一個帳號登出再登入，新 Cookie 可讀回先前完整的大模型草稿。 |
| [151–169](tests/integration/test-personal-workspace.mjs#L151) | 兩個分頁競寫 | 以相同 revision 同時寫兩個不同草稿，預期一筆 200、一筆 409。最終資料等於成功那筆，第二個帳號仍保有自己的空稿。 |
| [170–174](tests/integration/test-personal-workspace.mjs#L170) | 結束時清理 | finally 對本次產生的兩個專案及兩個 user 做實體刪除，user 的外鍵級聯清理其憑證、session 與工作區／分段。 |

<a id="fixtures"></a>

## 共用測試資料

| 檔案 | 內容與用途 |
| --- | --- |
| [tests/fixtures/c4Model.ts](tests/fixtures/c4Model.ts) | `sampleC4Nodes` 提供 system、前端與 API container、資料庫、編輯器等七個節點，含父層、座標及固定 ID，可延伸出 code、關係及深度邊界。 |
| [tests/fixtures/projects.ts](tests/fixtures/projects.ts) | `sampleProjects` 提供兩個有穩定 ID、序號、標題、期限、配分及 Markdown 的專案。各案例可複製後替換日期、語言或附件。 |
| [tests/fixtures/repository.ts](tests/fixtures/repository.ts) | `createRepoFixture()` 建立 API 形狀的公開倉庫，有 main、語言、tag、PR、兩個完整 SHA、統計、檔名與 patch，以及檔案樹和配額。測試自行替換其中的分頁或錯誤資料。 |
| [tests/fixtures/migratedDb.ts](tests/fixtures/migratedDb.ts) | `createMigratedDb()` 建立 Node SQLite 記憶體資料庫並啟用外鍵，依 migration journal 順序、以 statement-breakpoint 切開並執行實際 SQL，供外鍵、索引及 EXPLAIN 測試使用。 |
