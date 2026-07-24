import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { artifactFromGraph } from "../src/graph/artifact.js";
import { buildMarkdownDocumentGraph } from "../src/graph/markdown.js";
import { relatedGraph, searchGraph } from "../src/graph/query.js";
import type { GraphDocument, MarkdownGraph } from "../src/graph/model.js";

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-graph-query-"));
  await mkdir(join(root, "docs", "harness", "notes"), { recursive: true });
  await writeFile(join(root, "docs", "harness", "index.md"), "# index\n");
  await writeFile(join(root, "docs", "harness", "notes", "a.md"), "# Alpha\nalpha retrieval\n[[b]] [[c]]\n");
  await writeFile(join(root, "docs", "harness", "notes", "b.md"), "# Beta\nbeta retrieval\n[[c]]\n");
  await writeFile(join(root, "docs", "harness", "notes", "c.md"), "# Gamma\ngamma retrieval\n[[a]]\n");
  return root;
}

test("search is direct AND lexical retrieval with evidence and stable ordering", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifact = artifactFromGraph(await buildMarkdownDocumentGraph(root));
  const result = searchGraph(artifact, "retrieval alpha");
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0]?.reason, "lexical");
  assert.equal(result.results[0]?.id, "docs/harness/notes/a.md");
  assert.ok(result.results[0]!.matched_terms.includes("retrieval"));
  assert.ok(result.results[0]!.matched_fields.length > 0);
  assert.throws(() => searchGraph(artifact, "   "), /empty/);
  assert.throws(() => searchGraph(artifact, "alpha", { limit: 101 }), /1 to 100/);
});

test("related traversal handles direction, cycles, bounded depth, and unresolved targets", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifact = artifactFromGraph(await buildMarkdownDocumentGraph(root));
  const outbound = relatedGraph(artifact, "docs/harness/notes/a.md", { direction: "out", depth: 2 });
  assert.equal(outbound.outcome, "success");
  if (outbound.outcome === "success") {
    assert.deepEqual(outbound.results.map((entry) => entry.id), ["docs/harness/notes/b.md", "docs/harness/notes/c.md", "docs/harness/notes/a.md"]);
    assert.equal(outbound.root.reason, "identity");
  }
  const ambiguous = relatedGraph(artifact, "missing.md");
  assert.equal(ambiguous.outcome, "unresolved");
  assert.throws(() => relatedGraph(artifact, "a.md", { depth: 6 }), /1 to 5/);
});

test("10k document and 100k edge query benchmark stays within the approved budget", () => {
  const documents: GraphDocument[] = Array.from({ length: 10_000 }, (_, index) => {
    const id = `docs/harness/${String(index).padStart(5, "0")}.md`;
    return { id, path: id, title: `Document ${index}`, headings: ["Benchmark"], body: `benchmark token ${index}`, content_digest: `sha256:${"a".repeat(64)}`, occurrences: [] };
  });
  const edges = [];
  for (let source = 0; source < 10_000; source += 1) for (let offset = 1; offset <= 10; offset += 1) edges.push({ source: documents[source]!.id, target: documents[(source + offset) % 10_000]!.id, occurrences: [] });
  edges.sort((left, right) => `${left.source}\0${left.target}`.localeCompare(`${right.source}\0${right.target}`));
  const graph: MarkdownGraph = { documents, edges, unresolved: [], source_digest: `sha256:${"b".repeat(64)}` };
  const artifact = artifactFromGraph(graph);
  const searchSamples: number[] = [];
  const relatedSamples: number[] = [];
  for (let sample = 0; sample < 100; sample += 1) {
    let start = performance.now(); searchGraph(artifact, "benchmark token", { limit: 20 }); searchSamples.push(performance.now() - start);
    start = performance.now(); relatedGraph(artifact, documents[sample]!.id, { depth: 1 }); relatedSamples.push(performance.now() - start);
  }
  const p95 = (values: number[]) => [...values].sort((left, right) => left - right)[Math.floor(values.length * 0.95)]!;
  assert.ok(p95(searchSamples) <= 250, `search p95 ${p95(searchSamples)}ms`);
  assert.ok(p95(relatedSamples) <= 250, `related p95 ${p95(relatedSamples)}ms`);
});
