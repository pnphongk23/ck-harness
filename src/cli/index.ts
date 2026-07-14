import { parseArgs } from "node:util";
import {
  cleanHarness,
  createArtifact,
  deleteFeature,
  deprecateFeature,
  initializeHarness,
  listFeatures,
  renameFeature,
  showFeature,
  type ArtifactKind,
} from "../core/lifecycle.js";
import { checkIndex, diagnoseHarness, scanHarness, type IntegrityArtifactScope, type IntegrityResult } from "../core/integrity.js";
import { findRepositoryRoot, HarnessError } from "../fs/repository.js";
import { buildIndex } from "../index/index.js";
import { checkGraphify, buildGraph, type GraphProcessDependencies } from "../adapters/index.js";

export const EXIT_CODES = {
  success: 0,
  usage: 2,
  rejected: 3,
  invalid: 4,
  unexpected: 1,
} as const;

export interface CliIo {
  cwd: string;
  stdout: (value: string) => void;
  stderr: (value: string) => void;
  graph?: GraphProcessDependencies;
}

type OptionValue = string | boolean | string[] | undefined;
type OptionValues = Record<string, OptionValue>;
type OptionDefinition = { type: "string" | "boolean"; multiple?: boolean };

interface CommandContext {
  values: OptionValues;
  positionals: string[];
  io: CliIo;
}

interface CommandSpec {
  path: readonly string[];
  usage: string;
  options: Record<string, OptionDefinition>;
  run: (context: CommandContext) => Promise<unknown>;
  human: (data: unknown) => string;
}

const COMMON_OPTIONS = {
  workspace: { type: "string" },
  json: { type: "boolean" },
} as const;

