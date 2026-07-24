---
work_item: 2
title: Versioned graph and lexical index
status: completed
priority: P1
effort: 3-4 days
dependencies:
  - 1
decision_dependencies:
  - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  - "[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]]"
---

# Work Item 2: Versioned graph and lexical index

**Kind:** technical

## Tasks

1. Define the strict Zod v1 artifact schema from `design.md`, including engine
   versions/options digest, source/content digests, documents, logical edges and
   occurrences, unresolved evidence, lexical document IDs, and MiniSearch state.
   Reject unknown fields and every model invariant violation. [x]
2. Build one MiniSearch record per graph node over path/title/headings/body using
   fixed NFC/lowercase processing, no stemming/stop words/fuzzy/prefix behavior,
   and the approved fields/store fields. Assert exact node/index ID parity before
   serialization. [x]
3. Implement stable two-space JSON serialization with a trailing newline and no
   timestamp. Enforce the 128 MiB byte limit before publication and before
   query-side parsing. [x]
4. Add `graph-out/` to repository-owned disposable paths, cleanup preview and
   confirmation, Markdown discovery exclusions, and watcher invalidation
   exclusions. Preserve `graphify-out/` only as excluded cleanup compatibility;
   do not write new data there. [x]
5. Build complete artifact bytes from the consistent Work Item 1 snapshot and
   publish only `graph-out/retrieval-index.json` through `applyMutation()` with a
   staged reparse/invariant validation hook. Preserve prior bytes on every
   failure and report unchanged output when bytes already match. [x]
6. Implement artifact loading and internal validation independently from source
   freshness. Implement a freshness check that recomputes the current eligible
   source digest and compares it with the validated artifact. [x]
7. Test MiniSearch serialize/load round-trips, graph/index parity, malformed and
   prototype-bearing JSON, incompatible schema/engine/options, dangling edges,
   occurrence partition failures, output limits, atomic conflicts/rollback,
   stale digests, configured layouts, cleanup, and watcher self-exclusion. [x]

## Scope and affected files

- `src/graph/artifact.ts` (new)
- `src/graph/build.ts` (new)
- `src/graph/index.ts`
- `src/fs/repository.ts`
- `src/core/lifecycle.ts`
- `src/watcher/index.ts`
- `src/fs/atomic-write.ts` only if the existing validation hook cannot express
  staged artifact verification without weakening other writers
- `tests/graph-artifact.test.ts` (new)
- `tests/graph-build.test.ts` (new)
- `tests/cli-lifecycle.test.ts`
- `tests/index-resolution.test.ts`
- `tests/index-watch.test.ts`
- `tests/mutations.test.ts`
- `tests/repository-paths.test.ts`

No public CLI grammar or lexical/related result shaping belongs to this Work
Item.

## Success criteria

- [x] One logical model produces one byte-stable `retrieval-index.json` whose
  node IDs, lexical IDs, edge references, occurrence partition, and digests all
  validate.
- [x] MiniSearch serialized state loads with the exact v1 options and returns the
  same IDs/scores/match evidence as the pre-serialization instance.
- [x] Shuffled discovery and repeated unchanged builds produce identical bytes
  and do not replace the output.
- [x] A malformed, incompatible, internally incomplete, stale, or oversized
  artifact returns specific graph evidence without modifying canonical files.
- [x] Parse, second-read, size, lock, staging, validation, rename, and injected
  partial-publication failures preserve the previous complete artifact bytes.
- [x] `graph-out/` is excluded from graph/index discovery and watch events and is
  removed only by explicit cleanup; `graphify-out/` remains cleanup-only.
- [x] Default and configured Harness roots publish and clean only their resolved
  contained output path.

## Risks

- MiniSearch's JSON is library-version coupled. The surrounding schema records
  the exact engine/options versions and refuses incompatible loads.
- `cleanHarness()` currently depends on allowlist ordering. Replace positional
  assumptions with explicit disposable-path ownership or prove the new order at
  every test; do not broaden deletion targets.
- A single artifact can consume memory twice during serialization. Enforce the
  size limit before staging and retain clear precondition errors.
- Source freshness and artifact validity are different checks. Tests and types
  must not make a valid historical snapshot look live without digest comparison.

## Required evidence

- `npm run verify`: TypeScript check and 120/120 tests passed.
- `graph-artifact.test.ts`: stable repeated-build bytes, MiniSearch round-trip,
  malformed/prototype/incompatible artifact rejection, invariant checks, and
  serialization boundary.
- `graph-model.test.ts`: deterministic snapshot, source digest, symlink and
  disposable-output exclusion evidence.
- Existing mutation, cleanup, watcher, custom-layout, and index suites pass.
- `git diff --check`: passed.
