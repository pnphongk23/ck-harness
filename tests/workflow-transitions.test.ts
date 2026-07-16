import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, test } from "node:test";
import { runCli, EXIT_CODES } from "../src/cli/index.js";
import { parseMarkdownDocument, serializeMarkdownDocument } from "../src/core/schemas/frontmatter.js";
import { planSchema, workItemSchema } from "../src/core/schemas/artifacts.js";
import { renderExpectedIndex } from "../src/core/integrity.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-wf-trans-"));
  temporaryRoots.push(root);
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

test("Workflow transitions: strict CLI and target resolution validations", async () => {
  const root = await temporaryRoot();
  await invoke(["init", "--workspace", root], root);
  
  // Create Plan
  await invoke(
    ["plan", "create", "--title", "Sample Plan", "--work-item", "WI 1", "--created", "2026-07-16T23:35:55+07:00", "--workspace", root],
    root
  );
  
  const wiPath = "docs/harness/plans/260716-2335-sample-plan/work-item-01-wi-1.md";
  
  // Reject unsupported status
  const badStatus = await invoke(
    ["work-item", "set-status", wiPath, "--status", "invalid-status", "--workspace", root, "--json"],
    root
  );
  assert.equal(badStatus.code, EXIT_CODES.usage);

  // Approve the Plan and start the Work Item so blocked/cancelled are valid
  // next transitions; this isolates the required-reason validation.
  await invoke(
    ["plan", "approve", "260716-2335-sample-plan", "--decided", "2026-07-16", "--workspace", root],
    root
  );
  await invoke(
    ["work-item", "set-status", wiPath, "--status", "in_progress", "--workspace", root],
    root
  );
  
  // Reject missing reason for blocked
  const missingReason = await invoke(
    ["work-item", "set-status", wiPath, "--status", "blocked", "--workspace", root, "--json"],
    root
  );
  assert.equal(missingReason.code, EXIT_CODES.rejected);
  assert.match(missingReason.stderr, /status reason is required/);
  
  // Reject missing reason for cancelled
  const missingReasonCancel = await invoke(
    ["work-item", "set-status", wiPath, "--status", "cancelled", "--workspace", root, "--json"],
    root
  );
  assert.equal(missingReasonCancel.code, EXIT_CODES.rejected);
  assert.match(missingReasonCancel.stderr, /status reason is required/);
  
  // Reject unknown option
  const unknownOpt = await invoke(
    ["work-item", "set-status", wiPath, "--status", "in_progress", "--unknown", "foo", "--workspace", root, "--json"],
    root
  );
  assert.equal(unknownOpt.code, EXIT_CODES.usage);
});

