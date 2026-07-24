import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";
import { checkIndex, diagnoseHarness, renderExpectedIndex, scanHarness } from "../src/core/integrity.js";

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

test("integrity scanner returns deterministic, source-specific findings without writing", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const features = join(root, "docs", "harness", "features");

  await writeFeature(features, "FEAT-001-valid.md", "FEAT-001");
  await writeFeature(features, "FEAT-002-mismatch.md", "FEAT-003");
  await writeFeature(features, "FEAT-004-link.md", "FEAT-004", 'features:\n    - "[[missing-feature|FEAT-999]]"');
  await writeFeature(features, "FEAT-005-source.md", "FEAT-005", "source_paths:\n    - src/missing.ts");
  await writeFeature(features, "FEAT-006-first.md", "FEAT-006");
  await writeFeature(features, "FEAT-006-second.md", "FEAT-006");
  await writeFile(join(features, "FEAT-007-approval.md"), featureDocument("FEAT-007").replace("status: draft", "status: approved"));
  const workItemDir = join(root, "docs", "harness", "plans", "260714-1200-invalid");
  await mkdir(workItemDir, { recursive: true });
  await writeFile(join(workItemDir, "work-item-01-invalid.md"), `---\nwork_item: 1\ntitle: Invalid\nstatus: blocked\npriority: P1\neffort: 1d\ndependencies: []\ndecision_dependencies: []\n---\n`);

  const before = await snapshot(root);
  const first = await scanHarness(root);
  const second = await scanHarness(root);
  const after = await snapshot(root);

  assert.equal(first.outcome, "failure");
  assert.deepEqual(first, second);
  assert.deepEqual(after, before);
  const ordered = [...first.findings].sort((left, right) => left.path.localeCompare(right.path) || left.checkId.localeCompare(right.checkId) || left.message.localeCompare(right.message));
  assert.deepEqual(first.findings, ordered);
  for (const checkId of ["artifact.filename", "artifact.id.duplicate", "relationships.wikilink", "relationships.source-path", "document.parse"]) {
    assert.ok(first.findings.some((entry) => entry.checkId === checkId), `expected ${checkId}`);
  }
  assert.ok(first.findings.every((entry) => entry.path.startsWith("docs/harness/")));

  const scoped = await scanHarness(root, { path: "docs/harness/features/FEAT-004-link.md" });
  assert.deepEqual(scoped.findings.map((entry) => entry.checkId), ["relationships.wikilink"]);
  const kindScoped = await scanHarness(root, { kind: "feature" });
  assert.ok(kindScoped.findings.every((entry) => entry.path.startsWith("docs/harness/features/")));
});

test("integrity scanner rejects a missing Harness index without guessing a scope", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "harness-integrity-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const result = await scanHarness(root);

  assert.equal(result.outcome, "failure");
  assert.deepEqual(result.findings.map((entry) => entry.checkId), ["repository.index.missing"]);
  assert.equal(result.findings[0]?.remediation, "run `harness init` in the intended repository");
});

test("integrity scanner rejects missing and escaping path scopes", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const missing = await scanHarness(root, { path: "docs/harness/features/missing.md" });
  const escaping = await scanHarness(root, { path: "../outside.md" });

  assert.deepEqual(missing.findings.map((entry) => entry.checkId), ["scope.path.missing"]);
  assert.deepEqual(escaping.findings.map((entry) => entry.checkId), ["scope.path.invalid"]);
});

test("index check compares deterministic expected bytes without writing", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const features = join(root, "docs", "harness", "features");
  await writeFeature(features, "FEAT-001-valid.md", "FEAT-001");
  await writeFile(join(root, "docs", "harness", "index.md"), await renderExpectedIndex(root));

  const before = await snapshot(root);
  const first = await checkIndex(root);
  const second = await checkIndex(root);
  assert.equal(first.outcome, "success");
  assert.deepEqual(first, second);
  assert.deepEqual(await snapshot(root), before);

  await writeFile(join(features, "FEAT-001-valid.md"), featureDocument("FEAT-001").replace("Purpose.", "Changed purpose."));
  const stale = await checkIndex(root);
  assert.equal(stale.outcome, "failure");
  assert.deepEqual(stale.findings.map((entry) => entry.checkId), ["index.stale"]);
  assert.doesNotMatch(stale.findings[0]?.remediation ?? "", /harness index build/);
  await writeFile(join(root, "docs", "harness", "index.md"), "not an index\n");
  const malformed = await checkIndex(root);
  assert.deepEqual(malformed.findings.map((entry) => entry.checkId), ["index.malformed"]);
  await rm(join(root, "docs", "harness", "index.md"));
  const missing = await checkIndex(root);
  assert.deepEqual(missing.findings.map((entry) => entry.checkId), ["index.missing"]);
  assert.equal(missing.findings[0]?.remediation, "run `harness init` in the intended repository");
});

