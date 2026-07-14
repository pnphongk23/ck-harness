import { access, lstat, readdir, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export class HarnessError extends Error {
  constructor(
    message: string,
    readonly code: "usage" | "precondition" | "conflict" | "invalid" = "precondition",
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = "HarnessError";
  }
}

export interface RepositoryPaths {
  root: string;
  harness: string;
  index: string;
  features: string;
  specs: string;
  decisions: string;
  reports: string;
  rules: string;
  templates: string;
}

export async function repositoryPaths(root: string): Promise<RepositoryPaths> {
  const canonicalRoot = await realpath(resolve(root));
  const harness = join(canonicalRoot, "docs", "harness");
  return {
    root: canonicalRoot,
    harness,
    index: join(harness, "index.md"),
    features: join(harness, "features"),
    specs: join(harness, "specs"),
    decisions: join(harness, "decisions"),
    reports: join(harness, "reports"),
    rules: join(harness, "rules"),
    templates: join(harness, "templates"),
  };
}

export async function findRepositoryRoot(start: string, allowUninitialized = false): Promise<string> {
  let current = resolve(start);
  const info = await stat(current).catch(() => undefined);
  if (!info) throw new HarnessError(`workspace does not exist: ${current}`, "precondition");
  if (!info.isDirectory()) current = dirname(current);
  current = await realpath(current);
  if (allowUninitialized) return current;

  while (true) {
    const marker = join(current, "docs", "harness", "index.md");
    if (await exists(marker)) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new HarnessError("Harness is not initialized; run `harness init` first", "precondition");
}

export async function assertContained(root: string, target: string): Promise<string> {
  const rawRoot = resolve(root);
  const canonicalRoot = await realpath(rawRoot);
  const requested = resolve(target);
  const rawRel = relative(rawRoot, requested);
  const absolute = isContainedRelative(rawRel) ? resolve(canonicalRoot, rawRel) : requested;
  const rel = relative(canonicalRoot, absolute);
  if (rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))) {
    const ancestor = await nearestExistingAncestor(absolute);
    const canonicalAncestor = await realpath(ancestor);
    const ancestorRel = relative(canonicalRoot, canonicalAncestor);
    if (ancestorRel === "" || (!ancestorRel.startsWith(`..${sep}`) && ancestorRel !== ".." && !isAbsolute(ancestorRel))) {
      if (await exists(absolute)) {
        const info = await lstat(absolute);
        if (info.isSymbolicLink()) {
          const canonicalTarget = await realpath(absolute);
          const targetRel = relative(canonicalRoot, canonicalTarget);
          if (targetRel.startsWith(`..${sep}`) || targetRel === ".." || isAbsolute(targetRel)) {
            throw new HarnessError(`path escapes repository through a symlink: ${absolute}`, "conflict");
          }
        }
      }
      return absolute;
    }
  }
  throw new HarnessError(`path escapes repository: ${absolute}`, "conflict");
}

function isContainedRelative(value: string): boolean {
  return value === "" || (!value.startsWith(`..${sep}`) && value !== ".." && !isAbsolute(value));
}

export async function listMarkdown(root: string): Promise<string[]> {
  if (!(await exists(root))) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return listMarkdown(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  }));
  return files.flat().sort((a, b) => a.localeCompare(b));
}

export async function exists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false);
}

async function nearestExistingAncestor(path: string): Promise<string> {
  let current = path;
  while (!(await exists(current))) {
    const parent = dirname(current);
    if (parent === current) throw new HarnessError(`no existing ancestor for path: ${path}`, "precondition");
    current = parent;
  }
  return current;
}
