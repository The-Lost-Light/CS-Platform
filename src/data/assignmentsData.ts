/**
 * 課程作業平台 — 作業題庫與內建 GitHub 專題快照資料集
 * 包含：
 * 1. 基礎程式作業 (Basic Assignments) — 整合 Pyodide、自訂測資、編輯行為追蹤與 AI 助教提示
 * 2. 進階專題作業 (Advanced Capstone Projects) — 整合 C4 架構圖設計、文字規格、GitHub Repo 數據與檔案結構比對
 */

export const BASIC_ASSIGNMENTS = [
  {
    id: 'basic-fib-dp',
    type: 'basic' as const,
    codeName: 'HW-01',
    title: '費氏數列與動態規劃最佳化 (Fibonacci & Memoization)',
    difficulty: '基礎入門',
    difficultyColor: 'emerald',
    dueDate: '2026-10-28 23:59',
    points: 100,
    status: '進行中',
    tags: ['Python 3', 'Recursion', 'Dynamic Programming', 'Pyodide'],
    summary: '實作高效率的費氏數列計算函式，處理標準輸入之多筆查詢，並比較單純遞迴與記憶化搜尋之時間複雜度差異。',
    description: `### 題目敘述
費氏數列（Fibonacci Sequence）定義如下：
- $F(0) = 0$
- $F(1) = 1$
- 當 $n \\ge 2$ 時，$F(n) = F(n-1) + F(n-2)$

在金融時間序列分析與演算法設計中，我們常需要快速計算前 $n$ 項費氏數列以及第 $n$ 項的值。請在右側編輯器完成 \`solve_fibonacci(n: int)\` 函式，使其讀取一個正整數 $n$，並輸出：
1. 第一行：前 $n$ 項費氏數列組成的串列（List）
2. 第二行：前 $n$ 項費氏數列的總和（Sum）`,
    inputFormat: '輸入為單一正整數 n (1 <= n <= 50)，代表要生成的費氏數列項數。',
    outputFormat: '第一行輸出前 n 項費氏數列 List 格式；第二行輸出 "Sum: <總和>"。',
    constraints: [
      '時間複雜度要求：O(n)，請避免使用指數級 O(2^n) 的未快取遞迴。',
      '空間複雜度要求：O(n) 以內。',
      '可透過下方「自訂測資」輸入任意正整數 n 進行即時驗證。'
    ],
    sampleCases: [
      {
        id: 'sample-1',
        name: '範例測資 1 (n = 10)',
        input: '10',
        expectedOutput: '[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\nSum: 88',
        explanation: '前 10 項為 0 到 34，總和為 88。'
      },
      {
        id: 'sample-2',
        name: '範例測資 2 (n = 6)',
        input: '6',
        expectedOutput: '[0, 1, 1, 2, 3, 5]\nSum: 12',
        explanation: '前 6 項為 [0, 1, 1, 2, 3, 5]，總和為 12。'
      },
      {
        id: 'sample-3',
        name: '邊界測資 3 (n = 1)',
        input: '1',
        expectedOutput: '[0]\nSum: 0',
        explanation: '當 n=1 時僅有第 0 項 [0]，總和為 0。'
      }
    ],
    starterCode: `# HW-01: 費氏數列與動態規劃最佳化
# 系統會將「自訂測資」透過標準輸入 sys.stdin 傳入程式中

import sys

def solve_fibonacci(n: int) -> list[int]:
    """生成前 n 項費氏數列 (O(n) 動態規劃)"""
    if n <= 0:
        return []
    if n == 1:
        return [0]
    seq = [0, 1]
    for _ in range(2, n):
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

def main():
    raw_input = sys.stdin.read().strip()
    n = int(raw_input.splitlines()[0]) if raw_input else 10
    result = solve_fibonacci(n)
    print(result)
    print(f"Sum: {sum(result)}")

if __name__ == "__main__":
    main()
`,
    aiHints: [
      '若需要處理 n=1 的邊界情況，請確認當 n=1 時回傳 `seq[:1]` 即 `[0]`，避免多回傳第 2 項。',
      '可以使用兩個變數 `a, b = 0, 1` 逐步迭代，或預先配置陣列以減少記憶體重新配置次數。',
      '想測試大數運算嗎？可以在自訂測資輸入 `35` 或 `50`，Python 支援任意精度整數！'
    ]
  },
  {
    id: 'basic-sales-analytics',
    type: 'basic' as const,
    codeName: 'HW-02',
    title: '電商訂單資料清洗與營收統計報表 (Data Aggregation)',
    difficulty: '中階實作',
    difficultyColor: 'amber',
    dueDate: '2026-11-04 23:59',
    points: 100,
    status: '開放作答',
    tags: ['Python 3', 'Data Processing', 'Dict & Comprehension', 'Sorting'],
    summary: '解析多行 CSV 格式的商品銷售紀錄，計算各品項小計、總營收與最高營收冠軍商品。',
    description: `### 題目敘述
在真實資料工程場景中，我們常需要解析批次匯入的交易紀錄並產出摘要指標。
每筆交易紀錄包含三個欄位：\`商品名稱,單價,數量\`（以逗號分隔）。

請撰寫 Python 程式讀取標準輸入中的所有訂單列，並輸出：
1. \`Total Revenue: <總營收整數>\`
2. \`Best Seller: <最高營收商品名稱> (<該商品小計營收>)\`
3. \`Item Count: <不重複商品種類數>\``,
    inputFormat: '多行文字，每行格式為「商品名稱,單價,數量」，例如：Laptop,32000,5',
    outputFormat: '輸出三行統計結果：Total Revenue、Best Seller 與 Item Count。',
    constraints: [
      '若同一商品出現多次，應先合併累計其總營收再進行比較。',
      '忽略空白行與首尾多餘空白字元。'
    ],
    sampleCases: [
      {
        id: 'sales-1',
        name: '範例測資 1 (標準 4 筆商品)',
        input: 'Laptop,32000,5\nKeyboard,2800,18\nMouse,1600,24\nMonitor,12500,8',
        expectedOutput: 'Total Revenue: 348800\nBest Seller: Laptop (160000)\nItem Count: 4',
        explanation: 'Laptop 小計 160000 最高，四項商品總營收 348800。'
      },
      {
        id: 'sales-2',
        name: '範例測資 2 (含重複品項合併)',
        input: 'Coffee,120,10\nTea,80,15\nCoffee,120,8',
        expectedOutput: 'Total Revenue: 3360\nBest Seller: Coffee (2160)\nItem Count: 2',
        explanation: 'Coffee 兩筆合計 18 杯共 2160 元，高於 Tea 的 1200 元。'
      }
    ],
    starterCode: `# HW-02: 電商訂單資料清洗與營收統計報表
import sys

def analyze_orders(lines: list[str]):
    revenue_by_item = {}
    for line in lines:
        line = line.strip()
        if not line:
            continue
        parts = [p.strip() for p in line.split(",")]
        if len(parts) != 3:
            continue
        name, price, qty = parts[0], int(parts[1]), int(parts[2])
        revenue_by_item[name] = revenue_by_item.get(name, 0) + price * qty

    if not revenue_by_item:
        print("Total Revenue: 0")
        return

    total_rev = sum(revenue_by_item.values())
    best_item = max(revenue_by_item.items(), key=lambda x: x[1])

    print(f"Total Revenue: {total_rev}")
    print(f"Best Seller: {best_item[0]} ({best_item[1]})")
    print(f"Item Count: {len(revenue_by_item)}")

if __name__ == "__main__":
    raw = sys.stdin.read().strip()
    default_data = "Laptop,32000,5\\nKeyboard,2800,18\\nMouse,1600,24\\nMonitor,12500,8"
    input_lines = (raw if raw else default_data).splitlines()
    analyze_orders(input_lines)
`,
    aiHints: [
      '使用 `dict.get(key, 0)` 或 `collections.defaultdict(int)` 可以優雅地累加相同商品的多次訂單金額。',
      '使用 `max(revenue_by_item.items(), key=lambda x: x[1])` 可直接找出營收最高的 `(商品名稱, 金額)` 值對。'
    ]
  },
  {
    id: 'basic- bracket-validator',
    type: 'basic' as const,
    codeName: 'HW-03',
    title: '語法樹括號平衡與優先級驗證器 (Stack & Parser)',
    difficulty: '進階挑戰',
    difficultyColor: 'purple',
    dueDate: '2026-11-12 23:59',
    points: 100,
    status: '開放作答',
    tags: ['Python 3', 'Stack', 'Compiler Basics', 'String Parsing'],
    summary: '運用堆疊 (Stack) 結構檢測程式碼片段中的小括號、中括號與大括號是否正確配對閉合，並回報最大巢狀深度。',
    description: `### 題目敘述
編譯器與 IDE 的語法檢查器（Linter）在解析程式碼時，首要任務是驗證括號結構是否合法。
給定一行或多行包含 \`()\`, \`[]\`, \`{}\` 及其他字元的字串，請對每一行判斷：
- 若完全合法配對，輸出 \`VALID (MaxDepth: <最大巢狀層數>)\`
- 若配對失敗，輸出 \`INVALID (Pos: <第一個錯誤發生的 0-based 索引位置>)\``,
    inputFormat: '輸入包含一至多行測試字串，每行代表一個待檢驗的運算式。',
    outputFormat: '針對每行輸入輸出一行驗證結果。',
    constraints: [
      '忽略括號以外的一般英數字元與運算子。',
      '若直到字串結尾仍有未閉合的左括號，錯誤位置 Pos 請回報為該行字串長度 len(s)。'
    ],
    sampleCases: [
      {
        id: 'bracket-1',
        name: '範例測資 1 (混合合法與非法)',
        input: 'fn(a[0], {x: (1 + 2)})\nfn(a[0})\n((a+b)',
        expectedOutput: 'VALID (MaxDepth: 3)\nINVALID (Pos: 6)\nINVALID (Pos: 6)',
        explanation: '第一行最大深度 3；第二行在索引 6 處 } 與 [ 不匹配；第三行結尾未閉合。'
      }
    ],
    starterCode: `# HW-03: 語法樹括號平衡與優先級驗證器
import sys

def check_brackets(expr: str) -> str:
    pairs = {')': '(', ']': '[', '}': '{'}
    openers = set(pairs.values())
    stack = []
    max_depth = 0

    for idx, ch in enumerate(expr):
        if ch in openers:
            stack.append(ch)
            if len(stack) > max_depth:
                max_depth = len(stack)
        elif ch in pairs:
            if not stack or stack[-1] != pairs[ch]:
                return f"INVALID (Pos: {idx})"
            stack.pop()

    if stack:
        return f"INVALID (Pos: {len(expr)})"
    return f"VALID (MaxDepth: {max_depth})"

if __name__ == "__main__":
    raw = sys.stdin.read().strip()
    sample = "fn(a[0], {x: (1 + 2)})\\nfn(a[0})\\n((a+b)"
    for line in (raw if raw else sample).splitlines():
        if line.strip():
            print(check_brackets(line.strip()))
`,
    aiHints: [
      '每次遇到左括號 `(`、`[`、`{` 時 `stack.append(ch)`，並同步更新 `max_depth = max(max_depth, len(stack))`。',
      '別忘了在迴圈結束後檢查 `if stack:`，因為可能只開不關（例如 `((a+b)`）。'
    ]
  }
];

