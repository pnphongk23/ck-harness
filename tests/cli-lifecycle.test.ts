import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { afterEach, test } from "node:test";
import { artifactSchema, planSchema, workItemSchema } from "../src/core/schemas/artifacts.js";
import { parseMarkdownDocument, serializeMarkdownDocument } from "../src/core/schemas/frontmatter.js";
import { runCli, EXIT_CODES } from "../src/cli/index.js";
import { renderExpectedIndex } from "../src/core/integrity.js";
import { skillNames } from "../src/core/skill-routing.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("init is idempotent, allowlisted, and preserves existing content", async () => {
  const root = await temporaryRoot();
  const readme = join(root, "docs", "harness", "README.md");
  const preservedSkill = join(root, ".agents", "skills", "harness-feature", "SKILL.md");
  const sentinel = join(root, "outside.txt");
  await mkdir(join(root, "docs", "harness"), { recursive: true });
  await mkdir(join(root, ".agents", "skills", "harness-feature"), { recursive: true });
  await writeFile(readme, "user content\n", "utf8");
  await writeFile(preservedSkill, "user skill\n", "utf8");
  await writeFile(sentinel, "preserve\n", "utf8");

  const first = await invoke(["init", "--workspace", root, "--json"], root);
  assert.equal(first.code, EXIT_CODES.success);
  assert.equal((JSON.parse(first.stdout) as { ok: boolean }).ok, true);
  assert.equal(await readFile(readme, "utf8"), "user content\n");
  assert.equal(await readFile(preservedSkill, "utf8"), "user skill\n");
  assert.equal(await readFile(sentinel, "utf8"), "preserve\n");
  for (const name of skillNames) {
    const target = join(root, ".agents", "skills", name, "SKILL.md");
    assert.equal(await fileExists(target), true, `missing initialized skill: ${name}`);
    if (name !== "harness-feature") {
      assert.equal(
        await readFile(target, "utf8"),
        await readFile(join(process.cwd(), ".agents", "skills", name, "SKILL.md"), "utf8"),
        `initialized skill differs from package source: ${name}`,
      );
    }
  }
  for (const internal of ["RULES.md", "schema-v1.md", "SKILL-PORTS.md"]) {
    assert.equal(await fileExists(join(root, "docs", "harness", internal)), false, `init must not publish ${internal}`);
  }
  const before = await snapshot(root);

  const second = await invoke(["init", "--workspace", root, "--json"], root);
  assert.equal(second.code, EXIT_CODES.success);
  assert.deepEqual(await snapshot(root), before);
  assert.equal((await readdir(join(root, "docs", "harness"))).includes(".harness.lock"), false);
});

test("artifact commands allocate monotonically and render canonical artifact shapes", async () => {
  const root = await initializedRoot();
  const commands = [
    ["feature", "create", "--title", "Checkout Flow", "--created", "2026-07-14"],
    ["feature", "create", "--title", "Refund Flow", "--created", "2026-07-14"],
    ["new", "spec", "--title", "Security Policy"],
    ["new", "decision", "--title", "Choose Storage", "--created", "2026-07-14"],
    ["new", "report", "--title", "Deliver Checkout", "--delivered", "2026-07-14"],
    ["new", "rule", "--title", "Verify Failure", "--approved", "2026-07-14", "--scope", "checkout", "--scope", "refund"],
  ];
  for (const args of commands) {
    const result = await invoke([...args, "--workspace", root, "--json"], root);
    assert.equal(result.code, EXIT_CODES.success, result.stderr);
  }

  const expected = [
    "docs/harness/features/FEAT-001-checkout-flow.md",
    "docs/harness/features/FEAT-002-refund-flow.md",
    "docs/harness/specs/security-policy.md",
    "docs/harness/decisions/DEC-001-choose-storage.md",
    "docs/harness/reports/REP-001-deliver-checkout.md",
    "docs/harness/rules/RULE-001-verify-failure.md",
  ];
  for (const path of expected) {
    const parsed = parseMarkdownDocument(await readFile(join(root, path), "utf8"));
    assert.ok("type" in parsed.frontmatter, path);
  }
  const feature = await readFile(join(root, expected[0]!), "utf8");
  assert.match(feature, /Product Authority must define/);
  assert.doesNotMatch(feature, /shopper confirms/);
  const index = await readFile(join(root, "docs", "harness", "index.md"), "utf8");
  assert.match(index, /next_feature_sequence: 3/);
  assert.match(index, /next_decision_sequence: 2/);
  assert.match(index, /next_report_sequence: 2/);
  assert.match(index, /next_rule_sequence: 2/);
});

