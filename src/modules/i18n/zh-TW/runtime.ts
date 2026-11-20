import type source from "../en/runtime";

export default {
  "github.merge.squash": "Squash and Merge (壓縮合併)",
  "github.merge.commit": "Create a Merge Commit (標準合併節點 --no-ff)",
  "github.merge.direct": "Direct Commit (直接提交)",
  "github.merge.rebase": "Rebase and Merge (變基線性合併)",
  "github.errors.notConfigured": "平台尚未設定 GitHub 同步功能，請聯絡課程管理員。",
  "github.errors.notFound": "找不到這個倉庫或分支，或平台沒有讀取權限。",
  "github.errors.limited": "已達 GitHub 請求次數上限，請稍後再試。",
  "github.errors.invalidUrl": "請輸入有效的 GitHub 倉庫網址 (例如 https://github.com/owner/repo)",
} satisfies Record<keyof typeof source, string>;
