import { copyFile, lstat, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, relative, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { applyMutation, type FileMutation, withRepositoryLock } from "../fs/atomic-write.js";
import { assertContained, exists, HarnessError, listMarkdown, repositoryPaths, type RepositoryPaths } from "../fs/repository.js";
import { artifactSchema, featureSchema, planSchema, workItemSchema, type ArtifactFrontmatter, validateArtifactFilename } from "./schemas/artifacts.js";
import { validateFeatureContent } from "./schemas/content.js";
import { parseMarkdownDocument, serializeMarkdownDocument } from "./schemas/frontmatter.js";
import { skillNames } from "./skill-routing.js";
import { scanHarness, type IntegrityResult, type IntegrityFinding } from "./integrity.js";
import { z } from "zod";


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

export interface CreatePlanInput {
  title: string;
  workItems: readonly string[];
  created?: string;
  createdBy?: string;
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

export async function createPlan(root: string, input: CreatePlanInput): Promise<MutationResult> {
  const paths = await repositoryPaths(root);
  const title = requireText(input.title, "title");
  if (input.workItems.length === 0) throw new HarnessError("at least one --work-item is required", "usage");
  const workItems = input.workItems.map((item, index) => requireText(item, `work item ${index + 1}`));
  const created = input.created ?? currentOffsetTimestamp();
  requireOffsetTimestamp(created);
  const slug = slugify(title);
  const directory = join(paths.plans, `${created.slice(2, 10).replaceAll("-", "")}-${created.slice(11, 16).replace(":", "")}-${slug}`);
  if (await exists(directory)) throw new HarnessError(`Plan already exists: ${relative(paths.root, directory)}`, "conflict");

  const [planTemplate, workItemTemplate] = await Promise.all([
    readFile(join(paths.templates, "plan.md"), "utf8").catch(() => { throw new HarnessError("canonical template is missing: plan.md", "precondition"); }),
    readFile(join(paths.templates, "work-item.md"), "utf8").catch(() => { throw new HarnessError("canonical template is missing: work-item.md", "precondition"); }),
  ]);
  let parsedPlanTemplate;
  let parsedWorkItemTemplate;
  try {
    parsedPlanTemplate = parseMarkdownDocument(planTemplate);
    parsedWorkItemTemplate = parseMarkdownDocument(workItemTemplate);
  } catch (err) {
    if (err instanceof HarnessError) throw err;
    throw new HarnessError("invalid plan or work-item template format", "invalid");
  }
  if (!("approval" in parsedPlanTemplate.frontmatter) || !("work_item" in parsedWorkItemTemplate.frontmatter)) {
    throw new HarnessError("canonical Plan templates have invalid types", "invalid");
  }

  const planPath = join(directory, "plan.md");
  let planFrontmatter;
  try {
    planFrontmatter = planSchema.parse({
      ...parsedPlanTemplate.frontmatter,
      title,
      description: `Implementation plan for ${title}.`,
      status: "pending",
      approval: { status: "pending", required_by: "Repository Maintainer" },
      branch: `codex/${slug}`,
      created,
      createdBy: requireText(input.createdBy ?? "Harness CLI", "createdBy"),
      relationships: EMPTY_RELATIONSHIPS,
    });
  } catch (err) {
    if (err instanceof HarnessError) throw err;
    throw new HarnessError("invalid plan template schema", "invalid");
  }
  const planBody = `# ${title}\n\n## Overview\n\n## Work Items\n\n${workItems.map((item, index) => `- [Work Item ${index + 1}: ${item}](./work-item-${String(index + 1).padStart(2, "0")}-${slugify(item)}.md)`).join("\n")}\n\n## Coverage\n\n## Verification`;
  const changes: FileMutation[] = [{ path: planPath, content: serializeMarkdownDocument({ frontmatter: planFrontmatter, body: planBody }) }];
  for (const [index, item] of workItems.entries()) {
    const workItemPath = join(directory, `work-item-${String(index + 1).padStart(2, "0")}-${slugify(item)}.md`);
    let frontmatter;
    try {
      frontmatter = workItemSchema.parse({
        ...parsedWorkItemTemplate.frontmatter,
        work_item: index + 1,
        title: item,
        status: "pending",
        dependencies: index === 0 ? [] : [index],
        decision_dependencies: [],
      });
    } catch (err) {
      if (err instanceof HarnessError) throw err;
      throw new HarnessError("invalid work-item template schema", "invalid");
    }
    const body = `# Work Item ${index + 1}: ${item}\n\n## Tasks\n\n## Scope and affected files\n\n## Success criteria\n\n## Risks\n\n## Required evidence`;
    changes.push({ path: workItemPath, content: serializeMarkdownDocument({ frontmatter, body }) });
  }

  await applyMutation(paths.root, changes, (overlay) => {
    const rootContent = overlay.get(planPath);
    if (rootContent === undefined || !("approval" in parseMarkdownDocument(rootContent).frontmatter)) throw new HarnessError("staged Plan root is invalid", "invalid");
    for (const change of changes.slice(1)) {
      const content = overlay.get(change.path);
      if (content === undefined || !("work_item" in parseMarkdownDocument(content).frontmatter)) throw new HarnessError(`staged Work Item is invalid: ${relative(paths.root, change.path)}`, "invalid");
    }
  });
  return { path: relative(paths.root, planPath), affected: changes.map((change) => relative(paths.root, change.path)) };
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
    const disposable = [
      join(paths.harness, "graph-out"),
      join(paths.harness, "graphify-out"),
      join(paths.harness, ".harness-tmp"),
      join(paths.harness, ".cache"),
    ];
    for (const candidate of disposable) {
      if (await exists(candidate)) targets.push(candidate);
    }
    const managedDirectories = [paths.features, paths.specs, paths.decisions, paths.plans, paths.reports, paths.rules, paths.templates, paths.workflows];
    await Promise.all(managedDirectories.map((directory) => collectTemporarySiblings(directory, targets)));
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

function requireOffsetTimestamp(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new HarnessError("created timestamp must be ISO-8601 with an offset", "usage");
  }
}

function currentOffsetTimestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type TargetKind = "feature" | "plan" | "work_item";

export interface ResolvedTarget {
  kind: TargetKind;
  path: string; // absolute path
  relativePath: string; // repo-relative POSIX path
}

export interface WorkflowState {
  targetKind: TargetKind;
  targetPath: string;
  title: string;
  reviewState?: string;
  executionState?: string;
  findings: string[];
  nextOperations: string[];
}

export async function resolveFeaturePath(root: string, paths: RepositoryPaths, targetInput: string): Promise<string> {
  const cleanInput = targetInput.trim();
  if (!cleanInput) {
    throw new HarnessError("Feature target is required", "usage");
  }
  if (cleanInput.includes("/") || cleanInput.includes("\\")) {
    const absPath = resolve(root, cleanInput);
    await assertContained(root, absPath);
    const parent = dirname(absPath);
    if (parent !== paths.features) {
      throw new HarnessError(`Feature file must be in the features directory: ${relative(root, absPath)}`, "invalid");
    }
    if (!(await exists(absPath))) {
      throw new HarnessError(`Feature file not found: ${relative(root, absPath)}`, "precondition");
    }
    const info = await lstat(absPath);
    if (info.isDirectory()) {
      throw new HarnessError(`Feature target cannot be a directory: ${relative(root, absPath)}`, "invalid");
    }
    return absPath;
  }
  const features = await loadFeatures(root, paths.features);
  const targetName = cleanInput.replace(/\.md$/, "");
  const matches = features.filter(
    (f) => f.frontmatter.id === targetName || basename(f.path, ".md") === targetName
  );
  if (matches.length === 0) {
    throw new HarnessError(`Feature not found: ${cleanInput}`, "precondition");
  }
  if (matches.length > 1) {
    throw new HarnessError(`Feature target is ambiguous: ${cleanInput}`, "conflict", matches.map((f) => relative(root, f.path)));
  }
  return matches[0]!.path;
}

export async function resolvePlanPath(root: string, paths: RepositoryPaths, targetInput: string): Promise<string> {
  const cleanInput = targetInput.trim();
  if (!cleanInput) {
    throw new HarnessError("Plan target is required", "usage");
  }
  let absPath: string;
  if (cleanInput.includes("/") || cleanInput.includes("\\")) {
    absPath = resolve(root, cleanInput);
  } else {
    absPath = resolve(paths.plans, cleanInput);
  }
  await assertContained(root, absPath);
  let isDir = false;
  try {
    const info = await lstat(absPath);
    isDir = info.isDirectory();
  } catch {
    // Let it fail at the exists check below
  }
  if (isDir) {
    absPath = join(absPath, "plan.md");
  }
  if (!(await exists(absPath))) {
    throw new HarnessError(`Plan file not found: ${relative(root, absPath)}`, "precondition");
  }
  const filename = basename(absPath);
  if (filename !== "plan.md") {
    throw new HarnessError(`Plan file must be named plan.md: ${relative(root, absPath)}`, "invalid");
  }
  const parentDir = dirname(absPath);
  const plansParent = dirname(parentDir);
  if (plansParent !== paths.plans) {
    throw new HarnessError(`Plan file must be in a plan directory under the plans directory: ${relative(root, absPath)}`, "invalid");
  }
  return absPath;
}

export async function resolveWorkItemPath(root: string, paths: RepositoryPaths, targetInput: string): Promise<string> {
  const cleanInput = targetInput.trim();
  if (!cleanInput) {
    throw new HarnessError("Work Item target is required", "usage");
  }
  const absPath = resolve(root, cleanInput);
  await assertContained(root, absPath);
  if (!(await exists(absPath))) {
    throw new HarnessError(`Work Item file not found: ${relative(root, absPath)}`, "precondition");
  }
  let isDir = false;
  try {
    const info = await lstat(absPath);
    isDir = info.isDirectory();
  } catch {
    // Ignore
  }
  if (isDir) {
    throw new HarnessError(`Work Item target cannot be a directory: ${relative(root, absPath)}`, "invalid");
  }
  const filename = basename(absPath);
  if (!/^work-item-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(filename)) {
    throw new HarnessError(`Work Item filename must match work-item-XX-kebab-name.md: ${filename}`, "invalid");
  }
  const parentDir = dirname(absPath);
  const plansParent = dirname(parentDir);
  if (plansParent !== paths.plans) {
    throw new HarnessError(`Work Item file must be in a plan directory under the plans directory: ${relative(root, absPath)}`, "invalid");
  }
  return absPath;
}

export async function resolveTarget(root: string, targetInput: string): Promise<ResolvedTarget> {
  const paths = await repositoryPaths(root);
  const cleanInput = targetInput.trim();
  if (!cleanInput) {
    throw new HarnessError("Target is required", "usage");
  }
  const name = basename(cleanInput);
  if (name.startsWith("work-item-") || cleanInput.includes("/work-item-") || cleanInput.includes("\\work-item-")) {
    const path = await resolveWorkItemPath(root, paths, cleanInput);
    return {
      kind: "work_item",
      path,
      relativePath: relative(root, path).replace(/\\/g, "/"),
    };
  }
  const looksLikeFeature = /^[A-Z]{3,4}-\d{3}$/.test(cleanInput) || cleanInput.startsWith("FEAT-") || cleanInput.includes("/features/") || cleanInput.includes("\\features\\");
  if (!looksLikeFeature) {
    try {
      const path = await resolvePlanPath(root, paths, cleanInput);
      return {
        kind: "plan",
        path,
        relativePath: relative(root, path).replace(/\\/g, "/"),
      };
    } catch (err) {
      // Fall through to try feature
    }
  }
  const path = await resolveFeaturePath(root, paths, cleanInput);
  return {
    kind: "feature",
    path,
    relativePath: relative(root, path).replace(/\\/g, "/"),
  };
}

export async function approveFeature(
  root: string,
  targetInput: string,
  approved: string,
  approvedBy: string
): Promise<MutationResult> {
  const paths = await repositoryPaths(root);
  const featurePath = await resolveFeaturePath(root, paths, targetInput);
  const cleanApproved = approved.trim();
  const cleanApprovedBy = approvedBy.trim();
  if (!cleanApproved) throw new HarnessError("approved date is required", "usage");
  if (!cleanApprovedBy) throw new HarnessError("approved-by authority is required", "usage");
  requireDate(cleanApproved);
  const source = await readFile(featurePath, "utf8");
  const parsed = parseMarkdownDocument(source);
  if (!("type" in parsed.frontmatter) || parsed.frontmatter.type !== "feature") {
    throw new HarnessError("Target is not a Feature", "invalid");
  }
  const updatedFM = featureSchema.parse({
    ...parsed.frontmatter,
    status: "approved",
    approved: cleanApproved,
    approved_by: cleanApprovedBy,
  });
  const content = serializeMarkdownDocument({ frontmatter: updatedFM, body: parsed.body });
  await applyMutation(paths.root, [{ path: featurePath, content }], (overlay) => {
    validateArtifactOverlay(featurePath, overlay.get(featurePath));
  });
  return { id: updatedFM.id, path: relative(paths.root, featurePath) };
}

export async function requestChangesFeature(
  root: string,
  targetInput: string
): Promise<MutationResult> {
  const paths = await repositoryPaths(root);
  const featurePath = await resolveFeaturePath(root, paths, targetInput);
  const source = await readFile(featurePath, "utf8");
  const parsed = parseMarkdownDocument(source);
  if (!("type" in parsed.frontmatter) || parsed.frontmatter.type !== "feature") {
    throw new HarnessError("Target is not a Feature", "invalid");
  }
  const updatedFM = featureSchema.parse({
    ...parsed.frontmatter,
    status: "proposed",
    approved: undefined,
    approved_by: undefined,
  });
  const content = serializeMarkdownDocument({ frontmatter: updatedFM, body: parsed.body });
  await applyMutation(paths.root, [{ path: featurePath, content }], (overlay) => {
    validateArtifactOverlay(featurePath, overlay.get(featurePath));
  });
  return { id: updatedFM.id, path: relative(paths.root, featurePath) };
}

export async function approvePlan(
  root: string,
  targetInput: string,
  decided: string
): Promise<MutationResult> {
  const paths = await repositoryPaths(root);
  const planPath = await resolvePlanPath(root, paths, targetInput);
  const cleanDecided = decided.trim();
  if (!cleanDecided) throw new HarnessError("decided date is required", "usage");
  requireDate(cleanDecided);
  const source = await readFile(planPath, "utf8");
  const parsed = parseMarkdownDocument(source);
  if (!("approval" in parsed.frontmatter)) {
    throw new HarnessError("Target is not a Plan", "invalid");
  }
  const updatedFM = planSchema.parse({
    ...parsed.frontmatter,
    approval: {
      ...parsed.frontmatter.approval,
      status: "approved",
      decided: cleanDecided,
    },
  });
  const content = serializeMarkdownDocument({ frontmatter: updatedFM, body: parsed.body });
  await applyMutation(paths.root, [{ path: planPath, content }], (overlay) => {
    const rootContent = overlay.get(planPath);
    if (rootContent === undefined) throw new HarnessError("staged Plan root is missing", "invalid");
    const parsedStaged = parseMarkdownDocument(rootContent);
    planSchema.parse(parsedStaged.frontmatter);
  });
  return { path: relative(paths.root, planPath) };
}

export async function requestChangesPlan(
  root: string,
  targetInput: string,
  decided: string
): Promise<MutationResult> {
  const paths = await repositoryPaths(root);
  const planPath = await resolvePlanPath(root, paths, targetInput);
  const cleanDecided = decided.trim();
  if (!cleanDecided) throw new HarnessError("decided date is required", "usage");
  requireDate(cleanDecided);
  const source = await readFile(planPath, "utf8");
  const parsed = parseMarkdownDocument(source);
  if (!("approval" in parsed.frontmatter)) {
    throw new HarnessError("Target is not a Plan", "invalid");
  }
  const updatedFM = planSchema.parse({
    ...parsed.frontmatter,
    approval: {
      ...parsed.frontmatter.approval,
      status: "changes_requested",
      decided: cleanDecided,
    },
  });
  const content = serializeMarkdownDocument({ frontmatter: updatedFM, body: parsed.body });
  await applyMutation(paths.root, [{ path: planPath, content }], (overlay) => {
    const rootContent = overlay.get(planPath);
    if (rootContent === undefined) throw new HarnessError("staged Plan root is missing", "invalid");
    const parsedStaged = parseMarkdownDocument(rootContent);
    planSchema.parse(parsedStaged.frontmatter);
  });
  return { path: relative(paths.root, planPath) };
}

export async function getWorkflowCheck(root: string, targetInput: string): Promise<IntegrityResult> {
  const resolved = await resolveTarget(root, targetInput);
  const scanResult = await scanHarness(root);
  let relevantFindings: IntegrityFinding[];
  if (resolved.kind === "feature" || resolved.kind === "work_item") {
    relevantFindings = scanResult.findings.filter((f) => f.path === resolved.relativePath);
  } else {
    const planDir = dirname(resolved.relativePath);
    relevantFindings = scanResult.findings.filter(
      (f) => f.path === resolved.relativePath || f.path.startsWith(planDir + "/")
    );
  }
  const outcome = relevantFindings.some((f) => f.severity === "error") ? "failure" : "success";
  return { outcome, findings: relevantFindings };
}

export async function getWorkflowStatus(root: string, targetInput: string): Promise<WorkflowState> {
  const paths = await repositoryPaths(root);
  const resolved = await resolveTarget(root, targetInput);
  const scanResult = await scanHarness(root);
  const source = await readFile(resolved.path, "utf8");
  const parsed = parseMarkdownDocument(source);
  const findings: string[] = [];
  const nextOperations: string[] = [];
  let relevantScanFindings: IntegrityFinding[];
  if (resolved.kind === "feature" || resolved.kind === "work_item") {
    relevantScanFindings = scanResult.findings.filter((f) => f.path === resolved.relativePath);
  } else {
    const planDir = dirname(resolved.relativePath);
    relevantScanFindings = scanResult.findings.filter(
      (f) => f.path === resolved.relativePath || f.path.startsWith(planDir + "/")
    );
  }
  for (const f of relevantScanFindings) {
    findings.push(`[${f.checkId}] ${f.message}`);
  }

  if (resolved.kind === "feature") {
    const fm = featureSchema.parse(parsed.frontmatter);
    const isApproved = ["approved", "active", "deprecated"].includes(fm.status);
    if (!isApproved) {
      findings.push("Feature is not approved");
    }
    const allDecisions = await loadDecisions(root, paths.decisions);
    const decisionLinks = fm.relationships?.decisions ?? [];
    for (const link of decisionLinks) {
      const targetIdOrName = link.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0]!.trim();
      const decision = allDecisions.find((d) => matchesWikilink(link, d.frontmatter.id, d.path));
      if (!decision) {
        findings.push(`decision dependency ${targetIdOrName} does not resolve`);
      } else if (decision.frontmatter.status !== "approved" && decision.frontmatter.status !== "superseded") {
        findings.push(`decision dependency ${decision.frontmatter.id || targetIdOrName} is not approved`);
      }
    }
    if (fm.status === "draft" || fm.status === "proposed") {
      nextOperations.push(`feature approve ${resolved.relativePath} --approved YYYY-MM-DD --approved-by AUTHORITY`);
      nextOperations.push(`feature rename ${resolved.relativePath} --title TITLE`);
      nextOperations.push(`feature delete ${resolved.relativePath}`);
    } else if (fm.status === "approved" || fm.status === "active") {
      nextOperations.push(`feature request-changes ${resolved.relativePath}`);
      nextOperations.push(`feature deprecate ${resolved.relativePath}`);
      nextOperations.push(`feature rename ${resolved.relativePath} --title TITLE`);
    } else if (fm.status === "deprecated") {
      nextOperations.push(`feature rename ${resolved.relativePath} --title TITLE`);
      nextOperations.push(`feature delete ${resolved.relativePath}`);
    }
    findings.sort();
    nextOperations.sort();
    return {
      targetKind: "feature",
      targetPath: resolved.relativePath,
      title: fm.title,
      reviewState: fm.status,
      findings,
      nextOperations,
    };
  }

  if (resolved.kind === "plan") {
    const fm = planSchema.parse(parsed.frontmatter);
    const reviewState = fm.approval.status;
    const executionState = fm.status;
    if (reviewState !== "approved") {
      findings.push("Plan is not approved");
    }
    const allFeatures = await loadFeatures(root, paths.features);
    const featureLinks = fm.relationships?.features ?? [];
    for (const link of featureLinks) {
      const targetIdOrName = link.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0]!.trim();
      const feature = allFeatures.find((f) => matchesWikilink(link, f.frontmatter.id, f.path));
      if (!feature) {
        findings.push(`governing feature ${targetIdOrName} does not resolve`);
      } else if (!["approved", "active", "deprecated"].includes(feature.frontmatter.status)) {
        findings.push(`governing feature ${feature.frontmatter.id || targetIdOrName} is not approved`);
      }
    }
    const allDecisions = await loadDecisions(root, paths.decisions);
    const decisionLinks = fm.relationships?.decisions ?? [];
    for (const link of decisionLinks) {
      const targetIdOrName = link.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0]!.trim();
      const decision = allDecisions.find((d) => matchesWikilink(link, d.frontmatter.id, d.path));
      if (!decision) {
        findings.push(`decision dependency ${targetIdOrName} does not resolve`);
      } else if (decision.frontmatter.status !== "approved" && decision.frontmatter.status !== "superseded") {
        findings.push(`decision dependency ${decision.frontmatter.id || targetIdOrName} is not approved`);
      }
    }
    const planDir = dirname(resolved.path);
    const workItems = await loadWorkItemsInDir(root, planDir);
    for (const wi of workItems) {
      for (const link of wi.frontmatter.decision_dependencies) {
        const targetIdOrName = link.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0]!.trim();
        const decision = allDecisions.find((d) => matchesWikilink(link, d.frontmatter.id, d.path));
        if (!decision) {
          findings.push(`decision dependency ${targetIdOrName} does not resolve`);
        } else if (decision.frontmatter.status !== "approved" && decision.frontmatter.status !== "superseded") {
          findings.push(`decision dependency ${decision.frontmatter.id || targetIdOrName} is not approved`);
        }
      }
    }
    if (reviewState === "pending" || reviewState === "changes_requested") {
      nextOperations.push(`plan approve ${resolved.relativePath} --decided YYYY-MM-DD`);
      nextOperations.push(`plan request-changes ${resolved.relativePath} --decided YYYY-MM-DD`);
    } else if (reviewState === "approved") {
      nextOperations.push(`plan request-changes ${resolved.relativePath} --decided YYYY-MM-DD`);
      if (executionState === "pending") {
        const sortedWIs = [...workItems].sort((a, b) => a.frontmatter.work_item - b.frontmatter.work_item);
        if (sortedWIs.length > 0) {
          nextOperations.push(`work-item set-status ${sortedWIs[0]!.relativePath} --status in_progress`);
        }
      } else if (executionState === "in_progress") {
        const activeWI = workItems.find((wi) => wi.frontmatter.status === "in_progress" || wi.frontmatter.status === "in-progress");
        if (activeWI) {
          nextOperations.push(`work-item set-status ${activeWI.relativePath} --status completed`);
          nextOperations.push(`work-item set-status ${activeWI.relativePath} --status blocked --reason REASON`);
          nextOperations.push(`work-item set-status ${activeWI.relativePath} --status cancelled --reason REASON`);
        }
      } else if (executionState === "blocked") {
        const blockedWI = workItems.find((wi) => wi.frontmatter.status === "blocked");
        if (blockedWI) {
          nextOperations.push(`work-item set-status ${blockedWI.relativePath} --status in_progress`);
          nextOperations.push(`work-item set-status ${blockedWI.relativePath} --status cancelled --reason REASON`);
        }
      }
    }
    findings.sort();
    nextOperations.sort();
    return {
      targetKind: "plan",
      targetPath: resolved.relativePath,
      title: fm.title,
      reviewState,
      executionState,
      findings,
      nextOperations,
    };
  }

  if (resolved.kind === "work_item") {
    const fm = workItemSchema.parse(parsed.frontmatter);
    const executionState = fm.status;
    const planDir = dirname(resolved.path);
    const planPath = join(planDir, "plan.md");
    if (!(await exists(planPath))) {
      findings.push("Plan is not approved");
    } else {
      const planDoc = parseMarkdownDocument(await readFile(planPath, "utf8"));
      const planFM = planSchema.parse(planDoc.frontmatter);
      if (planFM.approval.status !== "approved") {
        findings.push("Plan is not approved");
      }
    }
    const workItems = await loadWorkItemsInDir(root, planDir);
    for (const dep of fm.dependencies) {
      const pred = workItems.find((wi) => wi.frontmatter.work_item === dep);
      if (!pred) {
        findings.push(`missing predecessor Work Item ${dep}`);
      } else if (pred.frontmatter.status !== "completed") {
        findings.push(`predecessor Work Item ${dep} is not completed`);
      }
    }
    const allDecisions = await loadDecisions(root, paths.decisions);
    for (const link of fm.decision_dependencies) {
      const targetIdOrName = link.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0]!.trim();
      const decision = allDecisions.find((d) => matchesWikilink(link, d.frontmatter.id, d.path));
      if (!decision) {
        findings.push(`decision dependency ${targetIdOrName} does not resolve`);
      } else if (decision.frontmatter.status !== "approved" && decision.frontmatter.status !== "superseded") {
        findings.push(`decision dependency ${decision.frontmatter.id || targetIdOrName} is not approved`);
      }
    }
    const hasBlockers = findings.length > 0;
    if (!hasBlockers && executionState === "pending") {
      nextOperations.push(`work-item set-status ${resolved.relativePath} --status in_progress`);
    } else if (executionState === "in_progress" || executionState === "in-progress") {
      nextOperations.push(`work-item set-status ${resolved.relativePath} --status completed`);
      nextOperations.push(`work-item set-status ${resolved.relativePath} --status blocked --reason REASON`);
      nextOperations.push(`work-item set-status ${resolved.relativePath} --status cancelled --reason REASON`);
    } else if (executionState === "blocked") {
      nextOperations.push(`work-item set-status ${resolved.relativePath} --status in_progress`);
      nextOperations.push(`work-item set-status ${resolved.relativePath} --status cancelled --reason REASON`);
    }
    findings.sort();
    nextOperations.sort();
    return {
      targetKind: "work_item",
      targetPath: resolved.relativePath,
      title: fm.title,
      executionState,
      findings,
      nextOperations,
    };
  }
  throw new HarnessError(`Unsupported target kind`, "invalid");
}

