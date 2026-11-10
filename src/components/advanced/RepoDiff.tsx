export type DiffMode = 'unified' | 'split';
type PatchLine = { type: 'hunk' | 'add' | 'del' | 'ctx'; text: string };

export function splitPatch(patch: string): { left: PatchLine | null; right: PatchLine | null }[] {
  const rows: { left: PatchLine | null; right: PatchLine | null }[] = [];
  let removed: PatchLine[] = [];
  let added: PatchLine[] = [];
  const flush = () => {
    for (let i = 0; i < Math.max(removed.length, added.length); i++) {
      rows.push({ left: removed[i] ?? null, right: added[i] ?? null });
    }
    removed = [];
    added = [];
  };
  for (const line of parsePatch(patch)) {
    if (line.type === 'del') {
      if (added.length) flush();
      removed.push(line);
    } else if (line.type === 'add') {
      added.push(line);
    } else if (line.text.startsWith('\\')) {
      // Keep missing-newline markers beside the line they describe.
      const pending = added.length ? added : removed;
      if (pending.length) pending[pending.length - 1].text += '\n' + line.text;
      else rows.push({ left: line, right: line });
    } else {
      flush();
      rows.push({ left: line, right: line });
    }
  }
  flush();
  return rows;
}

function parsePatch(patch: string): PatchLine[] {
  return patch ? patch.split('\n').map(text => ({
    type: text.startsWith('@@') ? 'hunk' : text.startsWith('+') ? 'add' : text.startsWith('-') ? 'del' : 'ctx',
    text,
  })) : [];
}

function lineClass(line: PatchLine | null) {
  const color = line?.type === 'add'
    ? 'bg-success-container/60 text-on-success-container border-l-2 border-success'
    : line?.type === 'del'
    ? 'bg-danger-container/60 text-on-danger-container border-l-2 border-danger'
    : line?.type === 'hunk'
    ? 'bg-secondary-container text-on-secondary-container font-bold'
    : 'text-on-muted';
  return `px-2 py-0.5 align-top ${color}`;
}

export function RepoDiff({ patch, mode }: { patch: string; mode: DiffMode }) {
  return (
    <div className="p-2 font-mono text-[11px] overflow-x-auto" data-diff-mode={mode}>
      {mode === 'split' ? (
        <table className="w-full border-collapse table-fixed">
          <tbody>
            {splitPatch(patch).map((row, index) => (
              <tr key={index}>
                <td className={`${lineClass(row.left)} w-1/2 border-r border-outline whitespace-pre-wrap break-all`}>{row.left?.text ?? '\u00a0'}</td>
                <td className={`${lineClass(row.right)} w-1/2 whitespace-pre-wrap break-all`}>{row.right?.text ?? '\u00a0'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="space-y-0.5">
          {parsePatch(patch).map((line, index) => <div key={index} className={`${lineClass(line)} whitespace-pre`}>{line.text}</div>)}
        </div>
      )}
    </div>
  );
}
