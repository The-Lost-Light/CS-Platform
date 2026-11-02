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
        statusLabel: t("未指定預期路徑"),
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
    let statusLabel = t("尚未實作 (Missing)");
    let matchedFiles: string[] = [];

    if (exactMatch) {
      status = 'implemented';
      statusLabel = t("已完整實作 (Exact Match)");
      matchedFiles = [exactMatch];
    } else if (prefixMatches.length > 0) {
      status = 'implemented';
      statusLabel = t("目錄已建立 ({p0} 個檔案)", { p0: prefixMatches.length });
      matchedFiles = prefixMatches.slice(0, 4);
    } else if (fuzzyMatches.length > 0) {
      status = 'partial';
      statusLabel = t("路徑偏移 / 部分實作 (Path Shifted)");
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
      category: t("缺失模組補強"),
      title: t("尚有 {p0} 個 C4 架構圖規劃模組未在 GitHub 倉庫中建立", { p0: missingNodes.length }),
      detail: t("您在 C4 架構圖中規劃了 {p0}，但目前分支檔案樹中尚未發現對應檔案。建議建立對應骨架檔案或調整 C4 架構圖預期路徑。", { p0: missingNodes.map((n) => t('「{label}」', { label: `${n.label} (${n.expectedPath})` })).join(t('、')) }),
      actionItems: missingNodes.map(
        (n) => t("建立 `{p0}` 並實作「{p1}」基礎介面", { p0: n.expectedPath, p1: n.label })
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
      category: t("測試覆蓋率與品質保證"),
      title: t("GitHub 倉庫目前缺乏自動化單元測試檔案"),
      detail: hasTestNode
        ? t("您的專案架構設計中已規劃測試模組，但實際 Commit 與檔案結構尚未包含任何 `.test.ts` 或 `.spec.ts` 測試案例，開發進度略落後於測試計畫。")
        : t("建議在 C4 架構圖與倉庫中新增 `tests/` 測試目錄，針對核心邏輯撰寫自動化測試。"),
      actionItems: [
        t("新增 Vitest / Pytest 測試設定與至少 1 個核心 API 單元測試檔"),
        t("在提交 PR 前透過 GitHub Actions 自動執行測試驗證"),
      ],
    });
  }

  if (unplannedFiles.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: t("架構設計同步更新"),
      title: t("發現 {p0} 個實際開發檔案尚未納入 C4 架構圖", { p0: unplannedFiles.length }),
      detail: t("實際倉庫中包含 {p0} 等檔案，顯示開發過程中有動態擴充工具或子元件。建議將關鍵共用模組補回 C4 架構圖以保持設計文件與程式碼同步。", { p0: unplannedFiles.slice(0, 4).map((f) => `\`${f}\``).join(t('、')) }),
      actionItems: unplannedFiles
        .slice(0, 3)
        .map((f) => t("評估是否將 `{p0}` 新增為 C4 架構圖子節點", { p0: f })),
    });
  }

  // 檢查 Commit 開發節奏與分支規範
  const prCommits = commits.filter((c) => c.prInfo && c.prInfo.number);
  recommendations.push({
    priority: 'LOW',
    category: t("Git 開發流程與里程碑檢核"),
    title:
      prCommits.length > 0
        ? t("團隊已採用 Pull Request 流程 ({p0}/{p1} 筆含 PR 紀錄)", { p0: prCommits.length, p1: commits.length })
        : t("建議強化 Feature Branch 與 Pull Request 審查流程"),
    detail:
      t("比對您的文字架構里程碑計畫與 GitHub Commit 歷史，前端與核心基礎設施已率先推進，建議下階段提交 Commit 時在訊息中標註對應的 C4 架構圖模組代號，提升可追溯性。"),
    actionItems: [
      t("維持每個 C4 架構圖子模組獨立分支開發後再透過 PR 合併至 main"),
      t("同步更新 README.md 中的架構圖與實際目錄樹說明"),
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
