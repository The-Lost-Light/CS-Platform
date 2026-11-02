import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App';
import { I18nProvider } from '../src/i18n';
import { createTranslator, englishMessages, resolveLocale } from '../src/i18n/messages';
import { getLocalizedAssignments, updateLocalizedProjectDraft } from '../src/data/localizedAssignments';
import { analyzeArchitectureAlignment } from '../src/utils/architectureAnalyzer';
import { BUILTIN_REPO_SNAPSHOTS } from '../src/utils/githubService';
import { BasicAssignmentWorkspace } from '../src/components/basic/BasicAssignmentWorkspace';
import { AdvancedProjectWorkspace } from '../src/components/advanced/AdvancedProjectWorkspace';
import { ArchitectureComparisonPanel } from '../src/components/advanced/ArchitectureComparisonPanel';
import { GitHubRepoDashboard } from '../src/components/advanced/GitHubRepoDashboard';
import { LoginView } from '../src/components/auth/LoginView';
import { FloatingChangeTrackerModal } from '../src/components/basic/FloatingChangeTrackerModal';

const zh = getLocalizedAssignments('zh-TW');
const en = getLocalizedAssignments('en');
const t = createTranslator('en');
const han = /[\u3400-\u9fff]/;
const bundle = { ...BUILTIN_REPO_SNAPSHOTS['student-team/course-oj-platform'], sourceType: 'snapshot', rateLimit: '' };

test('saved language takes priority; unsupported values fall back to browser languages or Traditional Chinese', () => {
  assert.equal(resolveLocale('zh-TW', ['en-US']), 'zh-TW');
  assert.equal(resolveLocale('en', ['zh-TW']), 'en');
  assert.equal(resolveLocale('invalid', ['fr-FR', 'en-GB']), 'en');
  assert.equal(resolveLocale(null, ['zh-Hant-TW']), 'zh-TW');
  assert.equal(resolveLocale(null, ['ja-JP']), 'zh-TW');
  assert.equal(resolveLocale(null), 'zh-TW');
});

test('interpolation preserves literal code and unknown strings', () => {
  const input = '${value} {count} <script> $&';
  assert.equal(t('筆數：{count}', { count: input }), `Count: ${input}`);
  assert.equal(t('not in dictionary'), 'not in dictionary');
  assert.equal(t('constructor'), 'constructor');
  assert.equal(createTranslator('zh-TW')('筆數：{count}', { count: 3 }), '筆數：3');
});

test('translations preserve all interpolation parameters', () => {
  for (const [source, translation] of Object.entries(englishMessages)) {
    const placeholders = (text: string) => [...text.matchAll(/\{(p\d+|count)\}/g)].map(match => match[1]).sort();
    assert.deepEqual(placeholders(translation), placeholders(source), source);
  }
});

test('all built-in course text is translated and programming contracts remain unchanged', () => {
  assert.equal(han.test(JSON.stringify(en)), false);
  for (const [i, translated] of en.basicAssignments.entries()) {
    const original = zh.basicAssignments[i];
    assert.equal(translated.id, original.id);
    assert.equal(translated.codeName, original.codeName);
    assert.equal(translated.dueDate, original.dueDate);
    assert.deepEqual(translated.sampleCases.map(({ id, input, expectedOutput }) => ({ id, input, expectedOutput })),
      original.sampleCases.map(({ id, input, expectedOutput }) => ({ id, input, expectedOutput })));
    const executable = (code: string) => code.split('\n').filter(line => !line.trimStart().startsWith('#') && !line.includes('"""')).join('\n');
    assert.equal(executable(translated.starterCode), executable(original.starterCode));
  }
  for (const [i, project] of en.advancedProjects.entries()) {
    assert.deepEqual(project.initialMindMapNodes.map(({ id, expectedPath }) => ({ id, expectedPath })),
      zh.advancedProjects[i].initialMindMapNodes.map(({ id, expectedPath }) => ({ id, expectedPath })));
  }
});

