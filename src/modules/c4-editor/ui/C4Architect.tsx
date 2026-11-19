import { LoadingPanel } from "@shared/ui/LoadingPanel";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Network,
  Upload,
} from "lucide-react";
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
  const {
    t,
    designTab,
    setDesignTab,
    readmeMode,
    setReadmeMode,
    fileInput,
    importing,
    fileStatus,
    exportModel,
    importModel,
    scope,
    path,
    navigate,
  } = editor;
  return (
    <div className="space-y-5">
      <div className="ui-card rounded-t-none border-t border-outline-subtle p-4 sm:px-6 sm:py-4 space-y-4">
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

        {designTab === "diagram" && (
          <div className="border-t border-outline-subtle pt-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav
                aria-label="Breadcrumb"
                className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap py-1 text-xs"
              >
                <button
                  type="button"
                  onClick={() => navigate("")}
                  aria-current={!scope ? "page" : undefined}
                  className="px-3 py-1.5 rounded-full font-mono text-xs transition-colors cursor-pointer border border-outline-subtle bg-surface-sunken text-on-muted hover:bg-surface-hover hover:text-on-surface aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container aria-[current=page]:border-primary-outline aria-[current=page]:font-bold"
                >
                  C1 · Context
                </button>
                {path.map((node, index) => (
                  <span key={node.id} className="flex shrink-0 items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-on-subtle" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => navigate(node.id)}
                      aria-current={node.id === scope?.id ? "page" : undefined}
                      className="px-3 py-1.5 rounded-full font-mono text-xs transition-colors cursor-pointer border border-outline-subtle bg-surface-sunken text-on-muted hover:bg-surface-hover hover:text-on-surface aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container aria-[current=page]:border-primary-outline aria-[current=page]:font-bold"
                    >
                      C{index + 2} · {node.label}
                    </button>
                  </span>
                ))}
              </nav>
              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={importing}
                  title={t("c4.fileHelp")}
                  onClick={() => fileInput.current?.click()}
                  className="ui-btn-tonal"
                >
                  <Upload aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>{t(importing ? "c4.importing" : "c4.importModel")}</span>
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={exportModel}
                  className="ui-btn-tonal"
                >
                  <Download aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>{t("c4.exportModel")}</span>
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".json,application/json"
                  aria-label={t("c4.importModel")}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void importModel(file);
                  }}
                />
              </div>
            </div>

            {fileStatus && (
              <div
                role={fileStatus === "importSuccess" ? "status" : "alert"}
                className={
                  fileStatus === "importSuccess" ? "ui-banner-success" : "ui-banner-danger"
                }
              >
                <div className="flex items-center gap-2">
                  {fileStatus === "importSuccess" ? (
                    <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
                  )}
                  <span>{t(`c4.${fileStatus}`)}</span>
                </div>
              </div>
            )}
          </div>
        )}
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