interface ScannedDecision {
  path: string;
  frontmatter: Extract<ArtifactFrontmatter, { type: "decision" }>;
}

async function loadDecisions(root: string, directory: string): Promise<ScannedDecision[]> {
  if (!(await exists(directory))) return [];
  const results: ScannedDecision[] = [];
  for (const name of (await readdir(directory)).filter((entry) => entry.endsWith(".md")).sort()) {
    const path = join(directory, name);
    try {
      const source = await readFile(path, "utf8");
      const parsed = parseMarkdownDocument(source);
      const fm = artifactSchema.parse(parsed.frontmatter);
      if (fm.type === "decision") {
        results.push({ path, frontmatter: fm });
      }
    } catch {
      // Ignore
    }
  }
  return results;
}

interface LoadedWorkItem {
  path: string;
  relativePath: string;
  frontmatter: z.infer<typeof workItemSchema>;
}

async function loadWorkItemsInDir(root: string, directory: string): Promise<LoadedWorkItem[]> {
  const results: LoadedWorkItem[] = [];
  for (const name of (await readdir(directory)).filter((entry) => entry.endsWith(".md")).sort()) {
    if (name === "plan.md" || name === "design.md") continue;
    const path = join(directory, name);
    try {
      const source = await readFile(path, "utf8");
      const parsed = parseMarkdownDocument(source);
      if ("work_item" in parsed.frontmatter) {
        const fm = workItemSchema.parse(parsed.frontmatter);
        results.push({
          path,
          relativePath: relative(root, path).replace(/\\/g, "/"),
          frontmatter: fm,
        });
      }
    } catch {
      // Ignore
    }
  }
  return results;
}

