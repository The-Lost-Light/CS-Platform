import { PROJECTS, getLocalizedProjects, mergeProjectCatalog } from "@modules/projects";
import { isUniqueViolation } from "@server/errors";
import { assert, test } from "vite-plus/test";

test("catalog includes templates and custom projects once, honoring template edits", () => {
  const edited = { ...PROJECTS[0], title: "Edited template" };
  const custom = { ...PROJECTS[0], id: "custom", index: 3 };
  const result = mergeProjectCatalog(PROJECTS, [custom, edited], []);
  assert.strictEqual(result.length, PROJECTS.length + 1);
  assert.strictEqual(result.find((project) => project.id === edited.id)?.title, "Edited template");
  assert.strictEqual(result.filter((project) => project.id === edited.id).length, 1);
});
test("catalog sorts strictly by project index ascending rather than title", () => {
  const custom4 = { ...PROJECTS[0], id: "custom-4", index: 4, title: "Alpha" };
  const custom3 = { ...PROJECTS[0], id: "custom-3", index: 3, title: "Zeta" };
  const result = mergeProjectCatalog(PROJECTS, [custom4, custom3], []);
  assert.deepEqual(
    result.map((project) => ({ id: project.id, index: project.index })),
    [
      { id: PROJECTS[0].id, index: 1 },
      { id: PROJECTS[1].id, index: 2 },
      { id: "custom-3", index: 3 },
      { id: "custom-4", index: 4 },
    ],
  );
});
test("soft-deleted templates and overrides stay hidden in either language, including an empty catalog", () => {
  for (const locale of ["en", "zh-TW"] as const) {
    const templates = getLocalizedProjects(locale).projects;
    assert.ok(
      !mergeProjectCatalog(templates, [PROJECTS[0]], [PROJECTS[0].id]).some(
        (project) => project.id === PROJECTS[0].id,
      ),
    );
    assert.deepEqual(
      mergeProjectCatalog(
        templates,
        [],
        templates.map((project) => project.id),
      ),
      [],
    );
  }
});
test("catalog normalizes visible project indices to 1..N after soft deletions and reorders", () => {
  for (const locale of ["en", "zh-TW"] as const) {
    const templates = getLocalizedProjects(locale).projects;
    const reorderedTemplates = [
      { ...templates[0], index: 5 },
      { ...templates[1], index: 2 },
    ];
    const customFirst = { ...templates[0], id: "custom-first", index: 1, title: "Custom First" };
    const result = mergeProjectCatalog(
      templates,
      [customFirst, ...reorderedTemplates],
      [templates[1].id],
    );
    assert.deepEqual(
      result.map((project) => ({ id: project.id, index: project.index, title: project.title })),
      [
        { id: "custom-first", index: 1, title: "Custom First" },
        { id: templates[0].id, index: 2, title: templates[0].title },
      ],
    );
  }
});
test("unique constraint errors are detected through wrapped database causes", () => {
  assert.strictEqual(
    isUniqueViolation(
      new Error("Query failed", { cause: new Error("UNIQUE constraint failed: user.email") }),
    ),
    true,
  );
  assert.strictEqual(isUniqueViolation(new Error("Connection failed")), false);
  assert.strictEqual(isUniqueViolation({ message: "opaque" }), false);
});
