import assert from "node:assert/strict";
import { test, vi } from "vite-plus/test";
import type { PersonalWorkspace } from "../model/personalWorkspace";
import { createSaveQueue } from "../services/saveQueue";
import type { SaveResult } from "../services/workspaceApi";

const template: PersonalWorkspace = {
  designDoc: "",
  repoUrl: "",
  model: { format: "codepulse-c4", version: 1, nodes: [], relationships: [] },
};

test("autosave debounces edits and flushes the newest draft after an in-flight write on unmount", async () => {
  vi.useFakeTimers();
  try {
    const first = Promise.withResolvers<SaveResult>();
    const write = vi
      .fn<(revision: string | null, draft: PersonalWorkspace) => Promise<SaveResult>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ ok: true, revision: "next" });
    const saved = vi.fn();
    const queue = createSaveQueue(template, null, write, saved, vi.fn());
    const unmount = queue.mount();
    queue.update(template);
    await vi.advanceTimersByTimeAsync(1000);
    assert.equal(write.mock.calls.length, 0);
    const edited = { ...template, designDoc: "edited" };
    queue.update({ ...template, designDoc: "first" });
    queue.update(edited);
    await vi.advanceTimersByTimeAsync(749);
    assert.equal(write.mock.calls.length, 0);
    await vi.advanceTimersByTimeAsync(1);
    assert.deepEqual(write.mock.calls, [[null, edited]]);
    const latest = { ...edited, designDoc: "latest" };
    queue.update(latest);
    unmount();
    first.resolve({ ok: true, revision: "first" });
    await vi.runAllTimersAsync();
    assert.deepEqual(write.mock.calls, [
      [null, edited],
      ["first", latest],
    ]);
    assert.equal(queue.hasPendingChanges(), false);
    assert.equal(saved.mock.calls.length, 0);
  } finally {
    vi.useRealTimers();
  }
});

test("transient failures retry while conflicts stop later writes", async () => {
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
    await vi.advanceTimersByTimeAsync(750);
    assert.equal(status.mock.lastCall?.[0], "draft.saveError");
    await vi.advanceTimersByTimeAsync(5000);
    assert.equal(status.mock.lastCall?.[0], "draft.conflict");
    queue.update({ ...template, designDoc: "b" });
    unmount();
    await vi.runAllTimersAsync();
    assert.equal(write.mock.calls.length, 2);
  } finally {
    vi.useRealTimers();
  }
});
