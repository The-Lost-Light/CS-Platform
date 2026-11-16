import type source from './runtime.zh-TW';

export default {
  "github.merge.squash": "Squash and merge",
  "github.merge.commit": "Create a merge commit (--no-ff)",
  "github.merge.direct": "Direct commit",
  "github.merge.rebase": "Rebase and merge",
  "github.errors.invalidUrl": "Enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)"
} satisfies Record<keyof typeof source, string>;
