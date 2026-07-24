import MiniSearch from "minisearch";
import type { GraphArtifact } from "./artifact.js";

export interface LexicalSearchOptions { limit?: number }

export interface LexicalResult {
  reason: "lexical";
  id: string;
  path: string;
  title: string;
  score: number;
  matched_terms: string[];
  matched_fields: string[];
  source_digest: string;
}

export interface LexicalSearchResponse {
  outcome: "success";
  source_digest: string;
  query: string;
  query_terms: string[];
  count: number;
  results: LexicalResult[];
}

export interface RelatedOptions { direction?: "in" | "out" | "both"; depth?: number }

export interface RelatedResult {
  reason: "relationship";
  id: string;
  path: string;
  title: string;
  distance: number;
  direction: "in" | "out" | "both";
  explicit_path: string[];
}

export interface RelatedResponse {
  outcome: "success";
  source_digest: string;
  target: string;
  root: { reason: "identity"; id: string; path: string; title: string };
  count: number;
  results: RelatedResult[];
}

export interface UnresolvedTargetResponse {
  outcome: "unresolved";
  source_digest: string;
  target: string;
  status: "broken" | "ambiguous";
  candidates: string[];
}

function normalized(value: string): string {
  return value.normalize("NFC").replaceAll("\\", "/").trim();
}

function assertLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("limit must be an integer from 1 to 100");
}

function assertDepth(depth: number): void {
  if (!Number.isInteger(depth) || depth < 1 || depth > 5) throw new Error("depth must be an integer from 1 to 5");
}

function makeSearch(artifact: GraphArtifact): MiniSearch<{ id: string; path: string; title: string; headings: string; body: string }> {
  return MiniSearch.loadJSON(JSON.stringify(artifact.search.index), {
    fields: ["path", "title", "headings", "body"],
    storeFields: ["path", "title"],
    processTerm: (term) => term.normalize("NFC").toLowerCase(),
  });
}

export function searchGraph(artifact: GraphArtifact, query: string, options: LexicalSearchOptions = {}): LexicalSearchResponse {
  const normalizedQuery = normalized(query);
  if (!normalizedQuery) throw new Error("query must not be empty");
  const limit = options.limit ?? 20;
  assertLimit(limit);
  const search = makeSearch(artifact);
  const raw = search.search(normalizedQuery, { combineWith: "AND", prefix: false, fuzzy: false });
  const results: LexicalResult[] = raw.filter((result) => Number.isFinite(result.score)).map((result) => {
    const match = result.match as Record<string, string[]>;
    const matchedFields = [...new Set(Object.values(match).flat())].sort();
    return {
      reason: "lexical" as const,
      id: String(result.id),
      path: String(result.path),
      title: String(result.title),
      score: result.score,
      matched_terms: [...result.terms].sort(),
      matched_fields: matchedFields,
      source_digest: artifact.source_digest,
    };
  }).sort((left, right) => right.score - left.score || left.path.localeCompare(right.path)).slice(0, limit);
  return {
    outcome: "success",
    source_digest: artifact.source_digest,
    query: normalizedQuery,
    query_terms: normalizedQuery.split(/\s+/).map((term) => term.toLowerCase()),
    count: results.length,
    results,
  };
}

function resolveTarget(artifact: GraphArtifact, target: string): { status: "resolved"; id: string } | { status: "broken" | "ambiguous"; candidates: string[] } {
  const value = normalized(target);
  const exact = artifact.documents.find((document) => document.id === value || document.id === `${value}.md`);
  if (exact) return { status: "resolved", id: exact.id };
  const basename = value.split("/").pop()!.replace(/\.md$/i, "").toLowerCase();
  const candidates = artifact.documents.filter((document) => document.id.split("/").pop()!.replace(/\.md$/i, "").toLowerCase() === basename).map((document) => document.id).sort();
  return candidates.length === 1 ? { status: "resolved", id: candidates[0]! } : { status: candidates.length ? "ambiguous" : "broken", candidates };
}

interface WalkState { id: string; path: string[]; directions: ("in" | "out")[] }

export function relatedGraph(artifact: GraphArtifact, target: string, options: RelatedOptions = {}): RelatedResponse | UnresolvedTargetResponse {
  const direction = options.direction ?? "both";
  if (!["in", "out", "both"].includes(direction)) throw new Error("direction must be in, out, or both");
  const depth = options.depth ?? 1;
  assertDepth(depth);
  const resolved = resolveTarget(artifact, target);
  if (resolved.status !== "resolved") return { outcome: "unresolved", source_digest: artifact.source_digest, target, status: resolved.status, candidates: resolved.candidates };
  const root = artifact.documents.find((document) => document.id === resolved.id)!;
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const edge of artifact.edges) {
    if (edge.source === edge.target) continue;
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target].sort());
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source].sort());
  }
  const queue: WalkState[] = [{ id: root.id, path: [root.id], directions: [] }];
  const best = new Map<string, WalkState>();
  while (queue.length) {
    const current = queue.shift()!;
    if (current.directions.length >= depth) continue;
    const neighbors: Array<{ id: string; direction: "in" | "out" }> = [];
    if (direction === "out" || direction === "both") for (const id of outgoing.get(current.id) ?? []) neighbors.push({ id, direction: "out" });
    if (direction === "in" || direction === "both") for (const id of incoming.get(current.id) ?? []) neighbors.push({ id, direction: "in" });
    neighbors.sort((left, right) => left.id.localeCompare(right.id) || left.direction.localeCompare(right.direction));
    for (const neighbor of neighbors) {
      const state: WalkState = { id: neighbor.id, path: [...current.path, neighbor.id], directions: [...current.directions, neighbor.direction] };
      const previous = best.get(state.id);
      if (previous && (previous.directions.length < state.directions.length || (previous.directions.length === state.directions.length && previous.path.join("\0") <= state.path.join("\0")))) continue;
      best.set(state.id, state);
      queue.push(state);
    }
    queue.sort((left, right) => left.directions.length - right.directions.length || left.path.join("\0").localeCompare(right.path.join("\0")));
  }
  const results: RelatedResult[] = [...best.values()].sort((left, right) => left.directions.length - right.directions.length || left.path.join("\0").localeCompare(right.path.join("\0"))).map((state) => {
    const document = artifact.documents.find((entry) => entry.id === state.id)!;
    const uniqueDirections = [...new Set(state.directions)];
    return { reason: "relationship" as const, id: document.id, path: document.id, title: document.title, distance: state.directions.length, direction: uniqueDirections.length === 1 ? uniqueDirections[0]! : "both", explicit_path: state.path };
  });
  return { outcome: "success", source_digest: artifact.source_digest, target, root: { reason: "identity", id: root.id, path: root.id, title: root.title }, count: results.length, results };
}
