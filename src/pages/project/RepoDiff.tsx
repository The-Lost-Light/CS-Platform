import {
  parsePatch,
  splitPatch,
  type DiffMode,
  type PatchLine,
} from "@domain/diff";

function lineClass(line: PatchLine | null) {
  const color =
    line?.type === "add"
      ? "bg-success-container/60 text-on-success-container border-l-2 border-success"
      : line?.type === "del"
        ? "bg-danger-container/60 text-on-danger-container border-l-2 border-danger"
        : line?.type === "hunk"
          ? "bg-secondary-container text-on-secondary-container font-bold"
          : "text-on-muted";
  return `px-2 py-0.5 align-top ${color}`;
}

export function RepoDiff({ patch, mode }: { patch: string; mode: DiffMode }) {
  return (
    <div
      className="p-2 font-mono text-[11px] overflow-x-auto"
      data-diff-mode={mode}
    >
      {mode === "split" ? (
        <table className="w-full border-collapse table-fixed">
          <tbody>
            {splitPatch(patch).map((row, index) => (
              <tr key={index}>
                <td
                  className={`${lineClass(row.left)} w-1/2 border-r border-outline whitespace-pre-wrap break-all`}
                >
                  {row.left?.text ?? "\u00a0"}
                </td>
                <td
                  className={`${lineClass(row.right)} w-1/2 whitespace-pre-wrap break-all`}
                >
                  {row.right?.text ?? "\u00a0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="space-y-0.5">
          {parsePatch(patch).map((line, index) => (
            <div key={index} className={`${lineClass(line)} whitespace-pre`}>
              {line.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
