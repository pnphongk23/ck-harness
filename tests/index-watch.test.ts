import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import type { FSWatcher } from "chokidar";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { watchHarness, type WatcherEvent } from "../src/watcher/index.js";
import { EXIT_CODES, runCli } from "../src/cli/index.js";

async function harnessFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-index-watch-"));
  const harness = join(root, "docs", "harness");
  await mkdir(join(harness, "features"), { recursive: true });
  await writeFile(join(harness, "index.md"), "---\nschema_version: 1\ngenerated: true\n---\n\n# Harness Index\n");
  return root;
}

const featureBody = `# Feature

## Introduction

Purpose.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Contributor | Business role | Maintain Harness | Edit canonical documents |

### User needs

Reliable reconciliation.

### Main flow

1. **Actor:** The contributor edits a document. **System:** The index is reconciled.

### Alternative flows

- Source step: 1. Condition: edits are coalesced. Behavior: reconcile once. Ends with: a current index.

### Exception flows

- Source step: 1. Failure: input is invalid. Handling: preserve the index. Prohibited: partial publication. Failure postcondition: prior bytes remain.

### Postconditions

The complete index is current or the last valid snapshot is preserved.

## Requirements

- Reconciliation uses a complete scan.

## Acceptance

- [ ] Valid edits publish a complete snapshot.

## Relationships

- None.
`;

function featureDocument(id: string): string {
  return `---
schema_version: 1
type: feature
id: ${id}
title: Test ${id}
status: draft
created: 2026-07-14
relationships:
  specs: []
  decisions: []
  plans: []
  reports: []
  rules: []
  features: []
  source_paths: []
---
${featureBody}`;
}

async function invoke(args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const code = await runCli(args, {
    cwd,
    stdout: (value) => { stdout += value; },
    stderr: (value) => { stderr += value; },
  });
  return { code, stdout, stderr };
}

async function waitFor(predicate: () => boolean, label: string, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("watcher performs one initial reconciliation and shuts down gracefully", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  await writeFile(join(root, "docs", "harness", "features", "FEAT-001-test.md"), featureDocument("FEAT-001"));

  const events: WatcherEvent[] = [];
  const ac = new AbortController();

  const promise = watchHarness({
    workspace: root,
    debounceMs: 50,
    signal: ac.signal,
    onEvent: (e) => {
      events.push(e);
      if (e.type === "ready") {
        ac.abort();
      }
    }
  });

  const result = await promise;
  assert.equal(result.outcome, "shutdown");
  
  const ready = events.find(e => e.type === "ready");
  assert.ok(ready);
  if (ready.type === "ready") {
     assert.equal(ready.result.outcome, "success");
     assert.equal(ready.result.unchanged, false);
  }

  const shutdown = events.find(e => e.type === "shutdown");
  assert.ok(shutdown);
});

test("watcher coalesces bursts of add/change/unlink/rename", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const events: WatcherEvent[] = [];
  const ac = new AbortController();

  const promise = watchHarness({
    workspace: root,
    debounceMs: 50,
    signal: ac.signal,
    onEvent: (e) => {
      events.push(e);
      if (e.type === "reconciled" && events.filter(ev => ev.type === "reconciled").length === 1) {
         ac.abort();
      }
    }
  });

  await waitFor(() => events.some((event) => event.type === "ready"), "watcher ready");

  const harness = join(root, "docs", "harness");
  await writeFile(join(harness, "features", "FEAT-001-test.md"), featureDocument("FEAT-001"));
  await writeFile(join(harness, "features", "FEAT-002-test.md"), featureDocument("FEAT-002"));
  await rm(join(harness, "features", "FEAT-001-test.md"));
  await writeFile(join(harness, "features", "FEAT-002-test.md"), featureDocument("FEAT-002"));
  await rename(join(harness, "features", "FEAT-002-test.md"), join(harness, "features", "FEAT-003-test.md"));
  await writeFile(join(harness, "features", "FEAT-003-test.md"), featureDocument("FEAT-003"));

  await promise;

  const reconciled = events.filter(e => e.type === "reconciled");
  assert.equal(reconciled.length, 1);
});

test("watcher recovers from invalid edits while preserving previous valid bytes", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const events: WatcherEvent[] = [];
  const ac = new AbortController();
  
  const harness = join(root, "docs", "harness");
  await writeFile(join(harness, "features", "FEAT-001-test.md"), featureDocument("FEAT-001"));

  const promise = watchHarness({
    workspace: root,
    debounceMs: 50,
    signal: ac.signal,
    onEvent: (e) => {
      events.push(e);
      if (e.type === "reconciled") {
         ac.abort();
      }
    }
  });

  await waitFor(() => events.some((event) => event.type === "ready"), "watcher ready");

  const initialIndex = await readFile(join(harness, "index.md"), "utf8");

  await writeFile(join(harness, "features", "FEAT-002-test.md"), "invalid");
  
  await waitFor(() => events.some((event) => event.type === "degraded"), "degraded state");

  const currentIdx = await readFile(join(harness, "index.md"), "utf8");
  assert.equal(currentIdx, initialIndex);

  await writeFile(join(harness, "features", "FEAT-002-test.md"), featureDocument("FEAT-002"));

  await promise;
  
  const reconciled = events.filter(e => e.type === "reconciled");
  assert.equal(reconciled.length, 1);
});

