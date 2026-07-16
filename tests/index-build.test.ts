import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildIndex } from "../src/index/index.js";
import { renderExpectedIndex } from "../src/core/integrity.js";
import { EXIT_CODES, runCli } from "../src/cli/index.js";

async function harnessFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-index-build-"));
  const harness = join(root, "docs", "harness");
  await mkdir(join(harness, "features"), { recursive: true });
  await writeFile(join(harness, "index.md"), "---\nschema_version: 1\ngenerated: true\n---\n\n# Harness Index\n");
  return root;
}

const featureBody = `# Feature

## Introduction

Purpose.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Contributor | Business role | Validate Harness | Read diagnostics |

### User needs

Reliable feedback.

### Main flow

1. **Actor:** The contributor requests validation. **System:** The system evaluates the Harness.

### Alternative flows

- Source step: 1. Condition: a path is invalid. Behavior: report it. Ends with: a failed result.

### Exception flows

- Source step: 1. Failure: a document is malformed. Handling: identify it. Prohibited: repair it. Failure postcondition: no change.

### Postconditions

A deterministic result is available.

## Requirements

- Validation is read-only.

## Acceptance

- [ ] Validation reports violations.

## Relationships

- None.
`;

function featureDocument(id: string, features: readonly string[] = []): string {
  const featureLinks = features.map((link) => `    - "${link}"`).join("\n");
  return `---
schema_version: 1
type: feature
id: ${id}
title: Test ${id}
status: draft
created: 2026-07-14
relationships:
  specs: []
  decisions: []
  plans: []
  reports: []
  rules: []
  features:${featureLinks ? `\n${featureLinks}` : " []"}
  source_paths: []
---

${featureBody}`;
}

test("buildIndex publishes a complete valid derived index", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  await writeFile(join(root, "docs", "harness", "features", "FEAT-001-test.md"), featureDocument("FEAT-001", ["[[FEAT-002-target|FEAT-002]]"]));
  await writeFile(join(root, "docs", "harness", "features", "FEAT-002-target.md"), featureDocument("FEAT-002"));
  
  const result = await buildIndex(root);
  assert.equal(result.outcome, "success");
  assert.equal(result.unchanged, false);

  const indexContent = await readFile(join(root, "docs", "harness", "index.md"), "utf8");
  for (const heading of ["Catalog", "Forward relationships", "Backlinks", "Unresolved relationships", "Canonical document digests"]) {
    assert.match(indexContent, new RegExp(`## ${heading}`));
  }
  assert.match(indexContent, /\[docs\/harness\/features\/FEAT-001-test\.md\]\(features\/FEAT-001-test\.md\)/);
  assert.match(indexContent, /FEAT-001-test\.md.*→.*FEAT-002-target\.md/);
  assert.match(indexContent, /FEAT-002-target\.md.*←.*FEAT-001-test\.md/);
  assert.match(indexContent, /## Unresolved relationships\n- None\./);
  assert.doesNotMatch(indexContent, /\\|\r|\/Users\//);
});

test("expected index names unresolved relationship sources without inventing an edge", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "docs", "harness", "features", "FEAT-001-test.md"), featureDocument("FEAT-001", ["[[missing-target|FEAT-999]]"]));

  const rendered = await renderExpectedIndex(root);
  assert.match(rendered, /docs\/harness\/features\/FEAT-001-test\.md → `\[\[missing-target\|FEAT-999\]\]` broken/);
  assert.match(rendered, /## Forward relationships\n- None\./);
  assert.match(rendered, /## Backlinks\n- None\./);
});

test("buildIndex reports unchanged rebuild over equivalent logical input", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  await writeFile(join(root, "docs", "harness", "features", "FEAT-001-test.md"), featureDocument("FEAT-001"));
  
  await buildIndex(root); // build once
  const statBefore = await stat(join(root, "docs", "harness", "index.md"));
  
  const result = await buildIndex(root); // build again
  assert.equal(result.outcome, "success");
  assert.equal(result.unchanged, true);

  const statAfter = await stat(join(root, "docs", "harness", "index.md"));
  assert.equal(statBefore.mtimeMs, statAfter.mtimeMs);
});

test("buildIndex refuses publication when canonical scan is invalid and preserves existing index", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const existingIndexContent = "---\nschema_version: 1\ngenerated: true\n---\n\n# Harness Index\n";
  await writeFile(join(root, "docs", "harness", "index.md"), existingIndexContent);
  
  // write invalid feature (missing ID)
  await writeFile(join(root, "docs", "harness", "features", "invalid.md"), "---\nschema_version: 1\ntype: feature\nstatus: draft\n---\n");

  const result = await buildIndex(root);
  assert.equal(result.outcome, "failure");
  assert.equal(result.unchanged, true);

  const currentContent = await readFile(join(root, "docs", "harness", "index.md"), "utf8");
  assert.equal(currentContent, existingIndexContent);
});

test("buildIndex recreates a missing derived index", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  await writeFile(join(root, "docs", "harness", "features", "FEAT-007-test.md"), featureDocument("FEAT-007"));
  await rm(join(root, "docs", "harness", "index.md"));

  const result = await buildIndex(root);
  assert.equal(result.outcome, "success");
  assert.equal(result.unchanged, false);
  const rebuilt = await readFile(join(root, "docs", "harness", "index.md"), "utf8");
  assert.match(rebuilt, /## Catalog/);
  assert.match(rebuilt, /next_feature_sequence: 8/);
});

