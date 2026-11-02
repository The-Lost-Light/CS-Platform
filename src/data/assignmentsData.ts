import { createTranslator, type MessageKey, type Translator } from '../i18n/messages';

export interface MindMapNode {
  id: string;
  label: string;
  category: string;
  expectedPath: string;
  description: string;
  parentId: string | null;
  x: number;
  y: number;
}

export interface AdvancedProject {
  id: string;
  type: 'advanced';
  codeName: string;
  title: string;
  difficulty: string;
  difficultyColor: string;
  dueDate: string;
  points: number;
  status: string;
  defaultRepoUrl: string;
  tags: string[];
  summary: string;
  requirements: string[];
  initialMindMapNodes: MindMapNode[];
  initialDesignDoc: string;
}

type ProjectTemplate = Omit<AdvancedProject, 'title' | 'difficulty' | 'status' | 'summary' | 'requirements' | 'initialMindMapNodes' | 'initialDesignDoc'> & {
  titleKey: MessageKey;
  difficultyKey: MessageKey;
  statusKey: MessageKey;
  summaryKey: MessageKey;
  requirementKeys: MessageKey[];
  initialDesignDocKey: MessageKey;
  initialMindMapNodes: (Omit<MindMapNode, 'label' | 'description'> & { labelKey: MessageKey; descriptionKey: MessageKey })[];
};

