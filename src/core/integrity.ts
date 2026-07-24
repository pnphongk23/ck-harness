import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { assertContained, listMarkdown, repositoryPaths, type RepositoryPaths } from "../fs/repository.js";
import { validateArtifactFilename, type ArtifactFrontmatter, type HarnessFrontmatter } from "./schemas/artifacts.js";
import { validateFeatureContent } from "./schemas/content.js";
import { parseMarkdownDocument } from "./schemas/frontmatter.js";
import { parse } from "yaml";

export type IntegritySeverity = "error" | "warning";
export type IntegrityOutcome = "success" | "failure";

export interface IntegrityFinding {
  severity: IntegritySeverity;
  checkId: string;
  path: string;
  message: string;
  contract: string;
  remediation?: string;
}

export interface IntegrityResult {
  outcome: IntegrityOutcome;
  findings: readonly IntegrityFinding[];
}

export interface IndexCheckResult extends IntegrityResult {
  expected: string;
}

export interface IndexCounters {
  next_feature_sequence: number;
  next_decision_sequence: number;
  next_report_sequence: number;
  next_rule_sequence: number;
}

export interface DoctorResult extends IntegrityResult {}
export interface DoctorOptions { path?: string; }

export type IntegrityArtifactScope = "feature" | "spec" | "decision" | "report" | "rule" | "plan";
export interface IntegrityScope { path?: string; kind?: IntegrityArtifactScope; }
export interface IntegrityScanOptions { requireIndex?: boolean; }

interface ScannedDocument {
  path: string;
  relativePath: string;
  linkTargets: readonly string[];
  frontmatter: HarnessFrontmatter;
  body: string;
}

type LinkResolution =
  | { kind: "resolved"; target: ScannedDocument }
  | { kind: "broken" }
  | { kind: "ambiguous"; candidates: readonly ScannedDocument[] };

type PlanFrontmatter = HarnessFrontmatter & {
  approval: { status: "pending" | "changes_requested" | "approved" };
  relationships: ArtifactFrontmatter["relationships"];
};
type WorkItemFrontmatter = HarnessFrontmatter & {
  work_item: number;
  dependencies: readonly number[];
  decision_dependencies: readonly string[];
};

const artifactDirectories = ["features", "specs", "decisions", "reports", "rules"] as const;

/**
 * Read and validate canonical Harness artifacts without modifying repository
 * state. The result is deliberately independent from lifecycle mutations so it
 * can be reused by later CLI, index, and health commands.
 */
export async function scanHarness(
  root: string,
  scope: IntegrityScope = {},
  options: IntegrityScanOptions = {},
): Promise<IntegrityResult> {
  const paths = await repositoryPaths(root);
  const findings: IntegrityFinding[] = [];

  if (options.requireIndex !== false && !(await exists(paths.index))) {
    return result([finding("repository.index.missing", paths.relative.index, "Harness index is missing", "Repository Contract", "run `harness init` in the intended repository")]);
  }

  const documents: ScannedDocument[] = [];
  const planMarkdown = await listMarkdown(paths.plans);
  const planDesigns = planMarkdown.filter((path) => isPlanLocalDesign(paths, path));
  const files = [
    ...(await Promise.all(artifactDirectories.map((directory) => listMarkdown(paths[directory]))).then((groups) => groups.flat())),
    ...planMarkdown.filter((path) => !isPlanLocalDesign(paths, path)),
  ].sort((left, right) => left.localeCompare(right));

  for (const path of files) {
    const relativePath = toRepositoryPath(paths.root, path);
    try {
      const parsed = parseMarkdownDocument(await readFile(path, "utf8"));
      const document: ScannedDocument = {
        path,
        relativePath,
        linkTargets: targetsFor(paths, path),
        frontmatter: parsed.frontmatter,
        body: parsed.body,
      };
      documents.push(document);
      findings.push(...await documentFindings(paths.root, document));
    } catch (error) {
      findings.push(finding(
        "document.parse",
        relativePath,
        error instanceof Error ? error.message : String(error),
        "Workflow Artifact Contract",
        "repair the Markdown frontmatter and its required lifecycle provenance",
      ));
    }
  }

  findings.push(...relationshipFindings(documents));
  findings.push(...identityFindings(documents));
  findings.push(...workItemDecisionFindings(documents));
  findings.push(...planLifecycleFindings(documents, paths));
  findings.push(...planDesignFindings(paths, documents, planDesigns));
  if (scope.path === undefined && scope.kind === undefined) return result(findings);
  const selected = await selectScope(paths, documents, scope);
  if (selected instanceof Set) return result(findings.filter((entry) => selected.has(entry.path)));
  return result([selected]);
}

