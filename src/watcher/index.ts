import { watch, type ChokidarOptions, type FSWatcher } from "chokidar";
import { basename, resolve, sep } from "node:path";
import { buildIndex, type IndexBuildResult } from "../index/index.js";
import { exists, HarnessError, repositoryPaths } from "../fs/repository.js";
import type { IntegrityFinding } from "../core/integrity.js";

export const WATCHER_BOUNDARY = "reconciliation-only" as const;

export interface WatcherOptions {
  workspace: string;
  poll?: boolean;
  debounceMs?: number;
  rebindAttempts?: number;
  rebindBaseDelayMs?: number;
  signal?: AbortSignal;
  onEvent?: (event: WatcherEvent) => void;
  createWatcher?: (path: string, options: ChokidarOptions) => FSWatcher;
}

export type WatcherEvent =
  | { type: "ready"; result: IndexBuildResult }
  | { type: "reconciled"; result: IndexBuildResult }
  | { type: "degraded"; reason: string; findings?: readonly IntegrityFinding[] }
  | { type: "rebind"; attempt: number; max: number }
  | { type: "exhausted"; reason: string }
  | { type: "shutdown" };

export interface WatcherResult {
  outcome: "shutdown" | "exhausted";
  reason?: string;
}

const remediation = "Run `harness index build` or `harness index check` to verify canonical state.";

