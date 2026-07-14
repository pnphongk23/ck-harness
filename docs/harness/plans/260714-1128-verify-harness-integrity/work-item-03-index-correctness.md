---
work_item: 3
title: "Derived Index Correctness Gate"
status: completed
priority: P1
effort: "2-3 days"
dependencies: [1, 2]
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
---

# Work Item 3: Derived Index Correctness Gate

## Overview

Implement `harness index check` with the in-memory full scanner and a pure
deterministic renderer. The command is the CI correctness gate: it
validates canonical inputs, calculates expected derived state, and compares it
with persisted `docs/harness/index.md` without rebuilding it.

## Implementation Steps

1. Implement or extract a pure logical-index renderer from the full scan result
   with LF output, deterministic ordering, and no clock- or host-dependent
   fields.
2. Parse and validate the persisted index as CLI-owned derived state, reporting
   malformed, stale, missing, and inconsistent content with named sources.
3. Add `index check` to the strict CLI registry and make canonical validation a
   prerequisite to a successful correctness result.
4. Compare expected and persisted bytes in memory; return a failing outcome
   with actionable diff-oriented diagnostics and never call an index build,
   watcher, or write helper.
5. Add fixtures for current index, authored-document drift, malformed index,
   missing index, and equivalent repeated evidence.

## Success Criteria

- [x] `harness index check` succeeds only when canonical Harness documents are
      valid and the persisted index exactly matches the deterministic expected
      rendering.
- [x] A stale, missing, malformed, or inconsistent index produces a failing
      CI-suitable result that names the affected source and leaves every
      repository file unchanged.
- [x] Repeated checks over identical input produce identical expected bytes,
      findings, JSON output, and exit code.
- [x] Tests prove `index check` neither starts a watcher nor rebuilds, updates,
      or otherwise writes `docs/harness/index.md`.

## Verification Evidence

- `npm run check && npm test` passed on 2026-07-14: TypeScript typecheck passed
  and 38 tests passed, including deterministic expected-byte comparison,
  stale/malformed/missing-index diagnostics, strict CLI grammar, stable JSON
  outcomes, and before/after workspace snapshots.
- Source review confirmed `checkIndex` reads only through `readFile`; it has no
  watcher, build, process, or write-helper import or call path.
