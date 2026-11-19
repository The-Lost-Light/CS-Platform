import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { parseProjectInput } from "@modules/projects";

const valid = {
  codeName: "new-01",
  title: " New project ",
  summary: "A course project",
  dueDate: "2026-12-20T23:59",
  points: 100,
  tags: "React, React, D1",
  content: "    indented Markdown\n",
};
test("project creation normalizes identifiers and preserves Markdown without accepting student data or supplied IDs", () => {
  const project = parseProjectInput({
    ...valid,
    id: "project-fullstack-web",
    createdBy: "forged",
    initialDesignDoc: "answer",
    repoUrl: "private",
  });
  assert.ok(project);
  assert.equal(project.codeName, "NEW-01");
  assert.equal(project.title, "New project");
  assert.deepEqual(project.tags, ["React", "D1"]);
  assert.equal(project.content, valid.content);
  assert.equal("initialDesignDoc" in project, false);
  assert.equal("repoUrl" in project, false);
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
    { content: [] },
    { content: "x".repeat(40001) },
  ]) {
    assert.equal(parseProjectInput({ ...valid, ...patch }), null);
  }
  for (const input of [null, [], "text", {}]) assert.equal(parseProjectInput(input), null);
});
test("optional project fields can remain empty", () => {
  const project = parseProjectInput({
    ...valid,
    dueDate: "",
    tags: "",
    content: "",
  });
  assert.ok(project);
  assert.deepEqual(project.tags, []);
  assert.equal(project.content, "");
});
