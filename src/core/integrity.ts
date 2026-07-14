import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { assertContained, listMarkdown, repositoryPaths } from "../fs/repository.js";
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

interface IndexCounters {
  next_feature_sequence: number;
  next_decision_sequence: number;
  next_report_sequence: number;
  next_rule_sequence: number;
}

export interface DoctorResult extends IntegrityResult {}
export interface DoctorOptions { path?: string; }

export type IntegrityArtifactScope = "feature" | "spec" | "decision" | "report" | "rule" | "plan";
export interface IntegrityScope { path?: string; kind?: IntegrityArtifactScope; }

interface ScannedDocument {
  path: string;
  relativePath: string;
  linkTargets: readonly string[];
  frontmatter: HarnessFrontmatter;
  body: string;
}

type PlanFrontmatter = HarnessFrontmatter & {
  approval: { status: "pending" | "changes_requested" | "approved" };
  relationships: ArtifactFrontmatter["relationships"];
};
type PhaseFrontmatter = HarnessFrontmatter & {
  phase: number;
  dependencies: readonly number[];
  decision_dependencies: readonly string[];
};

const artifactDirectories = ["features", "specs", "decisions", "reports", "rules"] as const;

/**
 * Read and validate canonical Harness artifacts without modifying repository
 * state. The result is deliberately independent from lifecycle mutations so it
 * can be reused by later CLI, index, and health commands.
 */
export async function scanHarness(root: string, scope: IntegrityScope = {}): Promise<IntegrityResult> {
  const paths = await repositoryPaths(root);
  const findings: IntegrityFinding[] = [];

  if (!(await exists(paths.index))) {
    return result([finding("repository.index.missing", "docs/harness/index.md", "Harness index is missing", "Repository Contract", "run `harness init` in the intended repository")]);
  }

  const documents: ScannedDocument[] = [];
  const files = [
    ...(await Promise.all(artifactDirectories.map((directory) => listMarkdown(join(paths.harness, directory)))).then((groups) => groups.flat())),
    ...(await listMarkdown(join(paths.harness, "plans"))),
  ].sort((left, right) => left.localeCompare(right));

  for (const path of files) {
    const relativePath = toRepositoryPath(paths.root, path);
    try {
      const parsed = parseMarkdownDocument(await readFile(path, "utf8"));
      const document: ScannedDocument = {
        path,
        relativePath,
        linkTargets: targetsFor(paths.harness, path),
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
        "Schema Specification",
        "repair the Markdown frontmatter and its required lifecycle provenance",
      ));
    }
  }

  findings.push(...relationshipFindings(documents));
  findings.push(...identityFindings(documents));
  findings.push(...phaseDependencyFindings(documents));
  findings.push(...planLifecycleFindings(documents));
  if (scope.path === undefined && scope.kind === undefined) return result(findings);
  const selected = await selectScope(paths.root, documents, scope);
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
  const files = await canonicalFiles(paths.harness);
  const entries = await Promise.all(files.map(async (path) => {
    const content = await readFile(path, "utf8");
    return `${toRepositoryPath(paths.root, path)} ${createHash("sha256").update(content).digest("hex")}`;
  }));
  return `---\nschema_version: 1\nnext_feature_sequence: ${counters.next_feature_sequence}\nnext_decision_sequence: ${counters.next_decision_sequence}\nnext_report_sequence: ${counters.next_report_sequence}\nnext_rule_sequence: ${counters.next_rule_sequence}\ngenerated: true\n---\n\n# Harness Index\n\n## Canonical document digests\n${entries.map((entry) => `- ${entry}`).join("\n")}\n`;
}