test("feature list and show are read-only and rename rewrites inbound links", async () => {
  const root = await initializedRoot();
  await createFeature(root, "Checkout");
  await createFeature(root, "Consumer");
  const consumerPath = join(root, "docs", "harness", "features", "FEAT-002-consumer.md");
  const consumer = parseMarkdownDocument(await readFile(consumerPath, "utf8"));
  if (!("type" in consumer.frontmatter) || consumer.frontmatter.type !== "feature") assert.fail("expected Feature");
  const linked = artifactSchema.parse({
    ...consumer.frontmatter,
    relationships: { ...consumer.frontmatter.relationships, features: ["[[FEAT-001-checkout|FEAT-001]]"] },
  });
  await writeFile(consumerPath, serializeMarkdownDocument({ frontmatter: linked, body: consumer.body.replace("- No relationships recorded yet.", "- Related Feature: [[FEAT-001-checkout|FEAT-001]]") }), "utf8");
  const beforeReads = await snapshot(root);

  const listed = await invoke(["feature", "list", "--workspace", root, "--json"], root);
  const shown = await invoke(["feature", "show", "FEAT-001", "--workspace", root, "--json"], root);
  assert.equal(listed.code, EXIT_CODES.success);
  assert.equal(shown.code, EXIT_CODES.success);
  assert.deepEqual(await snapshot(root), beforeReads);

  const renamed = await invoke(["feature", "rename", "FEAT-001", "--title", "Purchase", "--workspace", root, "--json"], root);
  assert.equal(renamed.code, EXIT_CODES.success, renamed.stderr);
  assert.rejects(readFile(join(root, "docs", "harness", "features", "FEAT-001-checkout.md"), "utf8"));
  const renamedPath = join(root, "docs", "harness", "features", "FEAT-001-purchase.md");
  const renamedFeature = parseMarkdownDocument(await readFile(renamedPath, "utf8"));
  assert.equal("id" in renamedFeature.frontmatter && renamedFeature.frontmatter.id, "FEAT-001");
  assert.equal(renamedFeature.frontmatter.title, "Purchase");
  assert.match(await readFile(consumerPath, "utf8"), /\[\[FEAT-001-purchase\|FEAT-001\]\]/);

  const blocked = await invoke(["feature", "delete", "FEAT-001", "--workspace", root, "--json"], root);
  assert.equal(blocked.code, EXIT_CODES.rejected);
  assert.match(blocked.stderr, /FEAT-002-consumer\.md/);
  const forced = await invoke(["feature", "delete", "FEAT-001", "--force", "--workspace", root, "--json"], root);
  assert.equal(forced.code, EXIT_CODES.success);
  await createFeature(root, "Replacement");
  assert.equal(await fileExists(join(root, "docs", "harness", "features", "FEAT-003-replacement.md")), true);
});

