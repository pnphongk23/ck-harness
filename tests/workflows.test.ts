import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

const docsRoot = join(process.cwd(), "docs", "harness");

test("RULES.md exists and contains all stable rule labels from R-001 to R-026", async () => {
  const content = await readFile(join(docsRoot, "RULES.md"), "utf8");
  for (let i = 1; i <= 26; i++) {
    const label = `R-${String(i).padStart(3, "0")}`;
    assert.ok(content.includes(label), `RULES.md must define policy rule: ${label}`);
  }
});

test("each of the five workflows has the exact nine required sections", async () => {
  const workflows = ["feature.md", "decision.md", "plan.md", "cook.md", "self-improve.md"];
  const requiredSections = [
    "## Purpose",
    "## Use When",
    "## Inputs",
    "## Hard Gates",
    "## Procedure",
    "## Output",
    "## Completion Criteria",
    "## Prohibited Actions",
    "## Failure and Recovery",
  ];

  for (const file of workflows) {
    const content = await readFile(join(docsRoot, "workflows", file), "utf8");
    for (const section of requiredSections) {
      assert.ok(
        content.includes(section),
        `Workflow ${file} is missing the required section header: ${section}`
      );
    }
  }
});

test("workflows enforce key architectural boundaries and behaviors", async () => {
  const featureContent = await readFile(join(docsRoot, "workflows", "feature.md"), "utf8");
  assert.match(featureContent, /scout/i, "Feature workflow must mention scouting repository");
  assert.match(featureContent, /Observed/i, "Feature workflow must mention Observed evidence");
  assert.match(featureContent, /Inferred/i, "Feature workflow must mention Inferred evidence");
  assert.match(featureContent, /TBD/i, "Feature workflow must mention TBD evidence");
  assert.match(featureContent, /2-3/i, "Feature workflow must mention proposing 2-3 approaches");
  assert.match(featureContent, /simplest/i, "Feature workflow must prioritize the simplest approach");
  assert.match(featureContent, /human approval/i, "Feature workflow must require human approval");
  assert.match(featureContent, /do not create.*plan/i, "Feature workflow must prohibit planning");

  const cookContent = await readFile(join(docsRoot, "workflows", "cook.md"), "utf8");
  assert.match(cookContent, /approved plan/i, "Cook workflow must require an approved plan");
  assert.match(cookContent, /one phase at a time/i, "Cook workflow must work one phase at a time");
  assert.match(cookContent, /evidence/i, "Cook workflow must require evidence of success");
  assert.match(cookContent, /never.*automatically commit/i, "Cook workflow must prohibit automatic commits");
  assert.match(cookContent, /delegation is optional, never mandatory/i, "Cook must not require or forbid bounded workers");
  assert.match(cookContent, /cannot be marked `completed`/i, "Blocked verification must keep the plan incomplete");

  const planContent = await readFile(join(docsRoot, "workflows", "plan.md"), "utf8");
  assert.doesNotMatch(planContent, /status.*`approved`/i, "Plan workflow must not invent an approved status");
  assert.match(planContent, /every generated phase stub/i, "Plan workflow must read generated stubs before replacement");

  const selfImproveContent = await readFile(join(docsRoot, "workflows", "self-improve.md"), "utf8");
  assert.match(selfImproveContent, /classify the signal/i, "Self Improve must classify evidence before acting");
  assert.match(selfImproveContent, /recurrence_key/i, "Self Improve must preserve recurrence grouping");
  assert.match(selfImproveContent, /two independent/i, "Rule promotion inside Self Improve must require two occurrences");
  assert.match(selfImproveContent, /human.*approval/i, "Self Improve must require human approval");
  assert.match(selfImproveContent, /never rewrite.*automatically/is, "Self Improve must prohibit automatic self-mutation");
  assert.match(selfImproveContent, /graphify/i, "Self Improve must describe optional Graphify use");
  assert.match(selfImproveContent, /warn and skip/i, "Self Improve must degrade gracefully if Graphify is missing");
});

test("cook.md contains the exact Vietnamese block disclosure", async () => {
  const content = await readFile(join(docsRoot, "workflows", "cook.md"), "utf8");
  assert.ok(
    content.includes("Tôi không thể xác minh điều này hoạt động vì..."),
    "cook.md must include the exact Vietnamese block disclosure statement"
  );
});

test("index.md contains local workflow router and rules links", async () => {
  const content = await readFile(join(docsRoot, "index.md"), "utf8");
  assert.ok(content.includes("RULES.md"), "index.md must link to RULES.md");
  assert.ok(content.includes("workflows/README.md"), "index.md must link to the workflow router");
});

test("workflows/README.md references all five workflow files", async () => {
  const content = await readFile(join(docsRoot, "workflows", "README.md"), "utf8");
  assert.ok(content.includes("feature.md"), "workflow router must link to feature.md");
  assert.ok(content.includes("decision.md"), "workflow router must link to decision.md");
  assert.ok(content.includes("plan.md"), "workflow router must link to plan.md");
  assert.ok(content.includes("cook.md"), "workflow router must link to cook.md");
  assert.ok(content.includes("self-improve.md"), "workflow router must link to self-improve.md");
  assert.equal(content.includes("rule-promotion.md"), false, "workflow router must not reference the retired workflow path");
});
