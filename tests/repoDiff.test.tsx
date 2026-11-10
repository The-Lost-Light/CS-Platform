import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { RepoDiff, splitPatch } from '../src/components/advanced/RepoDiff';

test('split diff pairs replacements and pads unequal changes within each hunk', () => {
  const rows = splitPatch('@@ -1,3 +1,2 @@\n same\n-old\n-extra\n+new\n@@ -9,0 +9 @@\n+added');
  assert.deepEqual(rows.map(row => [row.left?.text ?? null, row.right?.text ?? null]), [
    ['@@ -1,3 +1,2 @@', '@@ -1,3 +1,2 @@'],
    [' same', ' same'], ['-old', '+new'], ['-extra', null],
    ['@@ -9,0 +9 @@', '@@ -9,0 +9 @@'], [null, '+added'],
  ]);
  assert.deepEqual(splitPatch(''), []);
});

test('missing newline markers stay with their respective sides', () => {
  const rows = splitPatch('-old\n\\ No newline at end of file\n+new\n\\ No newline at end of file');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].left?.text, '-old\n\\ No newline at end of file');
  assert.equal(rows[0].right?.text, '+new\n\\ No newline at end of file');
});

test('diff mode changes rendered layout while preserving and escaping code', () => {
  const patch = '@@ -1 +1 @@\n-<old>\n+<new>';
  const unified = renderToStaticMarkup(<RepoDiff patch={patch} mode="unified" />);
  const split = renderToStaticMarkup(<RepoDiff patch={patch} mode="split" />);
  assert.ok(!unified.includes('<table'));
  assert.ok(split.includes('<table'));
  assert.equal((split.match(/<td /g) ?? []).length, 4);
  for (const html of [unified, split]) {
    assert.ok(html.includes('-&lt;old&gt;'));
    assert.ok(html.includes('+&lt;new&gt;'));
  }
});
