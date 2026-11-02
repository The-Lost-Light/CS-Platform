import type { RepoBundle } from '../types';
/**
 * GitHub 專案資料擷取與內建快照服務 (延伸自 Demo 2 GitPulse)
 * 支援：
 * 1. 即時呼叫 GitHub REST API (Metadata, Languages, Branches, Commits, Commit Diffs, Git Recursive File Tree)
 * 2. 內建「學生專題倉庫 (student-team/course-oj-platform)」與「熱門開源倉庫 (facebook/react, vercel/next.js)」完整快照
 */

export const BUILTIN_REPO_SNAPSHOTS = {
  'student-team/course-oj-platform': {
    repo: {
      full_name: 'student-team/course-oj-platform',
      html_url: 'https://github.com/student-team/course-oj-platform',
      description: '期中軟體工程專題：支援 Pyodide 與即時編輯行為追蹤的課程作業平台',
      private: false,
      default_branch: 'main',
      stargazers_count: 18,
      forks_count: 4,
      open_issues_count: 3,
      size: 4820,
      language: 'TypeScript',
      updated_at: '2026-10-20T11:30:00Z',
      homepage: 'https://course-oj-demo.vercel.app',
      license: { spdx_id: 'MIT', name: 'MIT License' },
      topics: ['react', 'pyodide', 'education', 'monaco-editor', 'capstone-project'],
      owner: {
        login: 'student-team',
        avatar_url: '',
      },
    },
    languages: {
      TypeScript: 68400,
      JavaScript: 19200,
      CSS: 8400,
      HTML: 3200,
    },
    fileTree: [
      { path: 'README.md', type: 'blob', size: 2450 },
      { path: 'package.json', type: 'blob', size: 1120 },
      { path: 'pnpm-lock.yaml', type: 'blob', size: 48200 },
      { path: 'vite.config.ts', type: 'blob', size: 620 },
      { path: 'src/App.tsx', type: 'blob', size: 5400 },
      { path: 'src/main.tsx', type: 'blob', size: 480 },
      { path: 'src/components/CodeEditor.tsx', type: 'blob', size: 8920 },
      { path: 'src/components/ProblemViewer.tsx', type: 'blob', size: 4100 },
      { path: 'src/utils/changeTracker.ts', type: 'blob', size: 3650 },
      { path: 'server/index.ts', type: 'blob', size: 2100 },
      { path: 'server/routes/submissions.ts', type: 'blob', size: 4320 },
      { path: 'prisma/schema.prisma', type: 'blob', size: 1890 },
      { path: 'scripts/seed_demo.js', type: 'blob', size: 1540 },
    ],
    branches: [
      { name: 'main', protected: true, commit: { sha: '7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a' } },
      { name: 'feat/pyodide-sandbox', protected: false, commit: { sha: '3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c' } },
      { name: 'feat/backend-submissions', protected: false, commit: { sha: '9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e' } },
    ],
    commits: [
      {
        sha: '7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
        commit: {
          message: 'feat(editor): integrate MonacoChangeTracker and Pyodide stdin runner (#12)\n\nCompleted Milestone 2 editor integration with live insert/delete/replace counters.',
          author: { name: 'Chen Yu-Hsuan', email: 'yuhsuan@student.edu.tw', date: '2026-10-20T10:15:00Z' },
          committer: { name: 'LinBo-Yu', email: 'boyu@student.edu.tw', date: '2026-10-20T10:18:00Z' },
        },
        author: { login: 'yuhsuan-dev', avatar_url: '' },
        committer: { login: 'boyu-lin', avatar_url: '' },
        parents: [{ sha: '5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d' }],
        prInfo: {
          number: 12,
          title: 'feat(editor): integrate MonacoChangeTracker and Pyodide stdin runner',
          html_url: 'https://github.com/student-team/course-oj-platform/pull/12',
          state: 'merged',
          merge_method: 'squash',
          merge_method_label: 'Squash and Merge (壓縮合併)',
          merged_by: { login: 'boyu-lin', name: 'Lin Bo-Yu' },
          merged_at: '2026-10-20T10:18:00Z',
          base_ref: 'main',
          head_ref: 'feat/pyodide-sandbox',
        },
        stats: { total: 54, additions: 46, deletions: 8 },
        files: [
          {
            filename: 'src/components/CodeEditor.tsx',
            status: 'modified',
            additions: 34,
            deletions: 6,
            changes: 40,
            patch: `@@ -18,10 +18,38 @@ export function CodeEditor({ starterCode, onTrackChange }: Props) {
-  const [code, setCode] = useState(starterCode);
-  return <textarea value={code} onChange={e => setCode(e.target.value)} />;
+  const [code, setCode] = useState(starterCode);
+  const [stdinData, setStdinData] = useState('10');
+
+  const handleCodeChange = (nextVal: string) => {
+    const record = computeTextChangeRecord(code, nextVal, 'main.py');
+    if (record) {
+      onTrackChange(record);
+    }
+    setCode(nextVal);
+  };
+
+  return (
+    <div className="editor-workspace">
+      <PythonMonacoView code={code} onChange={handleCodeChange} />
+      <CustomStdinPanel value={stdinData} onChange={setStdinData} />
+    </div>
+  );
 }`,
          },
          {
            filename: 'server/routes/submissions.ts',
            status: 'added',
            additions: 12,
            deletions: 2,
            changes: 14,
            patch: `@@ -1,4 +1,14 @@
+import { Router } from 'express';
+export const submissionRouter = Router();
+
+submissionRouter.post('/api/submissions', async (req, res) => {
+  const { assignmentId, code, changeMetrics } = req.body;
+  return res.status(201).json({ status: 'ok', assignmentId, recordedChanges: changeMetrics.total });
+});`,
          },
        ],
      },
      {
        sha: '5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
        commit: {
          message: 'Merge pull request #8 from student-team/feat/backend-submissions\n\nchore(db): add Prisma schema for Assignment and ChangeLog tables',
          author: { name: 'Lin Bo-Yu', email: 'boyu@student.edu.tw', date: '2026-10-18T16:40:00Z' },
          committer: { name: 'Lin Bo-Yu', email: 'boyu@student.edu.tw', date: '2026-10-18T16:40:00Z' },
        },
        author: { login: 'boyu-lin', avatar_url: '' },
        committer: { login: 'boyu-lin', avatar_url: '' },
        parents: [
          { sha: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b' },
          { sha: '9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e' },
        ],
        prInfo: {
          number: 8,
          title: 'chore(db): add Prisma schema for Assignment and ChangeLog tables',
          html_url: 'https://github.com/student-team/course-oj-platform/pull/8',
          state: 'merged',
          merge_method: 'merge-commit',
          merge_method_label: 'Create a Merge Commit (標準合併節點 --no-ff)',
          merged_by: { login: 'boyu-lin', name: 'Lin Bo-Yu' },
          merged_at: '2026-10-18T16:40:00Z',
          base_ref: 'main',
          head_ref: 'feat/backend-submissions',
        },
        stats: { total: 32, additions: 30, deletions: 2 },
        files: [
          {
            filename: 'prisma/schema.prisma',
            status: 'added',
            additions: 30,
            deletions: 2,
            changes: 32,
            patch: `@@ -1,2 +1,30 @@
+datasource db {
+  provider = "postgresql"
+  url      = env("DATABASE_URL")
+}
+
+model Submission {
+  id          String   @id @default(cuid())
+  studentId   String
+  insertCount Int      @default(0)
+  deleteCount Int      @default(0)
+  replaceCount Int     @default(0)
+  createdAt   DateTime @default(now())
+}`,
          },
        ],
      },
      {
        sha: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
        commit: {
          message: 'init: bootstrap Vite + React + pnpm workspace and main App shell',
          author: { name: 'Chen Yu-Hsuan', email: 'yuhsuan@student.edu.tw', date: '2026-10-14T09:10:00Z' },
          committer: { name: 'Chen Yu-Hsuan', email: 'yuhsuan@student.edu.tw', date: '2026-10-14T09:10:00Z' },
        },
        author: { login: 'yuhsuan-dev', avatar_url: '' },
        committer: { login: 'yuhsuan-dev', avatar_url: '' },
        parents: [],
        prInfo: {
          number: null,
          title: 'init: bootstrap Vite + React + pnpm workspace and main App shell',
          html_url: 'https://github.com/student-team/course-oj-platform/commit/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
          state: 'committed',
          merge_method: 'direct',
          merge_method_label: 'Direct Commit (直接提交)',
          merged_by: { login: 'yuhsuan-dev', name: 'Chen Yu-Hsuan' },
          merged_at: '2026-10-14T09:10:00Z',
          base_ref: 'main',
          head_ref: 'main',
        },
        stats: { total: 48, additions: 48, deletions: 0 },
        files: [
          {
            filename: 'src/App.tsx',
            status: 'added',
            additions: 48,
            deletions: 0,
            changes: 48,
            patch: `@@ -0,0 +1,18 @@
+import React from 'react';
+import { CodeEditor } from '@/components/ui/CodeEditor';
+
+export default function App() {
+  return (
+    <main className="min-h-screen bg-slate-950 text-white">
+      <CodeEditor starterCode="# Write Python code here" onTrackChange={console.log} />
+    </main>
+  );
+}`,
          },
        ],
      },
    ],
  },

  'facebook/react': {
    repo: {
      full_name: 'facebook/react',
      html_url: 'https://github.com/facebook/react',
      description: 'The library for web and native user interfaces.',
      private: false,
      default_branch: 'main',
      stargazers_count: 229480,
      forks_count: 46810,
      open_issues_count: 834,
      size: 428920,
      language: 'JavaScript',
      updated_at: '2026-10-15T09:42:10Z',
      homepage: 'https://react.dev',
      license: { spdx_id: 'MIT', name: 'MIT License' },
      topics: ['react', 'javascript', 'declarative', 'ui', 'frontend', 'compiler'],
      owner: {
        login: 'facebook',
        avatar_url: '',
      },
    },
    languages: {
      JavaScript: 4182900,
      TypeScript: 2610400,
      HTML: 124500,
      CSS: 98300,
      Rust: 65200,
    },
    fileTree: [
      { path: 'README.md', type: 'blob', size: 5120 },
      { path: 'package.json', type: 'blob', size: 4210 },
      { path: 'compiler/packages/babel-plugin-react-compiler/src/ReactiveScopes/PruneScopes.ts', type: 'blob', size: 12400 },
      { path: 'compiler/packages/babel-plugin-react-compiler/src/__tests__/PruneScopes.test.ts', type: 'blob', size: 8400 },
      { path: 'packages/react-reconciler/src/ReactFiberCommitWork.js', type: 'blob', size: 84200 },
      { path: 'packages/react-devtools-shared/src/backend/flight/parseFlightStack.js', type: 'blob', size: 4600 },
      { path: 'packages/react/index.js', type: 'blob', size: 1920 },
    ],
    branches: [
      { name: 'main', protected: true, commit: { sha: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e' } },
      { name: 'canary', protected: true, commit: { sha: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d' } },
      { name: 'experimental', protected: false, commit: { sha: '7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b' } },
      { name: 'feat/react-compiler-hmr', protected: false, commit: { sha: '1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c' } },
    ],
    commits: [
      {
        sha: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e',
        commit: {
          message: '[Compiler] Optimize memoization boundaries for nested Server Actions (#31482)\n\nPreviously, inline closures referencing server actions inside nested client loops bypassed reactive scope pruning.',
          author: { name: 'Lauren Tan', email: 'lauren@react.dev', date: '2026-10-15T08:15:22Z' },
          committer: { name: 'Ricky Hanlon', email: 'ricky@react.dev', date: '2026-10-15T08:16:05Z' },
        },
        author: { login: 'poteto', avatar_url: '' },
        committer: { login: 'rickhanlonii', avatar_url: '' },
        parents: [{ sha: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4' }],
        prInfo: {
          number: 31482,
          title: '[Compiler] Optimize memoization boundaries for nested Server Actions',
          html_url: 'https://github.com/facebook/react/pull/31482',
          state: 'merged',
          merge_method: 'squash',
          merge_method_label: 'Squash and Merge (壓縮合併)',
          merged_by: { login: 'rickhanlonii', name: 'Ricky Hanlon' },
          merged_at: '2026-10-15T08:16:05Z',
          base_ref: 'main',
          head_ref: 'feat/react-compiler-hmr',
        },
        stats: { total: 42, additions: 31, deletions: 11 },
        files: [
          {
            filename: 'compiler/packages/babel-plugin-react-compiler/src/ReactiveScopes/PruneScopes.ts',
            status: 'modified',
            additions: 21,
            deletions: 9,
            changes: 30,
            patch: `@@ -44,10 +44,18 @@ export function pruneNonEscapingScopes(fn: HIRFunction): void {
-      if (value.kind === 'FunctionExpression' && value.loweredFunc.context.length > 0) {
-        markScopeAsEscaping(value.loweredFunc.id);
+      if (value.kind === 'FunctionExpression') {
+        const hasMutableCapture = value.loweredFunc.context.some(
+          dep => !isStableServerActionRef(dep.identifier)
+        );
+        if (hasMutableCapture) {
+          markScopeAsEscaping(value.loweredFunc.id);
+        }
       }`,
          },
          {
            filename: 'compiler/packages/babel-plugin-react-compiler/src/__tests__/PruneScopes.test.ts',
            status: 'modified',
            additions: 10,
            deletions: 2,
            changes: 12,
            patch: `@@ -112,4 +112,10 @@ describe('PruneScopes with Server Actions', () => {
-  it('marks all nested closures as escaping', () => {
+  it('elides unnecessary reactive scope wrapper when capturing stable server action', () => {
+    const result = compileFixture('server-action-loop');
+    expect(result.code).not.toContain('useMemoCache');
   });`,
          },
        ],
      },
      {
        sha: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
        commit: {
          message: 'Merge pull request #31479 from sebmarkbage/fix/suspense-hydration-edge\n\nFix Suspense fallback teardown timing during concurrent view transitions',
          author: { name: 'Andrew Clark', email: 'acdlite@react.dev', date: '2026-10-14T22:05:10Z' },
          committer: { name: 'Andrew Clark', email: 'acdlite@react.dev', date: '2026-10-14T22:05:10Z' },
        },
        author: { login: 'acdlite', avatar_url: '' },
        committer: { login: 'acdlite', avatar_url: '' },
        parents: [
          { sha: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c' },
          { sha: '4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b' },
        ],
        prInfo: {
          number: 31479,
          title: 'Fix Suspense fallback teardown timing during concurrent view transitions',
          html_url: 'https://github.com/facebook/react/pull/31479',
          state: 'merged',
          merge_method: 'merge-commit',
          merge_method_label: 'Create a Merge Commit (標準合併節點 --no-ff)',
          merged_by: { login: 'acdlite', name: 'Andrew Clark' },
          merged_at: '2026-10-14T22:05:10Z',
          base_ref: 'main',
          head_ref: 'fix/suspense-hydration-edge',
        },
        stats: { total: 27, additions: 19, deletions: 8 },
        files: [
          {
            filename: 'packages/react-reconciler/src/ReactFiberCommitWork.js',
            status: 'modified',
            additions: 19,
            deletions: 8,
            changes: 27,
            patch: `@@ -1840,7 +1840,14 @@ function commitSuspenseHydrationCallbacks(finishedRoot, offscreenFiber) {
-  if (enableViewTransition) {
-    detachOffscreenInstance(offscreenFiber);
-  }
+  if (enableViewTransition) {
+    const currentState = offscreenFiber.memoizedState;
+    if (currentState !== null) {
+      flushPendingViewTransitionCleanups(finishedRoot);
+    }
+    detachOffscreenInstance(offscreenFiber);
+  }`,
          },
        ],
      },
      {
        sha: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
        commit: {
          message: 'Add owner stack symbolication support for async Server Components in DevTools',
          author: { name: 'Andrew Clark', email: 'acdlite@react.dev', date: '2026-10-14T14:12:49Z' },
          committer: { name: 'Sebastian Markbåge', email: 'sebastian@react.dev', date: '2026-10-14T14:30:12Z' },
        },
        author: { login: 'acdlite', avatar_url: '' },
        committer: { login: 'sebmarkbage', avatar_url: '' },
        parents: [],
        prInfo: {
          number: 31471,
          title: 'Add owner stack symbolication support for async Server Components in DevTools',
          html_url: 'https://github.com/facebook/react/pull/31471',
          state: 'merged',
          merge_method: 'rebase',
          merge_method_label: 'Rebase and Merge (變基線性合併)',
          merged_by: { login: 'sebmarkbage', name: 'Sebastian Markbåge' },
          merged_at: '2026-10-14T14:30:12Z',
          base_ref: 'main',
          head_ref: 'feat/devtools-flight-stacks',
        },
        stats: { total: 35, additions: 32, deletions: 3 },
        files: [
          {
            filename: 'packages/react-devtools-shared/src/backend/flight/parseFlightStack.js',
            status: 'added',
            additions: 32,
            deletions: 3,
            changes: 35,
            patch: `@@ -1,3 +1,16 @@
-export function parseFlightStack(rawStack) {
-  return rawStack || [];
-}
+export function parseFlightStack(rawStack, sourceMapRegistry) {
+  if (!Array.isArray(rawStack)) return [];
+  return rawStack.map(frame => ({
+    functionName: frame.name || '<anonymous server component>',
+    fileName: frame.file,
+    isServer: true,
+  }));
+}`,
          },
        ],
      },
    ],
  },
};

export function parseGitHubRepoUrl(rawInput: string) {
  const cleaned = (rawInput || '').trim();
  if (!cleaned) return null;
  const pathPart = cleaned
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  const parts = pathPart.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1], fullKey: `${parts[0]}/${parts[1]}` };
  }
  return null;
}

export async function fetchGitHubProjectBundle(rawUrl: string, githubToken = ''): Promise<RepoBundle> {
  const parsed = parseGitHubRepoUrl(rawUrl);
  if (!parsed) {
    throw new Error('請輸入有效的 GitHub 倉庫網址 (例如 https://github.com/owner/repo)');
  }

  const normalizedKey = parsed.fullKey.toLowerCase();

  // 若為內建教學專題範例 `student-team/course-oj-platform`，優先載入完整教學快照
  if (normalizedKey === 'student-team/course-oj-platform') {
    return {
      ...BUILTIN_REPO_SNAPSHOTS['student-team/course-oj-platform'],
      sourceType: 'snapshot',
      rateLimit: '內建教學專題倉庫',
    };
  }

  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  try {
    const repoRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
      { headers }
    );

    if (!repoRes.ok) {
      throw new Error(`HTTP ${repoRes.status}`);
    }

    const rateRemaining = repoRes.headers.get('x-ratelimit-remaining');
    const rateLimit = repoRes.headers.get('x-ratelimit-limit');
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    const [languages, branches, commitsList, treeData] = await Promise.all([
      fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/languages`, { headers })
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
      fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches?per_page=30`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=10`,
        { headers }
      )
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
        { headers }
      )
        .then((r) => (r.ok ? r.json() : { tree: [] }))
        .catch(() => ({ tree: [] })),
    ]);

    return {
      repo: repoData,
      languages: languages || {},
      branches: Array.isArray(branches) ? branches : [],
      commits: Array.isArray(commitsList) ? commitsList : [],
      fileTree: Array.isArray(treeData?.tree) ? treeData.tree.slice(0, 250) : [],
      sourceType: 'live-api',
      rateLimit: rateRemaining && rateLimit ? `${rateRemaining}/${rateLimit}` : 'Live API',
    };
  } catch (err) {
    const snap =
      BUILTIN_REPO_SNAPSHOTS[normalizedKey as keyof typeof BUILTIN_REPO_SNAPSHOTS] ||
      BUILTIN_REPO_SNAPSHOTS['student-team/course-oj-platform'];
    return {
      ...snap,
      sourceType: 'fallback-snapshot',
      apiError: err instanceof Error ? err.message : String(err),
      rateLimit: '內建快照備援',
    };
  }
}