test("deprecation preserves approval and clean removes only allowlisted disposable output", async () => {
  const root = await initializedRoot();
  await createFeature(root, "Approved Feature");
  const featurePath = join(root, "docs", "harness", "features", "FEAT-001-approved-feature.md");
  const parsed = parseMarkdownDocument(await readFile(featurePath, "utf8"));
  if (!("type" in parsed.frontmatter) || parsed.frontmatter.type !== "feature") assert.fail("expected Feature");
  const approved = artifactSchema.parse({ ...parsed.frontmatter, status: "approved", approved: "2026-07-14", approved_by: "Product Authority" });
  await writeFile(featurePath, serializeMarkdownDocument({ frontmatter: approved, body: parsed.body }), "utf8");
  const deprecated = await invoke(["feature", "deprecate", "FEAT-001", "--workspace", root], root);
  assert.equal(deprecated.code, EXIT_CODES.success, deprecated.stderr);
  const after = parseMarkdownDocument(await readFile(featurePath, "utf8"));
  assert.equal("status" in after.frontmatter && after.frontmatter.status, "deprecated");

  const temporary = join(root, "docs", "harness", "features", ".stale.md.harness-tmp-99-0");
  const graph = join(root, "docs", "harness", "graph-out", "retrieval-index.json");
  await writeFile(temporary, "temporary", "utf8");
  await mkdir(join(root, "docs", "harness", "graph-out"), { recursive: true });
  await writeFile(graph, "{}", "utf8");
  const before = await snapshot(root);
  const preview = await invoke(["clean", "--dry-run", "--workspace", root, "--json"], root);
  assert.equal(preview.code, EXIT_CODES.success);
  assert.deepEqual(await snapshot(root), before);
  assert.match(preview.stdout, /graph-out/);
  assert.match(preview.stdout, /harness-tmp/);

  const cleaned = await invoke(["clean", "--workspace", root, "--json"], root);
  assert.equal(cleaned.code, EXIT_CODES.success);
  assert.equal(await fileExists(temporary), false);
  assert.equal(await fileExists(join(root, "docs", "harness", "graph-out")), false);
  assert.equal(await fileExists(featurePath), true);
});