/**
 * Render the complete derived index in memory.  Its digest entries make a
 * valid authored-document change observable without putting a write path in
 * the integrity capability.
 */
export async function renderExpectedIndex(root: string, counters: IndexCounters = defaultIndexCounters()): Promise<string> {
  const paths = await repositoryPaths(root);
  const files = await canonicalFiles(paths);
  const documents = await Promise.all(files.map(async (path): Promise<ScannedDocument> => {
    const content = await readFile(path, "utf8");
    const parsed = parseMarkdownDocument(content);
    return {
      path,
      relativePath: toRepositoryPath(paths.root, path),
      linkTargets: targetsFor(paths, path),
      frontmatter: parsed.frontmatter,
      body: parsed.body,
    };
  }));
  const destinations = relationshipCandidates(documents);

  const catalog = documents.map((document) => indexLink(paths.harness, document));
  const forward: string[] = [];
  const backlinks: string[] = [];
  const unresolved: string[] = [];
  for (const source of documents) {
    if (!hasRelationships(source.frontmatter)) continue;
    for (const link of relationshipLinks(source.frontmatter)) {
      const resolution = resolveRelationship(destinations, link);
      if (resolution.kind === "resolved") {
        forward.push(`${indexLink(paths.harness, source)} → ${indexLink(paths.harness, resolution.target)}`);
        backlinks.push(`${indexLink(paths.harness, resolution.target)} ← ${indexLink(paths.harness, source)}`);
      } else if (resolution.kind === "broken") {
        unresolved.push(`${source.relativePath} → \`${link}\` broken`);
      } else {
        const pathsList = resolution.candidates.map((candidate) => candidate.relativePath).join(", ");
        unresolved.push(`${source.relativePath} → \`${link}\` ambiguous: ${pathsList}`);
      }
    }
  }
  const digests = await Promise.all(files.map(async (path) => {
    const content = await readFile(path, "utf8");
    return `${toRepositoryPath(paths.root, path)} ${createHash("sha256").update(content).digest("hex")}`;
  }));

  const section = (heading: string, entries: readonly string[]): string =>
    `## ${heading}\n${entries.length ? [...entries].sort((left, right) => left.localeCompare(right)).map((entry) => `- ${entry}`).join("\n") : "- None."}`;
  return [
    "---",
    "schema_version: 1",
    `next_feature_sequence: ${counters.next_feature_sequence}`,
    `next_decision_sequence: ${counters.next_decision_sequence}`,
    `next_report_sequence: ${counters.next_report_sequence}`,
    `next_rule_sequence: ${counters.next_rule_sequence}`,
    "generated: true",
    "---",
    "",
    "# Harness Index",
    "",
    "## Core Documentation",
    `- [Workflow Router](${relative(paths.harness, paths.workflows).replace(/\\/g, "/")}/README.md)`,
    "- [Repository Contract](README.md)",
    "",
    section("Catalog", catalog),
    "",
    section("Forward relationships", forward),
    "",
    section("Backlinks", backlinks),
    "",
    section("Unresolved relationships", unresolved),
    "",
    section("Canonical document digests", digests),
    "",
  ].join("\n");
}

function indexLink(harness: string, document: ScannedDocument): string {
  const destination = relative(harness, document.path).replace(/\\/g, "/");
  return `[${document.relativePath}](${destination})`;
}

