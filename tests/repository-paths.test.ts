import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { afterEach, test } from "node:test";
import { repositoryPaths, findRepositoryRoot, HarnessError } from "../src/fs/repository.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-repo-test-"));
  const canonical = await realpath(root);
  roots.push(canonical);
  return canonical;
}

test("no config: defaults to docs/harness byte-for-byte equivalent layout", async () => {
  const root = await createTempRepo();
  const paths = await repositoryPaths(root);

  assert.equal(paths.root, root);
  assert.equal(paths.harness, join(paths.root, "docs", "harness"));
  assert.equal(paths.index, join(paths.harness, "index.md"));
  assert.equal(paths.features, join(paths.harness, "features"));
  assert.equal(paths.specs, join(paths.harness, "specs"));
  assert.equal(paths.decisions, join(paths.harness, "decisions"));
  assert.equal(paths.plans, join(paths.harness, "plans"));
  assert.equal(paths.reports, join(paths.harness, "reports"));
  assert.equal(paths.rules, join(paths.harness, "rules"));
  assert.equal(paths.templates, join(paths.harness, "templates"));
  assert.equal(paths.workflows, join(paths.harness, "workflows"));

  // Check display paths
  assert.equal(paths.relative.harness, "docs/harness");
  assert.equal(paths.relative.index, "docs/harness/index.md");
  assert.equal(paths.relative.features, "docs/harness/features");
  assert.equal(paths.relative.plans, "docs/harness/plans");
  assert.equal(paths.relative.workflows, "docs/harness/workflows");

  // Check allowlist
  assert.ok(paths.allowlist.includes(paths.index));
  assert.ok(paths.allowlist.includes(paths.features));
  assert.ok(paths.allowlist.includes(join(paths.harness, "graphify-out")));
  assert.ok(paths.allowlist.includes(join(paths.harness, "graph-out")));
});

test("root-only override resolves canonical collection names below custom root", async () => {
  const root = await createTempRepo();
  await writeFile(join(root, "harness.yaml"), "root: custom-docs\n", "utf8");
  const paths = await repositoryPaths(root);

  assert.equal(paths.harness, join(paths.root, "custom-docs"));
  assert.equal(paths.features, join(paths.harness, "features"));
  assert.equal(paths.relative.harness, "custom-docs");
  assert.equal(paths.relative.features, "custom-docs/features");
});

test("collection override merges overrides with canonical defaults", async () => {
  const root = await createTempRepo();
  await writeFile(
    join(root, "harness.yaml"),
    "root: docs\nfeatures: product-features\n",
    "utf8"
  );
  const paths = await repositoryPaths(root);

  assert.equal(paths.harness, join(paths.root, "docs"));
  assert.equal(paths.features, join(paths.harness, "product-features"));
  assert.equal(paths.specs, join(paths.harness, "specs"));

  assert.equal(paths.relative.harness, "docs");
  assert.equal(paths.relative.features, "docs/product-features");
  assert.equal(paths.relative.specs, "docs/specs");
});

test("invalid YAML syntax throws HarnessError invalid with no default fallback", async () => {
  const root = await createTempRepo();
  await writeFile(join(root, "harness.yaml"), "root: [unclosed\n", "utf8");

  await assert.rejects(
    repositoryPaths(root),
    (err: unknown) => err instanceof HarnessError && err.code === "invalid" && err.message.includes("Failed to parse")
  );
});

test("unknown configuration fields throw HarnessError invalid with no default fallback", async () => {
  const root = await createTempRepo();
  await writeFile(join(root, "harness.yaml"), "root: docs\nunknown_field: true\n", "utf8");

  await assert.rejects(
    repositoryPaths(root),
    (err: unknown) => err instanceof HarnessError && err.code === "invalid" && err.message.includes("Unknown configuration field")
  );
});

test("non-string field values throw HarnessError invalid", async () => {
  const root = await createTempRepo();
  await writeFile(join(root, "harness.yaml"), "root: docs\nfeatures: 123\n", "utf8");

  await assert.rejects(
    repositoryPaths(root),
    (err: unknown) => err instanceof HarnessError && err.code === "invalid" && err.message.includes("must be a string")
  );
});

test("absolute paths in root or collection keys throw HarnessError invalid", async () => {
  const root = await createTempRepo();
  await writeFile(join(root, "harness.yaml"), "root: /absolute-root\n", "utf8");

  await assert.rejects(
    repositoryPaths(root),
    (err: unknown) => err instanceof HarnessError && err.code === "invalid" && err.message.includes("cannot be an absolute path")
  );
});

test("path escapes via .. throw HarnessError invalid", async () => {
  const root = await createTempRepo();
  await writeFile(join(root, "harness.yaml"), "root: docs\nfeatures: ../outside\n", "utf8");

  await assert.rejects(
    repositoryPaths(root),
    (err: unknown) => err instanceof HarnessError && err.code === "invalid" && err.message.includes("cannot contain \"..\"")
  );
});

