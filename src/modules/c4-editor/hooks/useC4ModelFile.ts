import {
  type C4Node,
  type C4Relationship,
  C4_FILE_MAX_BYTES,
  parseC4File,
} from "@modules/c4-model";
import { useEffect, useState } from "react";

import type { C4HistoryAction } from "../model/modelHistory";
import type { DesignTab } from "../model/types";
import { downloadC4Model } from "../services/c4Download";

type C4FileStatus = "importSuccess" | "importError" | "fileTooLarge" | "exportError";

const FILE_STATUS_DURATION_MS: Record<C4FileStatus, number> = {
  importSuccess: 3500,
  importError: 6000,
  fileTooLarge: 5000,
  exportError: 5000,
};

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
  const [fileNotice, setFileNotice] = useState<{ status: C4FileStatus; id: number } | null>(null);
  const fileStatus = fileNotice?.status ?? null;
  const setFileStatus = (status: C4FileStatus | null) => {
    setFileNotice((previous) => (status ? { status, id: (previous?.id ?? 0) + 1 } : null));
  };
  useEffect(() => {
    if (!fileNotice) return;
    const timer = setTimeout(() => {
      setFileNotice((current) => (current?.id === fileNotice.id ? null : current));
    }, FILE_STATUS_DURATION_MS[fileNotice.status]);
    return () => clearTimeout(timer);
  }, [fileNotice]);
  const [importRevision, setImportRevision] = useState(0);

  const exportModel = () => {
    try {
      downloadC4Model(nodes, relationships);
      setFileStatus(null);
    } catch {
      setFileStatus("exportError");
    }
  };

  const importModel = async (file: File) => {
    setFileStatus(null);
    if (file.size > C4_FILE_MAX_BYTES) {
      setFileStatus("fileTooLarge");
      return;
    }
    setImporting(true);
    try {
      const model = parseC4File(await file.text());
      dispatchModel({ type: "edit", apply: () => model });
      setImportRevision((value) => value + 1);
      onChangeDesignTab("diagram");
      setFileStatus("importSuccess");
    } catch {
      setFileStatus("importError");
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
