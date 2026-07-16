import { copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, relative } from "node:path";
import { parse, stringify } from "yaml";
import { applyMutation, type FileMutation, withRepositoryLock } from "../fs/atomic-write.js";
import { exists, HarnessError, listMarkdown, repositoryPaths, type RepositoryPaths } from "../fs/repository.js";
import { artifactSchema, type ArtifactFrontmatter, validateArtifactFilename } from "./schemas/artifacts.js";
import { validateFeatureContent } from "./schemas/content.js";
import { parseMarkdownDocument, serializeMarkdownDocument } from "./schemas/frontmatter.js";
import { skillNames } from "./skill-routing.js";

export type ArtifactKind = "feature" | "spec" | "decision" | "report" | "rule";

export interface CreateArtifactInput {
  kind: ArtifactKind;
  title: string;
  date?: string;
  scope?: readonly string[];
}

export interface ArtifactSummary {
  id?: string;
  title: string;
  status: string;
  path: string;
}

export interface MutationResult {
  path?: string;
  id?: string;
  affected?: string[];
  removed?: string[];
}

const EMPTY_RELATIONSHIPS = {
  specs: [], decisions: [], plans: [], reports: [], rules: [], features: [], source_paths: [],
};

const COUNTERS = {
  feature: { key: "next_feature_sequence", prefix: "FEAT", directory: "features", template: "feature.md" },
  decision: { key: "next_decision_sequence", prefix: "DEC", directory: "decisions", template: "decision.md" },
  report: { key: "next_report_sequence", prefix: "REP", directory: "reports", template: "report.md" },
  rule: { key: "next_rule_sequence", prefix: "RULE", directory: "rules", template: "rule.md" },
} as const;

const INIT_DIRECTORIES = ["features", "specs", "decisions", "plans", "reports", "rules", "templates", "workflows"] as const;
const INIT_ROOT_FILES = ["README.md"] as const;

export async function initializeHarness(root: string): Promise<{ created: string[]; preserved: string[] }> {
  const paths = await repositoryPaths(root);
  const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));
  const sourceHarness = join(packageRoot, "docs", "harness");
  const created: string[] = [];
  const preserved: string[] = [];

  await withRepositoryLock(paths.root, paths.harness, async () => {
    for (const directory of INIT_DIRECTORIES) {
      const target = paths[directory];
      if (await exists(target)) preserved.push(relative(paths.root, target));
      else {
        await mkdir(target, { recursive: true });
        created.push(relative(paths.root, target));
      }
    }

    for (const name of INIT_ROOT_FILES) {
      await copyIfMissing(join(sourceHarness, name), join(paths.harness, name), paths.root, created, preserved);
    }
    for (const directory of ["templates", "workflows"] as const) {
      for (const name of (await readdir(join(sourceHarness, directory))).filter((entry) => entry.endsWith(".md")).sort()) {
        await copyIfMissing(join(sourceHarness, directory, name), join(paths[directory], name), paths.root, created, preserved);
      }
    }
    for (const name of skillNames) {
      await copyIfMissing(
        join(packageRoot, ".agents", "skills", name, "SKILL.md"),
        join(paths.root, ".agents", "skills", name, "SKILL.md"),
        paths.root,
        created,
        preserved,
      );
    }
    if (await exists(paths.index)) preserved.push(relative(paths.root, paths.index));
    else {
      await writeExclusive(paths.index, initialIndex());
      created.push(relative(paths.root, paths.index));
    }
  });

  return { created: created.sort(), preserved: preserved.sort() };
}

