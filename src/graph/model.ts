import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import { HarnessError, repositoryPaths } from "../fs/repository.js";

export type LinkKind = "markdown" | "wikilink" | "yaml";
export type UnresolvedStatus = "broken" | "ambiguous" | "unsafe";

export interface LinkOccurrence {
  kind: LinkKind;
  ordinal: number;
  raw_target: string;
}

export interface GraphDocument {
  id: string;
  path: string;
  title: string;
  headings: string[];
  body: string;
  content_digest: string;
  occurrences: LinkOccurrence[];
}

export interface GraphEdge {
  source: string;
  target: string;
  occurrences: LinkOccurrence[];
}

export interface GraphUnresolved extends LinkOccurrence {
  source: string;
  status: UnresolvedStatus;
  candidates: string[];
}

export interface MarkdownGraph {
  documents: GraphDocument[];
  edges: GraphEdge[];
  unresolved: GraphUnresolved[];
  source_digest: string;
}

export interface CapturedFile {
  id: string;
  path: string;
  content: string;
  digest: string;
}

export function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function normalizeDocumentId(value: string): string {
  return value.replaceAll("\\", "/").split("/").filter(Boolean).join("/").normalize("NFC");
}

function stableCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sourceDigest(files: readonly Pick<CapturedFile, "id" | "digest">[]): string {
  const input = `v1\0${files.map((file) => `${file.id}\0${file.digest}\n`).join("")}`;
  return sha256(input);
}

function isExcluded(relativePath: string, indexId: string): boolean {
  const normalized = normalizeDocumentId(relativePath);
  if (normalized === indexId) return true;
  const parts = normalized.split("/");
  return parts.some((part) => ["graph-out", "graphify-out", ".harness-tmp", ".cache"].includes(part)) ||
    parts.some((part) => part === ".harness.lock" || part.startsWith(".harness-tmp-"));
}

async function discoverMarkdown(root: string): Promise<string[]> {
  const paths = await repositoryPaths(root);
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => stableCompare(left.name, right.name))) {
      const path = join(directory, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) {
        throw new HarnessError(`Markdown discovery rejects symbolic link: ${relative(paths.root, path)}`, "conflict");
      }
      if (info.isDirectory()) {
        await visit(path);
      } else if (info.isFile() && extname(entry.name).toLowerCase() === ".md") {
        const id = normalizeDocumentId(relative(paths.root, path));
        if (!isExcluded(id, normalizeDocumentId(relative(paths.root, paths.index)))) files.push(path);
      }
    }
  }
  await visit(paths.harness);
  return files.sort((left, right) => stableCompare(normalizeDocumentId(relative(paths.root, left)), normalizeDocumentId(relative(paths.root, right))));
}

async function capture(root: string): Promise<CapturedFile[]> {
  const paths = await repositoryPaths(root);
  const files = await discoverMarkdown(root);
  const captured = await Promise.all(files.map(async (path) => {
    const content = await readFile(path, "utf8");
    return {
      id: normalizeDocumentId(relative(paths.root, path)),
      path,
      content,
      digest: sha256(content),
    };
  }));
  return captured.sort((left, right) => stableCompare(left.id, right.id));
}

function targetParts(raw: string): { target: string; fragment?: string } {
  const decoded = decodeURIComponent(raw).normalize("NFC");
  const hash = decoded.indexOf("#");
  const caret = decoded.indexOf("^");
  const splitAt = hash >= 0 && caret >= 0 ? Math.min(hash, caret) : Math.max(hash, caret);
  return splitAt >= 0 ? { target: decoded.slice(0, splitAt), fragment: decoded.slice(splitAt + 1) } : { target: decoded };
}

function safeTarget(raw: string): boolean {
  if (raw.includes("\0") || isAbsolute(raw) || /^[A-Za-z][A-Za-z+.-]*:/.test(raw) || raw.startsWith("//")) return false;
  return true;
}