/** Stable template IDs and paths are independent of translated text. */
const PROJECT_TEMPLATES = [
  {
    "id": "adv-fullstack-web",
    "type": "advanced",
    "codeName": "PROJ-01",
    "difficultyColor": "indigo",
    "dueDate": "2026-11-25 23:59",
    "points": 200,
    "defaultRepoUrl": "https://github.com/student-team/course-oj-platform",
    "tags": [
      "System Architecture",
      "Mind Map",
      "GitHub API",
      "File Tree Diff",
      "CI/CD"
    ],
    "titleKey": "courses.fullstack.title",
    "difficultyKey": "courses.fullstack.difficulty",
    "statusKey": "courses.fullstack.status",
    "summaryKey": "courses.fullstack.summary",
    "requirementKeys": [
      "courses.fullstack.requirements.diagram",
      "courses.fullstack.requirements.specification",
      "courses.fullstack.requirements.github",
      "courses.fullstack.requirements.comparison"
    ],
    "initialMindMapNodes": [
      {
        "id": "node-root",
        "category": "root",
        "expectedPath": "README.md",
        "parentId": null,
        "x": 380,
        "y": 55,
        "labelKey": "courses.fullstack.nodes.root.label",
        "descriptionKey": "courses.fullstack.nodes.root.description"
      },
      {
        "id": "node-fe-core",
        "category": "frontend",
        "expectedPath": "src/App.tsx",
        "parentId": "node-root",
        "x": 130,
        "y": 175,
        "labelKey": "courses.fullstack.nodes.frontend.label",
        "descriptionKey": "courses.fullstack.nodes.frontend.description"
      },
      {
        "id": "node-editor",
        "category": "frontend",
        "expectedPath": "src/components/CodeEditor.tsx",
        "parentId": "node-fe-core",
        "x": 90,
        "y": 310,
        "labelKey": "courses.fullstack.nodes.editor.label",
        "descriptionKey": "courses.fullstack.nodes.editor.description"
      },
      {
        "id": "node-api",
        "category": "backend",
        "expectedPath": "server/routes/submissions.ts",
        "parentId": "node-root",
        "x": 380,
        "y": 175,
        "labelKey": "courses.fullstack.nodes.api.label",
        "descriptionKey": "courses.fullstack.nodes.api.description"
      },
      {
        "id": "node-db",
        "category": "database",
        "expectedPath": "prisma/schema.prisma",
        "parentId": "node-api",
        "x": 380,
        "y": 310,
        "labelKey": "courses.fullstack.nodes.database.label",
        "descriptionKey": "courses.fullstack.nodes.database.description"
      },
      {
        "id": "node-ai-service",
        "category": "ai",
        "expectedPath": "server/services/aiTutor.ts",
        "parentId": "node-api",
        "x": 560,
        "y": 310,
        "labelKey": "courses.fullstack.nodes.aiTutor.label",
        "descriptionKey": "courses.fullstack.nodes.aiTutor.description"
      },
      {
        "id": "node-tests",
        "category": "testing",
        "expectedPath": "tests/submissions.test.ts",
        "parentId": "node-root",
        "x": 640,
        "y": 175,
        "labelKey": "courses.fullstack.nodes.tests.label",
        "descriptionKey": "courses.fullstack.nodes.tests.description"
      }
    ],
    "initialDesignDocKey": "courses.fullstack.designDoc"
  },
  {
    "id": "adv-ai-rag-agent",
    "type": "advanced",
    "codeName": "PROJ-02",
    "difficultyColor": "rose",
    "dueDate": "2026-12-18 23:59",
    "points": 250,
    "defaultRepoUrl": "https://github.com/facebook/react",
    "tags": [
      "Open Source",
      "Architecture Recovery",
      "GitGraph",
      "Commit Diff"
    ],
    "titleKey": "courses.react.title",
    "difficultyKey": "courses.react.difficulty",
    "statusKey": "courses.react.status",
    "summaryKey": "courses.react.summary",
    "requirementKeys": [
      "courses.react.requirements.diagram",
      "courses.react.requirements.mergeStrategies",
      "courses.react.requirements.report"
    ],
    "initialMindMapNodes": [
      {
        "id": "react-root",
        "category": "root",
        "expectedPath": "package.json",
        "parentId": null,
        "x": 380,
        "y": 55,
        "labelKey": "courses.react.nodes.root.label",
        "descriptionKey": "courses.react.nodes.root.description"
      },
      {
        "id": "react-compiler",
        "category": "frontend",
        "expectedPath": "compiler/packages/babel-plugin-react-compiler/src/ReactiveScopes/PruneScopes.ts",
        "parentId": "react-root",
        "x": 130,
        "y": 185,
        "labelKey": "courses.react.nodes.compiler.label",
        "descriptionKey": "courses.react.nodes.compiler.description"
      },
      {
        "id": "react-reconciler",
        "category": "backend",
        "expectedPath": "packages/react-reconciler/src/ReactFiberCommitWork.js",
        "parentId": "react-root",
        "x": 380,
        "y": 185,
        "labelKey": "courses.react.nodes.reconciler.label",
        "descriptionKey": "courses.react.nodes.reconciler.description"
      },
      {
        "id": "react-devtools",
        "category": "ai",
        "expectedPath": "packages/react-devtools-shared/src/backend/flight/parseFlightStack.js",
        "parentId": "react-root",
        "x": 630,
        "y": 185,
        "labelKey": "courses.react.nodes.devtools.label",
        "descriptionKey": "courses.react.nodes.devtools.description"
      },
      {
        "id": "react-compiler-test",
        "category": "testing",
        "expectedPath": "compiler/packages/babel-plugin-react-compiler/src/__tests__/PruneScopes.test.ts",
        "parentId": "react-compiler",
        "x": 130,
        "y": 320,
        "labelKey": "courses.react.nodes.tests.label",
        "descriptionKey": "courses.react.nodes.tests.description"
      },
      {
        "id": "react-docs-arch",
        "category": "database",
        "expectedPath": "docs/ARCHITECTURE.md",
        "parentId": "react-root",
        "x": 380,
        "y": 320,
        "labelKey": "courses.react.nodes.docs.label",
        "descriptionKey": "courses.react.nodes.docs.description"
      }
    ],
    "initialDesignDocKey": "courses.react.designDoc"
  }
] satisfies ProjectTemplate[];

export function createAdvancedProjects(t: Translator): AdvancedProject[] {
  return PROJECT_TEMPLATES.map(({ titleKey, difficultyKey, statusKey, summaryKey, requirementKeys, initialDesignDocKey, initialMindMapNodes, ...metadata }) => ({
    ...metadata,
    title: t(titleKey),
    difficulty: t(difficultyKey),
    status: t(statusKey),
    summary: t(summaryKey),
    requirements: requirementKeys.map(key => t(key)),
    initialDesignDoc: t(initialDesignDocKey),
    initialMindMapNodes: initialMindMapNodes.map(({ labelKey, descriptionKey, ...node }) => ({
      ...node, label: t(labelKey), description: t(descriptionKey),
    })),
  }));
}

export const ADVANCED_PROJECTS = createAdvancedProjects(createTranslator('zh-TW'));
