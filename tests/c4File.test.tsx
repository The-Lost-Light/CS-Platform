import assert from 'node:assert/strict';
import test from 'node:test';
import { ADVANCED_PROJECTS } from '../src/data/assignmentsData';
import { migrateC4Nodes } from '../src/utils/c4Model';
import { parseC4File, serializeC4File } from '../src/utils/c4File';

const nodes = migrateC4Nodes(ADVANCED_PROJECTS[0].initialMindMapNodes);
const relationships = [{ id: 'edge', source: nodes[0].id, target: nodes[1].id, label: '使用 → API', technology: 'HTTPS' }];
const fixture = () => JSON.parse(serializeC4File(nodes, relationships));

test('C4 JSON round trip preserves all levels, positions, metadata and directed relationships', () => {
  const moved = nodes.map((node, index) => ({ ...node, x: (index + 1) * -12.5, y: index * 37.25 }));
  const result = parseC4File('\uFEFF' + serializeC4File(moved, relationships));
  assert.deepEqual(result.nodes, moved);
  assert.deepEqual(result.relationships, relationships);
  assert.deepEqual(parseC4File(serializeC4File([], [])).nodes, []);
});

test('C4 import rejects malformed, incompatible and incomplete files', () => {
  for (const text of ['', '{', 'null', '[]', '{}']) assert.throws(() => parseC4File(text));
  for (const mutate of [
    (file: ReturnType<typeof fixture>) => { file.version = 2; },
    (file: ReturnType<typeof fixture>) => { file.format = 'other'; },
    (file: ReturnType<typeof fixture>) => { file.nodes[0].x = '12'; },
    (file: ReturnType<typeof fixture>) => { file.nodes[0].x = null; },
    (file: ReturnType<typeof fixture>) => { file.nodes[0].kind = 'unknown'; },
    (file: ReturnType<typeof fixture>) => { delete file.nodes[0].label; },
    (file: ReturnType<typeof fixture>) => { file.nodes[0].id = '__c4_boundary__'; },
    (file: ReturnType<typeof fixture>) => { file.nodes.push(file.nodes[0]); },
    (file: ReturnType<typeof fixture>) => { file.nodes[1].parentId = 'missing'; },
    (file: ReturnType<typeof fixture>) => { file.nodes[0].parentId = file.nodes[1].id; },
    (file: ReturnType<typeof fixture>) => { file.relationships[0].target = 'missing'; },
    (file: ReturnType<typeof fixture>) => { file.relationships[0].target = file.relationships[0].source; },
    (file: ReturnType<typeof fixture>) => { file.relationships.push(file.relationships[0]); },
  ]) {
    const file = fixture();
    mutate(file);
    assert.throws(() => parseC4File(JSON.stringify(file)));
  }
});

test('import strips unrelated object properties', () => {
  const file = fixture();
  file.nodes[0].selected = true;
  file.nodes[0].data = { onExplore: 'untrusted' };
  assert.deepEqual(parseC4File(JSON.stringify(file)).nodes, nodes);
});
