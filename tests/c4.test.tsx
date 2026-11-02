import assert from 'node:assert/strict';
import test from 'node:test';
import { ADVANCED_PROJECTS } from '../src/data/assignmentsData';
import { migrateC4Nodes, removeC4Nodes, visibleC4Nodes, type C4Node } from '../src/utils/c4Model';
import { analyzeArchitectureAlignment } from '../src/utils/architectureAnalyzer';
import { BUILTIN_REPO_SNAPSHOTS } from '../src/utils/githubService';

const nodes = migrateC4Nodes(ADVANCED_PROJECTS[0].initialMindMapNodes);
test('legacy path mappings survive C4 migration and databases belong to the system', () => {
  assert.deepEqual(nodes.map(node => [node.id, node.expectedPath]), ADVANCED_PROJECTS[0].initialMindMapNodes.map(node => [node.id, node.expectedPath]));
  assert.equal(nodes.find(node => node.id === 'node-db')?.parentId, 'node-root');
  assert.equal(nodes.find(node => node.id === 'node-tests')?.kind, 'component');
});
test('C4 scopes hide ancestors and unrelated components while retaining peer containers', () => {
  assert.deepEqual(visibleC4Nodes(nodes, 'system', '').map(node => node.id), ['node-root']);
  const visible = visibleC4Nodes(nodes, 'component', 'node-api').map(node => node.id);
  assert.ok(visible.includes('node-ai-service'));
  assert.ok(visible.includes('node-db'));
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