const commands: readonly CommandSpec[] = [
  command(["doctor"], "harness doctor [--workspace PATH] [--json]", COMMON_OPTIONS, async ({ values, io, positionals }) => {
    exactPositionals(positionals, 0);
    const result = await diagnoseHarness(await rootFor(values, io));
    if (result.outcome === "failure") throw new HarnessError("Harness doctor found required failures", "invalid", result.findings.map((entry) => `${entry.severity}: ${entry.path} [${entry.checkId}] ${entry.message}`));
    return result;
  }, integrityHuman),
  command(["index", "check"], "harness index check [--workspace PATH] [--json]", COMMON_OPTIONS, async ({ values, io, positionals }) => {
    exactPositionals(positionals, 0);
    const result = await checkIndex(await rootFor(values, io));
    if (result.outcome === "failure") throw new HarnessError("Harness index check failed", "invalid", result.findings.map((entry) => `${entry.path} [${entry.checkId}] ${entry.message}`));
    return result;
  }, integrityHuman),
  command(["index", "build"], "harness index build [--workspace PATH] [--json]", COMMON_OPTIONS, async ({ values, io, positionals }) => {
    exactPositionals(positionals, 0);
    const result = await buildIndex(await findRepositoryRoot(workspace(values, io), true));
    if (result.outcome === "failure") throw new HarnessError("Harness index build failed", "invalid", result.findings?.map((entry) => `${entry.path} [${entry.checkId}] ${entry.message}`));
    return result;
  }, (data) => {
    const result = data as Awaited<ReturnType<typeof buildIndex>>;
    return result.unchanged ? "Harness index unchanged" : "Harness index built";
  }),
  command(["graph", "check"], "harness graph check [--workspace PATH] [--json]", COMMON_OPTIONS, async ({ io, positionals }) => {
    exactPositionals(positionals, 0);
    return checkGraphify(io.graph);
  }, (data) => {
    const result = data as Awaited<ReturnType<typeof checkGraphify>>;
    if (result.available) return `Graphify version: ${result.version}`;
    return `Warning: ${result.warning}\nRemediation: ${result.remediation}`;
  }),
  command(["graph", "build"], "harness graph build --allow-external [--workspace PATH] [--json]", {
    ...COMMON_OPTIONS,
    "allow-external": { type: "boolean" },
  }, async ({ values, io, positionals }) => {
    exactPositionals(positionals, 0);
    const root = await rootFor(values, io);
    return buildGraph(root, { ...io.graph, allowExternal: values["allow-external"] === true });
  }, () => "Harness graph built"),
  command(["index", "watch"], "harness index watch [--poll] [--debounce MS] [--rebind-attempts N] [--workspace PATH] [--json]", {
    ...COMMON_OPTIONS,
    poll: { type: "boolean" },
    debounce: { type: "string" },
    "rebind-attempts": { type: "string" },
  }, async ({ values, io, positionals }) => {
    exactPositionals(positionals, 0);
    const workspacePath = await rootFor(values, io);

    const debounceStr = optionalString(values, "debounce");
    const debounceMs = debounceStr !== undefined ? Number(debounceStr) : undefined;
    if (debounceMs !== undefined && (!Number.isSafeInteger(debounceMs) || debounceMs < 0)) {
      throw new HarnessError("--debounce must be a non-negative integer", "usage");
    }

    const rebindAttemptsStr = optionalString(values, "rebind-attempts");
    const rebindAttempts = rebindAttemptsStr !== undefined ? Number(rebindAttemptsStr) : undefined;
    if (rebindAttempts !== undefined && (!Number.isSafeInteger(rebindAttempts) || rebindAttempts <= 0)) {
      throw new HarnessError("--rebind-attempts must be a positive integer", "usage");
    }

    const abortController = new AbortController();

    const onSigInt = () => abortController.abort();
    process.once("SIGINT", onSigInt);
    process.once("SIGTERM", onSigInt);

    const { watchHarness } = await import("../watcher/index.js");

    try {
      return await watchHarness({
        workspace: workspacePath,
        ...(values.poll === true && { poll: true }),
        ...(debounceMs !== undefined && { debounceMs }),
        ...(rebindAttempts !== undefined && { rebindAttempts }),
        signal: abortController.signal,
        onEvent: (event) => {
          if (values.json === true) {
            io.stderr(`${JSON.stringify({ event })}\n`);
          } else if (event.type === "ready") {
            io.stdout(event.result.outcome === "success" ? "Harness watcher ready\n" : "Harness watcher ready (degraded)\n");
          } else if (event.type === "reconciled") {
            io.stdout(event.result.unchanged ? "Harness index unchanged\n" : "Harness index built\n");
          } else if (event.type === "degraded") {
            io.stderr(`Degraded: ${event.reason}\n`);
            for (const finding of event.findings ?? []) {
              io.stderr(`  ${finding.path} [${finding.checkId}] ${finding.message}\n`);
            }
          } else if (event.type === "rebind") {
            io.stderr(`Rebinding watcher (attempt ${event.attempt}/${event.max})\n`);
          } else if (event.type === "exhausted") {
            io.stderr(`Exhausted: ${event.reason}\n`);
          } else if (event.type === "shutdown") {
            io.stdout("Harness watcher shut down\n");
          }
        },
      });
    } finally {
      process.removeListener("SIGINT", onSigInt);
      process.removeListener("SIGTERM", onSigInt);
    }
  }, (data) => {
    const res = data as import("../watcher/index.js").WatcherResult;
    return res.outcome === "exhausted" ? "Watcher exhausted" : "Watcher gracefully stopped";
  }),
  command(["validate"], "harness validate [PATH] [--kind KIND] [--all] [--workspace PATH] [--json]", {
    ...COMMON_OPTIONS, kind: { type: "string" }, all: { type: "boolean" },
  }, async ({ values, io, positionals }) => {
    if (positionals.length > 1) exactPositionals(positionals, 1);
    const hasPath = positionals.length === 1;
    const kind = optionalString(values, "kind");
    const all = values.all === true;
    if ((hasPath ? 1 : 0) + (kind ? 1 : 0) + (all ? 1 : 0) !== 1) {
      throw new HarnessError("select exactly one of PATH, --kind, or --all", "usage");
    }
    const scope = kind ? { kind: integrityKind(kind) } : hasPath ? { path: positionals[0]! } : {};
    const result = await scanHarness(await rootFor(values, io), scope);
    if (result.outcome === "failure") throw new HarnessError("Harness validation failed", "invalid", result.findings.map((entry) => `${entry.path} [${entry.checkId}] ${entry.message}`));
    return result;
  }, integrityHuman),
  command(["init"], "harness init [--workspace PATH] [--json]", COMMON_OPTIONS, async ({ values, io }) => {
    const root = await findRepositoryRoot(workspace(values, io), true);
    return initializeHarness(root);
  }, (data) => {
    const result = data as Awaited<ReturnType<typeof initializeHarness>>;
    return [
      ...result.created.map((path) => `created ${path}`),
      ...result.preserved.map((path) => `preserved ${path}`),
    ].join("\n") || "Harness already initialized";
  }),
  command(["feature", "create"], "harness feature create --title TITLE [--created YYYY-MM-DD] [--workspace PATH] [--json]", {
    ...COMMON_OPTIONS, title: { type: "string" }, created: { type: "string" },
  }, async ({ values, io }) => createArtifact(await rootFor(values, io), artifactInput(
    "feature", requiredString(values, "title"), optionalString(values, "created"),
  )), humanMutation("created")),
  command(["feature", "list"], "harness feature list [--workspace PATH] [--json]", COMMON_OPTIONS, async ({ values, io, positionals }) => {
    exactPositionals(positionals, 0);
    return listFeatures(await rootFor(values, io));
  }, (data) => (data as Awaited<ReturnType<typeof listFeatures>>).map((entry) => `${entry.id}\t${entry.status}\t${entry.title}\t${entry.path}`).join("\n") || "No Features"),
  command(["feature", "show"], "harness feature show TARGET [--workspace PATH] [--json]", COMMON_OPTIONS, async ({ values, io, positionals }) => {
    exactPositionals(positionals, 1);
    return showFeature(await rootFor(values, io), positionals[0]!);
  }, (data) => (data as Awaited<ReturnType<typeof showFeature>>).content.trimEnd()),
  command(["feature", "rename"], "harness feature rename TARGET --title TITLE [--workspace PATH] [--json]", {
    ...COMMON_OPTIONS, title: { type: "string" },
  }, async ({ values, io, positionals }) => {
    exactPositionals(positionals, 1);
    return renameFeature(await rootFor(values, io), positionals[0]!, requiredString(values, "title"));
  }, humanMutation("renamed")),
  command(["feature", "deprecate"], "harness feature deprecate TARGET [--workspace PATH] [--json]", COMMON_OPTIONS, async ({ values, io, positionals }) => {
    exactPositionals(positionals, 1);
    return deprecateFeature(await rootFor(values, io), positionals[0]!);
  }, humanMutation("deprecated")),
  command(["feature", "delete"], "harness feature delete TARGET [--force] [--workspace PATH] [--json]", {
    ...COMMON_OPTIONS, force: { type: "boolean" },
  }, async ({ values, io, positionals }) => {
    exactPositionals(positionals, 1);
    return deleteFeature(await rootFor(values, io), positionals[0]!, values.force === true);
  }, humanMutation("deleted")),
  ...(["spec", "decision", "report", "rule"] as const).map((kind) => command(
    ["new", kind],
    newArtifactUsage(kind),
    newArtifactOptions(kind),
    async ({ values, io, positionals }) => {
      exactPositionals(positionals, 0);
      return createArtifact(await rootFor(values, io), artifactInput(
        kind, requiredString(values, "title"), artifactDate(kind, values), stringList(values, "scope"),
      ));
    },
    humanMutation("created"),
  )),
  command(["clean"], "harness clean [--dry-run] [--workspace PATH] [--json]", {
    ...COMMON_OPTIONS, "dry-run": { type: "boolean" },
  }, async ({ values, io, positionals }) => {
    exactPositionals(positionals, 0);
    return cleanHarness(await rootFor(values, io), values["dry-run"] === true);
  }, (data) => {
    const result = data as Awaited<ReturnType<typeof cleanHarness>>;
    if (!result.paths.length) return "Nothing to clean";
    return `${result.removed ? "removed" : "would remove"}\n${result.paths.join("\n")}`;
  }),
];

