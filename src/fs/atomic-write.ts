import { open, mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { assertContained, exists, HarnessError } from "./repository.js";

export interface FileMutation {
  path: string;
  content?: string;
  rollback?: boolean;
}

export interface MutationHooks {
  beforePublish?: (changes: readonly FileMutation[]) => void | Promise<void>;
  beforeApply?: (change: FileMutation, index: number) => void | Promise<void>;
}

interface Snapshot {
  exists: boolean;
  content?: string;
}

export async function withRepositoryLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  const harness = await assertContained(root, join(root, "docs", "harness"));
  await mkdir(harness, { recursive: true });
  const lockPath = join(harness, ".harness.lock");
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
    await handle.writeFile(`${process.pid}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new HarnessError("another Harness mutation owns the repository lock", "conflict", [relative(root, lockPath)]);
    }
    throw error;
  }

  try {
    return await action();
  } finally {
    await handle?.close().catch(() => undefined);
    await rm(lockPath, { force: true }).catch(() => undefined);
  }
}

export async function applyMutation(
  root: string,
  changes: readonly FileMutation[],
  validate?: (overlay: ReadonlyMap<string, string | undefined>) => void | Promise<void>,
  hooks: MutationHooks = {},
): Promise<void> {
  await withRepositoryLock(root, () => applyMutationUnlocked(root, changes, validate, hooks));
}

async function applyMutationUnlocked(
  root: string,
  changes: readonly FileMutation[],
  validate?: (overlay: ReadonlyMap<string, string | undefined>) => void | Promise<void>,
  hooks: MutationHooks = {},
): Promise<void> {
  const normalized: FileMutation[] = [];
  const seen = new Set<string>();
  for (const change of changes) {
    const path = await assertContained(root, change.path);
    if (seen.has(path)) throw new HarnessError(`duplicate mutation target: ${relative(root, path)}`, "invalid");
    seen.add(path);
    normalized.push({ ...change, path });
  }

  const snapshots = new Map<string, Snapshot>();
  const staged = new Map<string, string>();
  const overlay = new Map<string, string | undefined>();
  try {
    for (const [index, change] of normalized.entries()) {
      const snapshot = await snapshotOf(change.path);
      snapshots.set(change.path, snapshot);
      overlay.set(change.path, change.content);
      if (change.content !== undefined) {
        await mkdir(dirname(change.path), { recursive: true });
        const temporary = join(dirname(change.path), `.${basename(change.path)}.harness-tmp-${process.pid}-${index}`);
        if (await exists(temporary)) throw new HarnessError(`temporary path already exists: ${relative(root, temporary)}`, "conflict");
        const handle = await open(temporary, "wx", 0o600);
        try {
          await handle.writeFile(change.content, "utf8");
          await handle.sync();
        } finally {
          await handle.close();
        }
        staged.set(change.path, temporary);
      }
    }
    await validate?.(overlay);
    await hooks.beforePublish?.(normalized);
    for (const change of normalized) {
      const current = await snapshotOf(change.path);
      if (!sameSnapshot(current, snapshots.get(change.path)!)) {
        throw new HarnessError(`target changed while mutation was staged: ${relative(root, change.path)}`, "conflict");
      }
    }

    const applied: FileMutation[] = [];
    try {
      for (const [index, change] of normalized.entries()) {
        await hooks.beforeApply?.(change, index);
        const temporary = staged.get(change.path);
        if (temporary) await renameWithRetry(temporary, change.path);
        else await unlink(change.path);
        applied.push(change);
      }
    } catch (error) {
      const rollbackFailures = await rollback(root, applied, snapshots);
      const base = error instanceof Error ? error.message : String(error);
      throw new HarnessError(
        `mutation failed during publication: ${base}`,
        "conflict",
        rollbackFailures.length ? rollbackFailures : applied.map((entry) => relative(root, entry.path)),
      );
    }
  } finally {
    await Promise.all([...staged.values()].map((path) => rm(path, { force: true }).catch(() => undefined)));
  }
}

async function rollback(root: string, applied: readonly FileMutation[], snapshots: ReadonlyMap<string, Snapshot>): Promise<string[]> {
  const failures: string[] = [];
  for (const change of [...applied].reverse()) {
    if (change.rollback === false) continue;
    try {
      const current = await snapshotOf(change.path);
      const expected: Snapshot = change.content === undefined ? { exists: false } : { exists: true, content: change.content };
      if (!sameSnapshot(current, expected)) throw new Error("target diverged before rollback");
      const before = snapshots.get(change.path)!;
      if (!before.exists) {
        await rm(change.path, { force: true });
      } else {
        const temporary = join(dirname(change.path), `.${basename(change.path)}.harness-rollback-${process.pid}`);
        await writeFile(temporary, before.content!, { encoding: "utf8", flag: "wx", mode: 0o600 });
        await renameWithRetry(temporary, change.path);
      }
    } catch {
      failures.push(relative(root, change.path));
    }
  }
  return failures;
}

async function snapshotOf(path: string): Promise<Snapshot> {
  if (!(await exists(path))) return { exists: false };
  return { exists: true, content: await readFile(path, "utf8") };
}

function sameSnapshot(left: Snapshot, right: Snapshot): boolean {
  return left.exists === right.exists && (!left.exists || left.content === right.content);
}

async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= 2 || !["EACCES", "EBUSY", "EPERM"].includes(code ?? "")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }
}