export async function createArtifact(root: string, input: CreateArtifactInput): Promise<MutationResult> {
  const paths = await repositoryPaths(root);
  const title = requireText(input.title, "title");
  const slug = slugify(title);
  const date = input.date ?? currentDate();
  requireDate(date);

  if (input.kind === "spec") {
    await validateArtifactDirectory(paths.root, paths.specs, "spec");
    const target = join(paths.specs, `${slug}.md`);
    if (await exists(target)) throw new HarnessError(`artifact already exists: ${relative(paths.root, target)}`, "conflict");
    const content = await renderFromTemplate(paths.templates, input, undefined, date);
    await applyMutation(paths.root, [{ path: target, content }], (overlay) => validateArtifactOverlay(target, overlay.get(target)));
    return { path: relative(paths.root, target) };
  }

  const counter = COUNTERS[input.kind];
  const indexSource = await readFile(paths.index, "utf8").catch(() => {
    throw new HarnessError("Harness index is missing; run `harness init`", "precondition");
  });
  const index = parseIndex(indexSource);
  const directory = paths[counter.directory];
  if (input.kind === "feature") await loadFeatures(paths.root, directory);
  else await validateArtifactDirectory(paths.root, directory, input.kind);
  const next = Math.max(readCounter(index.frontmatter, counter.key), await nextExistingSequence(directory, counter.prefix));
  const id = `${counter.prefix}-${String(next).padStart(3, "0")}`;
  const target = join(directory, `${id}-${slug}.md`);
  if (await exists(target)) throw new HarnessError(`artifact already exists: ${relative(paths.root, target)}`, "conflict");

  index.frontmatter[counter.key] = next + 1;
  const nextIndex = serializeIndex(index.frontmatter, index.body);
  const content = await renderFromTemplate(paths.templates, input, id, date);
  const changes: FileMutation[] = [
    { path: paths.index, content: nextIndex, rollback: false },
    { path: target, content },
  ];
  await applyMutation(paths.root, changes, (overlay) => validateArtifactOverlay(target, overlay.get(target)));
  return { id, path: relative(paths.root, target) };
}

export async function listFeatures(root: string): Promise<ArtifactSummary[]> {
  const paths = await repositoryPaths(root);
  const entries = await loadFeatures(paths.root, paths.features);
  return entries.map((entry) => ({
    id: entry.frontmatter.id,
    title: entry.frontmatter.title,
    status: entry.frontmatter.status,
    path: relative(paths.root, entry.path),
  }));
}

export async function showFeature(root: string, target: string): Promise<{ summary: ArtifactSummary; content: string }> {
  const paths = await repositoryPaths(root);
  const entry = await resolveFeature(paths.root, paths.features, target);
  return {
    summary: {
      id: entry.frontmatter.id,
      title: entry.frontmatter.title,
      status: entry.frontmatter.status,
      path: relative(paths.root, entry.path),
    },
    content: entry.source,
  };
}

