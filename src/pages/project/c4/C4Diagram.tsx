import { Background, Controls, MiniMap } from "@xyflow/react";
import { HelpCircle, Layers } from "lucide-react";
import { C4Canvas, nodeTypes } from "./C4Canvas";
import type { FlowNode } from "./flowTypes";
import { C4Inspector } from "./C4Inspector";
import type { useC4Editor } from "./useC4Editor";
import type { C4ArchitectProps } from "./types";
const colors = {
  internal: "var(--c4-internal-bg)",
  external: "var(--c4-external-bg)",
};
const NODE_SINGLE_CLICK_DELAY_MS = 350;

export function C4Diagram({
  editor,
  nodes,
  onChangeNodes,
  relationships,
  onChangeRelationships,
}: Pick<
  C4ArchitectProps,
  "nodes" | "onChangeNodes" | "relationships" | "onChangeRelationships"
> & { editor: ReturnType<typeof useC4Editor> }) {
  const {
    t,
    setSelectedId,
    setEdgeId,
    drawStart,
    drawPreview,
    setDrawPreview,
    flowInstance,
    importRevision,
    nodeClickTimer,
    cancelNodeClick,
    scope,
    inside,
    boundaryId,
    boundary,
    insideIds,
    flowNodes,
    flowEdges,
    navigate,
    remove,
    addNode,
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
          {/* Material Design 3 Tonal Canvas Header Bar */}
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
                  <p className="font-semibold text-secondary">
                    ● {t("c4.expandable")}
                  </p>
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
            onPointerDownCapture={(event) => {
              if (event.button !== 2) return;
              const target = event.target as HTMLElement;
              if (
                !target.closest(
                  ".react-flow__pane, .react-flow__node-boundary",
                ) ||
                target.closest(
                  ".react-flow__node-c4, .react-flow__controls, .react-flow__minimap",
                )
              )
                return;
              event.preventDefault();
              drawStart.current = { x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = drawStart.current;
              if (!start) return;
              const rect = event.currentTarget.getBoundingClientRect();
              setDrawPreview({
                x: Math.min(start.x, event.clientX) - rect.left,
                y: Math.min(start.y, event.clientY) - rect.top,
                width: Math.abs(event.clientX - start.x),
                height: Math.abs(event.clientY - start.y),
              });
            }}
            onPointerUp={(event) => {
              const start = drawStart.current;
              if (!start || event.button !== 2) return;
              drawStart.current = null;
              setDrawPreview(null);
              event.currentTarget.releasePointerCapture(event.pointerId);
              const flow = flowInstance.current;
              if (!flow) return;
              const from = flow.screenToFlowPosition(start);
              const to = flow.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
              });
              if (
                Math.hypot(event.clientX - start.x, event.clientY - start.y) < 5
              )
                addNode(from);
              else
                addNode(
                  { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y) },
                  {
                    width: Math.max(200, Math.abs(to.x - from.x)),
                    height: Math.max(160, Math.abs(to.y - from.y)),
                  },
                );
            }}
            onLostPointerCapture={() => {
              drawStart.current = null;
              setDrawPreview(null);
            }}
            onPointerCancel={() => {
              drawStart.current = null;
              setDrawPreview(null);
            }}
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
              onNodeClick={(event, node) => {
                cancelNodeClick();
                if (event.detail > 1) return;
                nodeClickTimer.current = setTimeout(() => {
                  nodeClickTimer.current = null;
                  setSelectedId(node.id);
                  setEdgeId("");
                }, NODE_SINGLE_CLICK_DELAY_MS);
              }}
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
              onNodesChange={(changes) => {
                onChangeNodes(
                  nodes.map((node) => {
                    let updated = node;
                    if (scope && node.id === scope.id) {
                      updated = { ...node, boundary: { ...boundary } };
                      for (const change of changes) {
                        if (!("id" in change)) continue;
                        if (change.id === boundaryId) {
                          if (change.type === "position" && change.position)
                            Object.assign(updated.boundary!, change.position);
                          if (change.type === "dimensions" && change.dimensions)
                            Object.assign(updated.boundary!, change.dimensions);
                        }
                      }
                    }
                    if (scope && !insideIds.has(node.id)) return updated;
                    for (const change of changes) {
                      if (!("id" in change) || change.id !== node.id) continue;
                      if (change.type === "position" && change.position)
                        updated = {
                          ...updated,
                          x: change.position.x - (scope ? 40 : 0),
                          y: change.position.y - (scope ? 70 : 0),
                        };
                      if (change.type === "dimensions" && change.dimensions)
                        updated = {
                          ...updated,
                          width: change.dimensions.width,
                          height: change.dimensions.height,
                        };
                    }
                    return updated;
                  }),
                );
              }}
              onNodesDelete={(deleted) =>
                remove(deleted.map((node) => node.id))
              }
              onEdgesDelete={(deleted) =>
                onChangeRelationships(
                  relationships.filter(
                    (edge) => !deleted.some((item) => item.id === edge.id),
                  ),
                )
              }
              isValidConnection={(connection) =>
                connection.source !== connection.target &&
                !relationships.some(
                  (edge) =>
                    edge.source === connection.source &&
                    edge.target === connection.target,
                )
              }
              onConnect={(connection) => {
                const id = crypto.randomUUID();
                onChangeRelationships([
                  ...relationships,
                  {
                    id,
                    source: connection.source,
                    target: connection.target,
                    label: t("c4.uses"),
                    technology: "",
                  },
                ]);
                setEdgeId(id);
                setSelectedId("");
              }}
            >
              <Background gap={24} color="var(--c4-grid)" />
              <Controls />
              <MiniMap
                nodeColor={(node) =>
                  (node.data as FlowNode["data"]).external
                    ? colors.external
                    : colors.internal
                }
                pannable
                zoomable
              />
            </C4Canvas>
            {drawPreview && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: drawPreview.x,
                  top: drawPreview.y,
                  width: drawPreview.width,
                  height: drawPreview.height,
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

        {/* Material Design 3 Floating Inspector Drawer */}
        <C4Inspector
          editor={editor}
          nodes={nodes}
          relationships={relationships}
          onChangeRelationships={onChangeRelationships}
        />
      </div>
    </div>
  );
}