test("index check preserves valid lifecycle sequence counters in expected bytes", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const counters = { next_feature_sequence: 7, next_decision_sequence: 3, next_report_sequence: 2, next_rule_sequence: 5 };
  await writeFile(join(root, "docs", "harness", "index.md"), await renderExpectedIndex(root, counters));

  const result = await checkIndex(root);
  assert.equal(result.outcome, "success");
  assert.match(result.expected, /next_feature_sequence: 7/);
});

test("full scan rejects missing Decision dependencies and invalid Plan lifecycle/layout evidence", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const plans = join(root, "docs", "harness", "plans");
  const completed = join(plans, "260714-1200-completed-plan");
  const pending = join(plans, "260714-1201-pending-plan");
  await mkdir(completed, { recursive: true });
  await mkdir(pending, { recursive: true });
  await mkdir(join(plans, "invalid-layout"), { recursive: true });
  await mkdir(join(plans, "260714-1202-valid-layout"), { recursive: true });
  await mkdir(join(plans, "260714-1203-missing-root"), { recursive: true });
  await writeFile(join(completed, "plan.md"), planDocument("completed", "approved", []));
  await writeFile(join(completed, "work-item-02-missing-dependency.md"), workItemDocument(2, "in_progress", [1], ['[[DEC-999-missing|DEC-999]]']));
  await writeFile(join(pending, "plan.md"), planDocument("pending", "pending", []));
  await writeFile(join(pending, "work-item-01-active.md"), workItemDocument(1, "in_progress"));
  await writeFile(join(plans, "invalid-layout", "wrong-name.md"), workItemDocument(1, "pending"));
  await writeFile(join(plans, "260714-1202-valid-layout", "wrong-name.md"), workItemDocument(1, "pending"));
  await writeFile(join(plans, "260714-1203-missing-root", "work-item-01-alone.md"), workItemDocument(1, "pending"));

  const result = await scanHarness(root);
  const ids = new Set(result.findings.map((entry) => entry.checkId));
  for (const checkId of ["work-item.decision.missing", "plan.work-item.dependency.missing", "plan.aggregation.incomplete", "plan.report.missing", "plan.approval.missing", "work-item.filename", "plan.layout", "plan.root.missing"]) {
    assert.ok(ids.has(checkId), `expected ${checkId}`);
  }
});

test("Plan-local design is plain supporting Markdown with an exact ownership trace", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const planDirectory = join(root, "docs", "harness", "plans", "260714-1300-plan-local-design");
  const designPath = "docs/harness/plans/260714-1300-plan-local-design/design.md";
  await mkdir(planDirectory, { recursive: true });
  await writeFile(
    join(planDirectory, "plan.md"),
    planDocument("pending", "pending", []).replace("  source_paths: []", `  source_paths:\n    - ${designPath}`),
  );
  await writeFile(join(planDirectory, "work-item-01-implement.md"), workItemDocument(1, "pending"));
  await writeFile(join(planDirectory, "design.md"), "# Plain implementation design\n\nNo lifecycle frontmatter.\n");

  const valid = await scanHarness(root);
  assert.equal(valid.outcome, "success", JSON.stringify(valid.findings));
  const rendered = await renderExpectedIndex(root);
  assert.doesNotMatch(rendered, /plan-local-design\/design\.md/);

  await writeFile(join(planDirectory, "plan.md"), planDocument("pending", "pending", []));
  const unlinked = await scanHarness(root);
  assert.ok(unlinked.findings.some((entry) => entry.checkId === "plan.design.unlinked" && entry.path === designPath));

  const externalDirectory = join(root, "docs", "harness", "design");
  await mkdir(externalDirectory, { recursive: true });
  await writeFile(join(externalDirectory, "design.md"), "# External design\n");
  await writeFile(
    join(planDirectory, "plan.md"),
    planDocument("pending", "pending", []).replace("  source_paths: []", "  source_paths:\n    - docs/harness/design/design.md"),
  );
  const external = await scanHarness(root);
  assert.ok(external.findings.some((entry) => entry.checkId === "plan.design.location"));
});

test("doctor remains independent from optional graph output and preserves the workspace", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "docs", "harness", "workflows"), { recursive: true });
  await writeFile(join(root, "docs", "harness", "workflows", "README.md"), "router\n");
  await writeFile(join(root, "docs", "harness", "workflows", "cook.md"), "cook\n");
  await writeFile(join(root, "docs", "harness", "index.md"), await renderExpectedIndex(root));
  const before = await snapshot(root);
  const result = await diagnoseHarness(root, { path: "" });
  assert.equal(result.outcome, "success");
  assert.ok(result.findings.every((entry) => entry.severity === "warning"));
  assert.equal(result.findings.some((entry) => entry.checkId.startsWith("doctor.graphify")), false);
  assert.deepEqual(await snapshot(root), before);
});