test("duplicate folder mappings throw HarnessError invalid with conflicting collection keys", async () => {
  const root = await createTempRepo();
  await writeFile(
    join(root, "harness.yaml"),
    "root: docs\nfeatures: same-folder\nspecs: same-folder\n",
    "utf8"
  );

  await assert.rejects(
    repositoryPaths(root),
    (err: unknown) =>
      err instanceof HarnessError &&
      err.code === "invalid" &&
      err.message.includes("duplicate folder configuration") &&
      err.details.includes("features") &&
      err.details.includes("specs")
  );
});

test("overlapping parent-child folder mappings throw HarnessError invalid with details", async () => {
  const root = await createTempRepo();
  await writeFile(
    join(root, "harness.yaml"),
    "root: docs\nfeatures: folder\nspecs: folder/nested\n",
    "utf8"
  );

  await assert.rejects(
    repositoryPaths(root),
    (err: unknown) =>
      err instanceof HarnessError &&
      err.code === "invalid" &&
      err.message.includes("overlapping folder configuration") &&
      err.details.includes("features") &&
      err.details.includes("specs")
  );
});

test("collection folder must be strictly contained inside the Harness root (not equal)", async () => {
  const root = await createTempRepo();
  await writeFile(join(root, "harness.yaml"), "root: docs\nfeatures: .\n", "utf8");

  await assert.rejects(
    repositoryPaths(root),
    (err: unknown) =>
      err instanceof HarnessError &&
      err.code === "invalid" &&
      err.message.includes("must be strictly contained under the Harness root")
  );
});

test("symlink escape is rejected before exposing layout", async () => {
  const root = await createTempRepo();
  const outside = await createTempRepo();

  // Create a symlink under the repository root pointing outside
  const linkPath = join(root, "escaped-link");
  try {
    await symlink(outside, linkPath, process.platform === "win32" ? "junction" : "dir");
  } catch {
    // If symlink creation fails due to platform restrictions, skip this assertion
    return;
  }

  await writeFile(join(root, "harness.yaml"), "root: escaped-link\n", "utf8");

  await assert.rejects(
    repositoryPaths(root),
    (err: unknown) => err instanceof HarnessError && err.code === "conflict" && err.message.includes("escapes repository")
  );
});

test("findRepositoryRoot finds initialized default Harness from nested path", async () => {
  const root = await createTempRepo();
  const nested = join(root, "src", "components", "nested");
  await mkdir(nested, { recursive: true });
  await mkdir(join(root, "docs", "harness"), { recursive: true });
  await writeFile(join(root, "docs", "harness", "index.md"), "# Index", "utf8");

  const resolvedRoot = await findRepositoryRoot(nested);
  assert.equal(resolvedRoot, resolve(root));
});

test("findRepositoryRoot finds configured Harness and returns root path, validating harness.yaml", async () => {
  const root = await createTempRepo();
  const nested = join(root, "src", "components", "nested");
  await mkdir(nested, { recursive: true });
  await writeFile(
    join(root, "harness.yaml"),
    "root: custom-docs\nfeatures: product-features\n",
    "utf8"
  );
  await mkdir(join(root, "custom-docs"), { recursive: true });
  await writeFile(join(root, "custom-docs", "index.md"), "# Configured Index", "utf8");

  const resolvedRoot = await findRepositoryRoot(nested);
  assert.equal(resolvedRoot, resolve(root));

  // Verify finding with allowUninitialized=true finds configured root even if index is missing
  const root2 = await createTempRepo();
  await writeFile(join(root2, "harness.yaml"), "root: custom-docs\n", "utf8");
  const resolvedRoot2 = await findRepositoryRoot(join(root2, "some-nested"), true).catch((e) => {
    // some-nested directory might need to exist or not depending on resolve
    return undefined;
  });
  if (resolvedRoot2 !== undefined) {
    assert.equal(resolvedRoot2, resolve(root2));
  } else {
    await mkdir(join(root2, "some-nested"), { recursive: true });
    const resolvedRoot3 = await findRepositoryRoot(join(root2, "some-nested"), true);
    assert.equal(resolvedRoot3, resolve(root2));
  }
});

test("invalid configuration never counts as initialized or default", async () => {
  const root = await createTempRepo();
  await writeFile(join(root, "harness.yaml"), "root: [unclosed\n", "utf8");

  // Even if allowUninitialized is true or false, invalid config throws configuration error
  await assert.rejects(
    findRepositoryRoot(root, true),
    (err: unknown) => err instanceof HarnessError && err.code === "invalid"
  );
  await assert.rejects(
    findRepositoryRoot(root, false),
    (err: unknown) => err instanceof HarnessError && err.code === "invalid"
  );
});

test("cross-platform forward slash expectations for relative path fields", async () => {
  const root = await createTempRepo();
  const paths = await repositoryPaths(root);
  assert.ok(!paths.relative.harness.includes("\\"));
  assert.ok(!paths.relative.index.includes("\\"));
  assert.ok(!paths.relative.features.includes("\\"));
});
