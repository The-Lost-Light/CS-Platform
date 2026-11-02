import type { MindMapNode, RepoBundle } from '../types';
import { createTranslator, type Translator } from '../i18n/messages';
/**
 * 專題架構與 C4 架構圖比對分析引擎 (Architecture & Mind-Map Comparator)
 * 功能：
 * 1. 比對學生繪製的「C4 架構圖節點 (Mind Map Nodes)」預期檔案路徑與 GitHub Repo 實際檔案樹 (File Tree)
 * 2. 分析學生撰寫的「文字架構設計規格書」中提及的檔案/資料夾與 Commit 開發紀錄是否一致
 * 3. 計算架構契合度分數 (Alignment Score)、模組完成率、未規劃額外檔案，並生成具體改進建議與下一步行動方向
 */

export function analyzeArchitectureAlignment({
  mindMapNodes = [],
  designDoc = '',
  repoBundle = null,
}: { mindMapNodes?: MindMapNode[]; designDoc?: string; repoBundle?: RepoBundle | null }, t: Translator = createTranslator('zh-TW')) {
  const actualFiles = (repoBundle?.fileTree || []).map((item) => item.path);
  const commits = repoBundle?.commits || [];

  // 彙整所有 Commit 修改過的檔案與提交次數
  const touchedFileCounts = new Map<string, number>();
  for (const c of commits) {
    const files = c.files || [];
    for (const f of files) {
      touchedFileCounts.set(f.filename, (touchedFileCounts.get(f.filename) || 0) + 1);
    }
  }

  // 1. 逐一檢查 C4 架構圖節點對應的實際檔案狀態
  const nodeEvaluations = mindMapNodes.map((node) => {
    const expected = (node.expectedPath || '').trim().replace(/^\/+/, '');
    if (!expected) {
      return {
        ...node,
        status: 'unmapped',
        statusLabel: t('analysis.status.unmapped'),
        matchedFiles: [],
        commitTouchCount: 0,
      };
    }

    // 精確匹配或資料夾前綴匹配或檔名模糊匹配
    const exactMatch = actualFiles.find((p) => p.toLowerCase() === expected.toLowerCase());
    const prefixMatches = actualFiles.filter((p) =>
      p.toLowerCase().startsWith(expected.toLowerCase().replace(/\/$/, '') + '/')
    );
    const baseName = (expected.split('/').pop() || '').toLowerCase();
    const fuzzyMatches = actualFiles.filter(
      (p) => p.toLowerCase().endsWith('/' + baseName) || p.toLowerCase() === baseName
    );

    let status = 'missing';
    let statusLabel = t('analysis.status.missing');
    let matchedFiles: string[] = [];

    if (exactMatch) {
      status = 'implemented';
      statusLabel = t('analysis.status.exact');
      matchedFiles = [exactMatch];
    } else if (prefixMatches.length > 0) {
      status = 'implemented';
      statusLabel = t('analysis.status.directory', { p0: prefixMatches.length });
      matchedFiles = prefixMatches.slice(0, 4);
    } else if (fuzzyMatches.length > 0) {
      status = 'partial';
      statusLabel = t('analysis.status.partial');
      matchedFiles = fuzzyMatches.slice(0, 3);
    }

    const commitTouchCount = matchedFiles.reduce(
      (sum, f) => sum + (touchedFileCounts.get(f) || 0),
      0
    );

    return {
      ...node,
      status, // 'implemented' | 'partial' | 'missing' | 'unmapped'
      statusLabel,
      matchedFiles,
      commitTouchCount,
    };
  });

  // 2. 從文字設計說明書中擷取以反引號標記的預期路徑 (例如 `src/App.tsx`)
  const docPathMatches = [
    ...designDoc.matchAll(/`([a-zA-Z0-9_.\-/]+\.[a-zA-Z0-9]+|[a-zA-Z0-9_-]+\/)`/g),
  ].map((m) => m[1]);
  const uniqueDocPaths = Array.from(new Set(docPathMatches));

  const docPathAudit = uniqueDocPaths.map((docPath) => {
    const clean = docPath.replace(/^\/+/, '');
    const found = actualFiles.some(
      (f) =>
        f.toLowerCase() === clean.toLowerCase() ||
        f.toLowerCase().startsWith(clean.toLowerCase())
    );
    return { path: docPath, existsInRepo: found };
  });

  // 3. 找出 GitHub 實際倉庫中存在、但未在 C4 架構圖規劃中的額外程式碼檔案
  const allPlannedPaths = mindMapNodes
    .map((n) => (n.expectedPath || '').trim().toLowerCase())
    .filter(Boolean);

  const unplannedFiles = actualFiles.filter((filePath) => {
    const lower = filePath.toLowerCase();
    // 排除基本設定檔
    if (
      ['package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'vite.config.js', 'readme.md'].includes(
        lower
      )
    ) {
      return false;
    }
    return !allPlannedPaths.some(
      (planned) =>
        lower === planned ||
        lower.startsWith(planned.replace(/\/$/, '') + '/') ||
        planned.endsWith('/' + lower.split('/').pop())
    );
  });

  // 4. 計算綜合契合度指標
  const totalNodes = nodeEvaluations.filter(node => node.expectedPath.trim()).length || 1;
  const implementedCount = nodeEvaluations.filter((n) => n.status === 'implemented').length;
  const partialCount = nodeEvaluations.filter((n) => n.status === 'partial').length;
  const missingCount = nodeEvaluations.filter((n) => n.status === 'missing').length;

  const rawScore = ((implementedCount * 1.0 + partialCount * 0.6) / totalNodes) * 100;
  const alignmentScore = Math.min(100, Math.round(rawScore));

  // 5. 分析開發軌跡與生成具體建議和改進方向
  const recommendations = [];

  const missingNodes = nodeEvaluations.filter((n) => n.status === 'missing');
  if (missingNodes.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: t('analysis.missing.category'),
      title: t('analysis.missing.title', { p0: missingNodes.length }),
      detail: t('analysis.missing.detail', { p0: missingNodes.map((n) => t('common.quotedLabel', { label: `${n.label} (${n.expectedPath})` })).join(t('common.listSeparator')) }),
      actionItems: missingNodes.map(
        (n) => t('analysis.missing.createFile', { p0: n.expectedPath, p1: n.label })
      ),
    });
  }

  const hasTestNode = mindMapNodes.some(
    (n) =>
      n.category === 'testing' ||
      (n.expectedPath && n.expectedPath.toLowerCase().includes('test'))
  );
  const actualTestFiles = actualFiles.filter(
    (f) => f.includes('.test.') || f.includes('.spec.') || f.startsWith('tests/')
  );

  if (actualTestFiles.length === 0) {
    recommendations.push({
      priority: 'HIGH',
      category: t('analysis.testing.category'),
      title: t('analysis.testing.title'),
      detail: hasTestNode
        ? t('analysis.testing.behindPlan')
        : t('analysis.testing.addDirectory'),
      actionItems: [
        t('analysis.testing.configure'),
        t('analysis.testing.ci'),
      ],
    });
  }

  if (unplannedFiles.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: t('analysis.unplanned.category'),
      title: t('analysis.unplanned.title', { p0: unplannedFiles.length }),
      detail: t('analysis.unplanned.detail', { p0: unplannedFiles.slice(0, 4).map((f) => `\`${f}\``).join(t('common.listSeparator')) }),
      actionItems: unplannedFiles
        .slice(0, 3)
        .map((f) => t('analysis.unplanned.addNode', { p0: f })),
    });
  }

  // 檢查 Commit 開發節奏與分支規範
  const prCommits = commits.filter((c) => c.prInfo && c.prInfo.number);
  recommendations.push({
    priority: 'LOW',
    category: t('analysis.workflow.category'),
    title:
      prCommits.length > 0
        ? t('analysis.workflow.prsUsed', { p0: prCommits.length, p1: commits.length })
        : t('analysis.workflow.improveReviews'),
    detail:
      t('analysis.workflow.detail'),
    actionItems: [
      t('analysis.workflow.branches'),
      t('analysis.workflow.readme'),
    ],
  });

  return {
    alignmentScore,
    implementedCount,
    partialCount,
    missingCount,
    totalNodes: nodeEvaluations.length,
    mappedNodeCount: nodeEvaluations.filter(node => node.expectedPath.trim()).length,
    nodeEvaluations,
    docPathAudit,
    unplannedFiles,
    actualFileCount: actualFiles.length,
    actualTestFileCount: actualTestFiles.length,
    recommendations,
  };
}