export async function renameFeature(root: string, target: string, titleInput: string): Promise<MutationResult> {
  const paths = await repositoryPaths(root);
  const entry = await resolveFeature(paths.root, paths.features, target);
  const title = requireText(titleInput, "title");
  const newBase = `${entry.frontmatter.id}-${slugify(title)}`;
  const oldBase = basename(entry.path, ".md");
  const destination = join(paths.features, `${newBase}.md`);
  if (destination !== entry.path && await exists(destination)) {
    throw new HarnessError(`rename target already exists: ${relative(paths.root, destination)}`, "conflict");
  }

  const renamedFrontmatter = artifactSchema.parse({ ...entry.frontmatter, title });
  const renamedBody = entry.body.replace(/^# .+$/m, `# ${entry.frontmatter.id}: ${title}`);
  const renamedContent = serializeMarkdownDocument({ frontmatter: renamedFrontmatter, body: renamedBody });
  const changes: FileMutation[] = [{ path: destination, content: renamedContent }];
  const affected: string[] = [];
  const linkPattern = new RegExp(`\\[\\[${escapeRegExp(oldBase)}(?=\\]|\\|)`, "g");
  for (const path of await listConfiguredMarkdown(paths)) {
    if (path === entry.path || path === paths.index) continue;
    const source = await readFile(path, "utf8");
    if (!linkPattern.test(source)) continue;
    linkPattern.lastIndex = 0;
    const content = source.replace(linkPattern, `[[${newBase}`);
    changes.push({ path, content });
    affected.push(relative(paths.root, path));
  }
  if (destination !== entry.path) changes.push({ path: entry.path });

  await applyMutation(paths.root, changes, (overlay) => {
    validateArtifactOverlay(destination, overlay.get(destination));
    for (const change of changes) {
      const content = overlay.get(change.path);
      if (content?.startsWith("---\n") && change.path !== destination) parseMarkdownDocument(content);
    }
  });
  return { id: entry.frontmatter.id, path: relative(paths.root, destination), affected: affected.sort() };
}

export async function deprecateFeature(root: string, target: string): Promise<MutationResult> {
  const paths = await repositoryPaths(root);
  const entry = await resolveFeature(paths.root, paths.features, target);
  if (!entry.frontmatter.approved || !entry.frontmatter.approved_by) {
    throw new HarnessError("only an approved or active Feature can be deprecated without new approval provenance", "precondition");
  }
  const frontmatter = artifactSchema.parse({ ...entry.frontmatter, status: "deprecated" });
  const content = serializeMarkdownDocument({ frontmatter, body: entry.body });
  await applyMutation(paths.root, [{ path: entry.path, content }], (overlay) => validateArtifactOverlay(entry.path, overlay.get(entry.path)));
  return { id: entry.frontmatter.id, path: relative(paths.root, entry.path) };
}

export async function deleteFeature(root: string, target: string, force = false): Promise<MutationResult> {
  const paths = await repositoryPaths(root);
  const entry = await resolveFeature(paths.root, paths.features, target);
  const featureBase = basename(entry.path, ".md");
  const backlinks = await findBacklinks(paths.root, paths.allowlist, entry.path, featureBase);
  if (backlinks.length && !force) {
    throw new HarnessError("Feature deletion is blocked by inbound wikilinks; deprecate it or retry with explicit `--force`", "conflict", backlinks);
  }
  await applyMutation(paths.root, [{ path: entry.path }]);
  return { id: entry.frontmatter.id, removed: [relative(paths.root, entry.path)], affected: backlinks };
}

export async function cleanHarness(root: string, dryRun: boolean): Promise<{ paths: string[]; removed: boolean }> {
  const paths = await repositoryPaths(root);
  return withRepositoryLock(paths.root, paths.harness, async () => {
    const targets: string[] = [];
    for (const candidate of paths.allowlist.slice(-3)) {
      if (await exists(candidate)) targets.push(candidate);
    }
    await Promise.all(paths.allowlist.slice(1, -3).map((directory) => collectTemporarySiblings(directory, targets)));
    const unique = [...new Set(targets)].sort();
    if (!dryRun) await Promise.all(unique.map((target) => rm(target, { recursive: true, force: true })));
    return { paths: unique.map((target) => relative(paths.root, target)), removed: !dryRun };
  });
}

interface LoadedFeature {
  path: string;
  source: string;
  body: string;
  frontmatter: Extract<ArtifactFrontmatter, { type: "feature" }>;
}

async function loadFeatures(root: string, directory: string): Promise<LoadedFeature[]> {
  const results: LoadedFeature[] = [];
  const ids = new Set<string>();
  for (const name of (await readdir(directory)).filter((entry) => entry.endsWith(".md")).sort()) {
    const path = join(directory, name);
    const source = await readFile(path, "utf8");
    const parsed = parseMarkdownDocument(source);
    if (!("type" in parsed.frontmatter) || parsed.frontmatter.type !== "feature") {
      throw new HarnessError(`non-Feature document found in features directory: ${relative(root, path)}`, "invalid");
    }
    const filenameErrors = validateArtifactFilename(name, parsed.frontmatter);
    if (filenameErrors.length) throw new HarnessError(filenameErrors.join("; "), "invalid", [relative(root, path)]);
    const contentErrors = validateFeatureContent(parsed.body);
    if (contentErrors.length) throw new HarnessError(contentErrors.join("; "), "invalid", [relative(root, path)]);
    if (ids.has(parsed.frontmatter.id)) throw new HarnessError(`duplicate Feature ID: ${parsed.frontmatter.id}`, "invalid", [relative(root, path)]);
    ids.add(parsed.frontmatter.id);
    results.push({ path, source, body: parsed.body, frontmatter: parsed.frontmatter });
  }
  return results.sort((left, right) => left.frontmatter.id.localeCompare(right.frontmatter.id));
}

async function validateArtifactDirectory(root: string, directory: string, expected: ArtifactKind): Promise<void> {
  if (!(await exists(directory))) return;
  const ids = new Set<string>();
  for (const name of (await readdir(directory)).filter((entry) => entry.endsWith(".md")).sort()) {
    const path = join(directory, name);
    const parsed = parseMarkdownDocument(await readFile(path, "utf8"));
    if (!("type" in parsed.frontmatter) || parsed.frontmatter.type !== expected) {
      throw new HarnessError(`unexpected artifact type in ${relative(root, directory)}: ${name}`, "invalid");
    }
    const errors = validateArtifactFilename(name, parsed.frontmatter);
    if (errors.length) throw new HarnessError(errors.join("; "), "invalid", [relative(root, path)]);
    if ("id" in parsed.frontmatter) {
      if (ids.has(parsed.frontmatter.id)) throw new HarnessError(`duplicate ${expected} ID: ${parsed.frontmatter.id}`, "invalid", [relative(root, path)]);
      ids.add(parsed.frontmatter.id);
    }
  }
}

async function resolveFeature(root: string, directory: string, targetInput: string): Promise<LoadedFeature> {
  const target = requireText(targetInput, "Feature target").replace(/\.md$/, "");
  const matches = (await loadFeatures(root, directory)).filter((entry) =>
    entry.frontmatter.id === target || basename(entry.path, ".md") === target,
  );
  if (matches.length === 0) throw new HarnessError(`Feature not found: ${target}`, "precondition");
  if (matches.length > 1) throw new HarnessError(`Feature target is ambiguous: ${target}`, "conflict", matches.map((entry) => relative(root, entry.path)));
  return matches[0]!;
}

async function renderFromTemplate(templates: string, input: CreateArtifactInput, id: string | undefined, date: string): Promise<string> {
  const templateName = input.kind === "spec" ? "shared-spec.md" : COUNTERS[input.kind].template;
  const source = await readFile(join(templates, templateName), "utf8").catch(() => {
    throw new HarnessError(`canonical template is missing: ${templateName}`, "precondition");
  });
  const parsed = parseMarkdownDocument(source);
  if (!("type" in parsed.frontmatter) || parsed.frontmatter.type !== input.kind) {
    throw new HarnessError(`canonical template type mismatch: ${templateName}`, "invalid");
  }

  const common = { ...parsed.frontmatter, title: input.title, relationships: EMPTY_RELATIONSHIPS };
  let candidate: unknown;
  switch (input.kind) {
    case "feature": candidate = { ...common, id, status: "draft", created: date, approved: undefined, approved_by: undefined }; break;
    case "decision": candidate = { ...common, id, status: "proposed", created: date, approved: undefined, approved_by: undefined, rejected: undefined, recurrence_key: undefined, supersedes: undefined }; break;
    case "report": candidate = { ...common, id, status: "completed", delivered: date, recurrence_key: undefined, rule_candidate: undefined }; break;
    case "rule": {
      if (!input.scope?.length) throw new HarnessError("`new rule` requires at least one `--scope` after human approval", "usage");
      candidate = { ...common, id, status: "active", approved: date, scope: [...input.scope] };
      break;
    }
    case "spec": candidate = { ...common, status: "draft" }; break;
  }
  const frontmatter = artifactSchema.parse(candidate);
  const body = scaffoldBody(input, id);
  return serializeMarkdownDocument({ frontmatter, body });
}

function scaffoldBody(input: CreateArtifactInput, id: string | undefined): string {
  const heading = id ? `# ${id}: ${input.title}` : `# ${input.title}`;
  switch (input.kind) {
    case "feature": return `${heading}

## Introduction

**Purpose:** **TBD:** Product Authority must define the observable purpose of ${input.title}.

**In scope:** **TBD:** Define the smallest approved behavior boundary.

**Out of scope:** Implementation design and behavior not explicitly approved here.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Product user | Business role | Use ${input.title} | Provide the triggering business intent |
| Product Authority | Business role | Define acceptable behavior | Resolve the recorded TBDs before approval |

### User needs

- **TBD:** Identify the concrete user need served by ${input.title}.

### Preconditions

- **TBD:** Identify required business preconditions.

### Trigger

The Product user requests ${input.title}; the exact trigger remains TBD.

### Main flow

1. **Actor:** The Product user triggers ${input.title}. **System:** The system performs the approved observable behavior, which remains TBD.

### Alternative flows

- **A1 — Alternative outcome TBD.** Source step: 1. Condition: an approved alternative applies. Behavior: **TBD:** Product Authority defines the observable outcome. Ends with: the approved alternative postcondition.

### Exception flows

- **E1 — Failure behavior TBD.** Source step: 1. Failure: the requested behavior cannot complete. Handling: **TBD:** define the visible failure and recovery option. Prohibited: reporting unverified success. Failure postcondition: no success is claimed.

### Postconditions

- **Success:** **TBD:** Define the observable successful result.
- **Failure:** No unverified success is reported.

## Requirements

- **FR-001 [TBD]:** Product Authority shall replace this open requirement before approval.

## Acceptance

- [ ] Product Authority has resolved every material TBD and approved the behavior boundary.

**Scenario: behavior approved before implementation**
Given ${input.title} contains unresolved material behavior
When implementation authority is requested
Then approval is withheld until the TBDs are resolved.

## Relationships

- No relationships recorded yet.`;
    case "spec": return `${heading}

## Scope

**TBD:** Define the cross-cutting concern and its boundaries.

## Contract

**TBD:** Record stable technical constraints without introducing product behavior.

## Verification

**TBD:** Define executable conformance evidence.`;
    case "decision": return `${heading}

## Context

**TBD:** Record the durable choice, constraints, evidence, and return boundary.

## Decision

**TBD:** Repository authority must select one alternative before approval.

## Alternatives

1. **Alternative A — TBD.** Record benefits, costs, risks, and reversibility.
2. **Alternative B — TBD.** Record benefits, costs, risks, and reversibility.

## Consequences

**TBD:** Record inherited constraints and follow-up work.

## Evidence

- **TBD:** Add repository-local evidence links.

## Supersession

This decision supersedes no earlier decision.`;
    case "report": return `${heading}

## Delivered outcome

**TBD:** Record only the verified delivered result.

## Changed files

- **TBD:** List each changed path and purpose.

## Verification evidence

- **TBD:** Record exact commands and outcomes.

## Plan variance

**TBD:** State material variance or explicitly record none.

## Repeated friction

No repeated friction recorded yet.`;
    case "rule": return `${heading}

## Guidance

**TBD:** State one imperative reusable rule.

## Scope

${(input.scope ?? []).map((scope) => `- ${scope}`).join("\n")}

## Rationale

**TBD:** Link the repeated evidence supporting this approved Rule.

## Evidence

- **TBD:** Add at least two independent evidence links.

## Exceptions

None recorded.

## Verification

**TBD:** Define how conformance is checked.`;
  }
}

function validateArtifactOverlay(path: string, content: string | undefined): void {
  if (content === undefined) throw new HarnessError(`staged artifact is missing: ${path}`, "invalid");
  const parsed = parseMarkdownDocument(content);
  if (!("type" in parsed.frontmatter)) throw new HarnessError(`staged path is not an artifact: ${path}`, "invalid");
  const errors = validateArtifactFilename(basename(path), parsed.frontmatter);
  if (parsed.frontmatter.type === "feature") errors.push(...validateFeatureContent(parsed.body));
  if (errors.length) throw new HarnessError(`staged artifact is invalid: ${errors.join("; ")}`, "invalid", [path]);
}

async function listConfiguredMarkdown(paths: RepositoryPaths): Promise<string[]> {
  const directories = [paths.features, paths.specs, paths.decisions, paths.plans, paths.reports, paths.rules, paths.templates, paths.workflows];
  return (await Promise.all(directories.map((directory) => listMarkdown(directory)))).flat().sort();
}

async function findBacklinks(root: string, directories: readonly string[], targetPath: string, featureBase: string): Promise<string[]> {
  const pattern = new RegExp(`\\[\\[${escapeRegExp(featureBase)}(?=\\]|\\|)`);
  const matches: string[] = [];
  for (const path of await Promise.all(directories.slice(1, -3).map((directory) => listMarkdown(directory))).then((groups) => groups.flat().sort())) {
    if (path === targetPath) continue;
    if (pattern.test(await readFile(path, "utf8"))) matches.push(relative(root, path));
  }
  return matches.sort();
}

async function collectTemporarySiblings(directory: string, targets: string[]): Promise<void> {
  if (!(await exists(directory))) return;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collectTemporarySiblings(path, targets);
    else if (entry.name.includes(".harness-tmp-") || entry.name.includes(".harness-rollback-")) targets.push(path);
  }
}

