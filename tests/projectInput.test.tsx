import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, parseProjectInput } from "@modules/projects";
import { readProjectInput } from "@server/projects";
import { assert, test } from "vite-plus/test";

const valid = {
  title: " New project ",
  dueDate: "2026-12-20T23:59",
  points: 100,
  content: "    indented Markdown\n",
};
test("project creation normalizes fields and preserves Markdown without accepting student data or supplied IDs", () => {
  const project = parseProjectInput({
    ...valid,
    id: "project-fullstack-web",
    index: 99,
    codeName: "FORGED",
    createdBy: "forged",
    summary: "ignored",
    tags: "React, D1",
    initialDesignDoc: "answer",
    repoUrl: "private",
  });
  assert.ok(project);
  assert.strictEqual(project.title, "New project");
  assert.strictEqual(project.content, valid.content);
  assert.strictEqual("summary" in project, false);
  assert.strictEqual("tags" in project, false);
  assert.strictEqual("initialDesignDoc" in project, false);
  assert.strictEqual("repoUrl" in project, false);
  assert.strictEqual("id" in project, false);
  assert.strictEqual("index" in project, false);
  assert.strictEqual("codeName" in project, false);
  assert.strictEqual("createdBy" in project, false);
});
test("invalid project input cannot reach storage", () => {
  for (const patch of [
    { title: " " },
    { dueDate: "2026-02-30T12:00" },
    { dueDate: "2026-12-20T24:00" },
    { points: -1 },
    { points: 1.5 },
    { points: "100" },
    { content: [] },
    { content: "x".repeat(40001) },
  ]) {
    assert.strictEqual(parseProjectInput({ ...valid, ...patch }), null);
  }
  for (const input of [null, [], "text", {}]) assert.strictEqual(parseProjectInput(input), null);
});
test("optional project fields can remain empty", () => {
  const project = parseProjectInput({
    ...valid,
    dueDate: "",
    content: "",
  });
  assert.ok(project);
  assert.strictEqual(project.content, "");
});

test("project edits enforce the attachment limits across retained files and new uploads", async () => {
  const existing = { id: "retained", name: "existing.txt", size: MAX_ATTACHMENT_BYTES - 1 };
  function edit(files: string[]) {
    const form = new FormData();
    for (const [key, value] of Object.entries(valid)) form.set(key, String(value));
    form.append("attachments", existing.id);
    for (const content of files) form.append("attachments", new Blob([content]), "new.txt");
    return readProjectInput(
      new Request("https://course.example/api/projects/demo", {
        method: "PATCH",
        body: form,
      }),
      [existing],
    );
  }
  assert.ok(await edit(["a", ...Array<string>(MAX_ATTACHMENTS - 2).fill("")]));
  assert.isNull(await edit(["ab"]));
  assert.isNull(await edit(Array<string>(MAX_ATTACHMENTS).fill("")));
});
