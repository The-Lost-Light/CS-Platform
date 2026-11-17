import type { C4Node, C4Relationship } from "@domain/c4";
import { serializeC4File } from "@domain/c4File";

/** Browser adapter; serialization itself stays usable without a DOM. */
export function downloadC4Model(
  nodes: C4Node[],
  relationships: C4Relationship[],
) {
  const url = URL.createObjectURL(
    new Blob([serializeC4File(nodes, relationships)], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "c4-model.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