async function copyIfMissing(source: string, target: string, root: string, created: string[], preserved: string[]): Promise<void> {
  if (await exists(target)) {
    preserved.push(relative(root, target));
    return;
  }
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target, constants.COPYFILE_EXCL);
  created.push(relative(root, target));
}

async function writeExclusive(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const handle = await import("node:fs/promises").then(({ open }) => open(path, "wx", 0o600));
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function initialIndex(): string {
  return `---\nschema_version: 1\nnext_feature_sequence: 1\nnext_decision_sequence: 1\nnext_report_sequence: 1\nnext_rule_sequence: 1\ngenerated: true\n---\n\n# Harness Index\n\nThis bootstrap index is CLI-owned.\n`;
}

function parseIndex(source: string): { frontmatter: Record<string, unknown>; body: string } {
  const normalized = source.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  const closing = lines.indexOf("---", 1);
  if (lines[0] !== "---" || closing < 0) throw new HarnessError("Harness index frontmatter is invalid", "invalid");
  const value: unknown = parse(lines.slice(1, closing).join("\n"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HarnessError("Harness index frontmatter must be a mapping", "invalid");
  const frontmatter = value as Record<string, unknown>;
  if (frontmatter.schema_version !== 1 || frontmatter.generated !== true) throw new HarnessError("Harness index schema is unsupported", "invalid");
  return { frontmatter, body: lines.slice(closing + 1).join("\n").replace(/^\n/, "") };
}

function serializeIndex(frontmatter: Record<string, unknown>, body: string): string {
  return `---\n${stringify(frontmatter, { lineWidth: 0 }).trimEnd()}\n---\n\n${body.trim()}\n`;
}

function readCounter(frontmatter: Record<string, unknown>, key: string): number {
  const value = frontmatter[key];
  if (value === undefined) return 1;
  if (!Number.isInteger(value) || (value as number) < 1) throw new HarnessError(`invalid index counter: ${key}`, "invalid");
  return value as number;
}

async function nextExistingSequence(directory: string, prefix: string): Promise<number> {
  if (!(await exists(directory))) return 1;
  let maximum = 0;
  const pattern = new RegExp(`^${prefix}-(\\d{3})-`);
  for (const name of await readdir(directory)) {
    const match = pattern.exec(name);
    if (match) maximum = Math.max(maximum, Number(match[1]));
  }
  return maximum + 1;
}

export function slugify(value: string): string {
  const slug = value.trim().replace(/[Đđ]/g, "d").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) throw new HarnessError("title must produce a non-empty ASCII kebab-case slug", "usage");
  return slug;
}

function requireText(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) throw new HarnessError(`${name} is required`, "usage");
  return normalized;
}

function requireDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HarnessError("date must use YYYY-MM-DD", "usage");
}

function currentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