export const ADVANCED_PROJECTS = [
  {
    id: 'adv-fullstack-web',
    type: 'advanced' as const,
    codeName: 'PROJ-01',
    title: '期中軟體工程專題：模組化全端專案架構設計與 GitHub 開發檢核',
    difficulty: '核心專題',
    difficultyColor: 'indigo',
    dueDate: '2026-11-25 23:59',
    points: 200,
    status: '架構比對中',
    defaultRepoUrl: 'https://github.com/student-team/course-oj-platform',
    tags: ['System Architecture', 'Mind Map', 'GitHub API', 'File Tree Diff', 'CI/CD'],
    summary: '先以互動 C4 架構圖與架構規格書規劃專案模組與預期目錄，再連結 GitHub Repository 即時比對實際檔案結構、Commit 軌跡與計畫契合度。',
    requirements: [
      '繪製包含至少 5 個核心模組節點的專案架構 C4 架構圖，並標註各節點預期對應的檔案或資料夾路徑。',
      '撰寫專案架構設計說明（含核心解決問題、技術棧選型、資料流向與測試策略）。',
      '連結您的 GitHub 專案網址，透過平台自動抓取分支、Commits、程式碼變更 Diff 與檔案結構樹。',
      '執行「原計畫 C4 架構圖 vs. GitHub 實際開發」比對分析，根據系統診斷建議補強缺失模組（如單元測試或文件）。'
    ],
    initialMindMapNodes: [
      {
        id: 'node-root',
        label: '線上學習平台專題 (Root)',
        category: 'root',
        expectedPath: 'README.md',
        description: '專案總覽、環境建置指南與架構入口',
        parentId: null,
        x: 380,
        y: 55
      },
      {
        id: 'node-fe-core',
        label: '前端介面與路由層',
        category: 'frontend',
        expectedPath: 'src/App.tsx',
        description: 'React 應用程式主框架、分頁導航與狀態管理',
        parentId: 'node-root',
        x: 130,
        y: 175
      },
      {
        id: 'node-editor',
        label: '程式碼編輯與 Pyodide 沙盒',
        category: 'frontend',
        expectedPath: 'src/components/CodeEditor.tsx',
        description: '整合線上編輯器、變更追蹤與 WebAssembly 執行器',
        parentId: 'node-fe-core',
        x: 90,
        y: 310
      },
      {
        id: 'node-api',
        label: '後端 API 與評測服務',
        category: 'backend',
        expectedPath: 'server/routes/submissions.ts',
        description: '處理學生作業提交、測資比對與成績紀錄 API',
        parentId: 'node-root',
        x: 380,
        y: 175
      },
      {
        id: 'node-db',
        label: '資料庫 Schema 與 ORM',
        category: 'database',
        expectedPath: 'prisma/schema.prisma',
        description: '定義 User、Assignment、Submission 與 ChangeLog 資料表',
        parentId: 'node-api',
        x: 380,
        y: 310
      },
      {
        id: 'node-ai-service',
        label: 'AI 程式碼診斷助教模組',
        category: 'ai',
        expectedPath: 'server/services/aiTutor.ts',
        description: '結合學生編輯行為紀錄與錯誤訊息提供漸進式提示',
        parentId: 'node-api',
        x: 560,
        y: 310
      },
      {
        id: 'node-tests',
        label: '自動化單元與整合測試',
        category: 'testing',
        expectedPath: 'tests/submissions.test.ts',
        description: '使用 Vitest 驗證核心評測與 API 邊界條件',
        parentId: 'node-root',
        x: 640,
        y: 175
      }
    ],
    initialDesignDoc: `## 1. 專案目標與核心價值
本專題旨在開發一個支援即時程式評測與學習歷程分析的課程作業平台，透過前端 WebAssembly 沙盒降低伺服器負擔，並紀錄學生的細粒度編輯行為（Insert / Delete / Replace）。

## 2. 系統模組分層規劃
- **前端展示層 (src/)**：採用 React + TypeScript + Tailwind CSS，包含 \`src/App.tsx\` 主框架與 \`src/components/CodeEditor.tsx\` 編輯元件。
- **後端服務層 (server/)**：提供 RESTful API (\`server/routes/submissions.ts\`) 與 AI 助教提示服務 (\`server/services/aiTutor.ts\`)。
- **資料持久層 (prisma/)**：透過 \`prisma/schema.prisma\` 管理作業題庫與提交紀錄。
- **品質保證與測試 (tests/)**：規劃撰寫 \`tests/submissions.test.ts\` 確保評分邏輯正確無誤。

## 3. 開發里程碑計畫
1. **Milestone 1 (第 1-2 週)**：完成專案初始化、資料庫 Schema 與前端主頁面骨架。
2. **Milestone 2 (第 3-4 週)**：完成程式碼編輯器與後端作業提交 API 串接。
3. **Milestone 3 (第 5 週)**：補齊 AI 診斷服務模組與單元測試覆蓋率達 80%。`
  },
  {
    id: 'adv-ai-rag-agent',
    type: 'advanced' as const,
    codeName: 'PROJ-02',
    title: '期末專題：開源大型專案架構逆向工程與演進分析 (React / Next.js)',
    difficulty: '進階研究',
    difficultyColor: 'rose',
    dueDate: '2026-12-18 23:59',
    points: 250,
    status: '開放提交',
    defaultRepoUrl: 'https://github.com/facebook/react',
    tags: ['Open Source', 'Architecture Recovery', 'GitGraph', 'Commit Diff'],
    summary: '針對大型開源專案或自建期末專題建立核心子系統 C4 架構圖，並透過 GitHub API 即時驗證分支拓撲、PR 合併策略與檔案目錄結構。',
    requirements: [
      '建立目標專案的核心模組 C4 架構圖（例如 Compiler、Reconciler、DevTools、Server Actions、Tests）。',
      '利用 GitGraph 觀察該專案的分支合併策略（Squash & Merge、Merge Commit 或 Rebase）。',
      '比對您設計的模組 C4 架構圖與實際 GitHub 專案目錄樹，撰寫架構演進分析報告。'
    ],
    initialMindMapNodes: [
      {
        id: 'react-root',
        label: 'React 核心架構 (Monorepo)',
        category: 'root',
        expectedPath: 'package.json',
        description: 'React Monorepo 頂層工作區與建置設定',
        parentId: null,
        x: 380,
        y: 55
      },
      {
        id: 'react-compiler',
        label: 'React Compiler 編譯器',
        category: 'frontend',
        expectedPath: 'compiler/packages/babel-plugin-react-compiler/src/ReactiveScopes/PruneScopes.ts',
        description: '自動記憶化分析與 Reactive Scopes 剪枝最佳化',
        parentId: 'react-root',
        x: 130,
        y: 185
      },
      {
        id: 'react-reconciler',
        label: 'Fiber Reconciler 協調器',
        category: 'backend',
        expectedPath: 'packages/react-reconciler/src/ReactFiberCommitWork.js',
        description: 'Concurrent 渲染排程、Suspense 與 ViewTransition 處理',
        parentId: 'react-root',
        x: 380,
        y: 185
      },
      {
        id: 'react-devtools',
        label: 'DevTools Flight 除錯工具',
        category: 'ai',
        expectedPath: 'packages/react-devtools-shared/src/backend/flight/parseFlightStack.js',
        description: 'Server Components 非同步堆疊追蹤與符號解析',
        parentId: 'react-root',
        x: 630,
        y: 185
      },
      {
        id: 'react-compiler-test',
        label: 'Compiler 單元測試套件',
        category: 'testing',
        expectedPath: 'compiler/packages/babel-plugin-react-compiler/src/__tests__/PruneScopes.test.ts',
        description: '驗證 Server Actions 閉包作用域剪枝正確性',
        parentId: 'react-compiler',
        x: 130,
        y: 320
      },
      {
        id: 'react-docs-arch',
        label: '貢獻者架構指南文件',
        category: 'database',
        expectedPath: 'docs/ARCHITECTURE.md',
        description: '整理給團隊成員閱讀的內部架構說明文件',
        parentId: 'react-root',
        x: 380,
        y: 320
      }
    ],
    initialDesignDoc: `## 1. 專題研究目標
深入剖析 React 19 與 React Compiler 的核心原始碼結構，將我們的理解繪製為 C4 架構圖，並與 \`facebook/react\` 官方倉庫進行自動化路徑與近期 Commit 修改比對。

## 2. 關鍵子系統追蹤清單
- **React Compiler (\`compiler/packages/babel-plugin-react-compiler\`)**：重點觀察 \`PruneScopes.ts\` 如何處理 Server Actions。
- **Fiber Reconciler (\`packages/react-reconciler\`)**：追蹤 \`ReactFiberCommitWork.js\` 中的 Suspense 與 ViewTransition 清理機制。
- **DevTools Flight (\`packages/react-devtools-shared\`)**：檢視 \`parseFlightStack.js\` 對 RSC 的支援。
- **架構文件 (\`docs/ARCHITECTURE.md\`)**：檢查是否具備獨立架構文件。`
  }
];

export type BasicAssignment = typeof BASIC_ASSIGNMENTS[number];
export type AdvancedProject = typeof ADVANCED_PROJECTS[number];
export type MindMapNode = AdvancedProject["initialMindMapNodes"][number];