/** Read-only CI gate for the persisted, CLI-owned index. */
export async function checkIndex(root: string): Promise<IndexCheckResult> {
  const paths = await repositoryPaths(root);
  if (!(await exists(paths.index))) {
    return indexResult([finding("index.missing", "docs/harness/index.md", "persisted Harness index is missing", "FR-003", "run `harness init` in the intended repository")], "");
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
    return indexResult([finding("index.malformed", "docs/harness/index.md", error instanceof Error ? error.message : String(error), "R-020", "restore a CLI-generated index before running this correctness gate")], "");
  }

  const expected = await renderExpectedIndex(paths.root, counters);
  if (persisted !== expected) {
    return indexResult([finding("index.stale", "docs/harness/index.md", "persisted index differs from the deterministic canonical rendering", "FR-003", "repair the index through the documented index-publication workflow; `index check` never repairs it")], expected);
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
  for (const path of ["docs/harness/schema-v1.md", "docs/harness/workflows/README.md", "docs/harness/workflows/cook.md"]) {
    if (!(await exists(join(paths.root, path)))) {
      findings.push(finding("doctor.workflow.missing", path, "required canonical Harness source is missing", "FR-004", "restore the canonical Harness source from the repository contract"));
    }
  }
  findings.push(...(await checkIndex(paths.root)).findings);
  if (!(await graphifyAvailable(options.path))) {
    findings.push(warning("doctor.graphify.unavailable", "graphify", "optional Graphify executable is unavailable", "R-021", "install Graphify only when local visualization output is needed"));
  }
  return result(findings);
}

async function canonicalFiles(harness: string): Promise<string[]> {
  return [
    ...(await Promise.all(artifactDirectories.map((directory) => listMarkdown(join(harness, directory)))).then((groups) => groups.flat())),
    ...(await listMarkdown(join(harness, "plans"))),
  ].sort((left, right) => left.localeCompare(right));
}

function indexFrontmatter(source: string): Record<string, unknown> {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  if (lines[0] !== "---") throw new Error("missing opening frontmatter delimiter");
  const closing = lines.indexOf("---", 1);
  if (closing < 0) throw new Error("missing closing frontmatter delimiter");
  const value = parse(lines.slice(1, closing).join("\n"));
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("index frontmatter must be a mapping");
  return value as Record<string, unknown>;
}

function defaultIndexCounters(): IndexCounters {
  return { next_feature_sequence: 1, next_decision_sequence: 1, next_report_sequence: 1, next_rule_sequence: 1 };
}

function indexCounters(frontmatter: Record<string, unknown>): IndexCounters {
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

async function graphifyAvailable(pathValue = process.env.PATH ?? ""): Promise<boolean> {
  const names = process.platform === "win32" ? ["graphify.exe", "graphify.cmd", "graphify"] : ["graphify"];
  const directories = pathValue.split(process.platform === "win32" ? ";" : ":").filter(Boolean);
  for (const directory of directories) {
    for (const name of names) if (await exists(join(directory, name))) return true;
  }
  return false;
}

async function selectScope(root: string, documents: readonly ScannedDocument[], scope: IntegrityScope): Promise<Set<string> | IntegrityFinding> {
  if (scope.path !== undefined) {
    let target: string;
    try {
      target = await assertContained(root, resolve(root, scope.path));
    } catch (error) {
      return finding("scope.path.invalid", scope.path, error instanceof Error ? error.message : String(error), "FR-001", "provide a repository-local supported document path");
    }
    if (!(await exists(target))) return finding("scope.path.missing", toRepositoryPath(root, target), "requested validation path does not exist", "FR-001", "provide an existing supported Harness document");
    const document = documents.find((entry) => entry.path === target);
    return document ? new Set([document.relativePath]) : finding("scope.path.unsupported", toRepositoryPath(root, target), "requested path is not a supported Harness document", "FR-001", "select an artifact or Plan document under docs/harness");
  }
  if (scope.kind !== undefined) {
    const selected = documents.filter((document) => scope.kind === "plan"
      ? document.relativePath.includes("/plans/")
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
  const targets = new Map<string, string>();
  for (const document of documents) {
    for (const target of document.linkTargets) targets.set(target, document.relativePath);
  }

  for (const document of documents) {
    if (!hasRelationships(document.frontmatter)) continue;
    for (const link of relationshipLinks(document.frontmatter)) {
      const target = link.slice(2, -2).split("|", 1)[0]!;
      if (!targets.has(target)) {
        findings.push(finding("relationships.wikilink", document.relativePath, `unresolved wikilink: ${link}`, "R-011", "create the target or correct the wikilink"));
      }
    }
  }
  return findings;
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

function phaseDependencyFindings(documents: readonly ScannedDocument[]): IntegrityFinding[] {
  const decisions = new Map<string, Extract<ArtifactFrontmatter, { type: "decision" }>>();
  for (const document of documents) {
    if (isArtifact(document.frontmatter) && document.frontmatter.type === "decision") {
      decisions.set(basename(document.path, ".md"), document.frontmatter);
    }
  }

  const findings: IntegrityFinding[] = [];
  for (const document of documents) {
    if (!("phase" in document.frontmatter)) continue;
    for (const link of document.frontmatter.decision_dependencies) {
      const target = link.slice(2, -2).split("|", 1)[0]!;
      const decision = decisions.get(target);
      if (!decision) {
        findings.push(finding("phase.decision.missing", document.relativePath, `decision dependency does not resolve: ${link}`, "workflow-lifecycle", "correct the Decision wikilink or create the required approved Decision"));
        continue;
      }
      if (decision.status !== "approved") {
        findings.push(finding("phase.decision.unapproved", document.relativePath, `decision dependency is not approved: ${link}`, "workflow-lifecycle", "approve the Decision before starting this phase"));
      }
    }
  }
  return findings;
}

function planLifecycleFindings(documents: readonly ScannedDocument[]): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  const plans = documents.filter((document) => isPlan(document.frontmatter)) as (ScannedDocument & { frontmatter: PlanFrontmatter })[];
  const reports = new Map<string, ArtifactFrontmatter>();
  for (const document of documents) {
    if (isArtifact(document.frontmatter) && document.frontmatter.type === "report") reports.set(basename(document.path, ".md"), document.frontmatter);
  }
  const activePhases: ScannedDocument[] = [];

  for (const document of documents) findings.push(...planLayoutFindings(document));
  const planDirectories = new Set(plans.map((plan) => dirname(plan.path)));
  for (const phase of documents.filter((document) => isPhase(document.frontmatter))) {
    if (!planDirectories.has(dirname(phase.path))) {
      findings.push(finding("plan.root.missing", phase.relativePath, "phase directory has no plan.md root document", "R-007", "add the required plan.md for this Plan directory"));
    }
  }
  for (const plan of plans) {
    const directory = dirname(plan.path);
    const phases = documents.filter((document) => dirname(document.path) === directory && isPhase(document.frontmatter)) as (ScannedDocument & { frontmatter: PhaseFrontmatter })[];
    const byNumber = new Map<number, ScannedDocument>();
    for (const phase of phases) {
      const number = phase.frontmatter.phase;
      if (byNumber.has(number)) findings.push(finding("plan.phase.duplicate", phase.relativePath, `duplicate phase number ${number}`, "workflow-lifecycle", "give each phase a unique ordered number"));
      else byNumber.set(number, phase);
      if (phase.frontmatter.status === "in_progress" || phase.frontmatter.status === "in-progress") activePhases.push(phase);
      for (const dependency of phase.frontmatter.dependencies) {
        const predecessor = byNumber.get(dependency);
        if (!predecessor) findings.push(finding("plan.phase.dependency.missing", phase.relativePath, `missing predecessor phase ${dependency}`, "workflow-lifecycle", "restore the predecessor phase or correct dependencies"));
        else if (["in_progress", "in-progress", "completed"].includes(phase.frontmatter.status) && predecessor.frontmatter.status !== "completed") {
          findings.push(finding("plan.phase.order", phase.relativePath, `predecessor phase ${dependency} is not completed`, "workflow-lifecycle", "complete predecessor phases before starting this phase"));
        }
      }
      if (["in_progress", "in-progress", "completed"].includes(phase.frontmatter.status) && plan.frontmatter.approval.status !== "approved") {
        findings.push(finding("plan.approval.missing", phase.relativePath, "phase execution started without approved Plan authority", "workflow-lifecycle", "obtain Repository Maintainer approval before execution"));
      }
    }
    if (plan.frontmatter.status === "completed") {
      if (phases.some((phase) => phase.frontmatter.status !== "completed")) {
        findings.push(finding("plan.aggregation.incomplete", plan.relativePath, "completed Plan has a required phase that is not completed", "workflow-lifecycle", "complete every required phase or revise the approved Plan"));
      }
      const linkedReports = plan.frontmatter.relationships.reports
        .map((link) => link.slice(2, -2).split("|", 1)[0]!)
        .map((target) => reports.get(target));
      if (!linkedReports.some((report) => report?.status === "completed")) {
        findings.push(finding("plan.report.missing", plan.relativePath, "completed Plan has no linked completed Delivery Report", "workflow-lifecycle", "create and link the required completed Delivery Report"));
      }
    }
  }
  if (activePhases.length > 1) {
    for (const phase of activePhases) findings.push(finding("phase.in-progress.multiple", phase.relativePath, "more than one Harness phase is in progress", "workflow-lifecycle", "leave only one phase in progress"));
  }
  return findings;
}

function planLayoutFindings(document: ScannedDocument): IntegrityFinding[] {
  const relativePath = document.relativePath.replace(/^docs\/harness\//, "");
  if (!relativePath.startsWith("plans/")) return [];
  const match = /^plans\/(\d{6}-\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*)\/([^/]+)$/.exec(relativePath);
  if (!match) return [finding("plan.layout", document.relativePath, "plan file is outside the required YYMMDD-HHmm-slug directory layout", "R-007", "move it under docs/harness/plans/YYMMDD-HHmm-slug")];
  const filename = match[2]!;
  if (isPlan(document.frontmatter) && filename !== "plan.md") return [finding("plan.filename", document.relativePath, "Plan document must be named plan.md", "R-007", "rename the Plan document to plan.md")];
  if (isPhase(document.frontmatter) && !/^phase-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(filename)) return [finding("phase.filename", document.relativePath, "phase filename must match phase-XX-kebab-name.md", "R-007", "rename the phase document")];
  return [];
}

function relationshipLinks(frontmatter: HarnessFrontmatter & { relationships: ArtifactFrontmatter["relationships"] }): readonly string[] {
  const { source_paths: _sourcePaths, ...links } = frontmatter.relationships;
  return Object.values(links).flat() as string[];
}

function targetsFor(harness: string, path: string): readonly string[] {
  const pathWithinHarness = relative(harness, path).replace(/\\/g, "/").replace(/\.md$/, "");
  const filename = basename(path, ".md");
  return pathWithinHarness.startsWith("plans/")
    ? [pathWithinHarness.slice("plans/".length), filename]
    : [filename];
}

function isArtifact(frontmatter: HarnessFrontmatter): frontmatter is ArtifactFrontmatter {
  return "type" in frontmatter;
}

function isPlan(frontmatter: HarnessFrontmatter): frontmatter is PlanFrontmatter {
  return "approval" in frontmatter;
}

function isPhase(frontmatter: HarnessFrontmatter): frontmatter is PhaseFrontmatter {
  return "phase" in frontmatter;
}

function hasRelationships(frontmatter: HarnessFrontmatter): frontmatter is HarnessFrontmatter & { relationships: ArtifactFrontmatter["relationships"] } {
  return "relationships" in frontmatter;
}

function finding(checkId: string, path: string, message: string, contract: string, remediation?: string): IntegrityFinding {
  return remediation === undefined
    ? { severity: "error", checkId, path, message, contract }
    : { severity: "error", checkId, path, message, contract, remediation };
}

function warning(checkId: string, path: string, message: string, contract: string, remediation?: string): IntegrityFinding {
  return remediation === undefined
    ? { severity: "warning", checkId, path, message, contract }
    : { severity: "warning", checkId, path, message, contract, remediation };
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
