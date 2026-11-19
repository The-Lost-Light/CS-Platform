import assert from "node:assert/strict";

import { PROJECTS, getLocalizedProjects, mergeProjectCatalog } from "@modules/projects";
import { isUniqueViolation } from "@server/errors";
import { test } from "vite-plus/test";

test("catalog includes templates and custom projects once, honoring template edits", () => {
  const edited = { ...PROJECTS[0], title: "Edited template" };
  const custom = { ...PROJECTS[0], id: "custom", codeName: "CUSTOM" };
  const result = mergeProjectCatalog(PROJECTS, [custom, edited], []);
  assert.equal(result.length, PROJECTS.length + 1);
  assert.equal(result.find((project) => project.id === edited.id)?.title, "Edited template");
  assert.equal(result.filter((project) => project.id === edited.id).length, 1);
});
test("removed templates and overrides stay removed in either language, including an empty catalog", () => {
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
test("unique constraint errors are detected through wrapped database causes", () => {
  assert.equal(
    isUniqueViolation(
      new Error("Query failed", { cause: new Error("UNIQUE constraint failed: user.email") }),
    ),
    true,
  );
  assert.equal(isUniqueViolation(new Error("Connection failed")), false);
  assert.equal(isUniqueViolation({ message: "opaque" }), false);
});
