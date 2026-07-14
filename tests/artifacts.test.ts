import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { artifactSchema, validateArtifactFilename } from "../src/core/schemas/artifacts.js";
import { validateFeatureContent } from "../src/core/schemas/content.js";
import { parseMarkdownDocument, serializeMarkdownDocument } from "../src/core/schemas/frontmatter.js";

const fixture = (name: string) => readFile(join(process.cwd(), "tests", "fixtures", name), "utf8");

test("valid feature parses, validates content, and round-trips deterministically", async () => {
  const parsed = parseMarkdownDocument(await fixture("valid-feature.md"));
  if (!("type" in parsed.frontmatter)) assert.fail("expected artifact frontmatter");
  assert.equal(parsed.frontmatter.type, "feature");
  assert.deepEqual(validateArtifactFilename("FEAT-042-recover-a-basket.md", parsed.frontmatter), []);
  assert.deepEqual(validateFeatureContent(parsed.body), []);
  assert.equal(serializeMarkdownDocument(parseMarkdownDocument(serializeMarkdownDocument(parsed))), serializeMarkdownDocument(parsed));
});

test("schema rejects malformed artifact values", async () => {
  const source = await fixture("malformed-feature.md");
  assert.throws(() => parseMarkdownDocument(source));
});

test("CK-compatible plan and phase frontmatter parse", async () => {
  const planDir = join(process.cwd(), "docs", "harness", "plans", "260714-0033-file-based-agent-harness");
  const plan = parseMarkdownDocument(await readFile(join(planDir, "plan.md"), "utf8"));
  const phase = parseMarkdownDocument(await readFile(join(planDir, "phase-01-foundation-and-contracts.md"), "utf8"));
  assert.equal("title" in plan.frontmatter && plan.frontmatter.title, "File-Based Multi-Agent Repository Harness");
  assert.equal("phase" in phase.frontmatter && phase.frontmatter.phase, 1);
});

test("filename rules reject bad names and ID drift", () => {
  const frontmatter = artifactSchema.parse({
    schema_version: 1,
    type: "feature",
    id: "FEAT-007",
    title: "Name",
    status: "draft",
    created: "2026-07-14",
    relationships: {},
  });
  assert.match(validateArtifactFilename("FEAT-7-name.md", frontmatter)[0] ?? "", /invalid/);
  assert.match(validateArtifactFilename("FEAT-008-name.md", frontmatter)[0] ?? "", /does not match/);

  const spec = artifactSchema.parse({
    schema_version: 1,
    type: "spec",
    title: "Security",
    status: "active",
    relationships: {},
  });
  assert.deepEqual(validateArtifactFilename("security.md", spec), []);
  assert.match(validateArtifactFilename("SPEC-001-security.md", spec)[0] ?? "", /invalid/);
});

test("feature content rejects implementation actors and incomplete flow contracts", () => {
  const body = `## Introduction\n\n## Business Understanding\n### Actors\nOrderService class\n### User needs\nX\n### Main flow\nX\n### Alternative flows\nX\n### Exception flows\nX\n### Postconditions\nX\n## Requirements\nX\n## Acceptance\nX\n## Relationships\nX`;
  const errors = validateFeatureContent(body);
  assert.ok(errors.some((error) => error.includes("actors")));
  assert.ok(errors.some((error) => error.includes("main flow")));
  assert.ok(errors.some((error) => error.includes("alternative")));
  assert.ok(errors.some((error) => error.includes("exception")));
});