test("integrity scanner, index check, and doctor consume custom layouts", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "harness-integrity-custom-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  // Create custom layout configuration
  await writeFile(
    join(root, "harness.yaml"),
    `root: custom-docs/custom-harness\nfeatures: my-features\nplans: my-plans\nworkflows: my-workflows\n`
  );

  const paths = join(root, "custom-docs", "custom-harness");
  const features = join(paths, "my-features");
  const plans = join(paths, "my-plans");
  const workflows = join(paths, "my-workflows");

  await mkdir(features, { recursive: true });
  await mkdir(plans, { recursive: true });
  await mkdir(workflows, { recursive: true });

  // Init default files
  await writeFile(join(paths, "index.md"), "---\nschema_version: 1\ngenerated: true\n---\n\n# Harness Index\n");
  await writeFile(join(workflows, "README.md"), "router\n");
  await writeFile(join(workflows, "cook.md"), "cook\n");

  // Write a feature
  await writeFeature(features, "FEAT-001-valid.md", "FEAT-001");

  // Render and write expected index
  const indexContent = await renderExpectedIndex(root);
  await writeFile(join(paths, "index.md"), indexContent);

  // Scan harness - should pass!
  const scanResult = await scanHarness(root);
  assert.equal(scanResult.outcome, "success");

  // Check doctor - should pass!
  const doctorResult = await diagnoseHarness(root, { path: "" });
  assert.equal(doctorResult.outcome, "success");

  // Check expected index contents
  assert.match(indexContent, /- \[Workflow Router\]\(my-workflows\/README\.md\)/);
  assert.match(indexContent, /- \[custom-docs\/custom-harness\/my-features\/FEAT-001-valid\.md\]\(my-features\/FEAT-001-valid\.md\)/);

  // Check index check passes when correct
  const checkResult = await checkIndex(root);
  assert.equal(checkResult.outcome, "success");

  // Test invalid configuration error fails before operation
  await writeFile(join(root, "harness.yaml"), "invalid: yaml: structure\n");
  await assert.rejects(async () => {
    await scanHarness(root);
  }, /HarnessError/);
});

async function harnessFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-integrity-"));
  const harness = join(root, "docs", "harness");
  await mkdir(join(harness, "features"), { recursive: true });
  await writeFile(join(harness, "index.md"), "---\nschema_version: 1\ngenerated: true\n---\n\n# Harness Index\n");
  return root;
}

async function writeFeature(directory: string, filename: string, id: string, relationships = ""): Promise<void> {
  await writeFile(join(directory, filename), featureDocument(id, relationships));
}

function featureDocument(id: string, additions = ""): string {
  let relationships = "  specs: []\n  decisions: []\n  plans: []\n  reports: []\n  rules: []\n  features: []\n  source_paths: []";
  if (additions.startsWith("features:")) relationships = relationships.replace("  features: []", `  ${additions}`);
  if (additions.startsWith("source_paths:")) relationships = relationships.replace("  source_paths: []", `  ${additions}`);
  return `---\nschema_version: 1\ntype: feature\nid: ${id}\ntitle: Test ${id}\nstatus: draft\ncreated: 2026-07-14\nrelationships:\n${relationships}\n---\n\n${featureBody}`;
}

function planDocument(status: "pending" | "completed", approval: "pending" | "approved", reports: readonly string[]): string {
  const decided = approval === "approved" ? "  decided: 2026-07-14\n" : "";
  return `---\ntitle: Test Plan\ndescription: Test plan\nstatus: ${status}\napproval:\n  status: ${approval}\n  required_by: Repository Maintainer\n${decided}priority: P1\neffort: 1d\nbranch: main\ntags: []\nblockedBy: []\nblocks: []\nrelationships:\n  specs: []\n  decisions: []\n  plans: []\n  reports: [${reports.join(", ")}]\n  rules: []\n  features: []\n  source_paths: []\ncreated: "2026-07-14T00:00:00.000Z"\ncreatedBy: test\n---\n`;
}

function workItemDocument(workItem: number, status: "pending" | "in_progress", dependencies: readonly number[] = [], decisions: readonly string[] = []): string {
  const decisionYaml = decisions.length ? `decision_dependencies:\n${decisions.map((decision) => `  - "${decision}"`).join("\n")}` : "decision_dependencies: []";
  return `---\nwork_item: ${workItem}\ntitle: Test Work Item\nstatus: ${status}\npriority: P1\neffort: 1d\ndependencies: [${dependencies.join(", ")}]\n${decisionYaml}\n---\n`;
}

async function snapshot(root: string): Promise<readonly string[]> {
  const files = await allFiles(root);
  return Promise.all(files.map(async (path) => `${relative(root, path)}:${createHash("sha256").update(await readFile(path)).digest("hex")}`));
}

async function allFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async (entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? allFiles(path) : [path];
  }));
  return groups.flat().sort((left, right) => left.localeCompare(right));
}
