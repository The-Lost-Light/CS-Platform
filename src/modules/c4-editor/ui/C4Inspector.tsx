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
    <label className="ui-field-label space-y-1.5">
      <span>{label}</span>
      {content}
    </label>
  );

  return (
    <>
      {(selected || selectedEdge) && (
        <aside
          aria-label={t(selected ? "c4.editElement" : "c4.editRelationship")}
          className="ui-card shadow-m3-3 absolute right-4 top-4 z-20 w-80 max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] overflow-y-auto p-5"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSelectedId("");
              setEdgeId("");
            }
          }}
        >
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-outline-subtle">
            <span className="ui-chip-primary font-mono">
              {selected ? `${t("c4.editElement")} · ${selected.kind}` : t("c4.editRelationship")}
            </span>
            <button
              type="button"
              aria-label={t("c4.closeEditor")}
              className="ui-btn-icon w-8 h-8"
              onClick={() => {
                setSelectedId("");
                setEdgeId("");
              }}
            >
              <X aria-hidden="true" className="w-4 h-4" />
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
              <div className="ui-panel p-3 space-y-1.5">
                <label className="flex items-center justify-between gap-3 text-xs font-semibold text-on-surface cursor-pointer">
                  <span>{t("c4.external")}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    className="ui-switch"
                    checked={!!selected.external}
                    disabled={expandableIds.has(selected.id)}
                    aria-describedby="c4-external-help"
                    onChange={(event) => update({ external: event.target.checked })}
                  />
                </label>
                <p id="c4-external-help" className="text-xs text-on-subtle leading-relaxed">
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
                className="ui-btn-danger-tonal w-full mt-2 py-2"
                onClick={() => remove([selected.id])}
              >
                <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{t("c4.deleteElement")}</span>
              </button>
            </div>
          )}

          {selectedEdge && (
            <div className="space-y-3.5">
              <p className="ui-panel px-3 py-2 text-xs font-mono font-semibold text-secondary">
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
                className="ui-btn-danger-tonal w-full mt-2 py-2"
                onClick={() => removeEdges([selectedEdge.id])}
              >
                <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{t("c4.deleteRelationship")}</span>
              </button>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
