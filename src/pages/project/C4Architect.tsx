import {
  ChevronRight,
  Download,
  FileText,
  Network,
  Upload,
} from "lucide-react";
import { C4Diagram } from "./c4/C4Diagram";
import { DesignDocument } from "./c4/DesignDocument";
import { useC4Editor } from "./c4/useC4Editor";
import type { C4ArchitectProps } from "./c4/types";

export function C4Architect(props: C4ArchitectProps) {
  const {
    nodes,
    onChangeNodes,
    relationships,
    onChangeRelationships,
    designDoc,
    onChangeDesignDoc,
  } = props;
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
      {/* Material Design 3 Control Header Card */}
      <div className="ui-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="ui-pill-group gap-1"
            role="tablist"
            aria-label={t("workspace.tabs.design")}
          >
            <button
              type="button"
              role="tab"
              id="design-tab-readme"
              aria-controls="design-panel-readme"
              aria-selected={designTab === "readme"}
              onClick={() => setDesignTab("readme")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                designTab === "readme"
                  ? "bg-secondary text-on-secondary shadow-2xs"
                  : "text-on-muted hover:bg-surface-hover hover:text-on-surface"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>README.md</span>
            </button>
            <button
              type="button"
              role="tab"
              id="design-tab-diagram"
              aria-controls="design-panel-diagram"
              aria-selected={designTab === "diagram"}
              onClick={() => setDesignTab("diagram")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                designTab === "diagram"
                  ? "bg-primary text-on-primary shadow-2xs"
                  : "text-on-muted hover:bg-surface-hover hover:text-on-surface"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>C4 Model</span>
            </button>
          </div>
        </div>

        {designTab === "diagram" && (
          <div className="border-t border-outline pt-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Material Design 3 Tonal Breadcrumb Pills */}
              <nav
                aria-label="Breadcrumb"
                className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap py-1 text-xs"
              >
                <button
                  type="button"
                  onClick={() => navigate("")}
                  aria-current={!scope ? "page" : undefined}
                  className="px-3 py-1 rounded-full font-mono text-xs transition border border-outline bg-surface-sunken text-secondary hover:bg-secondary-container/60 aria-[current=page]:bg-secondary-container aria-[current=page]:text-on-secondary-container aria-[current=page]:border-secondary aria-[current=page]:font-bold"
                >
                  C1 · Context
                </button>
                {path.map((node, index) => (
                  <span
                    key={node.id}
                    className="flex shrink-0 items-center gap-1.5"
                  >
                    <ChevronRight
                      className="w-3.5 h-3.5 text-on-subtle"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={() => navigate(node.id)}
                      aria-current={node.id === scope?.id ? "page" : undefined}
                      className="px-3 py-1 rounded-full font-mono text-xs transition border border-outline bg-surface-sunken text-primary hover:bg-primary-container/60 aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container aria-[current=page]:border-primary aria-[current=page]:font-bold"
                    >
                      C{index + 2} · {node.label}
                    </button>
                  </span>
                ))}
              </nav>

              {/* Material Design 3 Action Buttons */}
              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={importing}
                  title={t("c4.fileHelp")}
                  onClick={() => fileInput.current?.click()}
                  className="ui-btn-tonal"
                >
                  <Upload className="w-3.5 h-3.5 text-secondary" />
                  <span>
                    {t(importing ? "c4.importing" : "c4.importModel")}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={exportModel}
                  className="ui-btn-tonal"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
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
              <p
                role={fileStatus === "importSuccess" ? "status" : "alert"}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border ${
                  fileStatus === "importSuccess"
                    ? "bg-success-container border-success-outline text-on-success-container"
                    : "bg-danger-container border-danger-outline text-on-danger-container"
                }`}
              >
                {t(`c4.${fileStatus}`)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area: README Panel or C4 Diagram Panel */}
      {designTab === "readme" ? (
        <DesignDocument
          designDoc={designDoc}
          onChangeDesignDoc={onChangeDesignDoc}
          readmeMode={readmeMode}
          setReadmeMode={setReadmeMode}
        />
      ) : (
        <C4Diagram
          editor={editor}
          nodes={nodes}
          onChangeNodes={onChangeNodes}
          relationships={relationships}
          onChangeRelationships={onChangeRelationships}
        />
      )}
    </div>
  );
}
