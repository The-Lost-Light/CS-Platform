import type { PersonalWorkspace } from "@modules/workspace";
import { assert, test, vi } from "vite-plus/test";

import { createSaveQueue } from "@/modules/workspace/services/saveQueue";
import type { SaveResult } from "@/modules/workspace/services/workspaceApi";

const template: PersonalWorkspace = {
  designDoc: "",
  repoUrl: "",
  model: { format: "cap-c4", version: 1, nodes: [], relationships: [] },
};

test("autosave debounces edits and flushes the newest draft after an in-flight write on unmount", async () => {
  vi.useFakeTimers();
  try {
    const first = Promise.withResolvers<SaveResult>();
    const write = vi
      .fn<(revision: string | null, draft: PersonalWorkspace) => Promise<SaveResult>>()
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
    assert.deepEqual(write.mock.calls, [[null, edited]]);
    const latest = { ...edited, designDoc: "latest" };
    queue.update(latest);
    unmount();
    first.resolve({ ok: true, revision: "first", updatedAt: 1000 });
    await vi.runAllTimersAsync();
    assert.deepEqual(write.mock.calls, [
      [null, edited],
      ["first", latest],
    ]);
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
