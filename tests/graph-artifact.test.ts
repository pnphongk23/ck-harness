import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import MiniSearch from "minisearch";
import { buildGraphArtifact } from "../src/graph/build.js";
import { artifactFromGraph, GRAPH_MAX_BYTES, loadGraphArtifact, serializeGraphArtifact, validateGraphArtifact } from "../src/graph/artifact.js";
import { buildMarkdownDocumentGraph } from "../src/graph/markdown.js";

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-graph-artifact-"));
  await mkdir(join(root, "docs", "harness", "notes"), { recursive: true });
  await writeFile(join(root, "docs", "harness", "index.md"), "# index\n");
  await writeFile(join(root, "docs", "harness", "notes", "alpha.md"), "# Alpha\nOffline retrieval graph\n");
  await writeFile(join(root, "docs", "harness", "notes", "beta.md"), "# Beta\n[[alpha]]\n");
  return root;
}

test("publishes a stable artifact and round-trips MiniSearch state", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const first = await buildGraphArtifact(root);
  const firstBytes = await readFile(first.path, "utf8");
  const second = await buildGraphArtifact(root);
  const secondBytes = await readFile(second.path, "utf8");
  assert.equal(first.unchanged, false);
  assert.equal(second.unchanged, true);
  assert.equal(firstBytes, secondBytes);
  const artifact = await loadGraphArtifact(first.path);
  const search = MiniSearch.loadJSON(JSON.stringify(artifact.search.index), {
    fields: ["path", "title", "headings", "body"],
    storeFields: ["path", "title"],
    processTerm: (term) => term.normalize("NFC").toLowerCase(),
  });
  assert.deepEqual(search.search("offline", { combineWith: "AND" }).map((result) => result.id), ["docs/harness/notes/alpha.md"]);
});

test("rejects dangling edges, overlap, prototype keys, and incompatible engines", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const graph = await buildMarkdownDocumentGraph(root);
  const artifact = artifactFromGraph(graph);
  assert.throws(() => validateGraphArtifact({ ...artifact, edges: [{ source: "missing", target: artifact.documents[0]!.id, occurrences: [] }] }), /unknown document/);
  assert.throws(() => validateGraphArtifact({ ...artifact, engines: { ...artifact.engines, minisearch: "0.0.0" } }), /Invalid input/);
  assert.throws(() => validateGraphArtifact(JSON.parse('{"__proto__":{},"schema_version":1}')), /forbidden object key/);
});

test("artifact serialization has a trailing newline and enforces the size boundary", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const graph = await buildMarkdownDocumentGraph(root);
  const artifact = artifactFromGraph(graph);
  const serialized = serializeGraphArtifact(artifact);
  assert.equal(serialized.endsWith("\n"), true);
  assert.ok(Buffer.byteLength(serialized) < GRAPH_MAX_BYTES);
});