test("CLI grammar is strict and exposes no recovery, watcher, or adapter commands", async () => {
  const root = await initializedRoot();
  for (const args of [
    ["recover", "status"],
    ["validate"],
    ["watch"],
    ["--workspace", root, "feature", "list"],
    ["feature", "list", "--unknown"],
    ["new", "report", "--title", "Missing Delivery Date"],
    ["new", "rule", "--title", "Missing Approval", "--scope", "test"],
  ]) {
    const result = await invoke([...args, "--json"], root);
    assert.equal(result.code, EXIT_CODES.usage, args.join(" "));
    assert.equal((JSON.parse(result.stderr) as { ok: boolean }).ok, false);
  }
  const cliSource = await readFile(join(process.cwd(), "src", "cli", "index.ts"), "utf8");
  const lifecycleSource = await readFile(join(process.cwd(), "src", "core", "lifecycle.ts"), "utf8");
  assert.doesNotMatch(`${cliSource}\n${lifecycleSource}`, /node:child_process|\bspawn\s*\(|\bexecFile\s*\(/);
});

test("validate supports explicit scopes, stable JSON failures, and no writes", async () => {
  const root = await initializedRoot();
  await createFeature(root, "Integrity Target");
  const target = "docs/harness/features/FEAT-001-integrity-target.md";
  const before = await snapshot(root);
  for (const args of [["validate", "--all"], ["validate", target], ["validate", "--kind", "feature"]]) {
    const result = await invoke([...args, "--workspace", root, "--json"], root);
    assert.equal(result.code, EXIT_CODES.success, result.stderr);
    assert.equal((JSON.parse(result.stdout) as { ok: boolean }).ok, true);
  }
  assert.deepEqual(await snapshot(root), before);

  const parsed = parseMarkdownDocument(await readFile(join(root, target), "utf8"));
  if (!("type" in parsed.frontmatter)) assert.fail("expected artifact");
  await writeFile(join(root, target), serializeMarkdownDocument({
    frontmatter: artifactSchema.parse({ ...parsed.frontmatter, relationships: { ...parsed.frontmatter.relationships, features: ["[[missing|FEAT-999]]"] } }),
    body: parsed.body,
  }));
  const invalid = await invoke(["validate", target, "--workspace", root, "--json"], root);
  assert.equal(invalid.code, EXIT_CODES.invalid);
  const payload = JSON.parse(invalid.stderr) as { ok: boolean; error: { code: string; details: string[] } };
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "invalid");
  assert.ok(payload.error.details.some((detail) => detail.includes("relationships.wikilink")));
});

test("index check has stable CI outcomes and never changes the workspace", async () => {
  const root = await initializedRoot();
  await createFeature(root, "Indexed Feature");
  await writeFile(join(root, "docs", "harness", "index.md"), await renderExpectedIndex(root));
  const before = await snapshot(root);
  const valid = await invoke(["index", "check", "--workspace", root, "--json"], root);
  assert.equal(valid.code, EXIT_CODES.success, valid.stderr);
  assert.equal((JSON.parse(valid.stdout) as { ok: boolean }).ok, true);
  assert.deepEqual(await snapshot(root), before);

  await writeFile(join(root, "docs", "harness", "index.md"), "---\nschema_version: 1\ngenerated: true\n---\n\n# Harness Index\n");
  const stale = await invoke(["index", "check", "--workspace", root, "--json"], root);
  assert.equal(stale.code, EXIT_CODES.invalid);
  const payload = JSON.parse(stale.stderr) as { error: { details: string[] } };
  assert.ok(payload.error.details.some((detail) => detail.includes("index.stale")));
  const usage = await invoke(["index", "check", "extra", "--workspace", root, "--json"], root);
  assert.equal(usage.code, EXIT_CODES.usage);
});

test("index check accepts a current rendering with lifecycle-managed sequence counters", async () => {
  const root = await initializedRoot();
  await createFeature(root, "Counter Feature");
  await writeFile(join(root, "docs", "harness", "index.md"), await renderExpectedIndex(root, {
    next_feature_sequence: 2, next_decision_sequence: 1, next_report_sequence: 1, next_rule_sequence: 1,
  }));
  const result = await invoke(["index", "check", "--workspace", root, "--json"], root);
  assert.equal(result.code, EXIT_CODES.success, result.stderr);
});

test("doctor is read-only and never invokes a process", async () => {
  const root = await initializedRoot();
  await mkdir(join(root, "docs", "harness", "workflows"), { recursive: true });
  await writeFile(join(root, "docs", "harness", "workflows", "README.md"), "router\n");
  await writeFile(join(root, "docs", "harness", "workflows", "cook.md"), "cook\n");
  await writeFile(join(root, "docs", "harness", "index.md"), await renderExpectedIndex(root));
  const before = await snapshot(root);
  const result = await invoke(["doctor", "--workspace", root, "--json"], root);
  assert.equal(result.code, EXIT_CODES.success, result.stderr);
  const payload = JSON.parse(result.stdout) as { ok: boolean; data: { findings: { severity: string; checkId: string }[] } };
  assert.equal(payload.ok, true);
  assert.ok(payload.data.findings.every((entry) => entry.severity === "warning"));
  assert.deepEqual(await snapshot(root), before);
  const source = await readFile(join(process.cwd(), "src", "core", "integrity.ts"), "utf8");
  assert.doesNotMatch(source, /node:child_process|\bspawn\s*\(|\bexecFile\s*\(/);
});

test("nested working directories, spaces, non-ASCII titles, and inconsistent state are handled deterministically", async () => {
  const parent = await temporaryRoot();
  const root = join(parent, "repository with spaces");
  await mkdir(root);
  const initialized = await invoke(["init", "--workspace", root], root);
  assert.equal(initialized.code, EXIT_CODES.success, initialized.stderr);
  const nested = join(root, "nested", "working", "directory");
  await mkdir(nested, { recursive: true });
  const created = await invoke(["feature", "create", "--title", "Đổi trả sản phẩm", "--created", "2026-07-14"], nested);
  assert.equal(created.code, EXIT_CODES.success, created.stderr);
  const feature = join(root, "docs", "harness", "features", "FEAT-001-doi-tra-san-pham.md");
  assert.equal(await fileExists(feature), true);

  const duplicate = join(root, "docs", "harness", "features", "FEAT-001-duplicate.md");
  await writeFile(duplicate, await readFile(feature, "utf8"), "utf8");
  const rejected = await invoke(["feature", "create", "--title", "Must Not Publish", "--created", "2026-07-14"], nested);
  assert.equal(rejected.code, EXIT_CODES.invalid);
  assert.match(rejected.stderr, /duplicate Feature ID/);
  assert.equal(await fileExists(join(root, "docs", "harness", "features", "FEAT-002-must-not-publish.md")), false);
});

test("custom layout: init, create, rename, delete, clean, and errors", async () => {
  const root = await temporaryRoot();
  // Write custom harness.yaml
  await writeFile(
    join(root, "harness.yaml"),
    "root: custom-docs\nfeatures: product-features\nspecs: eng-specs\ndecisions: choices\nplans: roadmap\nreports: outcomes\nrules: guidelines\ntemplates: blueprints\nworkflows: procedures\n",
    "utf8"
  );

  // 1. Verify that running any command before init fails and references the custom index path, not docs/harness
  const failedShow = await invoke(["feature", "show", "FEAT-001", "--workspace", root, "--json"], root);
  assert.equal(failedShow.code, EXIT_CODES.rejected);
  const errPayload = JSON.parse(failedShow.stderr);
  assert.equal(errPayload.ok, false);
  assert.match(errPayload.error.message, /Harness is not initialized/);

  // 2. Initialize the custom layout
  const initResult = await invoke(["init", "--workspace", root, "--json"], root);
  assert.equal(initResult.code, EXIT_CODES.success, initResult.stderr);

  // Assert directories and files created under custom-docs/
  const customIndex = join(root, "custom-docs", "index.md");
  assert.equal(await fileExists(customIndex), true);
  assert.equal(await fileExists(join(root, "custom-docs", "README.md")), true);
  assert.equal(await fileExists(join(root, "custom-docs", "product-features")), true);
  assert.equal(await fileExists(join(root, "custom-docs", "blueprints", "feature.md")), true);
  assert.equal(await fileExists(join(root, "custom-docs", "procedures", "cook.md")), true);
  // Assert .agents/skills remains at root
  assert.equal(await fileExists(join(root, ".agents", "skills", "harness-feature", "SKILL.md")), true);

  // Assert docs/harness does NOT exist
  assert.equal(await fileExists(join(root, "docs", "harness")), false);

  // 3. Create a feature in custom layout
  const featureResult = await invoke(["feature", "create", "--title", "Configured Feature", "--created", "2026-07-14", "--workspace", root, "--json"], root);
  assert.equal(featureResult.code, EXIT_CODES.success, featureResult.stderr);
  const featurePath = join(root, "custom-docs", "product-features", "FEAT-001-configured-feature.md");
  assert.equal(await fileExists(featurePath), true);

  // 4. Rename feature in custom layout
  const renameResult = await invoke(["feature", "rename", "FEAT-001", "--title", "Renamed Configured Feature", "--workspace", root, "--json"], root);
  assert.equal(renameResult.code, EXIT_CODES.success, renameResult.stderr);
  const renamedPath = join(root, "custom-docs", "product-features", "FEAT-001-renamed-configured-feature.md");
  assert.equal(await fileExists(renamedPath), true);
  assert.equal(await fileExists(featurePath), false);

  // 5. Clean in custom layout
  // Create temporary/stale sibling under a custom collection directory
  const tempPath = join(root, "custom-docs", "product-features", ".stale.md.harness-tmp-99-0");
  await writeFile(tempPath, "temporary", "utf8");
  const cleanResult = await invoke(["clean", "--workspace", root, "--json"], root);
  assert.equal(cleanResult.code, EXIT_CODES.success);
  assert.equal(await fileExists(tempPath), false);

  // 6. Delete feature in custom layout
  const deleteResult = await invoke(["feature", "delete", "FEAT-001", "--workspace", root, "--json"], root);
  assert.equal(deleteResult.code, EXIT_CODES.success, deleteResult.stderr);
  assert.equal(await fileExists(renamedPath), false);
});

test("custom layout: init preserves existing custom files", async () => {
  const root = await temporaryRoot();
  await writeFile(
    join(root, "harness.yaml"),
    "root: custom-docs\nfeatures: product-features\ntemplates: blueprints\n",
    "utf8"
  );
  await mkdir(join(root, "custom-docs", "blueprints"), { recursive: true });
  await writeFile(join(root, "custom-docs", "blueprints", "feature.md"), "user template", "utf8");

  const initResult = await invoke(["init", "--workspace", root, "--json"], root);
  assert.equal(initResult.code, EXIT_CODES.success);
  assert.equal(await readFile(join(root, "custom-docs", "blueprints", "feature.md"), "utf8"), "user template");
});


test("plan creation, validations, custom layouts, and collisions", async () => {
  const root = await initializedRoot();

  // 1. Deterministic multi-Work-Item creation at 2026-07-16T23:35:55+07:00
  // Cover spaces/non-ASCII slugging, JSON output
  const title = "Thiết kế hệ thống";
  const createdTimestamp = "2026-07-16T23:35:55+07:00";
  const planArgs = [
    "plan",
    "create",
    "--title",
    title,
    "--work-item",
    "Work Item 1",
    "--work-item",
    "Work Item 2",
    "--created",
    createdTimestamp,
    "--workspace",
    root,
    "--json",
  ];
  const jsonResult = await invoke(planArgs, root);
  assert.equal(jsonResult.code, EXIT_CODES.success, jsonResult.stderr);

  const parsedJson = JSON.parse(jsonResult.stdout) as {
    ok: boolean;
    data: { path: string; affected: string[] };
  };
  assert.equal(parsedJson.ok, true);
  assert.ok(parsedJson.data.path.includes("260716-2335-thiet-ke-he-thong"));

  // Check exact 260716-2335 directory and files
  const planDir = join(root, "docs", "harness", "plans", "260716-2335-thiet-ke-he-thong");
  const planFile = join(planDir, "plan.md");
  const wi1File = join(planDir, "work-item-01-work-item-1.md");
  const wi2File = join(planDir, "work-item-02-work-item-2.md");

  assert.equal(await fileExists(planFile), true);
  assert.equal(await fileExists(wi1File), true);
  assert.equal(await fileExists(wi2File), true);

  // Check LF and schema validation
  const planContent = await readFile(planFile, "utf8");
  const wi1Content = await readFile(wi1File, "utf8");
  const wi2Content = await readFile(wi2File, "utf8");

  assert.equal(planContent.includes("\r"), false, "plan.md contains CR");
  assert.equal(wi1Content.includes("\r"), false, "work-item-01 contains CR");
  assert.equal(wi2Content.includes("\r"), false, "work-item-02 contains CR");

  // Parse via executable schemas
  const planDoc = parseMarkdownDocument(planContent);
  const planFM = planSchema.parse(planDoc.frontmatter);

  const wi1Doc = parseMarkdownDocument(wi1Content);
  const wi1FM = workItemSchema.parse(wi1Doc.frontmatter);

  const wi2Doc = parseMarkdownDocument(wi2Content);
  const wi2FM = workItemSchema.parse(wi2Doc.frontmatter);

  // Assert pending approval/execution with no decided date
  assert.equal(planFM.status, "pending");
  assert.equal(planFM.approval.status, "pending");
  assert.equal(planFM.approval.decided, undefined);

  // Assert pending Work Items and ordered dependencies
  assert.equal(wi1FM.status, "pending");
  assert.deepEqual(wi1FM.dependencies, []);
  assert.equal(wi2FM.status, "pending");
  assert.deepEqual(wi2FM.dependencies, [1]);

  // 2. Human output
  const root2 = await initializedRoot();
  const humanResult = await invoke(
    [
      "plan",
      "create",
      "--title",
      "Human Plan",
      "--work-item",
      "WI 1",
      "--created",
      "2026-07-16T23:35:55+07:00",
      "--workspace",
      root2,
    ],
    root2,
  );
  assert.equal(humanResult.code, EXIT_CODES.success, humanResult.stderr);
  assert.match(humanResult.stdout, /created/);

  // 3. Validation errors / strict inputs
  // Missing/empty title and Work Items
  const resultNoTitle = await invoke(
    ["plan", "create", "--work-item", "WI 1", "--workspace", root, "--json"],
    root,
  );
  assert.equal(resultNoTitle.code, EXIT_CODES.usage);

  const resultEmptyTitle = await invoke(
    ["plan", "create", "--title", " ", "--work-item", "WI 1", "--workspace", root, "--json"],
    root,
  );
  assert.equal(resultEmptyTitle.code, EXIT_CODES.usage);

  const resultNoWI = await invoke(
    ["plan", "create", "--title", "Title", "--workspace", root, "--json"],
    root,
  );
  assert.equal(resultNoWI.code, EXIT_CODES.usage);

  const resultEmptyWI = await invoke(
    ["plan", "create", "--title", "Title", "--work-item", " ", "--workspace", root, "--json"],
    root,
  );
  assert.equal(resultEmptyWI.code, EXIT_CODES.usage);

  // Malformed timestamp
  const resultBadTime = await invoke(
    [
      "plan",
      "create",
      "--title",
      "Title",
      "--work-item",
      "WI 1",
      "--created",
      "2026-07-16",
      "--workspace",
      root,
      "--json",
    ],
    root,
  );
  assert.equal(resultBadTime.code, EXIT_CODES.usage);

  // Strict unknown option/extra positional rejection
  const resultUnknownOpt = await invoke(
    [
      "plan",
      "create",
      "--title",
      "Title",
      "--work-item",
      "WI 1",
      "--unknown-opt",
      "--workspace",
      root,
      "--json",
    ],
    root,
  );
  assert.equal(resultUnknownOpt.code, EXIT_CODES.usage);

  const resultExtraPos = await invoke(
    [
      "plan",
      "create",
      "extra-positional",
      "--title",
      "Title",
      "--work-item",
      "WI 1",
      "--workspace",
      root,
      "--json",
    ],
    root,
  );
  assert.equal(resultExtraPos.code, EXIT_CODES.usage);

  // 4. Exact collision with no file changes
  const rootCol = await initializedRoot();
  const argsCol = [
    "plan",
    "create",
    "--title",
    "Collision Plan",
    "--work-item",
    "WI 1",
    "--created",
    "2026-07-16T23:35:55+07:00",
    "--workspace",
    rootCol,
    "--json",
  ];
  const firstCol = await invoke(argsCol, rootCol);
  assert.equal(firstCol.code, EXIT_CODES.success);
  const beforeSnapshot = await snapshot(rootCol);
  const secondCol = await invoke(argsCol, rootCol);
  assert.equal(secondCol.code, EXIT_CODES.rejected);
  assert.deepEqual(await snapshot(rootCol), beforeSnapshot);

  // 5. Handled invalid-template/failure with no Plan publication
  // Missing template
  const rootTpl = await initializedRoot();
  const planTemplatePath = join(rootTpl, "docs", "harness", "templates", "plan.md");
  await rm(planTemplatePath);
  const beforeTplSnapshot = await snapshot(rootTpl);
  const resultTpl = await invoke(
    ["plan", "create", "--title", "No Template", "--work-item", "WI 1", "--workspace", rootTpl, "--json"],
    rootTpl,
  );
  assert.equal(resultTpl.code, EXIT_CODES.rejected);
  assert.deepEqual(await snapshot(rootTpl), beforeTplSnapshot);

  // Invalid template frontmatter
  const rootInvTpl = await initializedRoot();
  const planTemplatePathInv = join(rootInvTpl, "docs", "harness", "templates", "plan.md");
  await writeFile(planTemplatePathInv, "invalid template content", "utf8");
  const beforeInvTplSnapshot = await snapshot(rootInvTpl);
  const resultInvTpl = await invoke(
    [
      "plan",
      "create",
      "--title",
      "Invalid Template",
      "--work-item",
      "WI 1",
      "--workspace",
      rootInvTpl,
      "--json",
    ],
    rootInvTpl,
  );
  assert.equal(resultInvTpl.code, EXIT_CODES.invalid);
  assert.deepEqual(await snapshot(rootInvTpl), beforeInvTplSnapshot);

  // 6. Custom configured plan/template directories
  const rootCustom = await temporaryRoot();
  await writeFile(
    join(rootCustom, "harness.yaml"),
    "root: custom-docs\nplans: roadmap\ntemplates: blueprints\n",
    "utf8",
  );
  // Initialize custom layout
  const initResult = await invoke(["init", "--workspace", rootCustom, "--json"], rootCustom);
  assert.equal(initResult.code, EXIT_CODES.success);

  // Verify templates exist in blueprints/
  assert.equal(await fileExists(join(rootCustom, "custom-docs", "blueprints", "plan.md")), true);
  assert.equal(await fileExists(join(rootCustom, "custom-docs", "blueprints", "work-item.md")), true);

  // Create plan in custom layout
  const planResult = await invoke(
    [
      "plan",
      "create",
      "--title",
      "Custom Configured Plan",
      "--work-item",
      "Item 1",
      "--created",
      "2026-07-16T23:35:55+07:00",
      "--workspace",
      rootCustom,
      "--json",
    ],
    rootCustom,
  );
  assert.equal(planResult.code, EXIT_CODES.success, planResult.stderr);
  const customPlanPath = join(
    rootCustom,
    "custom-docs",
    "roadmap",
    "260716-2335-custom-configured-plan",
    "plan.md",
  );
  assert.equal(await fileExists(customPlanPath), true);

  // 7. Init publishes both templates and preserves pre-existing template bytes
  const rootInit = await temporaryRoot();
  await mkdir(join(rootInit, "docs", "harness", "templates"), { recursive: true });
  await writeFile(
    join(rootInit, "docs", "harness", "templates", "plan.md"),
    "existing plan template bytes",
    "utf8",
  );
  const initResult2 = await invoke(["init", "--workspace", rootInit, "--json"], rootInit);
  assert.equal(initResult2.code, EXIT_CODES.success);
  assert.equal(
    await readFile(join(rootInit, "docs", "harness", "templates", "plan.md"), "utf8"),
    "existing plan template bytes",
  );
  assert.equal(
    await fileExists(join(rootInit, "docs", "harness", "templates", "work-item.md")),
    true,
  );
});

async function initializedRoot(): Promise<string> {
  const root = await temporaryRoot();
  const result = await invoke(["init", "--workspace", root], root);
  assert.equal(result.code, EXIT_CODES.success, result.stderr);
  return root;
}

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-cli-"));
  temporaryRoots.push(root);
  return root;
}

async function createFeature(root: string, title: string): Promise<void> {
  const result = await invoke(["feature", "create", "--title", title, "--created", "2026-07-14", "--workspace", root], root);
  assert.equal(result.code, EXIT_CODES.success, result.stderr);
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

async function fileExists(path: string): Promise<boolean> {
  return readFile(path).then(() => true, async () => {
    return readdir(path).then(() => true, () => false);
  });
}