function matchesWikilink(link: string, id: string | undefined, path: string): boolean {
  const content = link.replace(/^\[\[/, "").replace(/\]\]$/, "");
  const target = content.split("|")[0]!.trim();
  if (id && target === id) return true;
  if (basename(path, ".md") === target) return true;
  return false;
}

export interface TransitionResult {
  targetKind: "plan" | "work_item";
  targetPath: string;
  oldState: string;
  newState: string;
  affected: string[];
  blockers: string[];
  nextOperations: string[];
}

function extractH2Section(body: string, title: string): string {
  const lines = body.split(/\r?\n/);
  let inSection = false;
  const sectionLines: string[] = [];
  const headerRegex = new RegExp(`^##\\s+${escapeRegExp(title)}\\s*$`, "i");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      if (inSection) {
        break;
      }
      if (headerRegex.test(trimmed)) {
        inSection = true;
        continue;
      }
    }
    if (inSection) {
      sectionLines.push(line);
    }
  }
  return sectionLines.join("\n");
}

function verifyCheckboxes(sectionText: string): string[] {
  const cleanText = sectionText.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, "");
  const lines = cleanText.split("\n");
  const blockers: string[] = [];
  const checkboxRegex = /^\s*[-*+]\s*\[\s*([xX ]?)\s*\]/i;
  for (const line of lines) {
    const match = checkboxRegex.exec(line);
    if (match) {
      const content = match[1]?.trim() ?? "";
      if (content === "") {
        blockers.push(`unchecked checkbox: ${line.trim()}`);
      }
    }
  }
  return blockers;
}

