import { LoadingPanel } from "@shared/ui/LoadingPanel";
import { lazy, Suspense } from "react";

import { useC4Editor } from "../hooks/useC4Editor";
import type { C4ArchitectProps } from "../model/types";
import { DesignDocument } from "./DesignDocument";

const C4Diagram = lazy(() =>
  import("./C4Diagram").then((module) => ({
    default: module.C4Diagram,
  })),
);

export function C4Architect(props: C4ArchitectProps) {
  const { designDoc, onChangeDesignDoc, readOnly } = props;
  const editor = useC4Editor(props);
  const { t, designTab, readmeMode, setReadmeMode } = editor;
  return designTab === "readme" ? (
    <DesignDocument
      designDoc={designDoc}
      onChangeDesignDoc={onChangeDesignDoc}
      readmeMode={readmeMode}
      setReadmeMode={setReadmeMode}
      readOnly={readOnly}
    />
  ) : (
    <Suspense fallback={<LoadingPanel label={t("common.loading")} />}>
      <C4Diagram editor={editor} />
    </Suspense>
  );
}
