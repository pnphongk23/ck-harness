import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { renderExpectedIndex, scanHarness } from "../src/core/integrity.js";

async function harnessFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-resolution-"));
  const harness = join(root, "docs", "harness");
  await mkdir(join(harness, "features"), { recursive: true });
  await mkdir(join(harness, "plans"), { recursive: true });
  await writeFile(join(harness, "index.md"), "---\nschema_version: 1\ngenerated: true\n---\n\n# Harness Index\n");
  return root;
}

function featureDocument(id: string, links: readonly string[] = []): string {
  const featureLinks = links.map((link) => `    - "${link}"`).join("\n");
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

# Feature
`;
}

function planDocument(status: string = "in_progress"): string {
  return `---
title: Plan
description: Desc
status: ${status}
approval:
  status: approved
  required_by: Reviewer
  decided: "2026-07-14"
priority: P1
effort: 1d
branch: main
tags: []
blockedBy: []
blocks: []
relationships:
  features: []
  specs: []
  decisions: []
  reports: []
  rules: []
  source_paths: []
created: "2026-07-14T12:00:00Z"
createdBy: Dev
---

# Plan
`;
}

function phaseDocument(phase: number, dependencies: number[] = []): string {
  return `---
phase: ${phase}
title: Phase
status: pending
priority: P1
effort: 1d
dependencies: [${dependencies.join(", ")}]
decision_dependencies: []
---

# Phase
`;
}

test("resolves exact target and labeled exact target identically, ignoring label that resembles another target", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  await writeFile(join(root, "docs", "harness", "features", "FEAT-001.md"), featureDocument("FEAT-001", [
    "[[FEAT-002]]", // exact target
    "[[FEAT-002|Custom Label]]", // labeled exact target
    "[[FEAT-002|FEAT-003]]", // label that resembles another target
  ]));
  await writeFile(join(root, "docs", "harness", "features", "FEAT-002.md"), featureDocument("FEAT-002"));
  await writeFile(join(root, "docs", "harness", "features", "FEAT-003.md"), featureDocument("FEAT-003"));

  const rendered = await renderExpectedIndex(root);
  assert.match(rendered, /FEAT-001\.md.*→.*FEAT-002\.md/);
  assert.doesNotMatch(rendered, /FEAT-001\.md.*→.*FEAT-003\.md/);
  assert.match(rendered, /## Unresolved relationships\n- None\./);
  
  const scan = await scanHarness(root);
  const linkFindings = scan.findings.filter(f => f.checkId.startsWith("relationships.wikilink"));
  assert.deepEqual(linkFindings, []);
});

test("broken source yields unresolved broken entry with no guessed edge/backlink", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  await writeFile(join(root, "docs", "harness", "features", "FEAT-001.md"), featureDocument("FEAT-001", ["[[FEAT-999]]"]));
  
  const rendered = await renderExpectedIndex(root);
  assert.match(rendered, /docs\/harness\/features\/FEAT-001\.md → `\[\[FEAT-999\]\]` broken/);
  assert.match(rendered, /## Forward relationships\n- None\./);
  assert.match(rendered, /## Backlinks\n- None\./);
  
  const scan = await scanHarness(root);
  assert.equal(scan.outcome, "failure");
  const brokenFinding = scan.findings.find(f => f.checkId === "relationships.wikilink");
  assert.ok(brokenFinding);
  assert.equal(brokenFinding.message, "unresolved wikilink: [[FEAT-999]]");
});

test("ambiguous duplicates list all candidates in sorted order with no guessed edge/backlink", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  await mkdir(join(root, "docs", "harness", "specs", "nested"), { recursive: true });
  await mkdir(join(root, "docs", "harness", "rules"), { recursive: true });

  await writeFile(join(root, "docs", "harness", "features", "FEAT-001.md"), featureDocument("FEAT-001", ["[[FEAT-998]]"]));
  
  const dupDoc = featureDocument("FEAT-998");
  await writeFile(join(root, "docs", "harness", "specs", "nested", "FEAT-998.md"), dupDoc);
  await writeFile(join(root, "docs", "harness", "rules", "FEAT-998.md"), dupDoc);

  const rendered = await renderExpectedIndex(root);
  assert.match(rendered, /docs\/harness\/features\/FEAT-001\.md → `\[\[FEAT-998\]\]` ambiguous: docs\/harness\/rules\/FEAT-998\.md, docs\/harness\/specs\/nested\/FEAT-998\.md/);
  assert.match(rendered, /## Forward relationships\n- None\./);
  assert.match(rendered, /## Backlinks\n- None\./);

  const scan = await scanHarness(root);
  assert.equal(scan.outcome, "failure");
  const ambiguousFinding = scan.findings.find(f => f.checkId === "relationships.wikilink.ambiguous");
  assert.ok(ambiguousFinding);
  assert.equal(ambiguousFinding.message, "ambiguous wikilink: [[FEAT-998]] resolves to docs/harness/rules/FEAT-998.md, docs/harness/specs/nested/FEAT-998.md");
});

test("canonical plan and phase targets resolve correctly", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const planDir = join(root, "docs", "harness", "plans", "260714-1147-maintain-navigable-harness-knowledge");
  await mkdir(planDir, { recursive: true });
  
  await writeFile(join(planDir, "plan.md"), planDocument("in_progress"));
  await writeFile(join(planDir, "phase-02-link-resolution.md"), phaseDocument(2));
  await writeFile(join(planDir, "phase-01.md"), phaseDocument(1));

  await writeFile(join(root, "docs", "harness", "features", "FEAT-001.md"), featureDocument("FEAT-001", [
    "[[260714-1147-maintain-navigable-harness-knowledge/plan]]",
    "[[260714-1147-maintain-navigable-harness-knowledge/phase-02-link-resolution]]"
  ]));

  const rendered = await renderExpectedIndex(root);
  assert.match(rendered, /FEAT-001\.md.*→.*plan\.md/);
  assert.match(rendered, /FEAT-001\.md.*→.*phase-02-link-resolution\.md/);
  assert.match(rendered, /## Unresolved relationships\n- None\./);
  
  await writeFile(join(root, "docs", "harness", "features", "FEAT-002.md"), featureDocument("FEAT-002", ["[[plan]]"]));
  const rendered2 = await renderExpectedIndex(root);
  assert.match(rendered2, /docs\/harness\/features\/FEAT-002\.md → `\[\[plan\]\]` broken/);
});

test("file creation in shuffled orders producing identical index bytes/classifications", async (t) => {
  const root1 = await harnessFixture();
  const root2 = await harnessFixture();
  t.after(() => Promise.all([
    rm(root1, { recursive: true, force: true }),
    rm(root2, { recursive: true, force: true })
  ]));

  await mkdir(join(root1, "docs", "harness", "specs"), { recursive: true });
  await mkdir(join(root1, "docs", "harness", "rules"), { recursive: true });
  await mkdir(join(root2, "docs", "harness", "specs"), { recursive: true });
  await mkdir(join(root2, "docs", "harness", "rules"), { recursive: true });

  const f1 = featureDocument("FEAT-001", ["[[FEAT-998]]"]);
  const dup = featureDocument("FEAT-998");

  await writeFile(join(root1, "docs", "harness", "features", "FEAT-001.md"), f1);
  await writeFile(join(root1, "docs", "harness", "specs", "FEAT-998.md"), dup);
  await writeFile(join(root1, "docs", "harness", "rules", "FEAT-998.md"), dup);

  await writeFile(join(root2, "docs", "harness", "rules", "FEAT-998.md"), dup);
  await writeFile(join(root2, "docs", "harness", "specs", "FEAT-998.md"), dup);
  await writeFile(join(root2, "docs", "harness", "features", "FEAT-001.md"), f1);

  const rendered1 = await renderExpectedIndex(root1);
  const rendered2 = await renderExpectedIndex(root2);
  
  assert.equal(rendered1, rendered2);
  
  const scan1 = await scanHarness(root1);
  const scan2 = await scanHarness(root2);
  
  assert.deepEqual(scan1.findings, scan2.findings);
});

test("generated index/graph output excluded, outside-repository path or absolute path never match", async (t) => {
  const root = await harnessFixture();
  const outside = await mkdtemp(join(tmpdir(), "harness-resolution-outside-"));
  t.after(() => Promise.all([
    rm(root, { recursive: true, force: true }),
    rm(outside, { recursive: true, force: true }),
  ]));

  await writeFile(join(root, "docs", "harness", "features", "FEAT-001.md"), featureDocument("FEAT-001", [
    "[[index]]",
    "[[graph]]",
    "[[/absolute/path/to/FEAT-002]]",
    "[[../../outside/FEAT-002]]"
  ]));
  
  await writeFile(join(root, "docs", "harness", "features", "FEAT-002.md"), featureDocument("FEAT-002"));
  await mkdir(join(root, "docs", "harness", "graphify-out"), { recursive: true });
  await writeFile(join(root, "docs", "harness", "graphify-out", "graph.md"), featureDocument("FEAT-900"));
  await writeFile(join(outside, "FEAT-901.md"), featureDocument("FEAT-901"));
  try {
    await symlink(join(outside, "FEAT-901.md"), join(root, "docs", "harness", "features", "FEAT-901.md"), "file");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EPERM") t.skip("filesystem does not permit symlink creation");
    else throw error;
  }
  
  const rendered = await renderExpectedIndex(root);
  assert.match(rendered, /docs\/harness\/features\/FEAT-001\.md → `\[\[index\]\]` broken/);
  assert.match(rendered, /docs\/harness\/features\/FEAT-001\.md → `\[\[graph\]\]` broken/);
  assert.match(rendered, /docs\/harness\/features\/FEAT-001\.md → `\[\[\/absolute\/path\/to\/FEAT-002\]\]` broken/);
  assert.match(rendered, /docs\/harness\/features\/FEAT-001\.md → `\[\[\.\.\/\.\.\/outside\/FEAT-002\]\]` broken/);
  assert.doesNotMatch(rendered, /graphify-out|FEAT-900|FEAT-901/);
});