test("Workflow transitions: Work Item pending -> in_progress requirements (approval, predecessor, Decision)", async () => {
  const root = await temporaryRoot();
  await invoke(["init", "--workspace", root], root);
  
  // Create Plan with two Work Items
  await invoke(
    [
      "plan", "create",
      "--title", "Execution Plan",
      "--work-item", "WI 1",
      "--work-item", "WI 2",
      "--created", "2026-07-16T23:35:55+07:00",
      "--workspace", root
    ],
    root
  );
  
  const planPath = "docs/harness/plans/260716-2335-execution-plan/plan.md";
  const wi1Path = "docs/harness/plans/260716-2335-execution-plan/work-item-01-wi-1.md";
  const wi2Path = "docs/harness/plans/260716-2335-execution-plan/work-item-02-wi-2.md";
  
  // WI 1 transition to in_progress should fail because Plan is not approved
  const unapproved = await invoke(
    ["work-item", "set-status", wi1Path, "--status", "in_progress", "--workspace", root, "--json"],
    root
  );
  assert.equal(unapproved.code, EXIT_CODES.rejected);
  assert.match(unapproved.stderr, /Plan is not approved/);
  
  // Approve the plan
  await invoke(
    ["plan", "approve", "260716-2335-execution-plan", "--decided", "2026-07-16", "--workspace", root],
    root
  );
  
  // WI 2 transition to in_progress should fail because WI 1 is predecessor and not completed
  const predNotComp = await invoke(
    ["work-item", "set-status", wi2Path, "--status", "in_progress", "--workspace", root, "--json"],
    root
  );
  assert.equal(predNotComp.code, EXIT_CODES.rejected);
  assert.match(predNotComp.stderr, /predecessor Work Item 1 is not completed/);
  
  // Add an unapproved Decision dependency to WI 1
  const wi1Abs = join(root, wi1Path);
  const wi1Doc = parseMarkdownDocument(await readFile(wi1Abs, "utf8"));
  const wi1FM = workItemSchema.parse({
    ...wi1Doc.frontmatter,
    decision_dependencies: ["[[DEC-001-storage-tradeoff|DEC-001]]"]
  });
  await writeFile(wi1Abs, serializeMarkdownDocument({ frontmatter: wi1FM, body: wi1Doc.body }));
  
  // WI 1 transition should fail because DEC-001 does not resolve
  const decNotResolve = await invoke(
    ["work-item", "set-status", wi1Path, "--status", "in_progress", "--workspace", root, "--json"],
    root
  );
  assert.equal(decNotResolve.code, EXIT_CODES.rejected);
  assert.match(decNotResolve.stderr, /decision dependency DEC-001.*does not resolve/);
  
  // Create proposed Decision DEC-001
  await invoke(
    ["new", "decision", "--title", "Storage Tradeoff", "--created", "2026-07-16", "--workspace", root],
    root
  );
  
  // WI 1 transition should fail because DEC-001 is proposed, not approved
  const decNotApp = await invoke(
    ["work-item", "set-status", wi1Path, "--status", "in_progress", "--workspace", root, "--json"],
    root
  );
  assert.equal(decNotApp.code, EXIT_CODES.rejected);
  assert.match(decNotApp.stderr, /decision dependency DEC-001 is not approved/);
  
  // Approve DEC-001 by updating its status to approved in file
  const decPath = join(root, "docs", "harness", "decisions", "DEC-001-storage-tradeoff.md");
  const decDoc = parseMarkdownDocument(await readFile(decPath, "utf8"));
  const decFM = {
    ...decDoc.frontmatter,
    status: "approved" as const,
    approved: "2026-07-16",
    approved_by: "Maintainer"
  };
  await writeFile(decPath, serializeMarkdownDocument({ frontmatter: decFM as any, body: decDoc.body }));
  
  // Now WI 1 transition should succeed!
  const startSuccess = await invoke(
    ["work-item", "set-status", wi1Path, "--status", "in_progress", "--workspace", root, "--json"],
    root
  );
  assert.equal(startSuccess.code, EXIT_CODES.success, startSuccess.stderr);
  
  // Verify Plan execution status is atomically set to in_progress
  const planDoc = parseMarkdownDocument(await readFile(join(root, planPath), "utf8"));
  assert.equal(planDoc.frontmatter.status, "in_progress");
  
  // Try to start WI 2 while WI 1 is in_progress: should fail (one-active-item constraint)
  const concurrentWI = await invoke(
    ["work-item", "set-status", wi2Path, "--status", "in_progress", "--workspace", root, "--json"],
    root
  );
  assert.equal(concurrentWI.code, EXIT_CODES.rejected);
  assert.match(concurrentWI.stderr, /more than one Harness Work Item is in progress/);
});

