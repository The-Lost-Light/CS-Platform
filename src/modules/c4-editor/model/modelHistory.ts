import { removeC4Nodes, type C4File } from "@modules/c4-model";

export type C4Graph = Pick<C4File, "nodes" | "relationships">;

export interface C4History {
  past: C4Graph[];
  present: C4Graph;
  future: C4Graph[];
  group?: symbol;
}

export type C4HistoryAction =
  | { type: "edit"; apply: (graph: C4Graph) => C4Graph; group?: symbol }
  | { type: "undo" | "redo" };

const HISTORY_LIMIT = 100;

export function createC4History(model?: C4Graph): C4History {
  return { past: [], present: model ?? { nodes: [], relationships: [] }, future: [] };
}

export function reduceC4History(history: C4History, action: C4HistoryAction): C4History {
  const { past, present, future } = history;
  switch (action.type) {
    case "undo": {
      const previous = past.at(-1);
      return previous
        ? { past: past.slice(0, -1), present: previous, future: [...future, present] }
        : history;
    }
    case "redo": {
      const next = future.at(-1);
      return next
        ? { past: [...past, present], present: next, future: future.slice(0, -1) }
        : history;
    }
    case "edit": {
      const next = action.apply(present);
      if (next.nodes === present.nodes && next.relationships === present.relationships)
        return history;
      const continuing = action.group !== undefined && action.group === history.group;
      return {
        past: continuing ? past : [...past.slice(1 - HISTORY_LIMIT), present],
        present: next,
        future: [],
        group: action.group,
      };
    }
  }
}

export function removeC4Elements(graph: C4Graph, nodeIds: string[], edgeIds: string[]): C4Graph {
  const nodes = nodeIds.length ? removeC4Nodes(graph.nodes, nodeIds) : graph.nodes;
  const remaining = new Set(nodes.map((node) => node.id));
  const deleted = new Set(edgeIds);
  const relationships = graph.relationships.filter(
    (edge) => !deleted.has(edge.id) && remaining.has(edge.source) && remaining.has(edge.target),
  );
  return {
    nodes: nodes.length === graph.nodes.length ? graph.nodes : nodes,
    relationships:
      relationships.length === graph.relationships.length ? graph.relationships : relationships,
  };
}
