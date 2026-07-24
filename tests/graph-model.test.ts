import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildMarkdownDocumentGraph } from "../src/graph/markdown.js";
import { discoverGraphMarkdown } from "../src/graph/model.js";

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-graph-model-"));
  await mkdir(join(root, "docs", "harness", "features"), { recursive: true });
  await mkdir(join(root, "docs", "harness", "notes"), { recursive: true });
  await writeFile(join(root, "docs", "harness", "index.md"), "# generated\n");
  return root;
}

test("builds one deterministic graph node per eligible Markdown file", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "docs", "harness", "features", "a.md"), `---\ntitle: Alpha\nrelated: "[[b]]"\n---\n# Heading\nSee [Beta](../notes/b.md) and [[b|label]] plus [[missing]].\n\`\`\`\n[[ignored]]\n\`\`\`\n`);
  await writeFile(join(root, "docs", "harness", "notes", "b.md"), "# Beta\n");
  await mkdir(join(root, "docs", "harness", "graph-out"), { recursive: true });
  await writeFile(join(root, "docs", "harness", "graph-out", "ignored.md"), "# ignored\n");

  const graph = await buildMarkdownDocumentGraph(root);
  assert.deepEqual(graph.documents.map((document) => document.id), [
    "docs/harness/features/a.md",
    "docs/harness/notes/b.md",
  ]);
  assert.equal(graph.documents[0]?.title, "Alpha");
  assert.deepEqual(graph.edges.map((edge) => [edge.source, edge.target]), [
    ["docs/harness/features/a.md", "docs/harness/notes/b.md"],
  ]);
  assert.equal(graph.edges[0]?.occurrences.length, 3);
  assert.equal(graph.unresolved.length, 1);
  assert.equal(graph.unresolved[0]?.raw_target, "missing");
  assert.match(graph.source_digest, /^sha256:[0-9a-f]{64}$/);
});

test("preserves broken and ambiguous evidence without guessed edges", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "docs", "harness", "one"), { recursive: true });
  await mkdir(join(root, "docs", "harness", "two"), { recursive: true });
  await writeFile(join(root, "docs", "harness", "source.md"), "[[missing]] [[target]] [[../outside.md]]\n");
  await writeFile(join(root, "docs", "harness", "one", "target.md"), "# one\n");
  await writeFile(join(root, "docs", "harness", "two", "target.md"), "# two\n");

  const graph = await buildMarkdownDocumentGraph(root);
  assert.equal(graph.edges.length, 0);
  assert.deepEqual(graph.unresolved.map((entry) => entry.status), ["broken", "ambiguous", "broken"]);
  assert.deepEqual(graph.unresolved[1]?.candidates, ["docs/harness/one/target.md", "docs/harness/two/target.md"]);
});

test("rejects symlinks and keeps discovery order stable", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "docs", "harness", "features", "z.md"), "# Z\n");
  await writeFile(join(root, "docs", "harness", "features", "a.md"), "# A\n");
  assert.deepEqual((await discoverGraphMarkdown(root)).map((path) => path.endsWith("/a.md") || path.endsWith("\\a.md") ? "a" : "z"), ["a", "z"]);
  await symlink(join(root, "docs", "harness", "features", "a.md"), join(root, "docs", "harness", "features", "link.md"));
  await assert.rejects(() => discoverGraphMarkdown(root), /symbolic link/);
});

test("second graph build has the same source digest for unchanged input", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "docs", "harness", "features", "a.md"), "# A\n");
  const first = await buildMarkdownDocumentGraph(root);
  const second = await buildMarkdownDocumentGraph(root);
  assert.equal(first.source_digest, second.source_digest);
  assert.equal(await readFile(join(root, "docs", "harness", "features", "a.md"), "utf8"), "# A\n");
});
