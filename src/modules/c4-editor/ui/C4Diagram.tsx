import { Background, Controls, MiniMap } from "@xyflow/react";
import { ChevronRight, HelpCircle, Layers, Pencil, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import { useEffect, useRef } from "react";

import type { C4Editor } from "../hooks/useC4Editor";
import { C4Canvas, nodeTypes } from "./C4Canvas";
import { C4Inspector } from "./C4Inspector";
const levelNames = ["Container", "Component", "Code"] as const;

export function C4Diagram({ editor }: { editor: C4Editor }) {
  const {
    t,
    selected,
    selectedEdge,
    setSelectedId,
    setEdgeId,
    contextMenu,
    setContextMenu,
    select,
    selectEdge,
    drawing,
    flowInstance,
    importRevision,
    scope,
    path,
    visible,
    flowNodes,
    flowEdges,
    navigate,
    remove,
    updateLayout,
    canConnect,
    connect,
    canUndo,
    canRedo,
    stepHistory,
    beginEditGroup,
  } = editor;
  function dismissInspector(keep?: { nodeId?: string; edgeId?: string }) {
    if (!keep?.nodeId || keep.nodeId !== selected?.id) {
      setSelectedId("");
    }
    if (!keep?.edgeId || keep.edgeId !== selectedEdge?.id) {
      setEdgeId("");
    }
  }
  function openContextMenu(
    event: {
      preventDefault: () => void;
      stopPropagation: () => void;
      clientX: number;
      clientY: number;
    },
    target: { nodeId?: string; edgeId?: string },
  ) {
    event.preventDefault();
    event.stopPropagation();
    dismissInspector(target);
    drawing.cancelDrawing();
    const rect = canvasRef.current?.getBoundingClientRect();
    setContextMenu({
      ...target,
      x: rect ? event.clientX - rect.left : event.clientX,
      y: rect ? event.clientY - rect.top : event.clientY,
    });
  }
  const helpRef = useRef<HTMLDetailsElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function dismissOverlay(event: PointerEvent) {
      const help = helpRef.current;
      if (help?.open && event.target instanceof Node && !help.contains(event.target)) {
        help.open = false;
      }
      const menu = menuRef.current;
      if (menu && event.target instanceof Node && !menu.contains(event.target)) {
        setContextMenu(null);
      }
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
        drawing.cancelDrawing();
      }
    }
    document.addEventListener("pointerdown", dismissOverlay, true);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOverlay, true);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [drawing, setContextMenu]);

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
                    C{index + 2} · {levelNames[index]}
                  </button>
                </span>
              ))}
            </nav>
          </div>
          <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              aria-pressed={drawing.creating}
              onClick={() => {
                setContextMenu(null);
                drawing.toggleCreating();
              }}
              className={
                drawing.creating
                  ? "ui-btn-primary px-3 py-1.5 text-xs"
                  : "ui-btn-outlined px-3 py-1.5 text-xs"
              }
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" />
              {t("c4.createNode")}
            </button>
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
            <details ref={helpRef} className="relative group">
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
                      className="h-3 w-3 rounded border-2"
                      style={{ borderColor: "var(--c4-expandable-border)" }}
                    />
                    {t("c4.expandable")}
                  </p>
                  <p className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded border-2"
                      style={{ borderColor: "var(--c4-leaf-border)" }}
                    />
                    {t("c4.leaf")}
                  </p>
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
            ref={canvasRef}
            style={{
              height: "max(600px, 72vh)",
              overscrollBehavior: "contain",
              position: "relative",
            }}
            className={drawing.creating ? "cursor-crosshair" : undefined}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDownCapture={(event) => {
              beginEditGroup();
              drawing.startDrawing(event);
            }}
            onPointerMove={drawing.previewDrawing}
            onPointerUp={drawing.finishDrawing}
            onLostPointerCapture={drawing.abortDrawing}
            onPointerCancel={drawing.abortDrawing}
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
              elementsSelectable={false}
              selectNodesOnDrag={false}
              nodesFocusable={false}
              edgesFocusable={false}
              fitView
              onInit={(instance) => {
                flowInstance.current = instance;
              }}
              panOnDrag={drawing.creating ? [1] : [0, 1]}
              panActivationKeyCode={null}
              minZoom={0.15}
              maxZoom={2}
              onNodeClick={(_, node) => {
                setContextMenu(null);
                dismissInspector(node.type === "boundary" ? undefined : { nodeId: node.id });
              }}
              onNodeDoubleClick={(_, node) => {
                setContextMenu(null);
                if (node.type !== "boundary") navigate(node.id);
              }}
              onNodeContextMenu={(event, node) => {
                if (node.type === "boundary") {
                  event.preventDefault();
                  event.stopPropagation();
                  setContextMenu(null);
                  dismissInspector();
                  return;
                }
                openContextMenu(event, { nodeId: node.id });
              }}
              zoomOnDoubleClick={false}
              onPaneClick={() => {
                setContextMenu(null);
                dismissInspector();
              }}
              onPaneContextMenu={(event) => {
                event.preventDefault();
                setContextMenu(null);
                dismissInspector();
              }}
              onNodeDragStart={() => setContextMenu(null)}
              onMoveStart={() => setContextMenu(null)}
              onEdgeClick={(_, edge) => {
                setContextMenu(null);
                dismissInspector({ edgeId: edge.id });
              }}
              onEdgeContextMenu={(event, edge) => openContextMenu(event, { edgeId: edge.id })}
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
              <MiniMap nodeColor="var(--c4-node-bg)" pannable zoomable />
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
          {contextMenu && (
            <div
              ref={menuRef}
              role="menu"
              onContextMenu={(event) => event.preventDefault()}
              style={{
                position: "absolute",
                left: contextMenu.x,
                top: contextMenu.y,
                zIndex: 30,
              }}
              className="ui-menu min-w-36 p-1.5 space-y-0.5"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (contextMenu.nodeId) select(contextMenu.nodeId);
                  else if (contextMenu.edgeId) selectEdge(contextMenu.edgeId);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <Pencil aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span>{t("c4.edit")}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (contextMenu.nodeId) remove([contextMenu.nodeId]);
                  else if (contextMenu.edgeId) remove([], [contextMenu.edgeId]);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-danger hover:bg-danger-container hover:text-on-danger-container transition-colors cursor-pointer"
              >
                <Trash2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>{t("c4.delete")}</span>
              </button>
            </div>
          )}
          <C4Inspector editor={editor} />
        </div>
        {!visible.length && (
          <p className="px-5 py-3.5 text-xs sm:text-sm font-medium text-on-muted bg-surface-sunken border-t border-outline-subtle">
            {t("c4.emptyLevel")}
          </p>
        )}
      </div>
    </div>
  );
}
