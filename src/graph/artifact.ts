import { readFile } from "node:fs/promises";
import MiniSearch from "minisearch";
import { z } from "zod";
import { HarnessError, exists, repositoryPaths } from "../fs/repository.js";
import { buildMarkdownDocumentGraph } from "./markdown.js";
import { sha256, type GraphEdge, type GraphUnresolved, type MarkdownGraph } from "./model.js";

export const GRAPH_SCHEMA_VERSION = 1 as const;
export const GRAPH_MAX_BYTES = 128 * 1024 * 1024;
export const GRAPH_MARKDOWN_IT_VERSION = "14.3.0" as const;
export const GRAPH_MINISEARCH_VERSION = "7.2.0" as const;
export const GRAPH_OPTIONS_DIGEST = sha256("graph-schema-v1|markdown-it:html=false,linkify=false,typographer=false|minisearch:AND,path=2,title=4,headings=2,body=1");

const occurrenceSchema = z.object({
  kind: z.enum(["markdown", "wikilink", "yaml"]),
  ordinal: z.number().int().nonnegative(),
  raw_target: z.string(),
}).strict();

const documentSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  title: z.string(),
  headings: z.array(z.string()),
  content_digest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
}).strict();

const edgeSchema = z.object({ source: z.string().min(1), target: z.string().min(1), occurrences: z.array(occurrenceSchema) }).strict();
const unresolvedSchema = z.object({ source: z.string().min(1), kind: z.enum(["markdown", "wikilink", "yaml"]), ordinal: z.number().int().nonnegative(), raw_target: z.string(), status: z.enum(["broken", "ambiguous", "unsafe"]), candidates: z.array(z.string()) }).strict();

export const graphArtifactSchema = z.object({
  schema_version: z.literal(GRAPH_SCHEMA_VERSION),
  source_digest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  engines: z.object({ markdown_it: z.literal(GRAPH_MARKDOWN_IT_VERSION), minisearch: z.literal(GRAPH_MINISEARCH_VERSION), options_digest: z.literal(GRAPH_OPTIONS_DIGEST) }).strict(),
  documents: z.array(documentSchema),
  edges: z.array(edgeSchema),
  unresolved: z.array(unresolvedSchema),
  search: z.object({ document_ids: z.array(z.string()), index: z.unknown() }).strict(),
}).strict();

export type GraphArtifact = z.infer<typeof graphArtifactSchema>;

function rejectPrototypeKeys(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const entry of value) rejectPrototypeKeys(entry);
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) throw new HarnessError("graph artifact contains a forbidden object key", "invalid");
    rejectPrototypeKeys(entry);
  }
}

function assertSortedUnique(values: readonly string[], label: string): void {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) throw new HarnessError(`${label} must be sorted and unique`, "invalid");
  }
}

export function validateGraphArtifact(value: unknown): GraphArtifact {
  rejectPrototypeKeys(value);
  const artifact = graphArtifactSchema.parse(value);
  const documentIds = artifact.documents.map((document) => document.id);
  assertSortedUnique(documentIds, "graph document IDs");
  if (artifact.documents.some((document) => document.path !== document.id)) throw new HarnessError("graph document path/id parity is invalid", "invalid");
  const searchIds = artifact.search.document_ids;
  assertSortedUnique(searchIds, "lexical document IDs");
  if (searchIds.length !== documentIds.length || searchIds.some((id, index) => id !== documentIds[index])) throw new HarnessError("graph and lexical document IDs are not identical", "invalid");
  const edgeKeys = artifact.edges.map((edge) => `${edge.source}\0${edge.target}`);
  assertSortedUnique(edgeKeys, "graph edges");
  const occurrenceKeys = new Set<string>();
  for (const edge of artifact.edges) {
    if (!documentIds.includes(edge.source) || !documentIds.includes(edge.target)) throw new HarnessError("graph edge references an unknown document", "invalid");
    for (const occurrence of edge.occurrences) {
      const key = `${edge.source}\0${occurrence.ordinal}`;
      if (occurrenceKeys.has(key)) throw new HarnessError("graph occurrence partition contains a duplicate", "invalid");
      occurrenceKeys.add(key);
    }
  }
  for (const occurrence of artifact.unresolved) {
    if (!documentIds.includes(occurrence.source)) throw new HarnessError("unresolved occurrence references an unknown document", "invalid");
    const key = `${occurrence.source}\0${occurrence.ordinal}`;
    if (occurrenceKeys.has(key)) throw new HarnessError("graph occurrence partition overlaps", "invalid");
    occurrenceKeys.add(key);
    if (occurrence.status !== "ambiguous" && occurrence.candidates.length) throw new HarnessError("only ambiguous occurrences may contain candidates", "invalid");
  }
  for (const document of artifact.documents) {
    const ordinals = artifact.edges.flatMap((edge) => edge.source === document.id ? edge.occurrences.map((occurrence) => occurrence.ordinal) : []).concat(artifact.unresolved.filter((entry) => entry.source === document.id).map((entry) => entry.ordinal));
    if (new Set(ordinals).size !== ordinals.length) throw new HarnessError(`duplicate occurrence ordinal for ${document.id}`, "invalid");
  }
  return artifact;
}