type Resolution =
  | { status: "resolved"; target: GraphDocument; candidates: string[] }
  | { status: UnresolvedStatus; candidates: string[] };

function candidateIds(documents: readonly GraphDocument[], rawTarget: string, source: GraphDocument): Resolution {
  if (!safeTarget(rawTarget)) return { status: "unsafe", candidates: [] };
  let parts: { target: string; fragment?: string };
  try {
    parts = targetParts(rawTarget);
  } catch {
    return { status: "unsafe", candidates: [] };
  }
  if (parts.target === "") return { status: "resolved", target: source, candidates: [source.id] };
  const normalized = normalizeDocumentId(parts.target);
  const explicit = normalized.includes("/") || normalized.toLowerCase().endsWith(".md");
  const withExtension = normalized.toLowerCase().endsWith(".md") ? normalized : `${normalized}.md`;
  const sourceDirectory = dirname(source.id);
  const exactId = normalizeDocumentId(join(sourceDirectory, withExtension));
  const rootId = normalizeDocumentId(withExtension);
  const exact = documents.find((document) => document.id === exactId || (explicit && document.id === rootId));
  if (exact) return { status: "resolved", target: exact, candidates: [exact.id] };
  if (explicit) return { status: "broken", candidates: [] };
  const base = basename(withExtension).toLowerCase();
  const candidates = documents.filter((document) => basename(document.id).toLowerCase() === base).map((document) => document.id).sort(stableCompare);
  if (candidates.length === 1) {
    const target = documents.find((document) => document.id === candidates[0]);
    if (target) return { status: "resolved", target, candidates };
    return { status: "broken", candidates: [] };
  }
  return { status: candidates.length ? "ambiguous" : "broken", candidates };
}

export function resolveGraphOccurrences(documents: readonly GraphDocument[]): { edges: GraphEdge[]; unresolved: GraphUnresolved[] } {
  const edgeMap = new Map<string, GraphEdge>();
  const unresolved: GraphUnresolved[] = [];
  for (const source of documents) {
    for (const occurrence of source.occurrences) {
      const result = candidateIds(documents, occurrence.raw_target, source);
      if (result.status === "resolved") {
        const key = `${source.id}\0${result.target.id}`;
        const edge = edgeMap.get(key) ?? { source: source.id, target: result.target.id, occurrences: [] };
        edge.occurrences.push({ ...occurrence });
        edgeMap.set(key, edge);
      } else {
        unresolved.push({ ...occurrence, source: source.id, status: result.status, candidates: result.candidates });
      }
    }
  }
  const edges = [...edgeMap.values()].sort((left, right) => stableCompare(`${left.source}\0${left.target}`, `${right.source}\0${right.target}`));
  for (const edge of edges) edge.occurrences.sort((left, right) => left.ordinal - right.ordinal);
  unresolved.sort((left, right) => stableCompare(`${left.source}\0${left.ordinal}`, `${right.source}\0${right.ordinal}`));
  return { edges, unresolved };
}

export async function buildMarkdownGraph(root: string, parseDocument: (file: CapturedFile) => Omit<GraphDocument, "id" | "path" | "content_digest">): Promise<MarkdownGraph> {
  const first = await capture(root);
  const second = await capture(root);
  const firstShape = first.map(({ id, digest }) => `${id}\0${digest}`).join("\n");
  const secondShape = second.map(({ id, digest }) => `${id}\0${digest}`).join("\n");
  if (firstShape !== secondShape) throw new HarnessError("Markdown snapshot changed during graph build", "conflict");
  const documents = first.map((file) => ({ ...parseDocument(file), id: file.id, path: file.path, content_digest: file.digest })).sort((left, right) => stableCompare(left.id, right.id));
  const relationships = resolveGraphOccurrences(documents);
  return { documents, ...relationships, source_digest: sourceDigest(first) };
}

export async function discoverGraphMarkdown(root: string): Promise<string[]> {
  return discoverMarkdown(root);
}
