import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { test } from "vite-plus/test";

import tsconfig from "../tsconfig.json";

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = directory + "/" + entry.name;
    return entry.isDirectory() ? files(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}

const sources = ["src", "pages", "routes", "server", "db", "tests"]
  .flatMap(files)
  .concat("auth.ts");
const aliasTargets = new Map(
  Object.entries(tsconfig.compilerOptions.paths).map(([pattern, [target]]) => [
    pattern.slice(0, -2),
    target,
  ]),
);

function resolveImport(file: string, name: string) {
  const [prefix, ...segments] = name.split("/");
  const target = aliasTargets.get(prefix);
  const base =
    target && segments.length
      ? path.posix.normalize(target.replace("*", () => segments.join("/")))
      : name.startsWith(".")
        ? path.posix.join(path.posix.dirname(file), name)
        : undefined;
  if (!base) return name;
  const candidates = [base, base + ".ts", base + ".tsx", base + "/index.ts", base + "/index.tsx"];
  const resolved = candidates.find((p) => existsSync(p) && statSync(p).isFile());
  assert.ok(resolved, `${file}: unresolved ${name}`);
  return resolved;
}

const graph = new Map(
  sources.map((file) => {
    const specifiers = readFileSync(file, "utf8").matchAll(
      /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*|\bvi\.mock\(\s*)["']([^"']+)["']/g,
    );
    return [file, Array.from(specifiers, ([, name]) => resolveImport(file, name))];
  }),
);

function feature(file: string) {
  return file.match(/^(src\/modules\/[^/]+|server\/[^/]+)\//)?.[1];
}

test("cross-feature imports use the public index, including route handlers and type imports", () => {
  for (const directory of ["src/modules", "server"]) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory())
        assert.ok(existsSync(`${directory}/${entry.name}/index.ts`), entry.name);
    }
  }
  for (const [file, dependencies] of graph) {
    for (const dep of dependencies) {
      const owner = feature(dep);
      if (owner && owner !== feature(file))
        assert.equal(dep, owner + "/index.ts", `${file} -> ${dep}`);
    }
  }
});

test("shared utilities, domain rules and client features respect their layers", () => {
  for (const [file, dependencies] of graph) {
    if (file.includes("/__tests__/")) continue;
    for (const dep of dependencies) {
      const edge = `${file} -> ${dep}`;
      if (file.startsWith("src/shared/") && graph.has(dep))
        assert.ok(dep.startsWith("src/shared/"), edge);
      if (file.startsWith("src/")) {
        assert.doesNotMatch(
          dep,
          /^(?:server|pages|routes|db|\.void)\/|^void\/(?:db|auth|schema-d1)$/,
          edge,
        );
        if (feature(file)) assert.ok(!dep.startsWith("src/app/"), edge);
      }
      if (file.includes("/model/") || file.startsWith("src/modules/c4-model/")) {
        assert.doesNotMatch(dep, /\/(?:hooks|ui|services)\/|^react(?:-dom)?$/, edge);
        if (!file.startsWith("src/modules/c4-editor/")) assert.notEqual(dep, "@xyflow/react", edge);
      }
      if (/\/(services|hooks|data)\//.test(file)) assert.ok(!dep.includes("/ui/"), edge);
    }
  }
});

function assertAcyclic(edges: Map<string, string[]>) {
  const done = new Set<string>();
  function visit(file: string, stack: string[]) {
    assert.ok(!stack.includes(file), `Dependency cycle: ${[...stack, file].join(" -> ")}`);
    if (done.has(file)) return;
    for (const dep of edges.get(file) ?? []) if (edges.has(dep)) visit(dep, [...stack, file]);
    done.add(file);
  }
  for (const file of edges.keys()) visit(file, []);
}
test("files and features have no dependency cycles, including type imports", () => {
  assertAcyclic(graph);
  const features = new Map<string, string[]>();
  for (const [file, deps] of graph) {
    const owner = feature(file);
    if (!owner || file.includes("/__tests__/")) continue;
    features.set(owner, [
      ...new Set([
        ...(features.get(owner) ?? []),
        ...deps.map(feature).filter((dep): dep is string => !!dep && dep !== owner),
      ]),
    ]);
  }
  assertAcyclic(features);
});
