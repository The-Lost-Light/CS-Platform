import assert from 'node:assert/strict';
import test from 'node:test';
import { ADVANCED_PROJECTS } from '../src/data/assignmentsData';
import { migrateC4Nodes } from '../src/utils/c4Model';
import { parseC4File, serializeC4File } from '../src/utils/c4File';

const nodes = migrateC4Nodes(ADVANCED_PROJECTS[0].initialMindMapNodes);
const relationships = [{ id: 'edge', source: nodes[0].id, target: nodes[1].id, label: '使用 → API', technology: 'HTTPS' }];
const fixture = () => JSON.parse(serializeC4File(nodes, relationships));

test('import accepts four levels and rejects a fifth regardless of node kinds or order', () => {
  const chain = Array.from({ length: 5 }, (_, index) => ({ ...nodes[0], id: `level-${index}`, parentId: index ? `level-${index - 1}` : null }));
  assert.equal(parseC4File(serializeC4File(chain.slice(0, 4), [])).nodes.length, 4);
  assert.throws(() => parseC4File(serializeC4File(chain, [])));
  assert.throws(() => parseC4File(serializeC4File([...chain].reverse(), [])));
});

test('scope boundaries and independent context positions survive export and import', () => {
  const file = fixture();
  file.nodes[0].boundary = { x: -120, y: 80, width: 950, height: 720 };
  file.nodes[0].contextPositions = { peer: { x: 1100, y: -60 } };
  const restored = parseC4File(JSON.stringify(file));
  assert.deepEqual(restored.nodes[0].boundary, file.nodes[0].boundary);
  assert.deepEqual(restored.nodes[0].contextPositions?.peer, { x: 1100, y: -60 });
  file.nodes[0].boundary.width = -1;
  assert.throws(() => parseC4File(JSON.stringify(file)));
  file.nodes[0].boundary.width = 950;
  file.nodes[0].contextPositions.peer.x = 'invalid';
  assert.throws(() => parseC4File(JSON.stringify(file)));
});

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

test('C4 dimensions survive export and import while legacy nodes remain unchanged', () => {
  const resized = nodes.map((node, index) => index === 0 ? { ...node, width: 412.5, height: 360 } : node);
  assert.deepEqual(parseC4File(serializeC4File(resized, relationships)).nodes, resized);
  for (const key of ['width', 'height']) {
    for (const value of [0, -1, null, '300', Infinity]) {
      const file = fixture();
      file.nodes[0][key] = value;
      assert.throws(() => parseC4File(JSON.stringify(file)));
    }
  }
});

test('external flags round trip and external boundaries reject children', () => {
  const external = [{ ...nodes[0], external: true }];
  assert.deepEqual(parseC4File(serializeC4File(external, [])).nodes, external);
  assert.throws(() => parseC4File(serializeC4File([{ ...nodes[0], external: true }, ...nodes.slice(1)], relationships)));
  for (const value of ['true', 1, null]) {
    const file = fixture();
    file.nodes[0].external = value;
    assert.throws(() => parseC4File(JSON.stringify(file)));
  }
});
