import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve('src');
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}
const sources = files(root);
const graph = new Map<string, string[]>();
for (const file of sources) {
  const dependencies: string[] = [];
  // Scan module specifiers only; includes static, re-export and dynamic imports.
  const imports = readFileSync(file, 'utf8').matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g);
  for (const [, name] of imports) {
    if (name.startsWith('.') || name.startsWith('@/')) {
      const base = name.startsWith('@/') ? path.resolve(root, name.slice(2)) : path.resolve(path.dirname(file), name);
      const resolved = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx')].find(candidate => existsSync(candidate) && statSync(candidate).isFile());
      assert.ok(resolved, `${file}: unresolved ${name}`);
      dependencies.push(resolved);
    } else dependencies.push(name);
  }
  graph.set(file, dependencies);
}
const layer = (file: string) => path.relative(root, file).split(path.sep)[0];

test('domain and service modules do not depend on UI, hooks or fixture-derived types', () => {
  for (const [file, dependencies] of graph) {
    for (const dependency of dependencies) {
      if (layer(file) === 'domain') {
        assert.ok(!['pages', 'hooks', 'services', 'data'].includes(layer(dependency)), `${file} -> ${dependency}`);
        assert.ok(!['react', 'react-dom', '@xyflow/react'].includes(dependency), `${file} -> ${dependency}`);
      }
      if (['services', 'hooks', 'data', 'auth', 'i18n', 'theme'].includes(layer(file))) {
        assert.notEqual(layer(dependency), 'pages', `${file} -> ${dependency}`);
      }
    }
  }
});

test('source module dependency graph has no cycles, including type imports', () => {
  const done = new Set<string>();
  function visit(file: string, stack: string[]) {
    assert.ok(!stack.includes(file), `Dependency cycle: ${[...stack, file].map(p => path.relative(root, p)).join(' -> ')}`);
    if (done.has(file)) return;
    for (const dependency of graph.get(file) ?? []) if (graph.has(dependency)) visit(dependency, [...stack, file]);
    done.add(file);
  }
  for (const file of sources) visit(file, []);
});
