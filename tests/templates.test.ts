import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { parseMarkdownDocument } from "../src/core/schemas/frontmatter.js";
import { validateFeatureContent } from "../src/core/schemas/content.js";

const root = join(process.cwd(), "docs", "harness", "templates");

test("template snapshots are byte-stable and use LF line endings", async () => {
  const expected = JSON.parse(await readFile(join(process.cwd(), "tests", "snapshots", "template-hashes.json"), "utf8")) as Record<string, string>;
  for (const [name, hash] of Object.entries(expected)) {
    const content = await readFile(join(root, name), "utf8");
    assert.equal(content.includes("\r"), false, `${name} contains non-LF line endings`);
    assert.equal(createHash("sha256").update(content).digest("hex"), hash, `${name} snapshot changed`);
    assert.doesNotThrow(() => parseMarkdownDocument(content));
  }
  assert.deepEqual((await readdir(root)).sort(), Object.keys(expected).sort());
});

test("feature template has exactly the five-section BA contract", async () => {
  const content = await readFile(join(root, "feature.md"), "utf8");
  const parsed = parseMarkdownDocument(content);
  assert.deepEqual(validateFeatureContent(parsed.body), []);
  assert.deepEqual(
    parsed.body.split("\n").filter((line) => line.startsWith("## ")),
    ["## Introduction", "## Business Understanding", "## Requirements", "## Acceptance", "## Relationships"],
  );
});
