import { designVersions, designVersionParts } from "@db/schema";
import { validateC4File } from "@modules/c4-model";
import {
  emptyModel,
  type DesignContent,
  type DesignEdit,
  type DesignVersion,
} from "@modules/workspace";
import { availableProject } from "@server/projects";
import { and, db, eq, sql } from "void/db";

import { userTable } from "../../.void/better-auth-schema";
import { splitWorkspaceContent } from "./parts";

const key = (userId: string, projectId: string) =>
  and(eq(designVersions.userId, userId), eq(designVersions.projectId, projectId));

export async function latestDesignVersion(userId: string, projectId: string) {
  const row = await db.get<{ version: number }>(sql`SELECT COALESCE(MAX(version), 0) AS version
    FROM ${designVersions} WHERE ${key(userId, projectId)}`);
  return row?.version ?? 0;
}

export async function studentHistoryAvailable(userId: string, projectId: string) {
  return Boolean(
    await db.get(sql`SELECT 1 FROM ${userTable}
    WHERE ${userTable.id} = ${userId} AND ${userTable.deleted} = 0
      AND COALESCE(${userTable.role}, 'user') != 'admin' AND ${availableProject(projectId)}`),
  );
}

// Offsets are UTF-16 indices. JSON escapes lone surrogate halves in replacement text.
type Splice = [start: number, removed: number, inserted: string];
type Delta = { designDoc?: Splice; model?: Splice };

function difference(before: string, after: string): Splice | undefined {
  if (before === after) return;
  let start = 0;
  let end = 0;
  const length = Math.min(before.length, after.length);
  while (start < length && before[start] === after[start]) start++;
  while (end < length - start && before[before.length - 1 - end] === after[after.length - 1 - end])
    end++;
  return [start, before.length - start - end, after.slice(start, after.length - end)];
}

function applySplice(value: string, change?: Splice) {
  if (!change) return value;
  const [start, removed, inserted] = change;
  return value.slice(0, start) + inserted + value.slice(start + removed);
}

// A checkpoint bounds replay to at most 31 small deltas, including for large C4 imports.
export function designHistoryInserts(
  userId: string,
  projectId: string,
  version: number,
  base: DesignContent | null,
  edits: DesignEdit[],
) {
  let doc = base?.designDoc ?? "";
  let lastModel = base?.model ?? emptyModel();
  let modelText = JSON.stringify(lastModel);
  const statements = [];
  for (const edit of edits) {
    const nextModel = lastModel === edit.model ? modelText : JSON.stringify(edit.model);
    const delta: Delta = {
      designDoc: difference(doc, edit.designDoc),
      model: difference(modelText, nextModel),
    };
    if (!delta.designDoc && !delta.model) continue;
    doc = edit.designDoc;
    modelText = nextModel;
    lastModel = edit.model;
    const id = crypto.randomUUID();
    version++;
    const patch = JSON.stringify(delta);
    const checkpoint = version % 32 === 1 || patch.length > 32 * 1024;
    const content = checkpoint ? JSON.stringify({ designDoc: doc, model: edit.model }) : patch;
    statements.push(
      db.insert(designVersions).values({
        id,
        userId,
        projectId,
        version,
        editedAt: edit.editedAt,
        checkpoint,
      }),
    );
    for (const [part, chunk] of splitWorkspaceContent(content).entries()) {
      statements.push(db.insert(designVersionParts).values({ id, part, content: chunk }));
    }
  }
  return statements;
}

export async function readDesignVersion(
  userId: string,
  projectId: string,
  version: number,
): Promise<DesignVersion | null> {
  const scope = key(userId, projectId);
  const rows = await db
    .select({
      version: designVersions.version,
      editedAt: designVersions.editedAt,
      checkpoint: designVersions.checkpoint,
      part: designVersionParts.part,
      content: designVersionParts.content,
    })
    .from(designVersions)
    .innerJoin(designVersionParts, eq(designVersions.id, designVersionParts.id))
    .where(
      and(
        scope,
        sql`${designVersions.version} BETWEEN (
      SELECT MAX(version) FROM ${designVersions} WHERE ${scope} AND checkpoint = 1 AND version <= ${version}
    ) AND ${version}`,
      ),
    )
    .orderBy(designVersions.version, designVersionParts.part);
  const last = rows.at(-1);
  if (last?.version !== version) return null;
  let doc = "";
  let model = "";
  let parts: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    parts.push(row.content);
    if (rows[i + 1]?.version === row.version) continue;
    const data = JSON.parse(parts.join(""));
    parts = [];
    if (row.checkpoint) {
      doc = data.designDoc;
      // Migrated workspaces include repoUrl. New checkpoints already have the exact
      // serialized field order used for the following character offsets.
      model = JSON.stringify("repoUrl" in data ? validateC4File(data.model) : data.model);
    } else {
      const delta: Delta = data;
      doc = applySplice(doc, delta.designDoc);
      model = applySplice(model, delta.model);
    }
  }
  return {
    version,
    editedAt: last.editedAt,
    designDoc: doc,
    model: validateC4File(JSON.parse(model)),
  };
}
