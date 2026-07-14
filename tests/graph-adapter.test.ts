import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { spawn } from "node:child_process";
import { buildGraph, checkGraphify, type GraphProcessDependencies } from "../src/adapters/index.js";
import { EXIT_CODES, runCli } from "../src/cli/index.js";
import { cleanHarness } from "../src/core/lifecycle.js";
import { HarnessError } from "../src/fs/repository.js";

function decisionDocument(id: string, features: readonly string[] = []): string {
  return `---
schema_version: 1
type: decision
id: ${id}
title: Test ${id}
status: proposed
created: 2026-07-14
relationships:
  specs: []
  decisions: []
  plans: []
  reports: []
  rules: []
  features:${features.length ? `\n${features.map((link) => `    - "${link}"`).join("\n")}` : " []"}
  source_paths: []
---

# ${id}: Test decision
`;
}

async function harnessFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-graph-"));
  const harness = join(root, "docs", "harness");
  await mkdir(join(harness, "decisions"), { recursive: true });
  await writeFile(join(harness, "index.md"), "---\nschema_version: 1\ngenerated: true\n---\n\n# Harness Index\n");
  return root;
}

async function executableDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "harness-graph-bin-"));
  const executable = join(directory, process.platform === "win32" ? "graphify.exe" : "graphify");
  await writeFile(executable, "");
  if (process.platform !== "win32") await chmod(executable, 0o755);
  return directory;
}

interface FakeProcessOptions {
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  error?: Error;
  onInput?: (input: string) => void;
}

function fakeProcess(options: FakeProcessOptions = {}): ReturnType<typeof spawn> {
  const child = new EventEmitter() as any;
  child.stdin = Object.assign(new EventEmitter(), {
    end: (input = "") => {
      options.onInput?.(input);
      queueMicrotask(() => {
        if (options.error) child.emit("error", options.error);
        else {
          if (options.stdout) child.stdout.emit("data", options.stdout);
          if (options.stderr) child.stderr.emit("data", options.stderr);
          child.emit("close", options.exitCode ?? 0);
        }
      });
    },
  });
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  return child as ReturnType<typeof spawn>;
}

test("graph check degrades cleanly and reports a usable version", async (t) => {
  const bin = await executableDirectory();
  t.after(() => rm(bin, { recursive: true, force: true }));

  const missing = await checkGraphify({ path: join(bin, "missing") });
  assert.equal(missing.available, false);
  assert.match(missing.warning ?? "", /unavailable/i);
  assert.match(missing.remediation ?? "", /install Graphify/i);

  const calls: { command: string; args: readonly string[]; shell: unknown }[] = [];
  const fakeSpawn = ((command: string, args: readonly string[], options: { shell?: boolean }) => {
    calls.push({ command, args, shell: options.shell });
    return fakeProcess({ stdout: "Graphify 1.2.3\n" });
  }) as typeof spawn;
  const available = await checkGraphify({ path: bin, spawn: fakeSpawn });
  assert.deepEqual(available, { available: true, version: "Graphify 1.2.3" });
  assert.deepEqual(calls.map(({ args, shell }) => ({ args, shell })), [{ args: ["--version"], shell: false }]);

  const nonZero = await checkGraphify({ path: bin, spawn: (() => fakeProcess({ exitCode: 7 })) as typeof spawn });
  assert.equal(nonZero.available, false);
  assert.match(nonZero.warning ?? "", /exit code 7/);

  const spawnError = await checkGraphify({
    path: bin,
    spawn: (() => { throw new Error("injected spawn failure"); }) as typeof spawn,
  });
  assert.equal(spawnError.available, false);
  assert.match(spawnError.warning ?? "", /injected spawn failure/);
});

test("graph build uses fixed shell-free Harness directory arguments", async (t) => {
  const root = await harnessFixture();
  const bin = await executableDirectory();
  t.after(() => Promise.all([rm(root, { recursive: true, force: true }), rm(bin, { recursive: true, force: true })]));
  await writeFile(join(root, "docs", "harness", "decisions", "DEC-001-test.md"), decisionDocument("DEC-001"));
  let input = "";
  let observed: { args?: readonly string[]; cwd?: string | undefined; shell?: unknown } = {};
  const fakeSpawn = ((_command: string, args: readonly string[], options: { cwd?: string; shell?: boolean }) => {
    observed = { args, cwd: options.cwd, shell: options.shell };
    return fakeProcess({ onInput: (value) => { input = value; } });
  }) as typeof spawn;

  const result = await buildGraph(root, { path: bin, spawn: fakeSpawn, allowExternal: true });
  assert.deepEqual(result, { outcome: "success", exitCode: 0, output: "docs/harness/graphify-out" });
  assert.deepEqual(observed, {
    args: ["extract", "docs/harness", "--out", "docs/harness", "--no-cluster"],
    cwd: await realpath(root),
    shell: false,
  });
  assert.equal(input, "");
  assert.doesNotMatch(JSON.stringify(observed.args), /DEC-001|agent|git|deploy|release/);
});

