import { access, lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parse } from "yaml";

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
  plans: string;
  reports: string;
  rules: string;
  templates: string;
  workflows: string;
  relative: {
    harness: string;
    index: string;
    features: string;
    specs: string;
    decisions: string;
    plans: string;
    reports: string;
    rules: string;
    templates: string;
    workflows: string;
  };
  allowlist: string[];
}

function isParentOf(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel);
}

export async function repositoryPaths(root: string): Promise<RepositoryPaths> {
  const canonicalRoot = await realpath(resolve(root));
  const yamlPath = join(canonicalRoot, "harness.yaml");

  let config: any = {};
  if (await exists(yamlPath)) {
    let content: string;
    try {
      content = await readFile(yamlPath, "utf8");
    } catch (err: any) {
      throw new HarnessError(`Failed to read harness.yaml: ${err.message}`, "invalid");
    }

    try {
      config = parse(content);
    } catch (err: any) {
      throw new HarnessError(`Failed to parse harness.yaml: ${err.message}`, "invalid");
    }

    if (config === undefined) {
      config = {};
    }

    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new HarnessError("Configuration must be a mapping", "invalid");
    }

    const allowedKeys = [
      "root",
      "features",
      "specs",
      "decisions",
      "plans",
      "reports",
      "rules",
      "templates",
      "workflows",
    ];
    for (const key of Object.keys(config)) {
      if (!allowedKeys.includes(key)) {
        throw new HarnessError(`Unknown configuration field: ${key}`, "invalid");
      }
    }

    for (const [key, val] of Object.entries(config)) {
      if (typeof val !== "string") {
        throw new HarnessError(`Configuration field ${key} must be a string`, "invalid");
      }
      if (val.trim() === "") {
        throw new HarnessError(`Configuration field ${key} cannot be empty`, "invalid");
      }
      if (isAbsolute(val) || /^[A-Za-z]:/.test(val)) {
        throw new HarnessError(`Configuration field ${key} cannot be an absolute path`, "invalid");
      }
      const segments = val.replace(/\\/g, "/").split("/");
      if (segments.includes("..")) {
        throw new HarnessError(`Configuration field ${key} cannot contain ".."`, "invalid");
      }
    }
  }

  // Resolve root
  const harnessRootRel = config.root !== undefined ? config.root.trim() : "docs/harness";
  const harnessRootAbs = resolve(canonicalRoot, harnessRootRel);

  // Verify root containment
  await assertContained(canonicalRoot, harnessRootAbs);

  const keys = [
    "features",
    "specs",
    "decisions",
    "plans",
    "reports",
    "rules",
    "templates",
    "workflows",
  ] as const;

  const resolved: Record<typeof keys[number], string> = {
    features: "",
    specs: "",
    decisions: "",
    plans: "",
    reports: "",
    rules: "",
    templates: "",
    workflows: "",
  };

  for (const key of keys) {
    const val = config[key] !== undefined ? config[key].trim() : key;
    const absPath = resolve(harnessRootAbs, val);

    // Verify repository containment
    await assertContained(canonicalRoot, absPath);

    // Verify strict containment under the Harness root
    const rel = relative(harnessRootAbs, absPath);
    if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      throw new HarnessError(`Configuration field ${key} must be strictly contained under the Harness root`, "invalid");
    }

    resolved[key] = absPath;
  }

  // Verify duplicates and overlaps
  for (const keyA of keys) {
    const pathA = resolved[keyA];
    for (const keyB of keys) {
      if (keyA === keyB) continue;
      const pathB = resolved[keyB];

      if (pathA === pathB) {
        throw new HarnessError(`Ambiguous layout: duplicate folder configuration for ${keyA} and ${keyB}`, "invalid", [keyA, keyB]);
      }

      if (isParentOf(pathA, pathB)) {
        throw new HarnessError(`Ambiguous layout: overlapping folder configuration for ${keyA} and ${keyB}`, "invalid", [keyA, keyB]);
      }
    }
  }

  const relHarness = relative(canonicalRoot, harnessRootAbs).replace(/\\/g, "/");
  const relIndex = relative(canonicalRoot, join(harnessRootAbs, "index.md")).replace(/\\/g, "/");

  const relativePaths = {
    harness: relHarness,
    index: relIndex,
    features: relative(canonicalRoot, resolved.features).replace(/\\/g, "/"),
    specs: relative(canonicalRoot, resolved.specs).replace(/\\/g, "/"),
    decisions: relative(canonicalRoot, resolved.decisions).replace(/\\/g, "/"),
    plans: relative(canonicalRoot, resolved.plans).replace(/\\/g, "/"),
    reports: relative(canonicalRoot, resolved.reports).replace(/\\/g, "/"),
    rules: relative(canonicalRoot, resolved.rules).replace(/\\/g, "/"),
    templates: relative(canonicalRoot, resolved.templates).replace(/\\/g, "/"),
    workflows: relative(canonicalRoot, resolved.workflows).replace(/\\/g, "/"),
  };

  const allowlist = [
    join(harnessRootAbs, "index.md"),
    resolved.features,
    resolved.specs,
    resolved.decisions,
    resolved.plans,
    resolved.reports,
    resolved.rules,
    resolved.templates,
    resolved.workflows,
    join(harnessRootAbs, "graph-out"),
    join(harnessRootAbs, "graphify-out"),
    join(harnessRootAbs, ".harness-tmp"),
    join(harnessRootAbs, ".cache"),
  ];

  return {
    root: canonicalRoot,
    harness: harnessRootAbs,
    index: join(harnessRootAbs, "index.md"),
    features: resolved.features,
    specs: resolved.specs,
    decisions: resolved.decisions,
    plans: resolved.plans,
    reports: resolved.reports,
    rules: resolved.rules,
    templates: resolved.templates,
    workflows: resolved.workflows,
    relative: relativePaths,
    allowlist,
  };
}

export async function findRepositoryRoot(start: string, allowUninitialized = false): Promise<string> {
  let current = resolve(start);
  const info = await stat(current).catch(() => undefined);
  if (!info) throw new HarnessError(`workspace does not exist: ${current}`, "precondition");
  if (!info.isDirectory()) current = dirname(current);
  current = await realpath(current);

  let search = current;
  while (true) {
    const yamlPath = join(search, "harness.yaml");
    if (await exists(yamlPath)) {
      // Validate harness.yaml (this will throw HarnessError if invalid)
      const paths = await repositoryPaths(search);
      if (allowUninitialized) {
        return search;
      }
      // Check if configured index exists
      if (await exists(paths.index)) {
        return search;
      }
      throw new HarnessError("Harness is not initialized; run `harness init` first", "precondition");
    }

    // If harness.yaml doesn't exist, check default index.md
    const defaultMarker = join(search, "docs", "harness", "index.md");
    if (await exists(defaultMarker)) {
      return search;
    }

    const parent = dirname(search);
    if (parent === search) break;
    search = parent;
  }

  if (allowUninitialized) {
    return current;
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
