import {
  type C4Node,
  type C4Relationship,
  C4_FILE_MAX_BYTES,
  parseC4File,
} from "@modules/c4-model";
import { useTransientNotice } from "@shared/transientNotice";
import { useState } from "react";

import type { C4HistoryAction } from "../model/modelHistory";
import type { DesignTab } from "../model/types";
import { downloadC4Model } from "../services/c4Download";

type C4FileStatus = "importSuccess" | "importError" | "fileTooLarge" | "exportError";

export function useC4ModelFile({
  nodes,
  relationships,
  dispatchModel,
  onChangeDesignTab,
}: {
  nodes: C4Node[];
  relationships: C4Relationship[];
  dispatchModel: (action: C4HistoryAction) => void;
  onChangeDesignTab: (tab: DesignTab) => void;
}) {
  const [importing, setImporting] = useState(false);
  const {
    notice: fileStatus,
    show: showFileStatus,
    clear: clearFileStatus,
  } = useTransientNotice<C4FileStatus>();
  const [importRevision, setImportRevision] = useState(0);

  const exportModel = () => {
    try {
      downloadC4Model(nodes, relationships);
      clearFileStatus();
    } catch {
      showFileStatus("exportError");
    }
  };

  const importModel = async (file: File) => {
    clearFileStatus();
    if (file.size > C4_FILE_MAX_BYTES) {
      showFileStatus("fileTooLarge");
      return;
    }
    setImporting(true);
    try {
      const model = parseC4File(await file.text());
      dispatchModel({ type: "edit", apply: () => model });
      setImportRevision((value) => value + 1);
      onChangeDesignTab("diagram");
      showFileStatus("importSuccess");
    } catch {
      showFileStatus("importError");
    } finally {
      setImporting(false);
    }
  };

  return {
    importing,
    fileStatus,
    importRevision,
    exportModel,
    importModel,
  };
}

export type C4ModelFile = ReturnType<typeof useC4ModelFile>;