export async function watchHarness(options: WatcherOptions): Promise<WatcherResult> {
  const debounceMs = options.debounceMs ?? 200;
  const rebindAttempts = options.rebindAttempts ?? 3;
  const rebindBaseDelayMs = options.rebindBaseDelayMs ?? 1000;
  validateInteger(debounceMs, "debounceMs", true);
  validateInteger(rebindAttempts, "rebindAttempts", false);
  validateInteger(rebindBaseDelayMs, "rebindBaseDelayMs", true);

  const paths = await repositoryPaths(options.workspace);
  let watcher: FSWatcher | undefined;
  let debounceTimer: NodeJS.Timeout | undefined;
  let rebindTimer: NodeJS.Timeout | undefined;
  let stopped = false;
  let settled = false;
  let reconciling = false;
  let reconciliationPending = false;
  let rebinding = false;
  let rebindAttempt = 0;

  const emit = (event: WatcherEvent): void => options.onEvent?.(event);

  return new Promise<WatcherResult>((resolveResult) => {
    const settle = (result: WatcherResult): void => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", abortHandler);
      resolveResult(result);
    };

    const closeWatcher = async (): Promise<void> => {
      const current = watcher;
      watcher = undefined;
      if (current) await current.close();
    };

    const stop = async (result: WatcherResult, announceShutdown: boolean): Promise<void> => {
      if (stopped) return;
      stopped = true;
      reconciliationPending = false;
      clearTimeout(debounceTimer);
      clearTimeout(rebindTimer);
      await closeWatcher();
      if (announceShutdown) emit({ type: "shutdown" });
      settle(result);
    };

    const abortHandler = (): void => {
      void stop({ outcome: "shutdown" }, true);
    };

    const degraded = (reason: string, findings?: readonly IntegrityFinding[]): void => {
      emit(findings === undefined
        ? { type: "degraded", reason: `${reason} ${remediation}` }
        : { type: "degraded", reason: `${reason} ${remediation}`, findings });
    };

    const reconcile = async (): Promise<void> => {
      if (stopped || rebinding) return;
      if (reconciling) {
        reconciliationPending = true;
        return;
      }
      reconciling = true;
      try {
        const result = await buildIndex(paths.root);
        if (stopped) return;
        if (result.outcome === "success") {
          emit({ type: "reconciled", result });
        } else {
          degraded("Canonical Harness content is invalid; the last valid index was preserved.", result.findings);
        }
      } catch (error) {
        if (!stopped) degraded(`Index reconciliation failed: ${errorMessage(error)}.`);
      } finally {
        reconciling = false;
        if (reconciliationPending && !stopped && !rebinding) {
          reconciliationPending = false;
          scheduleReconciliation();
        }
      }
    };

    const scheduleReconciliation = (): void => {
      if (stopped || rebinding) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void reconcile(), debounceMs);
    };

    const exhaust = async (reason: string): Promise<void> => {
      const message = `${reason} Rebind attempts exhausted. ${remediation}`;
      emit({ type: "exhausted", reason: message });
      await stop({ outcome: "exhausted", reason: message }, false);
    };

    const rebind = async (reason: string): Promise<void> => {
      if (stopped || rebinding) return;
      rebinding = true;
      clearTimeout(debounceTimer);
      reconciliationPending = false;
      await closeWatcher();

      while (!stopped && rebindAttempt < rebindAttempts) {
        rebindAttempt += 1;
        emit({ type: "rebind", attempt: rebindAttempt, max: rebindAttempts });
        const delay = rebindBaseDelayMs * (2 ** (rebindAttempt - 1));
        await abortableDelay(delay, options.signal, (timer) => { rebindTimer = timer; });
        if (stopped) return;
        if (!(await exists(paths.harness))) continue;
        try {
          await bindWatcher();
          if (stopped) return;
          rebinding = false;
          const result = await buildIndex(paths.root);
          if (stopped) return;
          if (result.outcome === "success") {
            rebindAttempt = 0;
            emit({ type: "reconciled", result });
          } else {
            degraded("Coverage was restored, but canonical Harness content is invalid; the last valid index was preserved.", result.findings);
          }
          return;
        } catch (error) {
          degraded(`Watcher rebind attempt ${rebindAttempt} failed: ${errorMessage(error)}.`);
          await closeWatcher();
        }
      }

      if (!stopped) await exhaust(reason);
    };

    const bindWatcher = async (): Promise<void> => {
      if (stopped) return;
      const next = (options.createWatcher ?? watch)(paths.harness, {
        ignoreInitial: true,
        ...(options.poll === undefined ? {} : { usePolling: options.poll }),
        ignored: (testPath: string) => ignoredPath(testPath, paths.harness),
      });
      watcher = next;
      next.on("all", (eventName, eventPath) => {
        if (stopped || watcher !== next) return;
        if (eventName === "unlinkDir" && resolve(eventPath) === resolve(paths.harness)) {
          degraded("Watched Harness root was removed or replaced; coverage is degraded.");
          queueMicrotask(() => void rebind("Watched Harness root is unavailable."));
          return;
        }
        scheduleReconciliation();
      });
      next.on("error", (error: unknown) => {
        if (stopped || watcher !== next) return;
        degraded(`Watcher reported an error: ${errorMessage(error)}.`);
        queueMicrotask(() => void rebind("Watcher coverage failed."));
      });
      await new Promise<void>((resolveReady, rejectReady) => {
        const ready = (): void => finish(resolveReady);
        const failed = (error: unknown): void => finish(() => rejectReady(error));
        const aborted = (): void => finish(resolveReady);
        const finish = (complete: () => void): void => {
          next.removeListener("ready", ready);
          next.removeListener("error", failed);
          options.signal?.removeEventListener("abort", aborted);
          complete();
        };
        next.once("ready", ready);
        next.once("error", failed);
        options.signal?.addEventListener("abort", aborted, { once: true });
      });
    };

    const start = async (): Promise<void> => {
      try {
        const initial = await buildIndex(paths.root);
        if (stopped) return;
        if (initial.outcome === "failure") {
          degraded("Initial canonical Harness scan is invalid; the last valid index was preserved.", initial.findings);
        }
        await bindWatcher();
        if (!stopped) emit({ type: "ready", result: initial });
      } catch (error) {
        if (!stopped) {
          degraded(`Initial index reconciliation failed: ${errorMessage(error)}.`);
          await rebind("Initial watcher coverage is unavailable.");
        }
      }
    };

    if (options.signal?.aborted) {
      abortHandler();
      return;
    }
    options.signal?.addEventListener("abort", abortHandler, { once: true });
    void start();
  });
}

function ignoredPath(testPath: string, harnessRoot: string): boolean {
  const absolute = resolve(testPath);
  const name = basename(absolute);
  if (absolute === resolve(harnessRoot, "index.md")) return true;
  const graphOutput = resolve(harnessRoot, "graphify-out");
  if (absolute === graphOutput || absolute.startsWith(`${graphOutput}${sep}`)) return true;
  if (name === ".harness-tmp" || name === ".harness.lock") return true;
  return /^.*\.harness-(?:tmp|rollback)-.*$/.test(name);
}

function validateInteger(value: number, name: string, allowZero: boolean): void {
  if (!Number.isSafeInteger(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new HarnessError(`${name} must be a ${allowZero ? "non-negative" : "positive"} integer`, "usage");
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function abortableDelay(
  milliseconds: number,
  signal: AbortSignal | undefined,
  capture: (timer: NodeJS.Timeout) => void,
): Promise<void> {
  if (milliseconds === 0 || signal?.aborted) return;
  await new Promise<void>((resolveDelay) => {
    const finish = (): void => {
      signal?.removeEventListener("abort", finish);
      resolveDelay();
    };
    const timer = setTimeout(finish, milliseconds);
    capture(timer);
    signal?.addEventListener("abort", finish, { once: true });
  });
}
