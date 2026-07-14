---
phase: 5
title: "Index Watcher and Knowledge Graph"
status: pending
priority: P1
effort: "4-5 days"
dependencies: [2, 4]
---

# Phase 5: Index Watcher and Knowledge Graph

## Overview

Build the derived Markdown index, backlink graph, stale-index check, and cross-platform watcher. Graphify is optional enrichment; the harness remains fully navigable from `index.md` and wikilinks when Graphify is absent.

## Index Contract

`docs/harness/index.md` contains CLI-owned frontmatter plus a generated body:

- Schema version and monotonic counters.
- Last generated time and logical content hash.
- Directory tree.
- Feature, decision, CK plan, report, rule, and spec catalogs.
- Forward links and backlinks.
- Broken and ambiguous wikilinks.
- Duplicate IDs, filename/frontmatter mismatches, orphan documents, and TBD summary.
- Rule candidates grouped by `recurrence_key`.

Generated ordering is stable by artifact type, numeric ID, then path. Timestamps are excluded from equality checks so `index check` remains deterministic.

## Watcher Contract

- Watch `docs/harness/**/*.md` except generated/cache outputs.
- Debounce burst events and coalesce rename patterns.
- Ignore the watcher own `index.md` replacement.
- Reparse changed files incrementally, then render a complete index snapshot.
- Preserve the last valid index when an edited file is invalid; report the error visibly.
- `watch` is convenience only. `index check` is the correctness gate for CI and handoff.

## Knowledge Graph Contract

- Parse Obsidian `[[target]]` and `[[target|label]]` links locally.
- Resolve ID aliases and exact basenames deterministically; report ambiguity rather than guessing.
- Keep Graphify output such as `graphify-out/` ignored and disposable.
- `harness graph check` detects availability and version.
- `harness graph build` invokes Graphify only on explicit user command and propagates its exit status.

## Related Code Files

- Create: `src/indexer/`, `src/watcher/`, `src/graph/`.
- Create: index fixtures with valid, broken, ambiguous, cyclic, and renamed links.
- Modify: `.gitignore` for Graphify and transient watcher output.

## Implementation Steps

1. Implement artifact discovery and canonical sorting.
2. Implement wikilink parsing, alias resolution, forward edges, and backlinks.
3. Implement deterministic index rendering and logical hashing.
4. Preserve counters when rebuilding the derived body.
5. Implement `index build` and in-memory `index check` comparison.
6. Implement watcher debounce, self-write suppression, invalid-edit behavior, and graceful shutdown.
7. Add tests for insert, delete, move, slug rename, rapid edit bursts, and index self-updates.
8. Implement optional Graphify check/build wrapper without making it a required dependency.
9. Document Obsidian usage and generated-output cleanup.

## Risks

- Watch events may be dropped; full rebuild on startup and explicit `index check` close the gap.
- Wikilink aliases can be ambiguous; full basenames are canonical, aliases are display/discovery aids.
- A generated timestamp can make every check dirty; hash logical content and update the file only when the body or counters change.

## Success Criteria

- [ ] Index output is byte-stable for unchanged logical content.
- [ ] Insert, delete, move, and rename events reconcile without an infinite write loop.
- [ ] Backlinks and broken links identify exact source files.
- [ ] `index check` exits nonzero for stale, invalid, or inconsistent state.
- [ ] Missing Graphify produces a warning, not a harness failure.
- [ ] Graphify output is removable without losing canonical harness data.