test("Workflow transitions: Work Item completion checkbox and evidence validation", async () => {
  const root = await temporaryRoot();
  await invoke(["init", "--workspace", root], root);
  
  await invoke(
    [
      "plan", "create",
      "--title", "Checkbox Plan",
      "--work-item", "WI 1",
      "--created", "2026-07-16T23:35:55+07:00",
      "--workspace", root
    ],
    root
  );
  
  const wi1Path = "docs/harness/plans/260716-2335-checkbox-plan/work-item-01-wi-1.md";
  
  // Approve plan and start WI 1
  await invoke(["plan", "approve", "260716-2335-checkbox-plan", "--decided", "2026-07-16", "--workspace", root], root);
  await invoke(["work-item", "set-status", wi1Path, "--status", "in_progress", "--workspace", root], root);
  
  // WI 1 has some unchecked checkboxes in its body
  const wi1Abs = join(root, wi1Path);
  const wi1Doc = parseMarkdownDocument(await readFile(wi1Abs, "utf8"));
  
  const wiBodyWithUnchecked = `
# Work Item 1: WI 1

## Tasks

- [ ] Task A
- [x] Task B

## Success criteria

- [ ] Success A
`;
  await writeFile(wi1Abs, serializeMarkdownDocument({ frontmatter: wi1Doc.frontmatter, body: wiBodyWithUnchecked }));
  
  // Completion should fail due to unchecked checkboxes
  const failCompletion = await invoke(
    ["work-item", "set-status", wi1Path, "--status", "completed", "--workspace", root, "--json"],
    root
  );
  assert.equal(failCompletion.code, EXIT_CODES.rejected);
  assert.match(failCompletion.stderr, /unchecked checkbox/);
  
  // Mark all checkboxes as checked
  const wiBodyWithChecked = `
# Work Item 1: WI 1

## Tasks

- [x] Task A
- [x] Task B

## Success criteria

- [X] Success A
`;
  await writeFile(wi1Abs, serializeMarkdownDocument({ frontmatter: wi1Doc.frontmatter, body: wiBodyWithChecked }));
  
  // Completion should now succeed!
  const successCompletion = await invoke(
    ["work-item", "set-status", wi1Path, "--status", "completed", "--workspace", root, "--json"],
    root
  );
  assert.equal(successCompletion.code, EXIT_CODES.success, successCompletion.stderr);
  
  // Verify status is completed and status_reason is cleared
  const wi1FinalDoc = parseMarkdownDocument(await readFile(wi1Abs, "utf8"));
  assert.equal(wi1FinalDoc.frontmatter.status, "completed");
  assert.equal((wi1FinalDoc.frontmatter as any).status_reason, undefined);
});

test("Workflow transitions: Plan completed aggregation and Report constraints", async () => {
  const root = await temporaryRoot();
  await invoke(["init", "--workspace", root], root);
  
  await invoke(
    [
      "plan", "create",
      "--title", "Aggregation Plan",
      "--work-item", "WI 1",
      "--created", "2026-07-16T23:35:55+07:00",
      "--workspace", root
    ],
    root
  );
  
  const planPath = "docs/harness/plans/260716-2335-aggregation-plan/plan.md";
  const wi1Path = "docs/harness/plans/260716-2335-aggregation-plan/work-item-01-wi-1.md";
  
  // Approve plan and start WI 1
  await invoke(["plan", "approve", "260716-2335-aggregation-plan", "--decided", "2026-07-16", "--workspace", root], root);
  await invoke(["work-item", "set-status", wi1Path, "--status", "in_progress", "--workspace", root], root);
  
  // Try to set Plan status to completed: should fail because WI 1 is not completed
  const planCompFail1 = await invoke(
    ["plan", "set-status", "260716-2335-aggregation-plan", "--status", "completed", "--workspace", root, "--json"],
    root
  );
  assert.equal(planCompFail1.code, EXIT_CODES.rejected);
  assert.match(planCompFail1.stderr, /required Work Item that is not completed/);
  
  // Complete WI 1
  await invoke(["work-item", "set-status", wi1Path, "--status", "completed", "--workspace", root], root);
  
  // Try to set Plan status to completed: should fail because there is no linked Report
  const planCompFail2 = await invoke(
    ["plan", "set-status", "260716-2335-aggregation-plan", "--status", "completed", "--workspace", root, "--json"],
    root
  );
  assert.equal(planCompFail2.code, EXIT_CODES.rejected);
  assert.match(planCompFail2.stderr, /completed Plan has no linked completed Delivery Report/);
  
  // Create a Report and link it in the plan relationships
  await invoke(["new", "report", "--title", "Deliver Aggregation", "--delivered", "2026-07-16", "--workspace", root], root);
  
  // Link the Report in plan.md
  const planAbs = join(root, planPath);
  const planDoc = parseMarkdownDocument(await readFile(planAbs, "utf8"));
  const parsedFM = planSchema.parse(planDoc.frontmatter);
  const updatedFM = planSchema.parse({
    ...parsedFM,
    relationships: {
      ...parsedFM.relationships,
      reports: ["[[REP-001-deliver-aggregation|REP-001]]"]
    }
  });
  await writeFile(planAbs, serializeMarkdownDocument({ frontmatter: updatedFM, body: planDoc.body }));
  
  // Now set Plan status to completed should succeed!
  const planCompSuccess = await invoke(
    ["plan", "set-status", "260716-2335-aggregation-plan", "--status", "completed", "--workspace", root, "--json"],
    root
  );
  assert.equal(planCompSuccess.code, EXIT_CODES.success, planCompSuccess.stderr);
  
  const planDocFinal = parseMarkdownDocument(await readFile(planAbs, "utf8"));
  assert.equal(planDocFinal.frontmatter.status, "completed");
});

