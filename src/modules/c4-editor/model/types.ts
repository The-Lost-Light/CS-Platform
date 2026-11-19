import type { C4History, C4HistoryAction } from "./modelHistory";

export type DesignTab = "readme" | "diagram";

export type C4ArchitectProps = {
  history: C4History;
  dispatchModel: (action: C4HistoryAction) => void;
  designDoc: string;
  onChangeDesignDoc: (doc: string) => void;
  designTab: DesignTab;
  onChangeDesignTab: (tab: DesignTab) => void;
  importing?: boolean;
  importRevision?: number;
};
