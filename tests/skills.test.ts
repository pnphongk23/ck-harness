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