/** Read-only CI gate for the persisted, CLI-owned index. */
export async function checkIndex(root: string): Promise<IndexCheckResult> {
  const paths = await repositoryPaths(root);
  if (!(await exists(paths.index))) {
    return indexResult([finding("index.missing", paths.relative.index, "persisted Harness index is missing", "FR-003", "run `harness init` in the intended repository")], "");
  }

  const canonical = await scanHarness(paths.root);
  if (canonical.outcome === "failure") return indexResult(canonical.findings, "");

  let persisted: string;
  let counters: IndexCounters;
  try {
    persisted = await readFile(paths.index, "utf8");
    const frontmatter = indexFrontmatter(persisted);
    if (frontmatter.schema_version !== 1 || frontmatter.generated !== true) throw new Error("index frontmatter must declare schema_version: 1 and generated: true");
    counters = indexCounters(frontmatter);
  } catch (error) {
    return indexResult([finding("index.malformed", paths.relative.index, error instanceof Error ? error.message : String(error), "R-020", "restore a CLI-generated index before running this correctness gate")], "");
  }

  const expected = await renderExpectedIndex(paths.root, counters);
  if (persisted !== expected) {
    return indexResult([finding("index.stale", paths.relative.index, "persisted index differs from the deterministic canonical rendering", "FR-003", "repair the index through the documented index-publication workflow; `index check` never repairs it")], expected);
  }
  return indexResult([], expected);
}

/** Compose required Harness prerequisites and optional local capabilities without invoking them. */
export async function diagnoseHarness(root: string, options: DoctorOptions = {}): Promise<DoctorResult> {
  const paths = await repositoryPaths(root);
  const findings: IntegrityFinding[] = [];
  const nodeMajor = Number.parseInt(process.versions.node.split(".", 1)[0] ?? "0", 10);
  if (!Number.isFinite(nodeMajor) || nodeMajor < 20) {
    findings.push(finding("doctor.node.unsupported", "package.json", `Node ${process.versions.node} is unsupported; Node 20 or newer is required`, "package.json", "install a supported Node.js version before running Harness commands"));
  }
  const workflowsRelative = paths.relative.workflows;
  for (const filename of ["README.md", "cook.md"]) {
    const absPath = join(paths.workflows, filename);
    const relPath = `${workflowsRelative}/${filename}`;
    if (!(await exists(absPath))) {
      findings.push(finding("doctor.workflow.missing", relPath, "required canonical Harness source is missing", "FR-004", "restore the canonical Harness source from the repository contract"));
    }
  }
  findings.push(...(await checkIndex(paths.root)).findings);
  return result(findings);
}

async function canonicalFiles(paths: RepositoryPaths): Promise<string[]> {
  const planMarkdown = await listMarkdown(paths.plans);
  return [
    ...(await Promise.all(artifactDirectories.map((directory) => listMarkdown(paths[directory]))).then((groups) => groups.flat())),
    ...planMarkdown.filter((path) => !isPlanLocalDesign(paths, path)),
  ].sort((left, right) => left.localeCompare(right));
}

export function indexFrontmatter(source: string): Record<string, unknown> {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  if (lines[0] !== "---") throw new Error("missing opening frontmatter delimiter");
  const closing = lines.indexOf("---", 1);
  if (closing < 0) throw new Error("missing closing frontmatter delimiter");
  const value = parse(lines.slice(1, closing).join("\n"));
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("index frontmatter must be a mapping");
  return value as Record<string, unknown>;
}

export function defaultIndexCounters(): IndexCounters {
  return { next_feature_sequence: 1, next_decision_sequence: 1, next_report_sequence: 1, next_rule_sequence: 1 };
}

export async function derivedIndexCounters(root: string): Promise<IndexCounters> {
  const paths = await repositoryPaths(root);
  const counters = defaultIndexCounters();
  const files = await Promise.all(artifactDirectories.map((directory) => listMarkdown(join(paths.harness, directory))));
  for (const path of files.flat()) {
    try {
      const { frontmatter } = parseMarkdownDocument(await readFile(path, "utf8"));
      if (!isArtifact(frontmatter) || !("id" in frontmatter)) continue;
      const sequence = Number.parseInt(frontmatter.id.slice(frontmatter.id.indexOf("-") + 1), 10) + 1;
      if (frontmatter.type === "feature") counters.next_feature_sequence = Math.max(counters.next_feature_sequence, sequence);
      if (frontmatter.type === "decision") counters.next_decision_sequence = Math.max(counters.next_decision_sequence, sequence);
      if (frontmatter.type === "report") counters.next_report_sequence = Math.max(counters.next_report_sequence, sequence);
      if (frontmatter.type === "rule") counters.next_rule_sequence = Math.max(counters.next_rule_sequence, sequence);
    } catch {
      // The canonical scan reports invalid documents before callers use these counters.
    }
  }
  return counters;
}