test("buildIndex rebuilds a stale derived index", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const staleContent = "---\nschema_version: 1\ngenerated: true\n---\n\n# Harness Index\n\nStale content";
  await writeFile(join(root, "docs", "harness", "index.md"), staleContent);

  const result = await buildIndex(root);
  assert.equal(result.outcome, "success");
  assert.equal(result.unchanged, false);

  const currentContent = await readFile(join(root, "docs", "harness", "index.md"), "utf8");
  assert.notEqual(currentContent, staleContent);
  assert.ok(currentContent.includes("Harness Index"));
});

test("buildIndex handles publication failure preserving prior bytes", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const existingIndexContent = "---\nschema_version: 1\ngenerated: true\n---\n\n# Harness Index\n";
  await writeFile(join(root, "docs", "harness", "index.md"), existingIndexContent);

  await writeFile(join(root, "docs", "harness", "features", "FEAT-002-test.md"), featureDocument("FEAT-002"));

  // create a temporary file that atomic-write expects to use
  const temporary = join(root, "docs", "harness", `.index.md.harness-tmp-${process.pid}-0`);
  await writeFile(temporary, "conflict");

  try {
    await buildIndex(root);
    assert.fail("Should have thrown");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    assert.ok(message.includes("temporary path already exists") || message.includes("mutation failed"));
  }
  
  const currentContent = await readFile(join(root, "docs", "harness", "index.md"), "utf8");
  assert.equal(currentContent, existingIndexContent);
});

test("index build CLI has stable human, JSON, invalid, and usage outcomes", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "docs", "harness", "features", "FEAT-001-test.md"), featureDocument("FEAT-001"));

  const changed = await invoke(["index", "build", "--workspace", root], root);
  assert.equal(changed.code, EXIT_CODES.success, changed.stderr);
  assert.equal(changed.stdout, "Harness index built\n");

  const unchanged = await invoke(["index", "build", "--workspace", root], root);
  assert.equal(unchanged.code, EXIT_CODES.success, unchanged.stderr);
  assert.equal(unchanged.stdout, "Harness index unchanged\n");

  const json = await invoke(["index", "build", "--workspace", root, "--json"], root);
  assert.equal(json.code, EXIT_CODES.success, json.stderr);
  assert.deepEqual(JSON.parse(json.stdout), { ok: true, data: { outcome: "success", unchanged: true } });

  const extra = await invoke(["index", "build", "extra", "--workspace", root, "--json"], root);
  assert.equal(extra.code, EXIT_CODES.usage);
  assert.equal(JSON.parse(extra.stderr).error.code, "usage");
  const unknown = await invoke(["index", "build", "--unknown", "--workspace", root], root);
  assert.equal(unknown.code, EXIT_CODES.usage);

  await writeFile(join(root, "docs", "harness", "features", "invalid.md"), "not frontmatter\n");
  const invalid = await invoke(["index", "build", "--workspace", root, "--json"], root);
  assert.equal(invalid.code, EXIT_CODES.invalid);
  const invalidPayload = JSON.parse(invalid.stderr) as { error: { code: string; details: string[] } };
  assert.equal(invalidPayload.error.code, "invalid");
  assert.ok(invalidPayload.error.details.some((detail) => detail.includes("docs/harness/features/invalid.md")));
});

test("index build CLI can recreate a missing index with an explicit workspace", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await rm(join(root, "docs", "harness", "index.md"));

  const result = await invoke(["index", "build", "--workspace", root, "--json"], root);
  assert.equal(result.code, EXIT_CODES.success, result.stderr);
  assert.equal((JSON.parse(result.stdout) as { data: { unchanged: boolean } }).data.unchanged, false);
});

test("index build CLI rejects a workspace that has not been initialized", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "harness-index-uninitialized-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const result = await invoke(["index", "build", "--workspace", root, "--json"], root);
  assert.equal(result.code, EXIT_CODES.rejected);
  assert.equal((JSON.parse(result.stderr) as { error: { code: string } }).error.code, "precondition");
});

test("buildIndex generates deterministic index for custom layout fixtures", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "harness-index-build-custom-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  await writeFile(
    join(root, "harness.yaml"),
    `root: my-harness-root\nfeatures: feats\nplans: my-plans\n`
  );

  const harness = join(root, "my-harness-root");
  const features = join(harness, "feats");
  const plans = join(harness, "my-plans");
  await mkdir(features, { recursive: true });
  await mkdir(plans, { recursive: true });
  await writeFile(join(harness, "index.md"), "---\nschema_version: 1\ngenerated: true\n---\n\n# Harness Index\n");

  await writeFile(join(features, "FEAT-001-test.md"), featureDocument("FEAT-001"));

  // Build index first time
  const result1 = await buildIndex(root);
  assert.equal(result1.outcome, "success");
  assert.equal(result1.unchanged, false);

  const index1 = await readFile(join(harness, "index.md"), "utf8");
  assert.match(index1, /- \[my-harness-root\/feats\/FEAT-001-test\.md\]\(feats\/FEAT-001-test\.md\)/);

  // Build index second time - should be unchanged
  const result2 = await buildIndex(root);
  assert.equal(result2.outcome, "success");
  assert.equal(result2.unchanged, true);

  const index2 = await readFile(join(harness, "index.md"), "utf8");
  assert.equal(index1, index2); // Deterministic index byte comparison
});

async function invoke(args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const code = await runCli(args, {
    cwd,
    stdout: (value) => { stdout += value; },
    stderr: (value) => { stderr += value; },
  });
  return { code, stdout, stderr };
}
