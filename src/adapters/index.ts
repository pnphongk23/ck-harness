import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { constants } from "node:fs";
import { access, readdir } from "node:fs/promises";
import { delimiter, join } from "node:path";
import { HarnessError, repositoryPaths } from "../fs/repository.js";

export const ADAPTER_BOUNDARY = "explicit-local-process" as const;

export interface GraphCheckResult {
  available: boolean;
  version?: string;
  warning?: string;
  remediation?: string;
}

export interface GraphBuildResult {
  outcome: "success";
  exitCode: 0;
  output: "docs/harness/graphify-out";
}

export interface GraphProcessDependencies {
  path?: string;
  platform?: NodeJS.Platform;
  spawn?: typeof spawn;
  allowExternal?: boolean;
}

const remediation = "Install Graphify only when local visualization output is needed.";
const outputLimit = 64 * 1024;

export async function findGraphify(
  pathValue = process.env.PATH ?? "",
  platform: NodeJS.Platform = process.platform,
): Promise<string | undefined> {
  const names = platform === "win32" ? ["graphify.exe", "graphify"] : ["graphify"];
  const separator = platform === process.platform ? delimiter : platform === "win32" ? ";" : ":";
  for (const directory of pathValue.split(separator).filter(Boolean)) {
    for (const name of names) {
      const candidate = join(directory, name);
      try {
        await access(candidate, platform === "win32" ? constants.F_OK : constants.X_OK);
        return candidate;
      } catch {
        // Continue through the deterministic PATH candidate order.
      }
    }
  }
  return undefined;
}

export async function checkGraphify(dependencies: GraphProcessDependencies = {}): Promise<GraphCheckResult> {
  const executable = await findGraphify(dependencies.path, dependencies.platform);
  if (!executable) return unavailable("Optional Graphify executable is unavailable.");

  try {
    const result = await runGraphify(executable, ["--version"], undefined, undefined, dependencies.spawn);
    if (result.exitCode !== 0) return unavailable(`Graphify version check failed with exit code ${result.exitCode}.`);
    const version = result.stdout.trim();
    if (!version) return unavailable("Graphify version check returned no version.");
    return { available: true, version };
  } catch (error) {
    return unavailable(`Graphify version check could not start: ${errorMessage(error)}.`);
  }
}

export async function buildGraph(root: string, dependencies: GraphProcessDependencies = {}): Promise<GraphBuildResult> {
  if (dependencies.allowExternal !== true) {
    throw new HarnessError(
      "Graphify extraction may transmit Harness Markdown; explicit permission is required",
      "usage",
      ["retry with `harness graph build --allow-external` after reviewing the configured Graphify backend"],
    );
  }
  const paths = await repositoryPaths(root);
  await assertGraphScopeHasNoSymlinks(paths.harness);
  const executable = await findGraphify(dependencies.path, dependencies.platform);
  if (!executable) throw graphError("Optional Graphify executable is unavailable.", [remediation]);

  let result: ProcessResult;
  try {
    result = await runGraphify(
      executable,
      ["extract", "docs/harness", "--out", "docs/harness", "--no-cluster"],
      paths.root,
      undefined,
      dependencies.spawn,
    );
  } catch (error) {
    throw graphError("Graphify process failed to start.", [errorMessage(error)]);
  }
  if (result.exitCode !== 0) {
    throw graphError("Graphify build failed.", [
      `exit code ${result.exitCode}`,
      ...(result.stderr.trim() ? [result.stderr.trim()] : []),
    ]);
  }
  return { outcome: "success", exitCode: 0, output: "docs/harness/graphify-out" };
}

async function assertGraphScopeHasNoSymlinks(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const candidate = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw graphError("Graphify input scope contains a symbolic link.", [
        candidate,
        "replace the symbolic link with repository-local content before building the graph",
      ]);
    }
    if (entry.isDirectory()) await assertGraphScopeHasNoSymlinks(candidate);
  }
}

interface ProcessResult { exitCode: number | null; stdout: string; stderr: string; }

function runGraphify(
  executable: string,
  args: readonly string[],
  cwd: string | undefined,
  stdin: string | undefined,
  spawnOverride: typeof spawn | undefined,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = (spawnOverride ?? spawn)(executable, [...args], {
        ...(cwd === undefined ? {} : { cwd }),
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      reject(error);
      return;
    }

    let settled = false;
    let stdout = "";
    let stderr = "";
    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    child.stdout.on("data", (chunk) => { stdout = appendBounded(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = appendBounded(stderr, chunk); });
    child.on("error", fail);
    child.stdin.on("error", fail);
    child.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      resolve({ exitCode, stdout, stderr });
    });
    child.stdin.end(stdin ?? "");
  });
}

function unavailable(warning: string): GraphCheckResult {
  return { available: false, warning, remediation };
}

function graphError(message: string, details: readonly string[]): HarnessError {
  return new HarnessError(message, "invalid", details);
}

function appendBounded(current: string, chunk: unknown): string {
  return (current + String(chunk)).slice(0, outputLimit);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
