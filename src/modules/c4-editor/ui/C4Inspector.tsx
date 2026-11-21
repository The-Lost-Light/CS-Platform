import { X } from "lucide-react";
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
    showTechnology,
    update,
    selectedSourceLabel,
    selectedTargetLabel,
    updateEdge,
    beginEditGroup,
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
          onFocusCapture={beginEditGroup}
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
              {selected
                ? `${t("c4.editElement")} · ${selected.kind === "system" ? "context" : selected.kind}`
                : t("c4.editRelationship")}
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
              {showTechnology &&
                field(
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
            </div>
          )}

          {selectedEdge && (
            <div className="space-y-3.5">
              <p className="text-sm font-bold text-on-surface wrap-break-word">
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
            </div>
          )}
        </aside>
      )}
    </>
  );
}