export function indexCounters(frontmatter: Record<string, unknown>): IndexCounters {
  const counters = defaultIndexCounters();
  for (const key of Object.keys(counters) as (keyof IndexCounters)[]) {
    const value = frontmatter[key];
    if (value === undefined) continue;
    if (!Number.isInteger(value) || (value as number) < 1) throw new Error(`invalid index counter: ${key}`);
    counters[key] = value as number;
  }
  return counters;
}

function indexResult(findings: readonly IntegrityFinding[], expected: string): IndexCheckResult {
  const base = result(findings);
  return { ...base, expected };
}

async function selectScope(paths: RepositoryPaths, documents: readonly ScannedDocument[], scope: IntegrityScope): Promise<Set<string> | IntegrityFinding> {
  const root = paths.root;
  if (scope.path !== undefined) {
    let target: string;
    try {
      target = await assertContained(root, resolve(root, scope.path));
    } catch (error) {
      return finding("scope.path.invalid", scope.path, error instanceof Error ? error.message : String(error), "FR-001", "provide a repository-local supported document path");
    }
    if (!(await exists(target))) return finding("scope.path.missing", toRepositoryPath(root, target), "requested validation path does not exist", "FR-001", "provide an existing supported Harness document");
    const document = documents.find((entry) => entry.path === target);
    return document ? new Set([document.relativePath]) : finding("scope.path.unsupported", toRepositoryPath(root, target), "requested path is not a supported Harness document", "FR-001", `select an artifact or Plan document under ${paths.relative.harness}`);
  }
  if (scope.kind !== undefined) {
    const selected = documents.filter((document) => scope.kind === "plan"
      ? document.relativePath.startsWith(paths.relative.plans + "/")
      : isArtifact(document.frontmatter) && document.frontmatter.type === scope.kind,
    );
    return new Set(selected.map((document) => document.relativePath));
  }
  return new Set(documents.map((document) => document.relativePath));
}

async function documentFindings(root: string, document: ScannedDocument): Promise<IntegrityFinding[]> {
  const findings: IntegrityFinding[] = [];
  if (isArtifact(document.frontmatter)) {
    for (const message of validateArtifactFilename(basename(document.path), document.frontmatter)) {
      findings.push(finding("artifact.filename", document.relativePath, message, "R-005", "rename the file or correct its immutable frontmatter ID"));
    }
    if (document.frontmatter.type === "feature") {
      for (const message of validateFeatureContent(document.body)) {
        findings.push(finding("feature.content", document.relativePath, message, "R-008", "restore the required Feature business contract"));
      }
    }
  }

  if (hasRelationships(document.frontmatter)) {
    for (const sourcePath of document.frontmatter.relationships.source_paths) {
      if (!(await exists(join(root, sourcePath)))) {
        findings.push(finding("relationships.source-path", document.relativePath, `unresolved source path: ${sourcePath}`, "R-023", "restore the repository-local source path or remove the stale evidence"));
      }
    }
  }
  return findings;
}

function relationshipFindings(documents: readonly ScannedDocument[]): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  const targets = relationshipCandidates(documents);

  for (const document of documents) {
    if (!hasRelationships(document.frontmatter)) continue;
    for (const link of relationshipLinks(document.frontmatter)) {
      const resolution = resolveRelationship(targets, link);
      if (resolution.kind === "broken") {
        findings.push(finding("relationships.wikilink", document.relativePath, `unresolved wikilink: ${link}`, "R-011", "create the target or correct the wikilink"));
      } else if (resolution.kind === "ambiguous") {
        const candidates = resolution.candidates.map((candidate) => candidate.relativePath).join(", ");
        findings.push(finding("relationships.wikilink.ambiguous", document.relativePath, `ambiguous wikilink: ${link} resolves to ${candidates}`, "R-011", "rename or remove duplicate targets so the exact target is unique"));
      }
    }
  }
  return findings;
}

