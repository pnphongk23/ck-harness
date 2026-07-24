import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

const docsRoot = join(process.cwd(), "docs", "harness");

function procedureOf(content: string): string {
  const start = content.indexOf("## Procedure");
  const end = content.indexOf("## Output", start);
  assert.ok(start >= 0 && end > start, "workflow must expose an ordered Procedure section");
  return content.slice(start, end);
}

function assertOrdered(content: string, markers: string[], message: string): void {
  let prior = -1;
  for (const marker of markers) {
    const current = content.indexOf(marker);
    assert.ok(current >= 0, `${message}: missing ${marker}`);
    assert.ok(current > prior, `${message}: ${marker} is out of order`);
    prior = current;
  }
}

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
  assert.match(featureContent, /project purpose[\s\S]*stack[\s\S]*entry points[\s\S]*architecture[\s\S]*execution flows/i, "Feature workflow must require project and codebase research");
  assert.match(featureContent, /Observed/i, "Feature workflow must mention Observed evidence");
  assert.match(featureContent, /Inferred/i, "Feature workflow must mention Inferred evidence");
  assert.match(featureContent, /TBD/i, "Feature workflow must mention TBD evidence");
  assert.match(featureContent, /behavior variants/i, "Feature workflow must keep alternatives at business-behavior level");
  assert.match(featureContent, /do not create a Feature for every repository task/i, "Feature workflow must avoid universal Feature creation");
  assert.match(featureContent, /Product Authority/i, "Feature workflow must name its approval authority");
  assert.match(featureContent, /do not create.*plan/i, "Feature workflow must prohibit planning");
  assert.ok(
    featureContent.indexOf("Research project and codebase first") < featureContent.indexOf("Clarify exact requirements"),
    "Feature workflow must research the project and codebase before asking material questions"
  );
  for (const field of ["expected output", "acceptance criteria", "explicit exclusions", "non-negotiable constraints", "affected touchpoints"]) {
    assert.match(featureContent, new RegExp(field, "i"), `Feature workflow must require concrete ${field}`);
  }
  assert.match(featureContent, /two or three[\s\S]*behavior variants/i, "Feature workflow must compare grounded behavior variants");
  assert.match(featureContent, /Do not infer a selection/i, "Feature workflow must not choose for Product Authority");
  assert.match(featureContent, /Failed[\s\S]*Unresolved \(TBD\)/i, "Feature workflow must preserve failed and unresolved evidence");

  const decisionContent = await readFile(join(docsRoot, "workflows", "decision.md"), "utf8");
  assert.match(decisionContent, /return boundary/i, "Decision must return to the workflow that raised it");
  assert.match(decisionContent, /proposed or approved Feature/i, "Product Decision may use a proposed Feature");
  assert.match(decisionContent, /local, mandated, (?:and|or) cheaply\s+reversible/i, "Decision must avoid local-choice artifacts");

  const cookContent = await readFile(join(docsRoot, "workflows", "cook.md"), "utf8");
  assert.match(cookContent, /approved plan/i, "Cook workflow must require an approved plan");
  assert.match(cookContent, /one (?:eligible )?Work Item at a time/i, "Cook workflow must work one Work Item at a time");
  assert.match(cookContent, /evidence/i, "Cook workflow must require evidence of success");
  assert.match(cookContent, /never.*automatically commit/i, "Cook workflow must prohibit automatic commits");
  assert.match(cookContent, /do not write Cook status/i, "Cook must derive rather than persist its state");
  assert.match(cookContent, /do not complete the Work Item or Plan/i, "Blocked verification must keep the Plan incomplete");

  const planContent = await readFile(join(docsRoot, "workflows", "plan.md"), "utf8");
  assert.match(planContent, /approval metadata/i, "Plan workflow must store approval separately from execution");
  assert.match(planContent, /decision_dependencies/i, "Plan Work Items must record Decision dependencies");
  assert.match(planContent, /every generated Plan and Work Item file/i, "Plan workflow must read generated stubs before replacement");
  assert.match(planContent, /work-item-XX/i, "Plan workflow must use Work Item filenames");
  assert.match(planContent, /work_item/i, "Plan workflow must use Work Item frontmatter");
  assert.match(planContent, /design\.md.*beside `plan\.md`/is, "Plan workflow must co-locate optional design with its Plan");
  assert.doesNotMatch(planContent, /design\.md`? outside (?:the )?(?:canonical )?Plan/i, "Plan workflow must not place design outside its Plan");
  assert.match(planContent, /verification ledger/i, "Plan workflow must record claim verification");
  assert.match(planContent, /path[\s\S]*symbol[\s\S]*interface[\s\S]*dependency[\s\S]*command[\s\S]*test assumption[\s\S]*compatibility claim/i, "Plan workflow must verify execution-affecting claims");
  assert.match(planContent, /Repository Maintainer decides every unresolved\s+material/i, "Plan workflow must ask before material decisions");
  assert.match(planContent, /security and privacy[\s\S]*assumption[\s\S]*failure-mode[\s\S]*scope-complexity/i, "Plan workflow must apply adversarial lenses");
  assert.match(planContent, /whole-Plan consistency/i, "Plan workflow must sweep the complete plan");
  assert.match(planContent, /zero unresolved contradictions/i, "Plan workflow must block Cook on contradictions");
  assert.match(planContent, /Do not invent a material choice/i, "Plan workflow must prohibit guessed decisions");
  assert.match(planContent, /project purpose[\s\S]*stack[\s\S]*entry points[\s\S]*architecture[\s\S]*(?:control|data)[\s\S]*flows/i, "Plan workflow must require project and codebase research");
  assert.match(planContent, /file list alone is insufficient grounding/i, "Plan workflow must reject file-list-only scouting");

  const selfImproveContent = await readFile(join(docsRoot, "workflows", "self-improve.md"), "utf8");
  assert.match(selfImproveContent, /classify the signal/i, "Self Improve must classify evidence before acting");
  assert.match(selfImproveContent, /recurrence_key/i, "Self Improve must preserve recurrence grouping");
  assert.match(selfImproveContent, /two independent/i, "Rule promotion inside Self Improve must require two occurrences");
  assert.match(selfImproveContent, /human.*approval/i, "Self Improve must require human approval");
  assert.match(selfImproveContent, /never rewrite.*automatically/is, "Self Improve must prohibit automatic self-mutation");
  assert.match(selfImproveContent, /retrieval artifact/i, "Self Improve must describe optional retrieval-artifact use");
  assert.match(selfImproveContent, /warn and continue/i, "Self Improve must degrade gracefully if the retrieval artifact is missing");
});

test("cook.md contains the exact Vietnamese block disclosure", async () => {
  const content = await readFile(join(docsRoot, "workflows", "cook.md"), "utf8");
  assert.ok(
    content.includes("Tôi không thể xác minh điều này hoạt động vì..."),
    "cook.md must include the exact Vietnamese block disclosure statement"
  );
});

test("index.md exposes public workflow and repository documentation only", async () => {
  const content = await readFile(join(docsRoot, "index.md"), "utf8");
  assert.ok(content.includes("workflows/README.md"), "index.md must link to the workflow router");
  assert.ok(content.includes("README.md"), "index.md must link to the repository contract");
  assert.equal(content.includes("RULES.md"), false, "index.md must not expose internal project rules as initialized documentation");
  assert.equal(content.includes("schema-v1.md"), false, "index.md must not reference the retired schema file");
});

test("workflows/README.md references all five workflow files", async () => {
  const content = await readFile(join(docsRoot, "workflows", "README.md"), "utf8");
  assert.ok(content.includes("feature.md"), "workflow router must link to feature.md");
  assert.ok(content.includes("decision.md"), "workflow router must link to decision.md");
  assert.ok(content.includes("plan.md"), "workflow router must link to plan.md");
  assert.ok(content.includes("cook.md"), "workflow router must link to cook.md");
  assert.ok(content.includes("self-improve.md"), "workflow router must link to self-improve.md");
  assert.equal(content.includes("rule-promotion.md"), false, "workflow router must not reference the retired workflow path");
  assert.match(content, /Request Classification/, "workflow router must classify requests before Feature creation");
  assert.match(content, /Decision Workflow.*Interruptible/i, "workflow router must model Decision as interruptible");
  assert.doesNotMatch(content, /ReportGate/, "workflow router must not require a universal Report approval gate");
  assert.match(content, /## Artifact Contract/, "workflow router must own the shared artifact contract");
  for (const contract of [
    "FEAT-XXX-kebab-name.md",
    "Relationship keys",
    "Sequences are monotonic",
    "Plan frontmatter requires",
    "Work Item frontmatter requires",
    "design.md",
    "exactly five H2 sections",
  ]) {
    assert.ok(content.includes(contract), `workflow router must preserve schema contract: ${contract}`);
  }
});

test("workflows enforce CLI automation, request-changes semantics, manual fallback, and recovery boundaries", async () => {
  const readmeContent = await readFile(join(docsRoot, "workflows", "README.md"), "utf8");
  const featureContent = await readFile(join(docsRoot, "workflows", "feature.md"), "utf8");
  const planContent = await readFile(join(docsRoot, "workflows", "plan.md"), "utf8");
  const cookContent = await readFile(join(docsRoot, "workflows", "cook.md"), "utf8");
  const mainReadmeContent = await readFile(join(docsRoot, "README.md"), "utf8");

  const featureProcedure = procedureOf(featureContent);
  const planProcedure = procedureOf(planContent);
  const cookProcedure = procedureOf(cookContent);

  // Verify command requirements at supported boundaries
  for (const cmd of ["feature create", "workflow check", "feature approve", "feature request-changes"]) {
    assert.match(featureContent, new RegExp(cmd, "i"), `Feature workflow must mention ${cmd}`);
  }
  for (const cmd of ["plan create", "workflow status", "workflow check", "plan approve", "plan request-changes"]) {
    assert.match(planContent, new RegExp(cmd, "i"), `Plan workflow must mention ${cmd}`);
  }
  for (const cmd of ["workflow status", "workflow check", "work-item set-status", "plan set-status"]) {
    assert.match(cookContent, new RegExp(cmd, "i"), `Cook workflow must mention ${cmd}`);
  }

  // Verify commands occur at the actual lifecycle boundaries, in execution order.
  assertOrdered(
    featureProcedure,
    ["ckh feature create", "ckh workflow check", "ckh feature approve"],
    "Feature create/check/approve sequence"
  );
  assert.ok(
    featureProcedure.indexOf("ckh feature request-changes") > featureProcedure.indexOf("ckh workflow check"),
    "Feature request-changes must follow mechanical readiness checking"
  );
  assertOrdered(
    planProcedure,
    ["ckh plan create", "ckh workflow status", "ckh workflow check", "ckh plan approve"],
    "Plan create/status/check/approve sequence"
  );
  assert.ok(
    planProcedure.indexOf("ckh plan request-changes") > planProcedure.indexOf("ckh workflow check"),
    "Plan request-changes must follow mechanical readiness checking"
  );
  assertOrdered(
    cookProcedure,
    [
      "ckh workflow status",
      "ckh work-item set-status TARGET --status in_progress",
      "ckh workflow check",
      "ckh work-item set-status TARGET --status completed",
      "ckh plan set-status TARGET --status completed",
    ],
    "Cook eligibility/start/check/complete/aggregate sequence"
  );

  // Verify request-changes semantics
  assert.match(featureContent, /proposed/i, "Feature request-changes must return/keep proposed status");
  assert.match(planContent, /changes_requested/i, "Plan request-changes must set approval status to changes_requested");
  assert.match(planContent, /preserves? the independent execution status/i, "Plan request-changes must preserve execution state");
  assert.match(featureContent, /does not produce a terminal rejected state/i, "Feature workflow must state request-changes does not create terminal rejected state");
  assert.match(planContent, /does not produce a terminal rejected state/i, "Plan workflow must state request-changes does not create terminal rejected state");

  // Verify approval authority prohibition
  for (const doc of [featureContent, planContent, cookContent]) {
    assert.match(doc, /(?:Do not|never) grant.*human approval/i, "Workflows must prohibit inventing human approval");
  }

  // Verify fallback/recovery
  for (const doc of [featureContent, planContent, cookContent, readmeContent, mainReadmeContent]) {
    assert.match(doc, /manual (?:fallback|recovery)/i, "Workflows and READMEs must define the manual fallback path");
    assert.match(doc, /validate/i, "Workflows and READMEs must require validate after manual fallback");
    assert.match(doc, /never claim.*succeeded/i, "Workflows and READMEs must state to never claim a failed command succeeded");
    assert.match(doc, /recovery boundary/i, "Workflows and READMEs must define the recovery boundary");
    assert.match(doc, /(?:do not automatically start|do not automatically\s+start|agents do not automatically\s+start) (?:another )?Cook/i, "Workflows and READMEs must preserve the recovery boundary");
  }
});
