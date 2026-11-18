import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { parseProjectInput } from "@domain/projectInput";

const valid = {
  codeName: "new-01",
  title: " New project ",
  summary: "A course project",
  dueDate: "2026-12-20T23:59",
  points: 100,
  defaultRepoUrl: "https://github.com/example/project",
  tags: "React, React, D1",
  requirements: "First\r\nSecond",
  initialDesignDoc: "# Design",
};
test("project creation normalizes identifiers and creates an editable root without trusting supplied IDs", () => {
  const project = parseProjectInput({ ...valid, id: "project-fullstack-web", createdBy: "forged" });
  assert.ok(project);
  assert.equal(project.codeName, "NEW-01");
  assert.equal(project.title, "New project");
  assert.deepEqual(project.tags, ["React", "D1"]);
  assert.deepEqual(project.requirements, ["First", "Second"]);
  assert.equal(project.initialMindMapNodes[0].parentId, null);
  assert.equal("id" in project, false);
  assert.equal("createdBy" in project, false);
});
test("invalid project input cannot reach storage", () => {
  for (const patch of [
    { title: " " },
    { codeName: "../escape" },
    { summary: "x".repeat(2001) },
    { dueDate: "2026-02-30T12:00" },
    { dueDate: "2026-12-20T24:00" },
    { points: -1 },
    { points: 1.5 },
    { points: "100" },
    { defaultRepoUrl: "javascript:alert(1)" },
    { defaultRepoUrl: "https://github.com.evil.test/owner/repo" },
    { requirements: [] },
  ]) {
    assert.equal(parseProjectInput({ ...valid, ...patch }), null);
  }
  for (const input of [null, [], "text", {}]) assert.equal(parseProjectInput(input), null);
});
test("optional project fields can remain empty", () => {
  const project = parseProjectInput({
    ...valid,
    dueDate: "",
    defaultRepoUrl: "",
    tags: "",
    requirements: "",
    initialDesignDoc: "",
  });
  assert.ok(project);
  assert.deepEqual(project.tags, []);
  assert.deepEqual(project.requirements, []);
});
