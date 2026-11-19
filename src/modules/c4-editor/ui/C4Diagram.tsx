import { Background, Controls, MiniMap } from "@xyflow/react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  HelpCircle,
  Layers,
  Redo2,
  Undo2,
  Upload,
} from "lucide-react";

import type { C4Editor } from "../hooks/useC4Editor";
import type { FlowNode } from "../model/flowTypes";
import { C4Canvas, nodeTypes } from "./C4Canvas";
import { C4Inspector } from "./C4Inspector";
const colors = {
  internal: "var(--c4-internal-bg)",
  external: "var(--c4-external-bg)",
};

export function C4Diagram({ editor }: { editor: C4Editor }) {
  const {
    t,
    setSelectedId,
    setEdgeId,
    drawing,
    fileInput,
    flowInstance,
    importing,
    fileStatus,
    importRevision,
    cancelNodeClick,
    exportModel,
    importModel,
    scope,
    path,
    inside,
    flowNodes,
    flowEdges,
    navigate,
    remove,
    selectAfterClick,
    updateLayout,
    canConnect,
    connect,
    canUndo,
    canRedo,
    stepHistory,
    beginEditGroup,
  } = editor;
  return (
    <div
      role="tabpanel"
      id="design-panel-diagram"
      aria-labelledby="design-tab-diagram"
      className="space-y-5"
    >
      <div className="ui-card overflow-hidden bg-surface-sunken">
        <div className="ui-card-header flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
          <div className="flex min-w-48 flex-1 items-center gap-2.5">
            <div className="ui-icon-badge w-7 h-7 rounded-lg">
              <Layers aria-hidden="true" className="w-3.5 h-3.5" />
            </div>
            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap py-0.5 text-xs"
            >
              <button
                type="button"
                onClick={() => navigate("")}
                aria-current={!scope ? "page" : undefined}
                className="px-3 py-1.5 rounded-full font-mono text-xs transition-colors cursor-pointer border border-outline-subtle bg-surface/75 text-on-muted hover:bg-surface hover:text-on-surface aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container aria-[current=page]:border-primary-outline aria-[current=page]:font-bold aria-[current=page]:shadow-m3-1"
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
                    className="px-3 py-1.5 rounded-full font-mono text-xs transition-colors cursor-pointer border border-outline-subtle bg-surface/75 text-on-muted hover:bg-surface hover:text-on-surface aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container aria-[current=page]:border-primary-outline aria-[current=page]:font-bold aria-[current=page]:shadow-m3-1"
                  >
                    C{index + 2} · {node.label}
                  </button>
                </span>
              ))}
            </nav>
          </div>
          <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
            {fileStatus && (
              <div
                role={fileStatus === "importSuccess" ? "status" : "alert"}
                className={`inline-flex items-center gap-1.5 max-w-sm px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  fileStatus === "importSuccess"
                    ? "bg-success-container border-success-outline text-on-success-container"
                    : "bg-danger-container border-danger-outline text-on-danger-container"
                }`}
              >
                {fileStatus === "importSuccess" ? (
                  <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{t(`c4.${fileStatus}`)}</span>
              </div>
            )}
            <button
              type="button"
              disabled={!canUndo}
              onClick={() => stepHistory("undo")}
              className="ui-btn-outlined px-3 py-1.5 text-xs"
            >
              <Undo2 aria-hidden="true" className="w-3.5 h-3.5" />
              {t("c4.undo")}
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={() => stepHistory("redo")}
              className="ui-btn-outlined px-3 py-1.5 text-xs"
            >
              <Redo2 aria-hidden="true" className="w-3.5 h-3.5" />
              {t("c4.redo")}
            </button>
            <button
              type="button"
              disabled={importing}
              title={t("c4.fileHelp")}
              onClick={() => fileInput.current?.click()}
              className="ui-btn-tonal border border-primary-outline/70 px-3 py-1.5 text-xs"
            >
              <Upload aria-hidden="true" className="w-3.5 h-3.5" />
              <span>{t(importing ? "c4.importing" : "c4.importModel")}</span>
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={exportModel}
              className="ui-btn-tonal border border-primary-outline/70 px-3 py-1.5 text-xs"
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
            <details className="relative group">
              <summary className="ui-btn-outlined bg-surface text-primary border-primary-outline px-3 py-1.5 text-xs list-none [&::-webkit-details-marker]:hidden">
                <HelpCircle aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{t("c4.help")}</span>
              </summary>
              <div className="ui-menu absolute right-0 top-10 z-30 w-80 max-w-[calc(100vw-3rem)] p-4 space-y-2.5 text-xs text-on-muted">
                <p className="leading-relaxed">{t("c4.canvasInstructions")}</p>
                <p className="leading-relaxed">{t("c4.levelsDescription")}</p>
                <div className="pt-2 border-t border-outline-subtle space-y-1.5">
                  <p className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded border border-outline"
                      style={{ backgroundColor: colors.internal }}
                    />
                    {t("c4.internal")}
                  </p>
                  <p className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded border border-outline"
                      style={{ backgroundColor: colors.external }}
                    />
                    {t("c4.external")}
                  </p>
                  <p className="font-semibold text-secondary">● {t("c4.expandable")}</p>
                  <p className="font-semibold text-primary">● {t("c4.leaf")}</p>
                </div>
                <p className="text-[11px] text-on-subtle pt-2 border-t border-outline-subtle">
                  {t("c4.fileHelp")}
                </p>
              </div>
            </details>
          </div>
        </div>
        <div className="relative">
          <div
            style={{
              height: "max(600px, 72vh)",
              overscrollBehavior: "contain",
              position: "relative",
            }}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDownCapture={(event) => {
              beginEditGroup();
              drawing.startDrawing(event);
            }}
            onPointerMove={drawing.previewDrawing}
            onPointerUp={drawing.finishDrawing}
            onLostPointerCapture={drawing.cancelDrawing}
            onPointerCancel={drawing.cancelDrawing}
            onMouseDownCapture={(event) => {
              // Cancel browser middle-button autoscroll without stopping React Flow's pan handler.
              if (event.button === 1) event.preventDefault();
            }}
            onAuxClickCapture={(event) => {
              if (event.button === 1) event.preventDefault();
            }}
          >
            <C4Canvas
              key={`${importRevision}-${scope?.id || "context"}`}
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              // Keep the selected boundary behind its contents so nodes remain clickable.
              elevateNodesOnSelect={false}
              fitView
              onInit={(instance) => {
                flowInstance.current = instance;
              }}
              panOnDrag={[0, 1]}
              panActivationKeyCode={null}
              minZoom={0.15}
              maxZoom={2}
              onNodeClick={(event, node) => selectAfterClick(event.detail, node.id)}
              onNodeDoubleClick={(_, node) => {
                cancelNodeClick();
                if (node.type !== "boundary") navigate(node.id);
              }}
              zoomOnDoubleClick={false}
              onPaneClick={cancelNodeClick}
              onNodeDragStart={cancelNodeClick}
              onEdgeClick={(_, edge) => {
                cancelNodeClick();
                setEdgeId(edge.id);
                setSelectedId("");
              }}
              onNodesChange={updateLayout}
              onDelete={({ nodes, edges }) =>
                remove(
                  nodes.map((node) => node.id),
                  edges.map((edge) => edge.id),
                )
              }
              isValidConnection={canConnect}
              onConnect={connect}
            >
              <Background gap={24} color="var(--c4-grid)" />
              <Controls />
              <MiniMap
                nodeColor={(node) =>
                  (node.data as FlowNode["data"]).external ? colors.external : colors.internal
                }
                pannable
                zoomable
              />
            </C4Canvas>
            {drawing.preview && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: drawing.preview.x,
                  top: drawing.preview.y,
                  width: drawing.preview.width,
                  height: drawing.preview.height,
                  pointerEvents: "none",
                  zIndex: 10,
                }}
                className="border-2 border-dashed border-primary bg-primary/10 rounded-xl"
              />
            )}
          </div>
          <C4Inspector editor={editor} />
        </div>
        {!inside.length && (
          <p className="px-5 py-3.5 text-xs sm:text-sm font-medium text-on-muted bg-surface-sunken border-t border-outline-subtle">
            {t("c4.emptyLevel")}
          </p>
        )}
      </div>
    </div>
  );
}
