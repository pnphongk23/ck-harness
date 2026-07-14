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
  assert.equal(selectHarnessSkill("Use harness-feature for this request"), "harness-feature");
  assert.equal(selectHarnessSkill("Clarify business requirements for checkout"), "harness-feature");
  assert.equal(selectHarnessSkill("Compare trade-offs and record the decision"), "harness-decision");
  assert.equal(selectHarnessSkill("Create a Work Item implementation plan"), "harness-plan");
  assert.equal(selectHarnessSkill("Implement the approved plan"), "harness-cook");
  assert.equal(selectHarnessSkill("Self improve from recurring friction after reviewing wikilinks"), "harness-self-improve");
  assert.equal(selectHarnessSkill("Promote this recurring rule from two reports"), "harness-self-improve");
  assert.notEqual(selectHarnessSkill("Discover requirements before any implementation"), "harness-cook");
});