function relationshipCandidates(documents: readonly ScannedDocument[]): Map<string, ScannedDocument[]> {
  const targets = new Map<string, ScannedDocument[]>();
  for (const document of documents) {
    for (const target of document.linkTargets) {
      const existing = targets.get(target);
      if (existing) existing.push(document);
      else targets.set(target, [document]);
    }
  }
  for (const candidates of targets.values()) {
    candidates.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  }
  return targets;
}

function resolveRelationship(candidates: ReadonlyMap<string, readonly ScannedDocument[]>, link: string): LinkResolution {
  const target = link.slice(2, -2).split("|", 1)[0]!;
  const matches = candidates.get(target) ?? [];
  if (matches.length === 0) return { kind: "broken" };
  if (matches.length === 1) return { kind: "resolved", target: matches[0]! };
  return { kind: "ambiguous", candidates: matches };
}

function identityFindings(documents: readonly ScannedDocument[]): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  const owners = new Map<string, ScannedDocument>();
  for (const document of documents) {
    if (!isArtifact(document.frontmatter) || !("id" in document.frontmatter)) continue;
    const key = `${document.frontmatter.type}:${document.frontmatter.id}`;
    const existing = owners.get(key);
    if (existing) {
      findings.push(finding("artifact.id.duplicate", document.relativePath, `duplicate ${document.frontmatter.id}; first declared by ${existing.relativePath}`, "R-004", "allocate a new immutable ID or remove the duplicate artifact"));
    } else owners.set(key, document);
  }
  return findings;
}

function workItemDecisionFindings(documents: readonly ScannedDocument[]): IntegrityFinding[] {
  const decisions = new Map<string, Extract<ArtifactFrontmatter, { type: "decision" }>>();
  for (const document of documents) {
    if (isArtifact(document.frontmatter) && document.frontmatter.type === "decision") {
      decisions.set(basename(document.path, ".md"), document.frontmatter);
    }
  }

  const findings: IntegrityFinding[] = [];
  for (const document of documents) {
    if (!("work_item" in document.frontmatter)) continue;
    for (const link of document.frontmatter.decision_dependencies) {
      const target = link.slice(2, -2).split("|", 1)[0]!;
      const decision = decisions.get(target);
      if (!decision) {
        findings.push(finding("work-item.decision.missing", document.relativePath, `decision dependency does not resolve: ${link}`, "workflow-lifecycle", "correct the Decision wikilink or create the required approved Decision"));
        continue;
      }
      if (decision.status !== "approved") {
        findings.push(finding("work-item.decision.unapproved", document.relativePath, `decision dependency is not approved: ${link}`, "workflow-lifecycle", "approve the Decision before starting this Work Item"));
      }
    }
  }
  return findings;
}

