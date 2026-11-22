import { Card, Chip, FormField, IconButton, TextArea, TextInput } from "@shared/ui";
import { X } from "lucide-react";

import type { C4Editor } from "../hooks/useC4Editor";

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

  function closeInspector() {
    setSelectedId("");
    setEdgeId("");
  }

  return (
    <>
      {(selected || selectedEdge) && (
        <Card
          as="aside"
          onFocusCapture={beginEditGroup}
          aria-label={t(selected ? "c4.editElement" : "c4.editRelationship")}
          className="shadow-m3-3 absolute right-4 top-4 z-20 w-80 max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] overflow-y-auto p-5"
          onKeyDown={(event) => {
            if (event.key === "Escape") closeInspector();
          }}
        >
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-outline-subtle">
            <Chip variant="primary" mono>
              {selected
                ? `${t("c4.editElement")} · ${selected.kind === "system" ? "context" : selected.kind}`
                : t("c4.editRelationship")}
            </Chip>
            <IconButton icon={X} label={t("c4.closeEditor")} onClick={closeInspector} />
          </div>

          {selected && (
            <div className="space-y-3.5">
              <FormField label={t("c4.name")}>
                <TextInput
                  compact
                  value={selected.label}
                  onChange={(event) => update({ label: event.target.value })}
                />
              </FormField>
              {showTechnology && (
                <FormField label={t("c4.technology")}>
                  <TextInput
                    compact
                    mono
                    value={selected.technology}
                    onChange={(event) => update({ technology: event.target.value })}
                    placeholder="React / REST / MySQL"
                  />
                </FormField>
              )}
              <FormField label={t("c4.responsibilities")}>
                <TextArea
                  compact
                  rows={3}
                  value={selected.description}
                  onChange={(event) => update({ description: event.target.value })}
                />
              </FormField>
            </div>
          )}

          {selectedEdge && (
            <div className="space-y-3.5">
              <p className="text-sm font-bold text-on-surface wrap-break-word">
                {selectedSourceLabel} → {selectedTargetLabel}
              </p>
              <FormField label={t("c4.relationshipDescription")}>
                <TextInput
                  compact
                  value={selectedEdge.label}
                  onChange={(event) => updateEdge({ label: event.target.value })}
                />
              </FormField>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