export function verifyWorkItemCheckboxes(body: string): string[] {
  const tasksSection = extractH2Section(body, "Tasks");
  const successSection = extractH2Section(body, "Success criteria");

  const tasksBlockers = verifyCheckboxes(tasksSection);
  const successBlockers = verifyCheckboxes(successSection);

  return [...tasksBlockers, ...successBlockers];
}

interface ScannedReport {
  path: string;
  frontmatter: Extract<ArtifactFrontmatter, { type: "report" }>;
}

async function loadReports(root: string, directory: string): Promise<ScannedReport[]> {
  if (!(await exists(directory))) return [];
  const results: ScannedReport[] = [];
  for (const name of (await readdir(directory)).filter((entry) => entry.endsWith(".md")).sort()) {
    const path = join(directory, name);
    try {
      const source = await readFile(path, "utf8");
      const parsed = parseMarkdownDocument(source);
      const fm = artifactSchema.parse(parsed.frontmatter);
      if (fm.type === "report") {
        results.push({ path, frontmatter: fm });
      }
    } catch {
      // Ignore
    }
  }
  return results;
}

function calculateWorkItemNextOperations(relativePath: string, status: string, hasBlockers = false): string[] {
  const nextOperations: string[] = [];
  if (!hasBlockers && status === "pending") {
    nextOperations.push(`work-item set-status ${relativePath} --status in_progress`);
  } else if (status === "in_progress") {
    nextOperations.push(`work-item set-status ${relativePath} --status completed`);
    nextOperations.push(`work-item set-status ${relativePath} --status blocked --reason REASON`);
    nextOperations.push(`work-item set-status ${relativePath} --status cancelled --reason REASON`);
  } else if (status === "blocked") {
    nextOperations.push(`work-item set-status ${relativePath} --status in_progress`);
    nextOperations.push(`work-item set-status ${relativePath} --status cancelled --reason REASON`);
  }
  return nextOperations.sort();
}

