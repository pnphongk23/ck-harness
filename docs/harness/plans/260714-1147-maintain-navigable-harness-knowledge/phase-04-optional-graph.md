---
phase: 4
title: "Optional Local Graph View"
status: completed
priority: P2
effort: "2-3 days"
dependencies: [1, 2]
decision_dependencies:
  - "[[DEC-003-index-watch-and-graph-runtime|DEC-003]]"
  - "[[DEC-006-graphify-directory-extraction-boundary|DEC-006]]"
---

# Phase 4: optional-graph

## Overview

Provide explicit local Graphify availability and build commands around a narrow
process adapter. Graph output is disposable: its absence or failure cannot
invalidate canonical Markdown navigation or the generated Markdown index.

## Implementation Steps

1. Define strict `harness graph check` and `harness graph build` grammars and
   stable human/JSON outcomes; do not probe or spawn Graphify for unrelated
   commands.
2. Implement local executable discovery and version reporting for `graph
   check`, returning a warning and remediation when absent without failure of
   otherwise valid canonical Harness state.
3. Implement `graph build` only for an explicit actor request with
   `--allow-external`: run Graphify 0.8.39's directory-oriented extraction over
   only `docs/harness/`, using `shell: false`, fixed `extract docs/harness --out
   docs/harness --no-cluster` arguments, repository-contained output, and
   propagated exit status.
4. Ensure graph output is marked disposable, ignored by index/watch discovery,
   and cleaned only through existing allowlisted cleanup behavior.
5. Add fake-executable tests for unavailable, version, success, non-zero,
   spawn error, argument safety, output isolation, and no network/agent/Git
   side effects in `tests/graph-adapter.test.ts`.

## Success Criteria

- [x] `harness graph check` reports usable local Graphify version or a warning
      with remediation, and missing Graphify does not fail valid Markdown
      navigation or `harness index check`.
- [x] `harness graph build --allow-external` is the only graph-spawning command,
      uses `shell: false`, limits Graphify input and output to `docs/harness/`,
      and propagates Graphify success or failure without modifying canonical
      Markdown outside its disposable output directory.
- [x] Graph output is repository-contained, disposable, excluded from canonical
      discovery, and its removal leaves all authored knowledge and index
      navigation intact.
- [x] Adapter tests prove no command spawns Graphify without explicit
      `--allow-external` acknowledgement, invokes an agent, or runs Git,
      release, or deployment operations.
- [x] `npm run build && node --test dist/tests/graph-adapter.test.js` passes
      for unavailable, directory-scoped input, permission, success, non-zero,
      spawn-error, symlink-rejection, and output-isolation cases.

## Verification Evidence

- `npm run build && node --test dist/tests/graph-adapter.test.js` — passed on
  2026-07-14: 6 tests passed, 0 failed. Fixtures cover unavailable/version
  checks, fixed shell-free directory arguments, permission before spawn,
  successful CLI routing, non-zero/spawn failures, symlink rejection,
  disposable output, strict CLI grammar, and independent index checks.
- `npm run build && node --test dist/tests/graph-adapter.test.js dist/tests/index-resolution.test.js dist/tests/index-watch.test.js dist/tests/cli-lifecycle.test.js`
  — passed on 2026-07-14: 31 focused tests passed, 0 failed.
- `npm run verify` — passed on 2026-07-14: TypeScript checks passed; 74 tests
  passed, 0 failed.
- `npm pack --dry-run --json` — passed on 2026-07-14: 66 allowlisted package
  entries; no compiled tests or Graphify output included.
- `git diff --check` — passed with no whitespace errors.
- Direct review confirmed only explicit graph commands reach the process
  adapter; build uses `shell: false`, fixed `extract docs/harness --out
  docs/harness --no-cluster` arguments, canonical repository cwd, bounded
  captured output, and rejects input symlinks. The adapter contains no direct
  network, agent, Git, release, or deployment operation; Graphify's configured
  backend is acknowledged explicitly through `--allow-external`.
