import { Background, Controls, MiniMap } from "@xyflow/react";
import { HelpCircle, Layers } from "lucide-react";

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
    flowInstance,
    importRevision,
    cancelNodeClick,
    scope,
    inside,
    flowNodes,
    flowEdges,
    navigate,
    remove,
    selectAfterClick,
    updateLayout,
    canConnect,
    connect,
    removeEdges,
  } = editor;
  return (
    <div
      role="tabpanel"
      id="design-panel-diagram"
      aria-labelledby="design-tab-diagram"
      className="space-y-5"
    >
      <div className="relative">
        <div className="overflow-hidden rounded-3xl border border-outline-subtle bg-surface-sunken shadow-xs transition-colors">
          <div className="flex items-center justify-between border-b border-outline-tonal bg-surface-tonal px-5 py-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary text-on-primary flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-on-primary-container">
                {scope ? scope.label : "System Context"}
              </span>
            </div>
            <details className="relative group">
              <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface text-primary border border-primary-outline font-bold hover:bg-primary-container/50 transition">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{t("c4.help")}</span>
              </summary>
              <div className="absolute right-0 top-9 z-30 w-80 rounded-2xl border border-outline bg-surface p-4 shadow-xl space-y-2.5 text-xs text-on-muted">
                <p className="leading-relaxed">{t("c4.canvasInstructions")}</p>
                <p className="leading-relaxed">{t("c4.levelsDescription")}</p>
                <div className="pt-1 border-t border-outline space-y-1">
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
                <p className="text-[11px] text-on-subtle pt-1 border-t border-outline">
                  {t("c4.fileHelp")}
                </p>
              </div>
            </details>
          </div>
          <div
            style={{
              height: "max(600px, 72vh)",
              overscrollBehavior: "contain",
              position: "relative",
            }}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDownCapture={drawing.startDrawing}
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
              onNodesDelete={(deleted) => remove(deleted.map((node) => node.id))}
              onEdgesDelete={(deleted) => removeEdges(deleted.map((edge) => edge.id))}
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
                className="border-2 border-dashed border-primary bg-primary/10 rounded-2xl"
              />
            )}
          </div>
          {!inside.length && (
            <p className="p-4 text-xs sm:text-sm font-medium text-on-muted bg-surface border-t border-outline">
              {t("c4.emptyLevel")}
            </p>
          )}
        </div>
        <C4Inspector editor={editor} />
      </div>
    </div>
  );
}
