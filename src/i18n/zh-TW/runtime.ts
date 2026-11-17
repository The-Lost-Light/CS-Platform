import type source from '@i18n/en/runtime';

export default {
  "github.merge.squash": "Squash and Merge (壓縮合併)",
  "github.merge.commit": "Create a Merge Commit (標準合併節點 --no-ff)",
  "github.merge.direct": "Direct Commit (直接提交)",
  "github.merge.rebase": "Rebase and Merge (變基線性合併)",
  "github.errors.invalidUrl": "請輸入有效的 GitHub 倉庫網址 (例如 https://github.com/owner/repo)"
} satisfies Record<keyof typeof source, string>;
