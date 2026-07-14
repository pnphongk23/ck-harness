---
schema_version: 1
title: Choose the index watcher and graph process runtime
relationships:
  specs: []
  decisions:
    - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
  source_paths:
    - src/index/index.ts
    - src/watcher/index.ts
type: decision
id: DEC-003
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Repository Maintainer
---

# DEC-003: Choose the index watcher and graph process runtime

## Context

The index must be byte-stable for unchanged logical content and `index check` is the CI correctness gate. Watch mode is only a convenience and filesystem notifications can be duplicated, coalesced, missing, or unreliable on some filesystems. Node.js 20 or newer is already required, and Graphify must remain an optional local executable invoked only by an explicit command.

## Decision

Use Chokidar notifications as normalized invalidation signals, not as authoritative change records. Perform a full deterministic Harness scan at watcher startup and after each debounced event batch. Ignore `.harness-tmp/`, Graphify output, and `index.md` events because R-020 makes the index CLI-owned. Preserve the last valid index when a scan is invalid.

Support an explicit polling mode for network, virtualized, or otherwise unreliable filesystems. If the watched root is removed, renamed, becomes unavailable, or the watcher reports an error, report degraded state and attempt a bounded rebind; never silently claim continued coverage.

Use the same full in-memory scanner and renderer for `index build`, `index check`, mutation reconciliation, and watch mode. `index check` never relies on a running watcher or its event history.

Implement Graphify behind a separate process adapter. `graph check` reports local availability and version; `graph build` spawns the executable with `shell: false` only after an explicit user command and propagates its exit status. No ordinary command imports or invokes an agent runtime.

## Alternatives

1. **Native `fs.watch` plus full debounced reconciliation.** This is the smallest runtime and recursive Linux support exists in Node versions newer than the project minimum. It still exposes platform-specific event names, atomic-save patterns, root replacement behavior, and filesystem caveats that the project would need to normalize itself.
2. **Chokidar plus full reconciliation — recommended.** Chokidar normalizes add/change/unlink and editor atomic-write patterns while preserving a native-watch default. It adds one focused runtime dependency but reduces cross-platform event interpretation code; full scans and `index check` remain necessary because no watcher is an authoritative ledger.
3. **Polling snapshots only.** Polling avoids reliance on native event delivery but consumes resources while idle and delays feedback. It remains an explicit fallback mode for unsupported, network, or virtualized filesystems rather than the default.

## Consequences

- Chokidar becomes the only new runtime dependency justified by FEAT-004; the CLI parser remains on Node built-ins.
- Watch code remains small because it schedules full reconciliation rather than maintaining a complex incremental cache or normalizing raw platform events.
- Debounce timing is configurable and tested; correctness does not depend on one exact millisecond value.
- Startup rebuild, self-write suppression, invalid-edit preservation, graceful shutdown, and rapid-burst behavior require integration tests.
- The CLI must warn when watching is unavailable or degraded, offer explicit polling mode, and direct users to `index check`; it must not claim watcher completeness.
- Ignoring `index.md` events is deliberate: manual index edits violate R-020 and `index check` detects stale generated content without a self-write loop.
- Graphify output is ignored and disposable, and its absence never invalidates canonical Markdown.

## Evidence

- [[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]
- [[DEC-002-minimal-file-mutations|DEC-002]]
- [[260714-0033-file-based-agent-harness/plan|Plan]]
- `src/index/index.ts` and `src/watcher/index.ts` are currently boundary stubs.
- Node.js documents recursive `fs.watch` support on Linux, AIX, and IBM i from Node 19.1 and documents platform/filesystem caveats: https://nodejs.org/download/release/latest-v22.x/docs/api/fs.html#fswatchfilename-options-listener
- Chokidar 5 is ESM-only, requires Node.js 20, and documents normalized events, recursive watching, editor atomic-write handling, polling, and resource trade-offs: https://github.com/paulmillr/chokidar

## Supersession

This decision supersedes no earlier decision.
