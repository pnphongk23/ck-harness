---
work_item: 1
title: "Derived Index Build and Publication"
status: completed
priority: P1
effort: "3-4 days"
dependencies: []
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
  - "[[DEC-002-minimal-file-mutations|DEC-002]]"
---

# Work Item 1: index-build

## Overview

Add the explicit `harness index build` mutation on top of FEAT-003's completed
in-memory scan and deterministic expected-index renderer. It publishes the
derived `docs/harness/index.md` only after the complete canonical view is valid
and only when its logical bytes changed.

## Implementation Steps

1. Confirm the delivered FEAT-003 scanner and renderer expose a complete,
   deterministic canonical view suitable for reuse; keep `index check` read-only.
2. Register strict `harness index build [--workspace PATH] [--json]` grammar
   and stable success, invalid-canonical-state, rejected-precondition, and
   usage outcomes under DEC-001.
3. Render the full index in memory with LF output, repository-relative POSIX
   paths, ordered artifacts, forward relationships, backlinks, and unresolved
   relationship evidence; do not add timestamps or host-dependent data.
4. Refuse publication when the canonical scan is invalid, preserving the
   existing index; otherwise compare expected bytes with the existing index and
   report unchanged content without opening a write path.
5. Publish changed content through DEC-002's validated temporary sibling,
   flush, atomic-replace boundary and preserve the prior index on handled
   failure.
6. Add CLI and filesystem fixtures in `tests/index-build.test.ts` for valid
   publication, canonical invalidity, unchanged rebuild, stale/missing derived
   index, and publication failure.

## Success Criteria

- [x] `harness index build` publishes a complete valid derived index only from
      valid canonical input; an invalid source is named and the previous index
      bytes remain unchanged.
- [x] A rebuild over equivalent logical input performs no index replacement and
      reports an unchanged outcome; repeated successful output is byte-stable
      with LF and repository-relative POSIX paths.
- [x] The generated index exposes every catalog artifact, resolvable forward
      relationship, backlink, and unresolved relationship in deterministic
      order, with no authored Markdown mutation outside `index.md`.
- [x] CLI and failure-injection tests prove strict grammar, stable JSON/exit
      semantics, and DEC-002-safe publication behavior.
- [x] `npm run build && node --test dist/tests/index-build.test.js` passes with
      fixtures for every publication and preservation outcome above.

## Verification Evidence

- `npm run build && node --test dist/tests/index-build.test.js` — passed on
  2026-07-14: 10 tests passed, 0 failed. Fixtures cover complete catalog and
  relationship rendering, unresolved source evidence, unchanged rebuild,
  invalid-source preservation, missing/stale index publication, injected
  publication failure, strict CLI grammar, JSON/human outcomes, and rejected
  uninitialized workspaces.
- `npm run verify` — passed on 2026-07-14: TypeScript checks passed; 53 tests
  passed, 0 failed.
- `git diff --check -- src/core/integrity.ts src/index/index.ts src/cli/index.ts tests/index-build.test.ts`
  — passed with no whitespace errors.
- Direct review confirmed index output uses LF, repository-relative POSIX paths,
  relative Markdown destinations, no timestamps or host paths, and derives
  sequence counters from canonical IDs when the prior index is unavailable.
- A direct build of this working tree was correctly rejected without mutation
  because pre-existing, out-of-scope canonical state contains a stale FEAT-005
  source path and another active Work Item. Those findings do not replace the
  isolated passing Work Item 1 evidence and must be resolved before Work Item 2 starts.
