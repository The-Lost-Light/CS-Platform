import type { Project } from "@modules/projects";

export const sampleProjects: Project[] = [
  {
    id: "sample-project-1",
    index: 1,
    title: "Architecture Design Project",
    dueDate: "2026-11-25 23:59",
    points: 200,
    content:
      "## Assignment instructions\n\n- Draw a C4 architecture diagram.\n- Link your GitHub repository.",
    attachments: [],
  },
  {
    id: "sample-project-2",
    index: 2,
    title: "Repository Analysis Project",
    dueDate: "2026-12-18 23:59",
    points: 250,
    content: "## Assignment instructions\n\n- Analyze core modules and commit history.",
    attachments: [],
  },
];