test("Workflow transitions: byte-identical rejection on validation failure", async () => {
  const root = await temporaryRoot();
  await invoke(["init", "--workspace", root], root);
  
  await invoke(
    [
      "plan", "create",
      "--title", "Rejection Plan",
      "--work-item", "WI 1",
      "--created", "2026-07-16T23:35:55+07:00",
      "--workspace", root
    ],
    root
  );
  
  const before = await snapshot(root);
  
  // Try to start WI 1: should fail because Plan is not approved
  const wi1Path = "docs/harness/plans/260716-2335-rejection-plan/work-item-01-wi-1.md";
  const startFail = await invoke(
    ["work-item", "set-status", wi1Path, "--status", "in_progress", "--workspace", root, "--json"],
    root
  );
  assert.equal(startFail.code, EXIT_CODES.rejected);
  
  // Snapshot must be completely identical
  const after = await snapshot(root);
  assert.deepEqual(after, before);
});

test("Workflow transitions: legacy spelling and custom configured layout", async () => {
  const root = await temporaryRoot();
  await writeFile(
    join(root, "harness.yaml"),
    "root: custom-docs\nplans: roadmap\ndecisions: choices\nreports: outcomes\n",
    "utf8"
  );
  await invoke(["init", "--workspace", root], root);
  
  await invoke(
    [
      "plan", "create",
      "--title", "Custom Plan",
      "--work-item", "WI 1",
      "--created", "2026-07-16T23:35:55+07:00",
      "--workspace", root
    ],
    root
  );
  
  const wi1Path = "custom-docs/roadmap/260716-2335-custom-plan/work-item-01-wi-1.md";
  
  // Approve plan
  await invoke(["plan", "approve", "260716-2335-custom-plan", "--decided", "2026-07-16", "--workspace", root], root);
  
  // Set-status using legacy spelling "in-progress"
  const startSuccess = await invoke(
    ["work-item", "set-status", wi1Path, "--status", "in-progress", "--workspace", root, "--json"],
    root
  );
  assert.equal(startSuccess.code, EXIT_CODES.success, startSuccess.stderr);
  
  // Verify it wrote "in_progress" in frontmatter
  const doc = parseMarkdownDocument(await readFile(join(root, wi1Path), "utf8"));
  assert.equal(doc.frontmatter.status, "in_progress");
});
