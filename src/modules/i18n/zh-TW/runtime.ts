import type source from "../en/runtime";

export default {
  "github.errors.notConfigured": "平台尚未設定 GitHub 同步功能，請聯絡課程管理員。",
  "github.errors.notFound": "找不到這個倉庫或分支，或平台沒有讀取權限。",
  "github.errors.limited": "已達 GitHub 請求次數上限，請稍後再試。",
  "github.errors.invalidUrl": "請輸入有效的 GitHub 倉庫網址 (例如 https://github.com/owner/repo)",
} satisfies Record<keyof typeof source, string>;
