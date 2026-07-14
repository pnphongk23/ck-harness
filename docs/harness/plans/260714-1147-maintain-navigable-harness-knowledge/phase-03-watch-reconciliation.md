---
phase: 3
title: "Explicit Watch Reconciliation"
status: completed
priority: P1
effort: "3-4 days"
dependencies: [1, 2]
decision_dependencies:
  - "[[DEC-003-index-watch-and-graph-runtime|DEC-003]]"
---

# Phase 3: watch-reconciliation

## Overview

Implement opt-in `harness index watch` using DEC-003's Chokidar invalidation
signals and full deterministic reconciliation. Watch is a convenience view, not
a correctness gate, and must preserve the last valid index through invalid
edits or degraded coverage.

## Implementation Steps

1. Add the approved watcher dependency and strict watch grammar, including
   explicit polling mode and configurable debouncing under DEC-003.
2. Perform one initial full reconciliation, then coalesce normalized change
   notifications into bounded full scans and reuse the Phase 1 build path.
3. Exclude `.harness-tmp/`, Graphify output, `docs/harness/index.md`, and
   Harness temporary or rollback sibling files matching `.*.harness-tmp-*` or
   `.*.harness-rollback-*` from invalidation; never infer correctness from
   event history.
4. On invalid edits, failed scans, root replacement, watcher errors, or lost
   coverage, retain the last valid index, emit source-specific degraded state,
   and direct the maintainer to `harness index build` or `harness index check`.
5. Attempt DEC-003's bounded rebind behavior with a configurable maximum,
   defaulting to three exponential-backoff attempts; then remain degraded,
   report remediation, and stop retrying. Support graceful signal shutdown and
   ensure no timers, watcher handles, or child processes remain.
6. Add controlled integration tests for startup, atomic saves, additions,
   moves, deletes, rename bursts, self-publication, invalid-then-valid edits,
   polling, root loss, bounded rebind, and shutdown in `tests/index-watch.test.ts`.

## Success Criteria

- [x] Starting watch performs exactly one initial full reconciliation and each
      bounded edit burst causes at most the documented coalesced reconciliation,
      without an index self-write loop.
- [x] Invalid watched input, watcher errors, and degraded root coverage report
      actionable state while preserving the last valid index bytes; a later
      valid edit can publish a new complete snapshot.
- [x] Native and explicit polling fixtures cover add/change/unlink/rename
      behavior, root loss, bounded rebind, graceful shutdown, and no leaked
      watcher or timer handles.
- [x] Tests show watch does not make CI claims and that `index check` works
      independently of a running watcher or its event history.
- [x] `npm run build && node --test dist/tests/index-watch.test.js` passes,
      including sibling temporary-file suppression and exhausted-rebind behavior.

## Verification Evidence

- `npm run build && node --test dist/tests/index-watch.test.js` — passed on
  2026-07-14: 9 tests passed, 0 failed. Fixtures cover initial reconciliation,
  add/change/unlink/rename burst coalescing, invalid-to-valid recovery, index and
  temporary-output suppression, native root loss, injected watcher failure,
  bounded rebind exhaustion, polling, strict CLI numbers, graceful shutdown,
  and independent `index check` behavior.
- `npm run build && node --test dist/tests/index-build.test.js dist/tests/index-resolution.test.js dist/tests/index-watch.test.js`
  — passed on 2026-07-14: 25 Phase 1-3 tests passed, 0 failed.
- `npm run verify` — passed on 2026-07-14: TypeScript checks passed; 68 tests
  passed, 0 failed.
- `git diff --check -- package.json package-lock.json src/watcher/index.ts src/cli/index.ts tests/index-watch.test.ts`
  — passed with no whitespace errors.
- Direct review confirmed Chokidar notifications only invalidate a full
  `buildIndex` reconciliation; watcher/root failures close the prior watcher,
  retry with bounded exponential backoff, report command remediation, and
  leave no active watcher or timer after shutdown or exhaustion.