function calculatePlanNextOperations(
  relativePath: string,
  status: string,
  approvalStatus: string,
  workItems: LoadedWorkItem[]
): string[] {
  const nextOperations: string[] = [];

  if (approvalStatus === "pending" || approvalStatus === "changes_requested") {
    nextOperations.push(`plan approve ${relativePath} --decided YYYY-MM-DD`);
    nextOperations.push(`plan request-changes ${relativePath} --decided YYYY-MM-DD`);
  } else if (approvalStatus === "approved") {
    nextOperations.push(`plan request-changes ${relativePath} --decided YYYY-MM-DD`);
    if (status === "pending") {
      const sortedWIs = [...workItems].sort((a, b) => a.frontmatter.work_item - b.frontmatter.work_item);
      if (sortedWIs.length > 0) {
        nextOperations.push(`work-item set-status ${sortedWIs[0]!.relativePath} --status in_progress`);
      }
    } else if (status === "in_progress") {
      const activeWI = workItems.find((wi) => wi.frontmatter.status === "in_progress" || wi.frontmatter.status === "in-progress");
      if (activeWI) {
        nextOperations.push(`work-item set-status ${activeWI.relativePath} --status completed`);
        nextOperations.push(`work-item set-status ${activeWI.relativePath} --status blocked --reason REASON`);
        nextOperations.push(`work-item set-status ${activeWI.relativePath} --status cancelled --reason REASON`);
      }
    } else if (status === "blocked") {
      const blockedWI = workItems.find((wi) => wi.frontmatter.status === "blocked");
      if (blockedWI) {
        nextOperations.push(`work-item set-status ${blockedWI.relativePath} --status in_progress`);
        nextOperations.push(`work-item set-status ${blockedWI.relativePath} --status cancelled --reason REASON`);
      }
    }
  }

  return nextOperations.sort();
}

