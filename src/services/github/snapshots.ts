import type { RepoSnapshot } from "../../domain/repository";

export async function loadBuiltinRepoSnapshot(
  key: string,
): Promise<RepoSnapshot> {
  const { default: snapshots } =
    await import("../../data/builtinRepoSnapshots.json");
  const snapshotKey = Object.hasOwn(snapshots, key)
    ? (key as keyof typeof snapshots)
    : "student-team/course-oj-platform";
  return snapshots[snapshotKey] as RepoSnapshot;
}
