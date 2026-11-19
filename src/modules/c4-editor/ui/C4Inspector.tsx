import { Trash2, X } from "lucide-react";
import type { ReactNode } from "react";

import type { C4Editor } from "../hooks/useC4Editor";
const fieldClass = "ui-input px-3 py-2";

export function C4Inspector({ editor }: { editor: C4Editor }) {
  const {
    t,
    selected,
    selectedEdge,
    setSelectedId,
    setEdgeId,
    expandableIds,
    update,
    remove,
    selectedSourceLabel,
    selectedTargetLabel,
    updateEdge,
    removeEdges,
  } = editor;
  const field = (label: string, content: ReactNode) => (
    <label className="block space-y-1.5 text-xs font-semibold text-on-muted">
      <span>{label}</span>
      {content}
    </label>
  );

  return (
    <>
      {(selected || selectedEdge) && (
        <aside
          aria-label={t(selected ? "c4.editElement" : "c4.editRelationship")}
          className="absolute right-4 top-16 z-20 w-80 max-w-[calc(100%-2rem)] max-h-[calc(100%-5rem)] overflow-y-auto rounded-3xl border border-outline bg-surface p-4 shadow-xl"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSelectedId("");
              setEdgeId("");
            }
          }}
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container font-mono text-xs font-bold">
              {selected ? `${t("c4.editElement")} · ${selected.kind}` : t("c4.editRelationship")}
            </span>
            <button
              type="button"
              aria-label={t("c4.closeEditor")}
              className="w-7 h-7 rounded-full inline-flex items-center justify-center text-on-muted hover:bg-surface-high transition"
              onClick={() => {
                setSelectedId("");
                setEdgeId("");
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selected && (
            <div className="space-y-3.5">
              {field(
                t("c4.name"),
                <input
                  className={fieldClass}
                  value={selected.label}
                  onChange={(event) => update({ label: event.target.value })}
                />,
              )}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between gap-3 text-xs font-semibold text-on-surface">
                  <span>{t("c4.external")}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    className="h-4 w-4 accent-primary"
                    checked={!!selected.external}
                    disabled={expandableIds.has(selected.id)}
                    aria-describedby="c4-external-help"
                    onChange={(event) => update({ external: event.target.checked })}
                  />
                </label>
                <p id="c4-external-help" className="text-xs text-on-muted">
                  {t(expandableIds.has(selected.id) ? "c4.externalBlocked" : "c4.externalHelp")}
                </p>
              </div>
              {field(
                t("c4.technology"),
                <input
                  className={`${fieldClass} font-mono`}
                  value={selected.technology}
                  onChange={(event) => update({ technology: event.target.value })}
                  placeholder="React / REST / MySQL"
                />,
              )}
              {field(
                t("c4.responsibilities"),
                <textarea
                  rows={3}
                  className={fieldClass}
                  value={selected.description}
                  onChange={(event) => update({ description: event.target.value })}
                />,
              )}
              {field(
                t("c4.githubPath"),
                <input
                  className={`${fieldClass} font-mono`}
                  value={selected.expectedPath}
                  onChange={(event) => update({ expectedPath: event.target.value })}
                  placeholder="src/"
                />,
              )}
              <button
                type="button"
                className="w-full mt-2 px-3.5 py-2 rounded-xl bg-danger-container/60 hover:bg-danger-container text-on-danger-container border border-danger-outline text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
                onClick={() => remove([selected.id])}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t("c4.deleteElement")}</span>
              </button>
            </div>
          )}

          {selectedEdge && (
            <div className="space-y-3.5">
              <p className="px-3 py-1.5 rounded-xl bg-surface-high text-xs font-mono font-semibold text-secondary">
                {selectedSourceLabel} → {selectedTargetLabel}
              </p>
              {field(
                t("c4.relationshipDescription"),
                <input
                  className={fieldClass}
                  value={selectedEdge.label}
                  onChange={(event) => updateEdge({ label: event.target.value })}
                />,
              )}
              {field(
                t("c4.protocol"),
                <input
                  className={`${fieldClass} font-mono`}
                  value={selectedEdge.technology}
                  onChange={(event) => updateEdge({ technology: event.target.value })}
                />,
              )}
              <button
                type="button"
                className="w-full mt-2 px-3.5 py-2 rounded-xl bg-danger-container/60 hover:bg-danger-container text-on-danger-container border border-danger-outline text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
                onClick={() => removeEdges([selectedEdge.id])}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t("c4.deleteRelationship")}</span>
              </button>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
