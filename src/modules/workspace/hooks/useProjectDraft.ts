import { createC4History, reduceC4History, type C4HistoryAction } from "@modules/c4-editor";
import { useRef, useState } from "react";

import type { PersonalWorkspace } from "../model/personalWorkspace";

export function useProjectDraft(
  initialDraft: PersonalWorkspace | null,
  record?: (change: Partial<PersonalWorkspace>) => void,
) {
  const [history, setHistory] = useState(() => createC4History(initialDraft?.model));
  const current = useRef(history);
  const [designDoc, setDoc] = useState(initialDraft?.designDoc ?? "");
  function setDesignDoc(value: string) {
    record?.({ designDoc: value });
    setDoc(value);
  }
  function dispatchModel(action: C4HistoryAction) {
    // Capture each editor action even when React batches several into one render.
    const next = reduceC4History(current.current, action);
    if (next === current.current) return;
    current.current = next;
    record?.({ model: { format: "cap-c4", version: 1, ...next.present } });
    setHistory(next);
  }
  return { history, dispatchModel, designDoc, setDesignDoc };
}