export async function runCli(argv: readonly string[], partialIo: Partial<CliIo> = {}): Promise<number> {
  const io: CliIo = {
    cwd: partialIo.cwd ?? process.cwd(),
    stdout: partialIo.stdout ?? ((value) => process.stdout.write(value)),
    stderr: partialIo.stderr ?? ((value) => process.stderr.write(value)),
    ...(partialIo.graph === undefined ? {} : { graph: partialIo.graph }),
  };
  const args = [...argv];
  const jsonRequested = args.includes("--json");

  try {
    if (args.length === 0 || (args.length === 1 && ["--help", "-h"].includes(args[0]!))) {
      io.stdout(`${helpText()}\n`);
      return EXIT_CODES.success;
    }
    if (args.length === 1 && args[0] === "--version") {
      io.stdout("0.1.0\n");
      return EXIT_CODES.success;
    }

    const spec = [...commands].sort((a, b) => b.path.length - a.path.length)
      .find((candidate) => candidate.path.every((word, index) => args[index] === word));
    if (!spec) throw new HarnessError(`unsupported command: ${args.join(" ")}`, "usage");
    const remainder = args.slice(spec.path.length);
    const parsed = parseArgs({ args: remainder, options: spec.options, allowPositionals: true, strict: true });
    const values = parsed.values as OptionValues;
    const data = await spec.run({ values, positionals: parsed.positionals, io });
    if (values.json === true) io.stdout(`${JSON.stringify({ ok: true, data })}\n`);
    else io.stdout(`${spec.human(data)}\n`);
    return EXIT_CODES.success;
  } catch (error) {
    const normalized = normalizeError(error);
    const payload = { ok: false, error: { code: normalized.code, message: normalized.message, details: normalized.details } };
    if (jsonRequested) io.stderr(`${JSON.stringify(payload)}\n`);
    else {
      io.stderr(`error: ${normalized.message}\n`);
      for (const detail of normalized.details) io.stderr(`  ${detail}\n`);
    }
    return normalized.exitCode;
  }
}