function planLifecycleFindings(documents: readonly ScannedDocument[], paths: RepositoryPaths): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  const plans = documents.filter((document) => isPlan(document.frontmatter)) as (ScannedDocument & { frontmatter: PlanFrontmatter })[];
  const reports = new Map<string, ArtifactFrontmatter>();
  for (const document of documents) {
    if (isArtifact(document.frontmatter) && document.frontmatter.type === "report") reports.set(basename(document.path, ".md"), document.frontmatter);
  }
  const activeWorkItems: ScannedDocument[] = [];

  for (const document of documents) findings.push(...planLayoutFindings(document, paths));
  const planDirectories = new Set(plans.map((plan) => dirname(plan.path)));
  for (const workItem of documents.filter((document) => isWorkItem(document.frontmatter))) {
    if (!planDirectories.has(dirname(workItem.path))) {
      findings.push(finding("plan.root.missing", workItem.relativePath, "Work Item directory has no plan.md root document", "R-007", "add the required plan.md for this Plan directory"));
    }
  }
  for (const plan of plans) {
    const directory = dirname(plan.path);
    const workItems = documents.filter((document) => dirname(document.path) === directory && isWorkItem(document.frontmatter)) as (ScannedDocument & { frontmatter: WorkItemFrontmatter })[];
    const byNumber = new Map<number, ScannedDocument>();
    for (const workItem of workItems) {
      const number = workItem.frontmatter.work_item;
      if (byNumber.has(number)) findings.push(finding("plan.work-item.duplicate", workItem.relativePath, `duplicate Work Item number ${number}`, "workflow-lifecycle", "give each Work Item a unique ordered number"));
      else byNumber.set(number, workItem);
      if (workItem.frontmatter.status === "in_progress" || workItem.frontmatter.status === "in-progress") activeWorkItems.push(workItem);
      for (const dependency of workItem.frontmatter.dependencies) {
        const predecessor = byNumber.get(dependency);
        if (!predecessor) findings.push(finding("plan.work-item.dependency.missing", workItem.relativePath, `missing predecessor Work Item ${dependency}`, "workflow-lifecycle", "restore the predecessor Work Item or correct dependencies"));
        else if (["in_progress", "in-progress", "completed"].includes(workItem.frontmatter.status) && predecessor.frontmatter.status !== "completed") {
          findings.push(finding("plan.work-item.order", workItem.relativePath, `predecessor Work Item ${dependency} is not completed`, "workflow-lifecycle", "complete predecessor Work Items before starting this Work Item"));
        }
      }
      if (["in_progress", "in-progress", "completed"].includes(workItem.frontmatter.status) && plan.frontmatter.approval.status !== "approved") {
        findings.push(finding("plan.approval.missing", workItem.relativePath, "Work Item execution started without approved Plan authority", "workflow-lifecycle", "obtain Repository Maintainer approval before execution"));
      }
    }
    if (plan.frontmatter.status === "completed") {
      if (workItems.some((workItem) => workItem.frontmatter.status !== "completed")) {
        findings.push(finding("plan.aggregation.incomplete", plan.relativePath, "completed Plan has a required Work Item that is not completed", "workflow-lifecycle", "complete every required Work Item or revise the approved Plan"));
      }
      const linkedReports = plan.frontmatter.relationships.reports
        .map((link) => link.slice(2, -2).split("|", 1)[0]!)
        .map((target) => reports.get(target));
      if (!linkedReports.some((report) => report?.status === "completed")) {
        findings.push(finding("plan.report.missing", plan.relativePath, "completed Plan has no linked completed Delivery Report", "workflow-lifecycle", "create and link the required completed Delivery Report"));
      }
    }
  }
  if (activeWorkItems.length > 1) {
    for (const workItem of activeWorkItems) findings.push(finding("work-item.in-progress.multiple", workItem.relativePath, "more than one Harness Work Item is in progress", "workflow-lifecycle", "leave only one Work Item in progress"));
  }
  return findings;
}

function planDesignFindings(paths: RepositoryPaths, documents: readonly ScannedDocument[], designPaths: readonly string[]): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  const plans = documents.filter((document) => isPlan(document.frontmatter)) as (ScannedDocument & { frontmatter: PlanFrontmatter })[];
  const plansByDirectory = new Map(plans.map((plan) => [dirname(plan.path), plan]));

  for (const designPath of designPaths) {
    const relativePath = toRepositoryPath(paths.root, designPath);
    const plan = plansByDirectory.get(dirname(designPath));
    if (!plan) {
      findings.push(finding("plan.design.root.missing", relativePath, "Plan-local design has no sibling plan.md root", "R-007", "add the owning plan.md or remove the orphaned design.md"));
      continue;
    }
    if (!plan.frontmatter.relationships.source_paths.includes(relativePath)) {
      findings.push(finding("plan.design.unlinked", relativePath, "Plan-local design is not linked by its owning Plan", "DEC-009", "add the exact design.md path to the sibling Plan relationships.source_paths"));
    }
  }

  for (const plan of plans) {
    const expected = toRepositoryPath(paths.root, join(dirname(plan.path), "design.md"));
    for (const sourcePath of plan.frontmatter.relationships.source_paths.filter((path) => basename(path) === "design.md")) {
      if (sourcePath !== expected) {
        findings.push(finding("plan.design.location", plan.relativePath, `Plan references design outside its own directory: ${sourcePath}`, "DEC-009", `move the design to ${expected} and link that exact path`));
      }
    }
  }
  return findings;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlanLocalDesign(paths: RepositoryPaths, path: string): boolean {
  const plansRelToHarness = relative(paths.harness, paths.plans).replace(/\\/g, "/");
  const relativePath = relative(paths.harness, path).replace(/\\/g, "/");
  const escapedPlans = escapeRegExp(plansRelToHarness);
  return new RegExp(`^${escapedPlans}/\\d{6}-\\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*/design\\.md$`).test(relativePath);
}

