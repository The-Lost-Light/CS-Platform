/**
 * ChangeTracker 模組 — 精確計算並紀錄學生在程式碼編輯區的每一次「插入 (insert)」、「刪除 (delete)」、「替換 (replace)」操作
 * 完整支援 React 受控編輯器與 Monaco Editor 雙模式，並支援 JSON / CSV 匯出與行號定位。
 */

export function computeTextChangeRecord(prevText: string, nextText: string, fileName = 'main.py', counter = 1) {
  if (prevText === nextText) return null;

  const prevLen = prevText.length;
  const nextLen = nextText.length;

  // 1. 尋找共同前綴長度 (Common Prefix)
  let start = 0;
  const minLen = Math.min(prevLen, nextLen);
  while (start < minLen && prevText[start] === nextText[start]) {
    start++;
  }

  // 2. 尋找共同後綴長度 (Common Suffix)，確保不與前綴重疊
  let prevEnd = prevLen;
  let nextEnd = nextLen;
  while (
    prevEnd > start &&
    nextEnd > start &&
    prevText[prevEnd - 1] === nextText[nextEnd - 1]
  ) {
    prevEnd--;
    nextEnd--;
  }

  const removed = prevText.slice(start, prevEnd);
  const inserted = nextText.slice(start, nextEnd);

  let type = 'insert';
  if (removed.length > 0 && inserted.length > 0) {
    type = 'replace';
  } else if (removed.length > 0) {
    type = 'delete';
  } else {
    type = 'insert';
  }

  // 計算變更起始位置的 1-based 行號 (line) 與欄號 (column)
  const prefixSlice = prevText.slice(0, start);
  const prefixLines = prefixSlice.split('\n');
  const line = prefixLines.length;
  const column = prefixLines[prefixLines.length - 1].length + 1;

  const endSlice = nextText.slice(0, nextEnd);
  const endLines = endSlice.split('\n');
  const endLine = endLines.length;
  const endColumn = endLines[endLines.length - 1].length + 1;

  return {
    id: String(counter),
    timestamp: new Date().toISOString(),
    file: fileName,
    filePath: `/workspace/${fileName}`,
    line,
    column,
    endLine,
    endColumn,
    type, // 'insert' | 'delete' | 'replace'
    removed,
    inserted,
  };
}

export function summarizeChangeRecords(records: ChangeRecord[] = []) {
  let insert = 0;
  let del = 0;
  let replace = 0;
  for (const r of records) {
    if (r.type === 'insert') insert++;
    else if (r.type === 'delete') del++;
    else if (r.type === 'replace') replace++;
  }
  return {
    total: records.length,
    insert,
    delete: del,
    replace,
  };
}

export function exportChangesAsJSON(records: ChangeRecord[], filename = `changes_${Date.now()}.json`) {
  const jsonStr = JSON.stringify(records, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, filename);
}

export function exportChangesAsCSV(records: ChangeRecord[], filename = `changes_${Date.now()}.csv`) {
  const header = 'id,timestamp,file,line,column,type,removed,inserted\n';
  const rows = records
    .map((r) =>
      [
        r.id,
        r.timestamp,
        JSON.stringify(r.file || 'main.py'),
        r.line,
        r.column,
        r.type,
        JSON.stringify(r.removed || ''),
        JSON.stringify(r.inserted || ''),
      ].join(',')
    )
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type ChangeRecord = NonNullable<ReturnType<typeof computeTextChangeRecord>>;