function command(
  path: readonly string[], usage: string, options: Record<string, OptionDefinition>,
  run: CommandSpec["run"], human: CommandSpec["human"],
): CommandSpec {
  return { path, usage, options, run: async (context) => {
    try {
      return await run(context);
    } catch (error) {
      if (error instanceof HarnessError && error.code === "usage") {
        throw new HarnessError(`${error.message}\nusage: ${usage}`, "usage", error.details);
      }
      throw error;
    }
  }, human };
}

async function rootFor(values: OptionValues, io: CliIo): Promise<string> {
  return findRepositoryRoot(workspace(values, io));
}

function workspace(values: OptionValues, io: CliIo): string {
  return optionalString(values, "workspace") ?? io.cwd;
}

function requiredString(values: OptionValues, name: string): string {
  const value = optionalString(values, name);
  if (!value) throw new HarnessError(`--${name} is required`, "usage");
  return value;
}

function optionalString(values: OptionValues, name: string): string | undefined {
  const value = values[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new HarnessError(`--${name} must be a string`, "usage");
  return value;
}

function stringList(values: OptionValues, name: string): string[] | undefined {
  const value = values[name];
  if (value === undefined) return undefined;
  if (typeof value === "string") return [value];
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) return value;
  throw new HarnessError(`--${name} must be supplied as text`, "usage");
}