test('language changes preserve custom nodes, edited fields, deleted nodes, paths and positions', () => {
  const before = zh.advancedProjects[0];
  const after = en.advancedProjects[0];
  const nodes = before.initialMindMapNodes.slice(0, 3).map(node => ({ ...node }));
  nodes[1].label = '我自己改的標題';
  nodes[1].expectedPath = 'src/custom.ts';
  nodes[1].x = 222;
  nodes.push({ ...nodes[0], id: 'custom', label: 'My custom module' });
  const doc = before.initialDesignDoc + '\nMy notes';
  const result = updateLocalizedProjectDraft(nodes, doc, before, after);
  assert.equal(result.nodes.length, nodes.length);
  assert.equal(result.nodes[0].label, after.initialMindMapNodes[0].label);
  assert.equal(result.nodes[1].label, nodes[1].label);
  assert.equal(result.nodes[1].description, after.initialMindMapNodes[1].description);
  assert.equal(result.nodes[1].expectedPath, 'src/custom.ts');
  assert.equal(result.nodes[1].x, 222);
  assert.deepEqual(result.nodes[3], nodes[3]);
  assert.equal(result.designDoc, doc);
  const pristine = updateLocalizedProjectDraft(before.initialMindMapNodes, before.initialDesignDoc, before, after);
  assert.deepEqual(pristine.nodes, after.initialMindMapNodes);
  assert.equal(pristine.designDoc, after.initialDesignDoc);
  const roundTrip = updateLocalizedProjectDraft(result.nodes, result.designDoc, after, before);
  assert.deepEqual(roundTrip.nodes, nodes);
  assert.equal(roundTrip.designDoc, doc);
});

test('architecture analysis localizes messages without changing scores or matches', () => {
  const analyze = (project: typeof en.advancedProjects[number], locale: 'en' | 'zh-TW') => analyzeArchitectureAlignment({
    mindMapNodes: project.initialMindMapNodes, designDoc: project.initialDesignDoc, repoBundle: bundle,
  }, createTranslator(locale));
  const english = analyze(en.advancedProjects[0], 'en');
  const chinese = analyze(zh.advancedProjects[0], 'zh-TW');
  assert.equal(english.alignmentScore, chinese.alignmentScore);
  assert.deepEqual(english.docPathAudit, chinese.docPathAudit);
  assert.deepEqual(english.nodeEvaluations.map(node => node.matchedFiles), chinese.nodeEvaluations.map(node => node.matchedFiles));
  assert.equal(han.test(JSON.stringify(english)), false);
});

const noop = () => {};
const analysis = analyzeArchitectureAlignment({ mindMapNodes: en.advancedProjects[0].initialMindMapNodes, repoBundle: bundle }, t);
const screens = {
  dashboard: <App />,
  login: <LoginView onLoginSuccess={noop} onChangeThemeMode={noop} />,
  python: <BasicAssignmentWorkspace assignment={en.basicAssignments[0]} allBasicAssignments={en.basicAssignments} onSelectAssignment={noop} onBackHome={noop} onUpdateRecords={noop} />,
  project: <AdvancedProjectWorkspace project={en.advancedProjects[0]} allAdvancedProjects={en.advancedProjects} onSelectProject={noop} onBackHome={noop} />,
  comparison: <ArchitectureComparisonPanel analysis={analysis} />,
  github: <GitHubRepoDashboard repoBundle={bundle} />,
  tracker: <FloatingChangeTrackerModal isOpen onClose={noop} onTogglePause={noop} onClearRecords={noop} onSelectRecordLine={noop} />,
};

for (const [name, screen] of Object.entries(screens)) {
  test(`${name} renders English UI without untranslated Chinese labels`, () => {
    const html = renderToStaticMarkup(<I18nProvider initialLanguage="en">{screen}</I18nProvider>);
    // Names and the native-language option are intentionally preserved; input values are user data.
    const visibleText = html.replace(/<[^>]*>/g, '').replaceAll('繁體中文', '').replaceAll('陳宥軒 (資工三甲)', '').replaceAll('林博宇 (資工三乙)', '').replaceAll('張簡助教 (Course TA)', '').replace(/[陳林張]/g, '');
    assert.equal(han.test(visibleText), false, visibleText.match(/.{0,30}[\u3400-\u9fff].{0,60}/g)?.join('\n') ?? '');
  });
}
