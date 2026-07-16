import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { afterEach, test } from "node:test";
import { runCli, EXIT_CODES } from "../src/cli/index.js";
import { parseMarkdownDocument } from "../src/core/schemas/frontmatter.js";
import { planSchema } from "../src/core/schemas/artifacts.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-wf-state-"));
  temporaryRoots.push(root);
  return root;
}

async function initializedRoot(): Promise<string> {
  const root = await temporaryRoot();
  const result = await invoke(["init", "--workspace", root], root);
  assert.equal(result.code, EXIT_CODES.success, result.stderr);
  return root;
}

async function invoke(args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const code = await runCli(args, { cwd, stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } });
  return { code, stdout, stderr };
}

async function snapshot(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else result[relative(root, path)] = await readFile(path, "utf8");
    }
  }
  await walk(root);
  return result;
}

test("feature approve and request-changes positive and negative reviews", async () => {
  const root = await initializedRoot();

  // Create Feature
  const created = await invoke(["feature", "create", "--title", "Feature Review Test", "--created", "2026-07-16", "--workspace", root], root);
  assert.equal(created.code, EXIT_CODES.success);

  const featurePath = join(root, "docs", "harness", "features", "FEAT-001-feature-review-test.md");

  // Negative: Feature approve without authority or date
  const missingAuth = await invoke(["feature", "approve", "FEAT-001", "--approved", "2026-07-16", "--workspace", root, "--json"], root);
  assert.equal(missingAuth.code, EXIT_CODES.usage);

  // Positive: Feature approve
  const approved = await invoke(["feature", "approve", "FEAT-001", "--approved", "2026-07-16", "--approved-by", "Product Owner", "--workspace", root, "--json"], root);
  assert.equal(approved.code, EXIT_CODES.success, approved.stderr);

  const parsedApp = parseMarkdownDocument(await readFile(featurePath, "utf8"));
  assert.equal(parsedApp.frontmatter.status, "approved");
  assert.equal((parsedApp.frontmatter as any).approved, "2026-07-16");
  assert.equal((parsedApp.frontmatter as any).approved_by, "Product Owner");

  // Positive: request-changes
  const reqChanges = await invoke(["feature", "request-changes", "FEAT-001", "--workspace", root, "--json"], root);
  assert.equal(reqChanges.code, EXIT_CODES.success, reqChanges.stderr);

  const parsedReq = parseMarkdownDocument(await readFile(featurePath, "utf8"));
  assert.equal(parsedReq.frontmatter.status, "proposed");
  assert.equal((parsedReq.frontmatter as any).approved, undefined);
  assert.equal((parsedReq.frontmatter as any).approved_by, undefined);
});

test("plan approve and request-changes preserve execution state and body bytes", async () => {
  const root = await initializedRoot();

  // Create Plan
  const planCreated = await invoke(["plan", "create", "--title", "Plan Review Test", "--work-item", "Item 1", "--created", "2026-07-16T12:00:00+07:00", "--workspace", root], root);
  assert.equal(planCreated.code, EXIT_CODES.success);

  const planPath = join(root, "docs", "harness", "plans", "260716-1200-plan-review-test", "plan.md");

  // Positive: Plan approve
  const approved = await invoke(["plan", "approve", "260716-1200-plan-review-test", "--decided", "2026-07-16", "--workspace", root, "--json"], root);
  assert.equal(approved.code, EXIT_CODES.success, approved.stderr);

  const parsedApp = parseMarkdownDocument(await readFile(planPath, "utf8"));
  assert.equal(parsedApp.frontmatter.status, "pending"); // execution status remains independent
  assert.equal((parsedApp.frontmatter as any).approval.status, "approved");
  assert.equal((parsedApp.frontmatter as any).approval.decided, "2026-07-16");
  assert.ok(parsedApp.body.includes("- [Work Item 1: Item 1]"));

  // Positive: request-changes
  const reqChanges = await invoke(["plan", "request-changes", "260716-1200-plan-review-test", "--decided", "2026-07-17", "--workspace", root, "--json"], root);
  assert.equal(reqChanges.code, EXIT_CODES.success, reqChanges.stderr);

  const parsedReq = parseMarkdownDocument(await readFile(planPath, "utf8"));
  assert.equal(parsedReq.frontmatter.status, "pending");
  assert.equal((parsedReq.frontmatter as any).approval.status, "changes_requested");
  assert.equal((parsedReq.frontmatter as any).approval.decided, "2026-07-17");
});

test("workflow status and check are read-only and return deterministic ordering", async () => {
  const root = await initializedRoot();

  // Create a Feature
  await invoke(["feature", "create", "--title", "Sample Feature", "--created", "2026-07-16", "--workspace", root], root);

  const before = await snapshot(root);

  // Status check
  const status = await invoke(["workflow", "status", "FEAT-001", "--workspace", root], root);
  assert.equal(status.code, EXIT_CODES.success, status.stderr);
  assert.match(status.stdout, /Target: docs\/harness\/features\/FEAT-001-sample-feature\.md/);
  assert.match(status.stdout, /Review State: draft/);
  assert.match(status.stdout, /Feature is not approved/);

  // Check command
  const check = await invoke(["workflow", "check", "FEAT-001", "--workspace", root], root);
  assert.equal(check.code, EXIT_CODES.success, check.stderr);
  assert.match(check.stdout, /Harness validation passed/);

  // Verify read-only: no workspace bytes changed
  const after = await snapshot(root);
  assert.deepEqual(after, before);
});

test("target resolution negative cases (escaping, missing, wrong type)", async () => {
  const root = await initializedRoot();

  // Escaping target
  const escaping = await invoke(["workflow", "status", "../outside.md", "--workspace", root, "--json"], root);
  assert.equal(escaping.code, EXIT_CODES.rejected);
  assert.match(escaping.stderr, /escapes repository/);

  // Missing target
  const missing = await invoke(["workflow", "status", "FEAT-999", "--workspace", root, "--json"], root);
  assert.equal(missing.code, EXIT_CODES.rejected);
  assert.match(missing.stderr, /Feature not found/);

  // Wrong type: try using a plan target for feature approve
  const wrongType = await invoke(["feature", "approve", "docs/harness/README.md", "--approved", "2026-07-16", "--approved-by", "PO", "--workspace", root, "--json"], root);
  assert.equal(wrongType.code, EXIT_CODES.invalid);
});

test("custom layout works with status, check and reviews", async () => {
  const root = await temporaryRoot();
  await writeFile(
    join(root, "harness.yaml"),
    "root: custom-docs\nfeatures: product-features\nplans: roadmap\ndecisions: choices\n",
    "utf8"
  );

  const init = await invoke(["init", "--workspace", root], root);
  assert.equal(init.code, EXIT_CODES.success);

  // Create feature in custom layout
  const created = await invoke(["feature", "create", "--title", "Custom Feature", "--created", "2026-07-16", "--workspace", root], root);
  assert.equal(created.code, EXIT_CODES.success);

  // Verify status finds it in custom layout
  const status = await invoke(["workflow", "status", "FEAT-001", "--workspace", root], root);
  assert.equal(status.code, EXIT_CODES.success);
  assert.match(status.stdout, /product-features\/FEAT-001-custom-feature\.md/);
});