function newArtifactUsage(kind: Exclude<ArtifactKind, "feature">): string {
  const provenance = kind === "decision" ? " [--created YYYY-MM-DD]" : kind === "report" ? " --delivered YYYY-MM-DD" : kind === "rule" ? " --approved YYYY-MM-DD --scope SCOPE" : "";
  return `harness new ${kind} --title TITLE${provenance} [--workspace PATH] [--json]`;
}

function newArtifactOptions(kind: Exclude<ArtifactKind, "feature">): Record<string, OptionDefinition> {
  return {
    ...COMMON_OPTIONS,
    title: { type: "string" },
    ...(kind === "decision" ? { created: { type: "string" as const } } : {}),
    ...(kind === "report" ? { delivered: { type: "string" as const } } : {}),
    ...(kind === "rule" ? { approved: { type: "string" as const }, scope: { type: "string" as const, multiple: true } } : {}),
  };
}

function artifactDate(kind: Exclude<ArtifactKind, "feature">, values: OptionValues): string | undefined {
  if (kind === "decision") return optionalString(values, "created");
  if (kind === "report") return requiredString(values, "delivered");
  if (kind === "rule") return requiredString(values, "approved");
  return undefined;
}

function exactPositionals(positionals: readonly string[], expected: number): void {
  if (positionals.length !== expected) throw new HarnessError(`expected ${expected} positional argument${expected === 1 ? "" : "s"}, received ${positionals.length}`, "usage");
}

function humanMutation(verb: string): (data: unknown) => string {
  return (data) => {
    const result = data as { id?: string; path?: string; affected?: string[]; removed?: string[] };
    const primary = [verb, result.id, result.path].filter(Boolean).join(" ");
    const details = [...(result.removed ?? []), ...(result.affected ?? [])];
    return [primary, ...details.map((path) => `  ${path}`)].filter(Boolean).join("\n");
  };
}

function integrityKind(value: string): IntegrityArtifactScope {
  const kinds = ["feature", "spec", "decision", "report", "rule", "plan"] as const;
  if (!(kinds as readonly string[]).includes(value)) throw new HarnessError(`unsupported artifact scope: ${value}`, "usage");
  return value as IntegrityArtifactScope;
}

function integrityHuman(data: unknown): string {
  const result = data as IntegrityResult;
  return result.findings.length === 0 ? "Harness validation passed" : result.findings.map((entry) => `${entry.severity}: ${entry.path} [${entry.checkId}] ${entry.message}`).join("\n");
}

function normalizeError(error: unknown): { code: string; message: string; details: readonly string[]; exitCode: number } {
  if (error instanceof HarnessError) {
    const exitCode = error.code === "usage" ? EXIT_CODES.usage : error.code === "invalid" ? EXIT_CODES.invalid : EXIT_CODES.rejected;
    return { code: error.code, message: error.message, details: error.details, exitCode };
  }
  if (error instanceof TypeError && "code" in error && String((error as { code?: unknown }).code).startsWith("ERR_PARSE_ARGS")) {
    return { code: "usage", message: error.message, details: [], exitCode: EXIT_CODES.usage };
  }
  return { code: "unexpected", message: error instanceof Error ? error.message : String(error), details: [], exitCode: EXIT_CODES.unexpected };
}

function helpText(): string {
  return ["Harness artifact lifecycle CLI", "", "Commands:", ...commands.map((spec) => `  ${spec.usage}`), "  harness --help", "  harness --version"].join("\n");
}

function artifactInput(kind: ArtifactKind, title: string, date?: string, scope?: readonly string[]): Parameters<typeof createArtifact>[1] {
  const input: Parameters<typeof createArtifact>[1] = { kind, title };
  if (date !== undefined) input.date = date;
  if (scope !== undefined) input.scope = scope;
  return input;
}

export type { ArtifactKind };
