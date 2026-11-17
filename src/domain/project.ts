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

export interface Project {
  id: string;
  type: "project";
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