export async function setWorkItemStatus(
  root: string,
  targetInput: string,
  statusInput: string,
  reasonInput?: string
): Promise<TransitionResult> {
  const paths = await repositoryPaths(root);
  const resolved = await resolveWorkItemPath(root, paths, targetInput);
  const relativePath = relative(root, resolved).replace(/\\/g, "/");

  let newStatus = statusInput.trim().toLowerCase();
  if (newStatus === "in-progress") {
    newStatus = "in_progress";
  }

  const allowedStatuses = ["pending", "in_progress", "completed", "blocked", "cancelled"];
  if (!allowedStatuses.includes(newStatus)) {
    throw new HarnessError(`Unsupported status: ${statusInput}`, "usage");
  }

  const source = await readFile(resolved, "utf8");
  const doc = parseMarkdownDocument(source);
  const fm = workItemSchema.parse(doc.frontmatter);
  const oldStatus = fm.status;

  const allowedTransitions: Record<string, string[]> = {
    pending: ["in_progress", "cancelled"],
    in_progress: ["completed", "blocked", "cancelled"],
    blocked: ["in_progress", "cancelled"],
    cancelled: [],
    completed: []
  };

  if (oldStatus === newStatus) {
    const nextOps = calculateWorkItemNextOperations(relativePath, newStatus);
    return {
      targetKind: "work_item",
      targetPath: relativePath,
      oldState: oldStatus,
      newState: newStatus,
      affected: [],
      blockers: [],
      nextOperations: nextOps
    };
  }

  if (!allowedTransitions[oldStatus]?.includes(newStatus)) {
    throw new HarnessError(`Invalid status transition from ${oldStatus} to ${newStatus}`, "precondition", [
      `cannot transition Work Item from ${oldStatus} to ${newStatus}`
    ]);
  }

  if (["blocked", "cancelled"].includes(newStatus)) {
    if (!reasonInput || !reasonInput.trim()) {
      throw new HarnessError(`status reason is required for ${newStatus} status`, "precondition", [
        `status reason is required for ${newStatus} status`
      ]);
    }
  }

  const changes: FileMutation[] = [];
  const blockers: string[] = [];

  const planDir = dirname(resolved);
  const planPath = join(planDir, "plan.md");

  let planDoc: ReturnType<typeof parseMarkdownDocument> | undefined = undefined;
  let planFM: z.infer<typeof planSchema> | undefined = undefined;
  if (!(await exists(planPath))) {
    blockers.push("Plan is not approved");
  } else {
    const planSource = await readFile(planPath, "utf8");
    planDoc = parseMarkdownDocument(planSource);
    planFM = planSchema.parse(planDoc.frontmatter);
    if (planFM.approval.status !== "approved") {
      blockers.push("Plan is not approved");
    }
  }

  const siblingWorkItems = await loadWorkItemsInDir(root, planDir);

  if (newStatus === "in_progress") {
    for (const dep of fm.dependencies) {
      const pred = siblingWorkItems.find((wi) => wi.frontmatter.work_item === dep);
      if (!pred) {
        blockers.push(`missing predecessor Work Item ${dep}`);
      } else if (pred.frontmatter.status !== "completed") {
        blockers.push(`predecessor Work Item ${dep} is not completed`);
      }
    }

    const allDecisions = await loadDecisions(root, paths.decisions);
    for (const link of fm.decision_dependencies) {
      const targetIdOrName = link.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0]!.trim();
      const decision = allDecisions.find((d) => matchesWikilink(link, d.frontmatter.id, d.path));
      if (!decision) {
        blockers.push(`decision dependency ${targetIdOrName} does not resolve`);
      } else if (decision.frontmatter.status !== "approved" && decision.frontmatter.status !== "superseded") {
        blockers.push(`decision dependency ${decision.frontmatter.id || targetIdOrName} is not approved`);
      }
    }

    const activeWI = siblingWorkItems.find(
      (wi) => wi.relativePath !== relativePath &&
              (wi.frontmatter.status === "in_progress" || wi.frontmatter.status === "in-progress")
    );
    if (activeWI) {
      blockers.push(`more than one Harness Work Item is in progress: ${activeWI.relativePath}`);
    }
  }

  if (newStatus === "completed") {
    const cbBlockers = verifyWorkItemCheckboxes(doc.body);
    blockers.push(...cbBlockers);

    for (const dep of fm.dependencies) {
      const pred = siblingWorkItems.find((wi) => wi.frontmatter.work_item === dep);
      if (!pred) {
        blockers.push(`missing predecessor Work Item ${dep}`);
      } else if (pred.frontmatter.status !== "completed") {
        blockers.push(`predecessor Work Item ${dep} is not completed`);
      }
    }
  }

  if (blockers.length > 0) {
    throw new HarnessError(`status transition to ${newStatus} was rejected`, "precondition", blockers.sort());
  }

  const updatedFM = { ...fm, status: newStatus as z.infer<typeof workItemSchema>["status"] };
  if (["in_progress", "completed"].includes(newStatus)) {
    delete updatedFM.status_reason;
  } else if (["blocked", "cancelled"].includes(newStatus)) {
    updatedFM.status_reason = reasonInput;
  }

  const updatedContent = serializeMarkdownDocument({
    frontmatter: workItemSchema.parse(updatedFM),
    body: doc.body
  });

  changes.push({ path: resolved, content: updatedContent });

  let planChanged = false;
  let newPlanFM: z.infer<typeof planSchema> | undefined = undefined;
  if (newStatus === "in_progress" && planFM) {
    const isFirstWorkItem = fm.work_item === 1;
    const fromBlocked = oldStatus === "blocked";

    if ((isFirstWorkItem && ["pending", "blocked"].includes(planFM.status)) ||
        (fromBlocked && planFM.status === "blocked")) {
      newPlanFM = { ...planFM, status: "in_progress" };
      delete newPlanFM.status_reason;
      planChanged = true;
    }
  }

  if (planChanged && planDoc && newPlanFM) {
    const updatedPlanContent = serializeMarkdownDocument({
      frontmatter: planSchema.parse(newPlanFM),
      body: planDoc.body
    });
    changes.push({ path: planPath, content: updatedPlanContent });
  }

  await applyMutation(paths.root, changes, (overlay) => {
    if (overlay.get(planPath) !== undefined) {
      const parsedStaged = parseMarkdownDocument(overlay.get(planPath)!);
      planSchema.parse(parsedStaged.frontmatter);
    }
    if (overlay.get(resolved) !== undefined) {
      const parsedStaged = parseMarkdownDocument(overlay.get(resolved)!);
      workItemSchema.parse(parsedStaged.frontmatter);
    }
  });

  const nextOps = calculateWorkItemNextOperations(relativePath, newStatus);

  return {
    targetKind: "work_item",
    targetPath: relativePath,
    oldState: oldStatus,
    newState: newStatus,
    affected: changes.map((c) => relative(root, c.path).replace(/\\/g, "/")),
    blockers: [],
    nextOperations: nextOps
  };
}

