import assert from 'node:assert/strict';
import test from 'node:test';
import { ADVANCED_PROJECTS } from '../src/data/assignmentsData';
import { overlapsC4Boundary, c4Drilldown, createC4NodeInScope, migrateC4Nodes, removeC4Nodes, visibleC4Nodes, type C4Node } from '../src/utils/c4Model';
import { analyzeArchitectureAlignment } from '../src/utils/architectureAnalyzer';
import { BUILTIN_REPO_SNAPSHOTS } from '../src/utils/githubService';

const nodes = migrateC4Nodes(ADVANCED_PROJECTS[0].initialMindMapNodes);

test('new nodes are placed below the full height of resized siblings', () => {
  const siblings = [{ ...nodes[0], y: 100, height: 600 }, { ...nodes[0], id: 'other', y: 400, height: 160 }];
  assert.equal(createC4NodeInScope(siblings, '', 'new', 'New')?.y, 750);
});

test('an empty node opens its own boundary and accepts its first child', () => {
  const empty = c4Drilldown(nodes, 'node-db');
  assert.equal(empty.scope?.id, 'node-db');
  assert.deepEqual(empty.inside, []);
  assert.deepEqual(empty.path.map(node => node.id), ['node-root', 'node-db']);
  assert.deepEqual(empty.outside, []);
  const child = createC4NodeInScope(nodes, 'node-db', 'db-child', 'Database component')!;
  assert.equal(child.kind, 'component');
  const populated = c4Drilldown([...nodes, child], 'node-db');
  assert.deepEqual(populated.inside.map(node => node.id), ['db-child']);
  assert.deepEqual(populated.outside, empty.outside);
});

test('new nodes belong to the current scope and infer their C4 level', () => {
  for (const [scopeId, kind] of [['', 'system'], ['node-root', 'container'], ['node-fe-core', 'component'], ['node-editor', 'code']]) {
    const created = createC4NodeInScope(nodes, scopeId, 'new-node', 'New node')!;
    assert.equal(created.kind, kind);
    assert.equal(created.parentId, scopeId || null);
    const view = c4Drilldown([...nodes, created], scopeId);
    assert.ok(view.inside.some(node => node.id === created.id));
    assert.ok(view.inside.filter(node => node.id !== created.id).every(node => node.y + 230 < created.y));
  }
  const created = createC4NodeInScope([], '', 'root', 'First system')!;
  assert.equal(created.kind, 'system');
  assert.equal(created.y, 0);
  assert.equal(createC4NodeInScope(nodes, 'deleted', 'new', 'New'), undefined);
  const leaf: C4Node = { ...created, kind: 'code' };
  assert.equal(createC4NodeInScope([leaf], leaf.id, 'new', 'New')?.parentId, leaf.id);
  const person = { ...leaf, kind: 'person' as const };
  assert.equal(createC4NodeInScope([person], person.id, 'child', 'New')?.parentId, person.id);
});

test('drilldown hides enclosing peers by default and keeps them available for manual addition', () => {
  const person: C4Node = { ...nodes[0], id: 'user', kind: 'person', parentId: null };
  const code: C4Node = { ...nodes[0], id: 'class', kind: 'code', parentId: 'node-editor' };
  const all = [...nodes, person, code];
  const root = c4Drilldown(all, '');
  assert.deepEqual(root.outside, []);
  assert.deepEqual(root.visible.map(node => node.id), ['node-root', 'user']);
  for (const id of ['node-root', 'node-fe-core', 'node-editor']) {
    const next = c4Drilldown(all, id);
    assert.ok(next.inside.every(node => node.parentId === id));
    assert.deepEqual(next.outside, []);
    assert.equal(new Set(next.visible.map(node => node.id)).size, next.visible.length);
  }
  const deep = c4Drilldown(all, 'node-editor');
  assert.deepEqual(deep.inside.map(node => node.id), ['class']);
  assert.deepEqual(deep.outside, []);
  assert.deepEqual(deep.path.map(node => node.id), ['node-root', 'node-fe-core', 'node-editor']);
});

test('missing or deleted scope returns to context without stale boundary or breadcrumbs', () => {
  const view = c4Drilldown(removeC4Nodes(nodes, ['node-fe-core']), 'node-editor');
  assert.equal(view.scope, undefined);
  assert.deepEqual(view.path, []);
  assert.deepEqual(view.outside, []);
  assert.ok(view.visible.every(node => !node.parentId));
});
test('legacy path mappings survive C4 migration and databases belong to the system', () => {
  assert.deepEqual(nodes.map(node => [node.id, node.expectedPath]), ADVANCED_PROJECTS[0].initialMindMapNodes.map(node => [node.id, node.expectedPath]));
  assert.equal(nodes.find(node => node.id === 'node-db')?.parentId, 'node-root');
  assert.equal(nodes.find(node => node.id === 'node-tests')?.kind, 'component');
});
test('C4 scopes show their own elements without peer containers', () => {
  assert.deepEqual(visibleC4Nodes(nodes, 'system', '').map(node => node.id), ['node-root']);
  const visible = visibleC4Nodes(nodes, 'component', 'node-api').map(node => node.id);
  assert.ok(visible.includes('node-ai-service'));
  assert.ok(!visible.includes('node-db'));
  assert.ok(!visible.includes('node-root'));
  assert.ok(!visible.includes('node-api'));
  assert.ok(!visible.includes('node-editor'));
});
test('removing a system recursively removes descendants including code elements', () => {
  const code: C4Node = { ...nodes[0], id: 'class', kind: 'code', parentId: 'node-editor' };
  assert.deepEqual(removeC4Nodes([...nodes, code], ['node-root']), []);
  const remaining = removeC4Nodes([...nodes, code], ['node-fe-core']);
  assert.ok(!remaining.some(node => ['node-fe-core', 'node-editor', 'class'].includes(node.id)));
  assert.ok(remaining.some(node => node.id === 'node-api'));
});
test('people and external systems without paths do not lower file alignment', () => {
  const repoBundle = { ...BUILTIN_REPO_SNAPSHOTS['student-team/course-oj-platform'], sourceType: 'snapshot', rateLimit: '' };
  const base = analyzeArchitectureAlignment({ mindMapNodes: nodes, repoBundle });
  const person: C4Node = { ...nodes[0], id: 'user', kind: 'person', expectedPath: '', parentId: null };
  const withPerson = analyzeArchitectureAlignment({ mindMapNodes: [...nodes, person], repoBundle });
  assert.equal(withPerson.alignmentScore, base.alignmentScore);
  assert.equal(withPerson.nodeEvaluations.at(-1)?.status, 'unmapped');
});

test('external elements cannot receive children, but can become internal again', () => {
  const external = { ...nodes[0], external: true };
  assert.equal(createC4NodeInScope([external], external.id, 'child', 'Child'), undefined);
  assert.equal(createC4NodeInScope([{ ...external, external: false }], external.id, 'child', 'Child')?.parentId, external.id);
});


test('boundary movement includes partial overlaps but excludes separated nodes', () => {
  const boundary = { x: 100, y: 100, width: 400, height: 300 };
  for (const [x, y] of [[150, 150], [50, 150], [490, 150], [150, 50], [150, 390], [50, 50]]) {
    assert.equal(overlapsC4Boundary({ x, y, width: 100, height: 100 }, boundary), true);
  }
  for (const [x, y] of [[0, 0], [500, 150], [150, 400], [-100, 150]]) {
    assert.equal(overlapsC4Boundary({ x, y, width: 100, height: 100 }, boundary), false);
  }
});
