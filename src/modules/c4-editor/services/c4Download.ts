import { type C4Node, type C4Relationship, serializeC4File } from "@modules/c4-model";

/** Browser adapter; serialization itself stays usable without a DOM. */
export function downloadC4Model(nodes: C4Node[], relationships: C4Relationship[]) {
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
