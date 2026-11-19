import { createC4History, reduceC4History } from "@modules/c4-editor";
import { useReducer, useState } from "react";

import type { PersonalWorkspace } from "../model/personalWorkspace";

export function useProjectDraft(initialDraft: PersonalWorkspace | null) {
  const [history, dispatchModel] = useReducer(
    reduceC4History,
    initialDraft?.model,
    createC4History,
  );
  const [designDoc, setDesignDoc] = useState(() => initialDraft?.designDoc ?? "");
  return {
    history,
    dispatchModel,
    designDoc,
    setDesignDoc,
  };
}