export function serializeGraphArtifact(artifact: GraphArtifact): string {
  const text = `${JSON.stringify(validateGraphArtifact(artifact), null, 2)}\n`;
  if (Buffer.byteLength(text, "utf8") > GRAPH_MAX_BYTES) throw new HarnessError("graph artifact exceeds the 128 MiB limit", "precondition");
  return text;
}

export async function loadGraphArtifact(path: string): Promise<GraphArtifact> {
  const content = await readFile(path, "utf8").catch((error: unknown) => {
    throw new HarnessError(`graph artifact is unavailable: ${error instanceof Error ? error.message : String(error)}`, "precondition");
  });
  if (Buffer.byteLength(content, "utf8") > GRAPH_MAX_BYTES) throw new HarnessError("graph artifact exceeds the 128 MiB limit", "precondition");
  let value: unknown;
  try { value = JSON.parse(content); } catch (error) { throw new HarnessError(`graph artifact is malformed: ${error instanceof Error ? error.message : String(error)}`, "invalid"); }
  return validateGraphArtifact(value);
}

function buildSearch(graph: MarkdownGraph): { document_ids: string[]; index: unknown } {
  const search = new MiniSearch<{ id: string; path: string; title: string; headings: string; body: string }>({
    idField: "id",
    fields: ["path", "title", "headings", "body"],
    storeFields: ["path", "title"],
    processTerm: (term) => term.normalize("NFC").toLowerCase(),
  });
  search.addAll(graph.documents.map((document) => ({ id: document.id, path: document.id, title: document.title, headings: document.headings.join(" "), body: document.body })));
  const documentIds = graph.documents.map((document) => document.id).sort();
  const indexedIds = [...(search as unknown as { _documentIds: Map<number, string> })._documentIds.values()].map(String).sort();
  if (documentIds.join("\0") !== indexedIds.join("\0")) throw new HarnessError("graph and lexical document IDs are not identical", "invalid");
  return { document_ids: documentIds, index: search.toJSON() };
}

export function artifactFromGraph(graph: MarkdownGraph): GraphArtifact {
  const search = buildSearch(graph);
  return validateGraphArtifact({
    schema_version: GRAPH_SCHEMA_VERSION,
    source_digest: graph.source_digest,
    engines: { markdown_it: GRAPH_MARKDOWN_IT_VERSION, minisearch: GRAPH_MINISEARCH_VERSION, options_digest: GRAPH_OPTIONS_DIGEST },
    documents: graph.documents.map(({ id, path: _path, title, headings, content_digest }) => ({ id, path: id, title, headings, content_digest })),
    edges: graph.edges,
    unresolved: graph.unresolved,
    search,
  });
}

export async function currentGraphSourceDigest(root: string): Promise<string> {
  return (await buildMarkdownDocumentGraph(root)).source_digest;
}

export async function checkGraphFreshness(root: string, artifact: GraphArtifact): Promise<boolean> {
  return artifact.source_digest === await currentGraphSourceDigest(root);
}

export function graphOutputPath(root: string): string {
  return `${root}/graph-out/retrieval-index.json`;
}

export async function artifactExists(root: string): Promise<boolean> {
  const paths = await repositoryPaths(root);
  return exists(`${paths.harness}/graph-out/retrieval-index.json`);
}

export interface GraphCheckResult {
  outcome: "success" | "failure";
  available: boolean;
  fresh?: boolean;
  source_digest?: string;
  reason?: "missing" | "malformed" | "stale";
  message?: string;
}

export async function checkGraphArtifact(root: string): Promise<GraphCheckResult> {
  const paths = await repositoryPaths(root);
  const output = `${paths.harness}/graph-out/retrieval-index.json`;
  if (!(await exists(output))) return { outcome: "failure", available: false, reason: "missing", message: "graph artifact is unavailable; run `ckh graph build`" };
  try {
    const artifact = await loadGraphArtifact(output);
    const fresh = await checkGraphFreshness(paths.root, artifact);
    return fresh
      ? { outcome: "success", available: true, fresh: true, source_digest: artifact.source_digest }
      : { outcome: "failure", available: true, fresh: false, source_digest: artifact.source_digest, reason: "stale", message: "graph artifact is stale; run `ckh graph build`" };
  } catch (error) {
    return { outcome: "failure", available: true, reason: "malformed", message: error instanceof Error ? error.message : String(error) };
  }
}
