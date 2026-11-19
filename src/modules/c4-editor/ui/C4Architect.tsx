import { LoadingPanel } from "@shared/ui/LoadingPanel";
import { FileText, Network } from "lucide-react";
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
  const { designDoc, onChangeDesignDoc } = props;
  const editor = useC4Editor(props);
  const { t, designTab, setDesignTab, readmeMode, setReadmeMode } = editor;
  return (
    <div className="space-y-5">
      <div className="ui-card rounded-t-none border-t border-outline-subtle p-4 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="ui-pill-group" role="tablist" aria-label={t("workspace.tabs.design")}>
            <button
              type="button"
              role="tab"
              id="design-tab-readme"
              aria-controls="design-panel-readme"
              aria-selected={designTab === "readme"}
              onClick={() => setDesignTab("readme")}
              className={`ui-pill-item px-4 ${
                designTab === "readme" ? "ui-pill-item-active" : "ui-pill-item-idle"
              }`}
            >
              <FileText aria-hidden="true" className="w-3.5 h-3.5" />
              <span>README.md</span>
            </button>
            <button
              type="button"
              role="tab"
              id="design-tab-diagram"
              aria-controls="design-panel-diagram"
              aria-selected={designTab === "diagram"}
              onClick={() => setDesignTab("diagram")}
              className={`ui-pill-item px-4 ${
                designTab === "diagram" ? "ui-pill-item-active" : "ui-pill-item-idle"
              }`}
            >
              <Network aria-hidden="true" className="w-3.5 h-3.5" />
              <span>C4 Model</span>
            </button>
          </div>
        </div>
      </div>

      {designTab === "readme" ? (
        <DesignDocument
          designDoc={designDoc}
          onChangeDesignDoc={onChangeDesignDoc}
          readmeMode={readmeMode}
          setReadmeMode={setReadmeMode}
        />
      ) : (
        <Suspense fallback={<LoadingPanel label={t("common.loading")} />}>
          <C4Diagram editor={editor} />
        </Suspense>
      )}
    </div>
  );
}
