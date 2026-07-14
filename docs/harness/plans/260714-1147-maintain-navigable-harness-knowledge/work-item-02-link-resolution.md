---
work_item: 2
title: "Deterministic Wikilink Resolution"
status: completed
priority: P1
effort: "2-3 days"
dependencies: [1]
decision_dependencies: []
---

# Work Item 2: link-resolution

## Overview

Make local wikilink resolution deterministic. The target is an exact local
basename; text after `|` is a display label only and never a second target
namespace. Broken and ambiguous targets remain visible evidence rather than
guessed relationships.

## Implementation Steps

1. Define the eligible local target namespace for artifacts, plans, and Work Items
   from canonical paths; parse `[[target|label]]` as target plus display-only
   label and exclude generated output and paths outside the repository.
2. Build a sorted candidate map that preserves all duplicate candidates rather
   than overwriting one while collecting the index logical view.
3. Resolve only exact basenames; classify every link as resolved, broken, or
   ambiguous with source path and candidate evidence, without interpreting a
   display label as an alias.
4. Feed only resolved links into forward/backlink edges, and render broken or
   ambiguous links in an ordered unresolved section without choosing a target.
5. Align shared diagnostic identifiers and messages with FEAT-003 where
   applicable without broadening `validate` or `index check` behavior.
6. Add fixtures for exact links with and without display labels, basename
   collisions, broken links, plan/Work Item targets, and shuffled file discovery
   in `tests/index-resolution.test.ts`.

## Success Criteria

- [x] Exact basename links, including links with a display label, resolve to
      the same stable target regardless of filesystem enumeration order; a
      display label never changes target selection.
- [x] Broken links name their source; ambiguous links name their source and all
      candidates, and neither produces a forward edge or backlink by guessing.
- [x] Repeated fixture builds produce identical resolution classifications,
      index bytes, forward edges, backlinks, and unresolved-link ordering.
- [x] Tests prove local resolution never reads outside the repository or treats
      generated index/graph output as canonical link targets.
- [x] `npm run build && node --test dist/tests/index-resolution.test.js` passes
      and exercises exact, labeled, broken, ambiguous, and shuffled-discovery
      fixtures.

## Verification Evidence

- `npm run build && node --test dist/tests/index-resolution.test.js` — passed
  on 2026-07-14: 6 tests passed, 0 failed. Fixtures cover exact and labeled
  targets, label isolation, broken and ambiguous evidence, plan/Work Item targets,
  shuffled creation order, generated output exclusion, and an outside-file
  symlink that is not followed.
- `node --test dist/tests/index-build.test.js` — passed on 2026-07-14: 10
  Work Item 1 regression tests passed, 0 failed.
- `npm run verify` — passed on 2026-07-14: TypeScript checks passed; 59 tests
  passed, 0 failed.
- `git diff --check -- src/core/integrity.ts tests/index-resolution.test.ts tests/index-build.test.ts`
  — passed with no whitespace errors.
- Direct code review confirmed renderer and validation diagnostics share one
  sorted candidate resolver; only exactly one candidate produces edges, and
  ambiguous remediation does not suggest an unsupported guessed namespace.