export async function setPlanStatus(
  root: string,
  targetInput: string,
  statusInput: string,
  reasonInput?: string
): Promise<TransitionResult> {
  const paths = await repositoryPaths(root);
  const resolved = await resolvePlanPath(root, paths, targetInput);
  const relativePath = relative(root, resolved).replace(/\\/g, "/");

  let newStatus = statusInput.trim().toLowerCase();
  if (newStatus === "in-progress") {
    newStatus = "in_progress";
  }

  const allowedStatuses = ["pending", "in_progress", "completed", "blocked", "cancelled"];
  if (!allowedStatuses.includes(newStatus)) {
    throw new HarnessError(`Unsupported status: ${statusInput}`, "usage");
  }

  const source = await readFile(resolved, "utf8");
  const doc = parseMarkdownDocument(source);
  const fm = planSchema.parse(doc.frontmatter);
  const oldStatus = fm.status;

  const allowedTransitions: Record<string, string[]> = {
    pending: ["in_progress", "blocked", "cancelled"],
    in_progress: ["completed", "blocked", "cancelled"],
    blocked: ["in_progress", "cancelled"],
    cancelled: [],
    completed: []
  };

  if (oldStatus === newStatus) {
    const planDir = dirname(resolved);
    const workItems = await loadWorkItemsInDir(root, planDir);
    const nextOps = calculatePlanNextOperations(relativePath, newStatus, fm.approval.status, workItems);
    return {
      targetKind: "plan",
      targetPath: relativePath,
      oldState: oldStatus,
      newState: newStatus,
      affected: [],
      blockers: [],
      nextOperations: nextOps
    };
  }

  if (!allowedTransitions[oldStatus]?.includes(newStatus)) {
    throw new HarnessError(`cannot transition Plan from ${oldStatus} to ${newStatus}`, "precondition", [
      `cannot transition Plan from ${oldStatus} to ${newStatus}`
    ]);
  }

  if (["blocked", "cancelled"].includes(newStatus)) {
    if (!reasonInput || !reasonInput.trim()) {
      throw new HarnessError(`status reason is required for ${newStatus} status`, "precondition", [
        `status reason is required for ${newStatus} status`
      ]);
    }
  }

  const blockers: string[] = [];
  const planDir = dirname(resolved);
  const workItems = await loadWorkItemsInDir(root, planDir);

  if (newStatus === "in_progress") {
    if (fm.approval.status !== "approved") {
      blockers.push("Plan is not approved");
    }
    const hasActiveOrCompleted = workItems.some(
      (wi) => ["in_progress", "in-progress", "completed", "blocked"].includes(wi.frontmatter.status)
    );
    if (!hasActiveOrCompleted) {
      blockers.push("Plan has no active or completed Work Items");
    }
  }

  if (newStatus === "completed") {
    if (workItems.length === 0) {
      blockers.push("Plan has no Work Items");
    } else {
      const allCompleted = workItems.every((wi) => wi.frontmatter.status === "completed");
      if (!allCompleted) {
        blockers.push("completed Plan has a required Work Item that is not completed");
      }
    }

    const reports = new Map<string, ArtifactFrontmatter>();
    const allReports = await loadReports(root, paths.reports);
    for (const report of allReports) {
      reports.set(basename(report.path, ".md"), report.frontmatter);
    }

    const linkedReports = fm.relationships.reports
      .map((link) => link.slice(2, -2).split("|", 1)[0]!)
      .map((target) => reports.get(target));

    if (!linkedReports.some((report) => report?.status === "completed")) {
      blockers.push("completed Plan has no linked completed Delivery Report");
    }
  }

  if (blockers.length > 0) {
    throw new HarnessError(`status transition to ${newStatus} was rejected`, "precondition", blockers.sort());
  }

  const updatedFM = { ...fm, status: newStatus as z.infer<typeof planSchema>["status"] };
  if (["in_progress", "completed"].includes(newStatus)) {
    delete updatedFM.status_reason;
  } else if (["blocked", "cancelled"].includes(newStatus)) {
    updatedFM.status_reason = reasonInput;
  }

  const updatedContent = serializeMarkdownDocument({
    frontmatter: planSchema.parse(updatedFM),
    body: doc.body
  });

  const changes = [{ path: resolved, content: updatedContent }];

  await applyMutation(paths.root, changes, (overlay) => {
    const rootContent = overlay.get(resolved);
    if (rootContent !== undefined) {
      const parsedStaged = parseMarkdownDocument(rootContent);
      planSchema.parse(parsedStaged.frontmatter);
    }
  });

  const nextOps = calculatePlanNextOperations(relativePath, newStatus, fm.approval.status, workItems);

  return {
    targetKind: "plan",
    targetPath: relativePath,
    oldState: oldStatus,
    newState: newStatus,
    affected: changes.map((c) => relative(root, c.path).replace(/\\/g, "/")),
    blockers: [],
    nextOperations: nextOps
  };
}
