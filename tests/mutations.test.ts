import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { applyMutation } from "../src/fs/atomic-write.js";
import { assertContained, HarnessError, exists, repositoryPaths } from "../src/fs/repository.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("staged mutation rejects a divergent external edit before publication", async () => {
  const root = await repository();
  const target = join(root, "docs", "harness", "features", "one.md");
  await writeFile(target, "before", "utf8");
  await assert.rejects(
    applyMutation(root, [{ path: target, content: "after" }], undefined, {
      beforePublish: () => writeFile(target, "external", "utf8"),
    }),
    (error: unknown) => error instanceof HarnessError && error.code === "conflict" && /changed while mutation was staged/.test(error.message),
  );
  assert.equal(await readFile(target, "utf8"), "external");
});

test("handled partial publication rolls back already replaced paths", async () => {
  const root = await repository();
  const first = join(root, "docs", "harness", "features", "first.md");
  const second = join(root, "docs", "harness", "features", "second.md");
  await writeFile(first, "first-before", "utf8");
  await writeFile(second, "second-before", "utf8");
  await assert.rejects(applyMutation(root, [
    { path: first, content: "first-after" },
    { path: second, content: "second-after" },
  ], undefined, {
    beforeApply: (_change, index) => { if (index === 1) throw new Error("injected publication failure"); },
  }), /mutation failed during publication/);
  assert.equal(await readFile(first, "utf8"), "first-before");
  assert.equal(await readFile(second, "utf8"), "second-before");
});

test("rollback preserves a divergent user edit and reports its path", async () => {
  const root = await repository();
  const first = join(root, "docs", "harness", "features", "first.md");
  const second = join(root, "docs", "harness", "features", "second.md");
  await writeFile(first, "first-before", "utf8");
  await writeFile(second, "second-before", "utf8");
  await assert.rejects(
    applyMutation(root, [
      { path: first, content: "first-after" },
      { path: second, content: "second-after" },
    ], undefined, {
      beforeApply: async (_change, index) => {
        if (index === 1) {
          await writeFile(first, "external-after-publication", "utf8");
          throw new Error("injected publication failure");
        }
      },
    }),
    (error: unknown) => error instanceof HarnessError && error.details.some((path) => path.endsWith("first.md")),
  );
  assert.equal(await readFile(first, "utf8"), "external-after-publication");
  assert.equal(await readFile(second, "utf8"), "second-before");
});

test("a published ID reservation is not rolled back when later artifact publication fails", async () => {
  const root = await repository();
  const index = join(root, "docs", "harness", "index.md");
  const artifact = join(root, "docs", "harness", "features", "FEAT-001-example.md");
  await writeFile(index, "next_feature_sequence: 1\n", "utf8");
  await assert.rejects(applyMutation(root, [
    { path: index, content: "next_feature_sequence: 2\n", rollback: false },
    { path: artifact, content: "artifact" },
  ], undefined, {
    beforeApply: (_change, position) => { if (position === 1) throw new Error("injected artifact publication failure"); },
  }), /mutation failed during publication/);
  assert.equal(await readFile(index, "utf8"), "next_feature_sequence: 2\n");
  await assert.rejects(readFile(artifact, "utf8"));
});

test("a staging failure cleans temporary siblings created earlier in the batch", async () => {
  const root = await repository();
  const directory = join(root, "docs", "harness", "features");
  const first = join(directory, "first.md");
  const second = join(directory, "second.md");
  const conflictingTemporary = join(directory, `.second.md.harness-tmp-${process.pid}-1`);
  await writeFile(conflictingTemporary, "conflict", "utf8");
  await assert.rejects(applyMutation(root, [
    { path: first, content: "first" },
    { path: second, content: "second" },
  ]), /temporary path already exists/);
  const entries = await readdir(directory);
  assert.equal(entries.includes(`.first.md.harness-tmp-${process.pid}-0`), false);
  assert.equal(await readFile(conflictingTemporary, "utf8"), "conflict");
});

test("repository lock rejects concurrent writers and symlink containment rejects escape", async () => {
  const root = await repository();
  const lock = join(root, "docs", "harness", ".harness.lock");
  const target = join(root, "docs", "harness", "features", "one.md");
  await writeFile(lock, "other", "utf8");
  await assert.rejects(applyMutation(root, [{ path: target, content: "value" }]), (error: unknown) => error instanceof HarnessError && error.code === "conflict");
  await rm(lock);

  const outside = await mkdtemp(join(tmpdir(), "harness-outside-"));
  roots.push(outside);
  const link = join(root, "docs", "harness", "escape");
  await symlink(outside, link, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(assertContained(root, join(link, "file.md")), /escapes repository/);
});

async function repository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-mutation-"));
  roots.push(root);
  await mkdir(join(root, "docs", "harness", "features"), { recursive: true });
  return root;
}

test("lock acquisition occurs in the effective layout and does not create docs/harness", async () => {
  const { root, paths } = await customRepository("root: custom-docs\nfeatures: product-features\n");
  const target = join(paths.features, "one.md");
  await writeFile(target, "before", "utf8");

  // Let's acquire a lock manually in the custom layout to block mutation
  const lock = join(paths.harness, ".harness.lock");
  await mkdir(paths.harness, { recursive: true });
  await writeFile(lock, "other", "utf8");

  await assert.rejects(
    applyMutation(root, [{ path: target, content: "value" }]),
    (error: unknown) => error instanceof HarnessError && error.code === "conflict"
  );

  // Assert that docs/harness was not created
  assert.equal(await exists(join(root, "docs", "harness")), false);

  // Clean the manual lock
  await rm(lock);
});

async function customRepository(configContent: string): Promise<{ root: string; paths: any }> {
  const root = await mkdtemp(join(tmpdir(), "harness-mutation-custom-"));
  roots.push(root);
  await writeFile(join(root, "harness.yaml"), configContent, "utf8");
  const paths = await repositoryPaths(root);
  await mkdir(paths.features, { recursive: true });
  await mkdir(paths.harness, { recursive: true });
  return { root, paths };
}