test("watcher does not loop on its own outputs or temp files", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const events: WatcherEvent[] = [];
  const ac = new AbortController();

  const promise = watchHarness({
    workspace: root,
    debounceMs: 50,
    signal: ac.signal,
    onEvent: (e) => {
      events.push(e);
    }
  });

  await waitFor(() => events.some((event) => event.type === "ready"), "watcher ready");

  const harness = join(root, "docs", "harness");
  await writeFile(join(harness, "index.md"), "ignore");
  await writeFile(join(harness, ".harness-tmp-123"), "ignore");
  await writeFile(join(harness, ".harness-rollback-123"), "ignore");
  await writeFile(join(harness, ".harness.lock"), "ignore");
  await mkdir(join(harness, ".harness-tmp"));
  await writeFile(join(harness, ".harness-tmp", "partial.md"), "ignore");
  await mkdir(join(harness, "graphify-out"));
  await writeFile(join(harness, "graphify-out", "graph.json"), "ignore");

  await new Promise(r => setTimeout(r, 200));
  ac.abort();
  await promise;

  const reconciled = events.filter(e => e.type === "reconciled");
  assert.equal(reconciled.length, 0);
});

test("watcher performs bounded rebinds on root loss", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const events: WatcherEvent[] = [];

  const harness = join(root, "docs", "harness");
  
  const promise = watchHarness({
    workspace: root,
    debounceMs: 10,
    rebindAttempts: 2,
    rebindBaseDelayMs: 10,
    onEvent: (e) => {
      events.push(e);
    }
  });

  await waitFor(() => events.some((event) => event.type === "ready"), "watcher ready");

  await rm(harness, { recursive: true, force: true });

  const result = await promise;
  assert.equal(result.outcome, "exhausted");

  const rebinds = events.filter(e => e.type === "rebind");
  assert.equal(rebinds.length, 2);
});

test("watcher errors report degraded coverage and exhaust bounded rebinds", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const events: WatcherEvent[] = [];
  let first: EventEmitter | undefined;
  let closeCount = 0;
  let creations = 0;
  const createWatcher = (): FSWatcher => {
    creations += 1;
    if (creations > 1) throw new Error("injected watcher bind failure");
    const emitter = new EventEmitter();
    first = emitter;
    Object.assign(emitter, {
      close: async () => { closeCount += 1; },
    });
    queueMicrotask(() => emitter.emit("ready"));
    return emitter as FSWatcher;
  };

  const promise = watchHarness({
    workspace: root,
    rebindAttempts: 2,
    rebindBaseDelayMs: 0,
    createWatcher,
    onEvent: (event) => events.push(event),
  });
  await waitFor(() => events.some((event) => event.type === "ready"), "injected watcher ready");
  first!.emit("error", new Error("injected watcher error"));

  const result = await promise;
  assert.equal(result.outcome, "exhausted");
  assert.equal(closeCount, 1);
  assert.equal(events.filter((event) => event.type === "rebind").length, 2);
  assert.ok(events.some((event) => event.type === "degraded" && /injected watcher error/.test(event.reason)));
  assert.ok(events.some((event) => event.type === "exhausted" && /index check/.test(event.reason)));
});

test("explicit polling option works", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const ac = new AbortController();
  const events: WatcherEvent[] = [];
  const promise = watchHarness({
    workspace: root,
    poll: true,
    debounceMs: 50,
    signal: ac.signal,
    onEvent: e => {
      events.push(e);
      if (e.type === "ready") {
         ac.abort();
      }
    }
  });
  
  await promise;
  assert.ok(events.some(e => e.type === "ready"));
});

test("index watch CLI numeric options validation", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const neg = await invoke(["index", "watch", "--debounce", "-1", "--workspace", root], root);
  assert.equal(neg.code, EXIT_CODES.usage);
  
  const zeroRebind = await invoke(["index", "watch", "--rebind-attempts", "0", "--workspace", root], root);
  assert.equal(zeroRebind.code, EXIT_CODES.usage);

  const fractional = await invoke(["index", "watch", "--rebind-attempts", "1.5", "--workspace", root], root);
  assert.equal(fractional.code, EXIT_CODES.usage);

  const notNumeric = await invoke(["index", "watch", "--debounce", "soon", "--workspace", root], root);
  assert.equal(notNumeric.code, EXIT_CODES.usage);

  const extraPos = await invoke(["index", "watch", "extra", "--workspace", root], root);
  assert.equal(extraPos.code, EXIT_CODES.usage);

  const unknown = await invoke(["index", "watch", "--unknown", "--workspace", root], root);
  assert.equal(unknown.code, EXIT_CODES.usage);
});

test("index check remains independent", async (t) => {
  const root = await harnessFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const built = await invoke(["index", "build", "--workspace", root], root);
  assert.equal(built.code, EXIT_CODES.success);
  const chk = await invoke(["index", "check", "--workspace", root], root);
  assert.equal(chk.code, EXIT_CODES.success);
});
