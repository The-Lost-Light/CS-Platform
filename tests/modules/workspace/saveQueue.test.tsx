import type { PersonalWorkspace } from "@modules/workspace";
import { readWorkspaceInput } from "@server/workspaces";
import { assert, test, vi } from "vite-plus/test";

import type { SaveBatch } from "@/modules/workspace/model/personalWorkspace";
import { createSaveQueue } from "@/modules/workspace/services/saveQueue";
import { saveDraft } from "@/modules/workspace/services/workspaceApi";
import type { SaveResult } from "@/modules/workspace/services/workspaceApi";

const template: PersonalWorkspace = {
  designDoc: "",
  repoUrl: "",
  model: { format: "cap-c4", version: 1, nodes: [], relationships: [] },
};

test("autosave preserves every edit in order across batching and unmount during a write", async () => {
  vi.useFakeTimers();
  try {
    const first = Promise.withResolvers<SaveResult>();
    const write = vi
      .fn<(revision: string | null, batch: SaveBatch) => Promise<SaveResult>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ ok: true, revision: "next", updatedAt: 2000 });
    const saved = vi.fn();
    const queue = createSaveQueue(template, null, write, saved, vi.fn());
    const unmount = queue.mount();
    queue.update(template);
    await vi.advanceTimersByTimeAsync(1000);
    assert.strictEqual(write.mock.calls.length, 0);
    const edited = { ...template, designDoc: "edited" };
    queue.update({ ...template, designDoc: "first" });
    queue.update(edited);
    await vi.advanceTimersByTimeAsync(999);
    assert.strictEqual(write.mock.calls.length, 0);
    await vi.advanceTimersByTimeAsync(1);
    assert.deepEqual(
      write.mock.calls[0][1].edits.map((edit) => edit.draft.designDoc),
      ["first", "edited"],
    );
    const latest = { ...edited, designDoc: "latest" };
    queue.update(latest);
    unmount();
    first.resolve({ ok: true, revision: "first", updatedAt: 1000 });
    await vi.runAllTimersAsync();
    assert.deepEqual(
      write.mock.calls.map(([parent]) => parent),
      [null, "first"],
    );
    assert.deepEqual(
      write.mock.calls[1][1].edits.map((edit) => edit.draft),
      [latest],
    );
    assert.strictEqual(queue.hasPendingChanges(), false);
    assert.strictEqual(saved.mock.calls.length, 0);
  } finally {
    vi.useRealTimers();
  }
});

test("transient failures retry while conflicts and deadline locks stop later writes", async () => {
  vi.useFakeTimers();
  try {
    const write = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "draft.saveError", retry: true })
      .mockResolvedValueOnce({ ok: false, error: "draft.conflict", retry: false });
    const status = vi.fn();
    const queue = createSaveQueue(template, "original", write, vi.fn(), status);
    const unmount = queue.mount();
    queue.update({ ...template, designDoc: "a" });
    await vi.advanceTimersByTimeAsync(1000);
    assert.strictEqual(status.mock.lastCall?.[0], "draft.saveError");
    await vi.advanceTimersByTimeAsync(5000);
    assert.strictEqual(status.mock.lastCall?.[0], "draft.conflict");
    queue.update({ ...template, designDoc: "b" });
    unmount();
    await vi.runAllTimersAsync();
    assert.strictEqual(write.mock.calls.length, 2);
    assert.deepEqual(write.mock.calls[0], write.mock.calls[1]);

    const lockedWrite = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "draft.deadlinePassed", retry: false });
    const lockedStatus = vi.fn();
    const lockedQueue = createSaveQueue(template, "original", lockedWrite, vi.fn(), lockedStatus);
    const unmountLocked = lockedQueue.mount();
    lockedQueue.update({ ...template, designDoc: "late" });
    await vi.advanceTimersByTimeAsync(1000);
    assert.strictEqual(lockedStatus.mock.lastCall?.[0], "draft.deadlinePassed");
    lockedQueue.update({ ...template, designDoc: "even-later" });
    unmountLocked();
    await vi.runAllTimersAsync();
    assert.strictEqual(lockedWrite.mock.calls.length, 1);
  } finally {
    vi.useRealTimers();
  }
});

test("batched transport round-trips interleaved README, C4 and undo edits with their original times", async () => {
  const imported = {
    ...template.model,
    nodes: [
      {
        id: "s",
        label: "教學系統",
        kind: "system" as const,
        category: "system",
        description: "處理選課",
        technology: "",
        parentId: null,
        x: 2,
        y: 3,
      },
    ],
  };
  const drafts = [
    template,
    { ...template, designDoc: "📖" },
    { ...template, designDoc: "📖", model: imported },
    template,
  ];
  const capture = vi.fn(async (_url: string, options: RequestInit) => {
    const result = await readWorkspaceInput(
      new Request("https://course.example/workspace", options),
    );
    assert.ok(result.ok);
    assert.deepEqual(
      result.edits.map((edit) => [edit.designDoc, edit.model, edit.editedAt]),
      drafts.map((draft, index) => [draft.designDoc, draft.model, index]),
    );
    return Response.json({ revision: "saved", updatedAt: 42 });
  });
  vi.stubGlobal("document", { visibilityState: "visible" });
  vi.stubGlobal("fetch", capture);
  try {
    assert.ok(
      (
        await saveDraft("p", "u", null, {
          writeId: crypto.randomUUID(),
          edits: drafts.map((draft, editedAt) => ({ draft, editedAt })),
        })
      ).ok,
    );
    assert.equal(capture.mock.calls.length, 1);
  } finally {
    vi.unstubAllGlobals();
  }
});

test("oversized batches split in order and a corrected draft can follow a rejected single edit", async () => {
  vi.useFakeTimers();
  try {
    const accepted: string[] = [];
    const write = async (_parent: string | null, batch: SaveBatch): Promise<SaveResult> => {
      const doc = batch.edits[0].draft.designDoc;
      if (batch.edits.length > 1 || doc === "oversized")
        return { ok: false, error: "draft.tooLarge", retry: false };
      accepted.push(doc);
      return { ok: true, revision: doc, updatedAt: 2 };
    };
    const queue = createSaveQueue(template, null, write, vi.fn(), vi.fn());
    const unmount = queue.mount();
    for (const designDoc of ["a", "b", "oversized"]) queue.update({ designDoc });
    await vi.runAllTimersAsync();
    assert.deepEqual(accepted, ["a", "b"]);
    queue.update({ designDoc: "corrected" });
    await vi.runAllTimersAsync();
    assert.deepEqual(accepted, ["a", "b", "corrected"]);
    assert.equal(queue.hasPendingChanges(), false);
    unmount();
  } finally {
    vi.useRealTimers();
  }
});