function planLayoutFindings(document: ScannedDocument, paths: RepositoryPaths): IntegrityFinding[] {
  const plansRelToHarness = relative(paths.harness, paths.plans).replace(/\\/g, "/");
  const relativePathWithinHarness = relative(paths.harness, document.path).replace(/\\/g, "/");
  if (!relativePathWithinHarness.startsWith(plansRelToHarness + "/")) return [];
  const escapedPlans = escapeRegExp(plansRelToHarness);
  const regex = new RegExp(`^${escapedPlans}/(\\d{6}-\\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*)/([^/]+)$`);
  const match = regex.exec(relativePathWithinHarness);
  if (!match) {
    return [finding(
      "plan.layout",
      document.relativePath,
      "plan file is outside the required YYMMDD-HHmm-slug directory layout",
      "R-007",
      `move it under ${paths.relative.plans}/YYMMDD-HHmm-slug`
    )];
  }
  const filename = match[2]!;
  if (isPlan(document.frontmatter) && filename !== "plan.md") return [finding("plan.filename", document.relativePath, "Plan document must be named plan.md", "R-007", "rename the Plan document to plan.md")];
  if (isWorkItem(document.frontmatter) && !/^work-item-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(filename)) return [finding("work-item.filename", document.relativePath, "Work Item filename must match work-item-XX-kebab-name.md", "R-007", "rename the Work Item document")];
  return [];
}

function relationshipLinks(frontmatter: HarnessFrontmatter & { relationships: ArtifactFrontmatter["relationships"] }): readonly string[] {
  const { source_paths: _sourcePaths, ...links } = frontmatter.relationships;
  return Object.values(links).flat() as string[];
}

function targetsFor(paths: RepositoryPaths, path: string): readonly string[] {
  const pathWithinHarness = relative(paths.harness, path).replace(/\\/g, "/").replace(/\.md$/, "");
  const filename = basename(path, ".md");
  const plansRelToHarness = relative(paths.harness, paths.plans).replace(/\\/g, "/");
  return pathWithinHarness.startsWith(plansRelToHarness + "/")
    ? [pathWithinHarness.slice((plansRelToHarness + "/").length)]
    : [filename];
}

function isArtifact(frontmatter: HarnessFrontmatter): frontmatter is ArtifactFrontmatter {
  return "type" in frontmatter;
}

function isPlan(frontmatter: HarnessFrontmatter): frontmatter is PlanFrontmatter {
  return "approval" in frontmatter;
}

function isWorkItem(frontmatter: HarnessFrontmatter): frontmatter is WorkItemFrontmatter {
  return "work_item" in frontmatter;
}

function hasRelationships(frontmatter: HarnessFrontmatter): frontmatter is HarnessFrontmatter & { relationships: ArtifactFrontmatter["relationships"] } {
  return "relationships" in frontmatter;
}

function finding(checkId: string, path: string, message: string, contract: string, remediation?: string): IntegrityFinding {
  return remediation === undefined
    ? { severity: "error", checkId, path, message, contract }
    : { severity: "error", checkId, path, message, contract, remediation };
}

function result(findings: readonly IntegrityFinding[]): IntegrityResult {
  const ordered = [...findings].sort((left, right) =>
    left.path.localeCompare(right.path)
    || left.checkId.localeCompare(right.checkId)
    || left.message.localeCompare(right.message),
  );
  return { outcome: ordered.some((entry) => entry.severity === "error") ? "failure" : "success", findings: ordered };
}

function toRepositoryPath(root: string, path: string): string {
  return relative(root, path).replace(/\\/g, "/");
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false);
}