test("graph build requires permission and propagates unavailable, spawn, and non-zero failures", async (t) => {
  const root = await harnessFixture();
  const bin = await executableDirectory();
  t.after(() => Promise.all([rm(root, { recursive: true, force: true }), rm(bin, { recursive: true, force: true })]));

  let spawned = false;
  await assert.rejects(buildGraph(root, {
    path: bin,
    spawn: (() => { spawned = true; return fakeProcess(); }) as typeof spawn,
  }), (error: unknown) => error instanceof HarnessError && error.code === "usage" && /permission/i.test(error.message));
  assert.equal(spawned, false);

  await assert.rejects(buildGraph(root, { path: join(bin, "missing"), allowExternal: true }), (error: unknown) =>
    error instanceof HarnessError && /unavailable/i.test(error.message));
  await assert.rejects(buildGraph(root, {
    path: bin,
    allowExternal: true,
    spawn: (() => { throw new Error("spawn exploded"); }) as typeof spawn,
  }), (error: unknown) => error instanceof HarnessError && error.details.some((detail) => /spawn exploded/.test(detail)));
  await assert.rejects(buildGraph(root, {
    path: bin,
    allowExternal: true,
    spawn: (() => fakeProcess({ exitCode: 9, stderr: "bad graph" })) as typeof spawn,
  }), (error: unknown) => error instanceof HarnessError
    && error.details.includes("exit code 9")
    && error.details.includes("bad graph"));
});

test("graph build rejects symbolic links before Graphify can escape its directory scope", async (t) => {
  if (process.platform === "win32") {
    t.skip("symbolic-link creation requires environment-specific Windows privileges");
    return;
  }
  const root = await harnessFixture();
  const bin = await executableDirectory();
  t.after(() => Promise.all([rm(root, { recursive: true, force: true }), rm(bin, { recursive: true, force: true })]));
  const outside = join(root, "outside.md");
  await writeFile(outside, "outside");
  await symlink(outside, join(root, "docs", "harness", "outside-link.md"));

  let spawned = false;
  await assert.rejects(buildGraph(root, {
    path: bin,
    allowExternal: true,
    spawn: (() => { spawned = true; return fakeProcess(); }) as typeof spawn,
  }), (error: unknown) => error instanceof HarnessError && /symbolic link/i.test(error.message));
  assert.equal(spawned, false);
});

test("graph output is contained, disposable, and leaves canonical Markdown unchanged", async (t) => {
  const root = await harnessFixture();
  const bin = await executableDirectory();
  t.after(() => Promise.all([rm(root, { recursive: true, force: true }), rm(bin, { recursive: true, force: true })]));
  const decision = join(root, "docs", "harness", "decisions", "DEC-001-test.md");
  await writeFile(decision, decisionDocument("DEC-001"));
  const before = await readFile(decision, "utf8");
  const output = join(root, "docs", "harness", "graphify-out");
  await mkdir(output);
  await writeFile(join(output, "graph.json"), "derived");
  const cleaned = await cleanHarness(root, false);
  assert.deepEqual(cleaned.paths, ["docs/harness/graphify-out"]);
  await assert.rejects(readFile(join(output, "graph.json"), "utf8"));
  assert.equal(await readFile(decision, "utf8"), before);
});

test("graph CLI grammar is strict and missing check has stable human and JSON success", async (t) => {
  const root = await harnessFixture();
  const bin = await executableDirectory();
  t.after(() => Promise.all([rm(root, { recursive: true, force: true }), rm(bin, { recursive: true, force: true })]));
  const invoke = async (args: string[], graph?: GraphProcessDependencies) => {
    let stdout = "";
    let stderr = "";
    const code = await runCli(args, {
      cwd: root,
      stdout: (value) => { stdout += value; },
      stderr: (value) => { stderr += value; },
      ...(graph === undefined ? {} : { graph }),
    });
    return { code, stdout, stderr };
  };

  const previousPath = process.env.PATH;
  process.env.PATH = "";
  try {
    const human = await invoke(["graph", "check", "--workspace", root]);
    assert.equal(human.code, EXIT_CODES.success);
    assert.match(human.stdout, /Warning:.*unavailable/i);
    const json = await invoke(["graph", "check", "--workspace", root, "--json"]);
    assert.equal(json.code, EXIT_CODES.success);
    assert.equal((JSON.parse(json.stdout) as { data: { available: boolean } }).data.available, false);
    assert.equal((await invoke(["index", "build", "--workspace", root])).code, EXIT_CODES.success);
    assert.equal((await invoke(["index", "check", "--workspace", root])).code, EXIT_CODES.success);
  } finally {
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
  }

  assert.equal((await invoke(["graph", "check", "extra"])).code, EXIT_CODES.usage);
  assert.equal((await invoke(["graph", "build", "extra"])).code, EXIT_CODES.usage);
  assert.equal((await invoke(["graph", "build"])).code, EXIT_CODES.usage);
  const built = await invoke(["graph", "build", "--allow-external", "--workspace", root, "--json"], {
    path: bin,
    spawn: (() => fakeProcess()) as typeof spawn,
  });
  assert.equal(built.code, EXIT_CODES.success);
  assert.deepEqual((JSON.parse(built.stdout) as { data: unknown }).data, {
    outcome: "success",
    exitCode: 0,
    output: "docs/harness/graphify-out",
  });
  assert.equal((await invoke(["graph", "check", "--unknown"])).code, EXIT_CODES.usage);
});
