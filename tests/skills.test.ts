import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { selectHarnessSkill, skillNames } from "../src/core/skill-routing.js";

const repo = process.cwd();
const skillRoot = join(repo, ".agents", "skills");

test("canonical skills are complete, local, credited, and free of forbidden operations", async () => {
  assert.deepEqual((await readdir(skillRoot)).sort(), [...skillNames].sort());
  const forbidden = [/\$HOME\/\.claude/, /\bsubagents?\b/i, /\bTask tool\b/i, /\bspawn(?:ing)? an? agent\b/i, /\bgit (?:commit|push)\b/i, /\bdeploy(?:ment)? command\b/i];

  for (const name of skillNames) {
    const content = await readFile(join(skillRoot, name, "SKILL.md"), "utf8");
    assert.match(content, new RegExp(`name: ${name}`));
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    assert.deepEqual(frontmatter.split("\n").map((line) => line.split(":", 1)[0]), ["name", "description"], `${name} frontmatter keys`);
    for (const pattern of forbidden) assert.doesNotMatch(content, pattern, `${name} contains ${pattern}`);
    const references = [...content.matchAll(/`(docs\/harness\/[A-Za-z0-9_./-]+\.md)`/g)]
      .map((match) => match[1]!)
      .filter((reference) => !/[A-Z]{2,}|YYMMDD|HHmm/.test(reference));
    for (const reference of references) {
      assert.equal((await stat(join(repo, reference))).isFile(), true, `${reference} does not resolve`);
    }
  }
  assert.equal((await stat(join(repo, "docs", "harness", "PROVENANCE.md"))).isFile(), true);
});

test("explicit and implicit prompts route to focused skills", () => {
  assert.equal(selectHarnessSkill("Use ask for this architecture question"), "ask");
  assert.equal(selectHarnessSkill("I need technical guidance on cache invalidation"), "ask");
  assert.equal(selectHarnessSkill("Use brainstorm to explore this feature"), "brainstorm");
  assert.equal(selectHarnessSkill("Explore approaches for offline synchronization"), "brainstorm");
  assert.equal(selectHarnessSkill("Use scout to map the repository"), "scout");
  assert.equal(selectHarnessSkill("Find files where checkout is implemented"), "scout");
  assert.equal(selectHarnessSkill("Research this project before proposing changes"), "scout");
  assert.equal(selectHarnessSkill("Research the repository architecture and execution flow"), "scout");
  assert.equal(selectHarnessSkill("Please research this codebase"), "scout");
  assert.equal(selectHarnessSkill("Do customer research before changing onboarding"), undefined);
  assert.notEqual(selectHarnessSkill("Break this implementation task into steps"), "ask");
  assert.equal(selectHarnessSkill("Use harness-feature for this request"), "harness-feature");
  assert.equal(selectHarnessSkill("Clarify business requirements for checkout"), "harness-feature");
  assert.equal(selectHarnessSkill("Compare trade-offs and record the decision"), "harness-decision");
  assert.equal(selectHarnessSkill("Create a Work Item implementation plan"), "harness-plan");
  assert.equal(selectHarnessSkill("Implement the approved plan"), "harness-cook");
  assert.equal(selectHarnessSkill("Self improve from recurring friction after reviewing wikilinks"), "harness-self-improve");
  assert.equal(selectHarnessSkill("Promote this recurring rule from two reports"), "harness-self-improve");
  assert.notEqual(selectHarnessSkill("Discover requirements before any implementation"), "harness-cook");
});

test("Scout requires synthesized project and codebase research", async () => {
  const content = await readFile(join(skillRoot, "scout", "SKILL.md"), "utf8");
  for (const expected of [
    "Project overview",
    "Architecture and flows",
    "Relevant code",
    "Dependencies and integrations",
    "Quality and operations",
    "Active work and constraints",
    "Findings and risks",
    "Unknowns",
  ]) assert.match(content, new RegExp(expected, "i"));
  assert.match(content, /file list alone[\s\S]*not a complete result/i);
  assert.match(content, /Observed[\s\S]*Inferred[\s\S]*Failed[\s\S]*Unresolved/i);
  assert.match(content, /read-only local inspection/i);
});

test("harness-feature, harness-plan, and harness-cook skills name command obligations and route back to workflows", async () => {
  const featureSkill = await readFile(join(skillRoot, "harness-feature", "SKILL.md"), "utf8");
  const planSkill = await readFile(join(skillRoot, "harness-plan", "SKILL.md"), "utf8");
  const cookSkill = await readFile(join(skillRoot, "harness-cook", "SKILL.md"), "utf8");

  // Verify command obligations in skills
  assert.match(featureSkill, /ckh feature create/i);
  assert.match(featureSkill, /ckh workflow check/i);
  assert.match(featureSkill, /ckh feature approve/i);
  assert.match(featureSkill, /ckh feature request-changes/i);

  assert.match(planSkill, /ckh plan create/i);
  assert.match(planSkill, /ckh workflow status/i);
  assert.match(planSkill, /ckh workflow check/i);
  assert.match(planSkill, /ckh plan approve/i);
  assert.match(planSkill, /ckh plan request-changes/i);

  assert.match(cookSkill, /ckh workflow status/i);
  assert.match(cookSkill, /ckh workflow check/i);
  assert.match(cookSkill, /ckh work-item set-status/i);
  assert.match(cookSkill, /ckh plan set-status/i);

  // Verify thin routing back to workflows
  assert.match(featureSkill, /refer to `docs\/harness\/workflows\/feature\.md`/i);
  assert.match(planSkill, /refer to `docs\/harness\/workflows\/plan\.md`/i);
  assert.match(cookSkill, /refer to `docs\/harness\/workflows\/cook\.md`/i);

  for (const content of [featureSkill, planSkill, cookSkill]) {
    assert.match(content, /At every supported boundary/i);
    assert.match(content, /before reasoning about or mutating state/i);
    assert.doesNotMatch(content, /changes_requested|terminal rejected|approval provenance.*clears/i, "Thin skills must not duplicate lifecycle semantics");
  }

  // Assert no stale manual-mutation steps in these skills
  for (const content of [featureSkill, planSkill, cookSkill]) {
    assert.doesNotMatch(content, /manually (?:change|edit|update|set) the status (?:to|of)/i, "Skills must not contain stale manual status mutation steps");
  }
});
