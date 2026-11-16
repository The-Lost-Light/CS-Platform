export type DiffMode = 'unified' | 'split';
export type PatchLine = { type: 'hunk' | 'add' | 'del' | 'ctx'; text: string };

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

export function parsePatch(patch: string): PatchLine[] {
  return patch ? patch.split('\n').map(text => ({
    type: text.startsWith('@@') ? 'hunk' : text.startsWith('+') ? 'add' : text.startsWith('-') ? 'del' : 'ctx',
    text,
  })) : [];
}

