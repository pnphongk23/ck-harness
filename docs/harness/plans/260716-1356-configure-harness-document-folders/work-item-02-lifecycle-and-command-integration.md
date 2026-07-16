---
work_item: 2
title: "Lifecycle and Command Integration"
status: completed
priority: P1
effort: "3-4 days"
dependencies: [1]
decision_dependencies: []
---

# Work Item 2: Lifecycle and Command Integration

## Scope

Route initialization, artifact lifecycle operations, template and workflow
publication, cleanup, and CLI workspace resolution through the effective
layout. Preserve existing IDs, filenames, atomic writes, and user content.

## Implementation steps

1. Replace lifecycle joins based on `paths.harness` or literal directory names
   with logical paths from the resolved layout, including Plans where required.
2. Change `withRepositoryLock()` and its tests to receive the effective lock
   location; it must never create `docs/harness/` in a configured repository.
3. Limit backlink discovery, rename rewrite, deletion checks, cleanup, and
   temporary-sibling traversal to configured logical collections and owned
   disposable locations, never all Markdown below a broad root.
4. Make initialization create only the effective allowlisted collections,
   copy canonical templates and workflows to their configured locations, and
   create the derived index under the configured root without relocating old
   documents.
5. Retain root-level `.agents/skills` publication as a runtime-owned location;
   ensure its initialization remains independent of configured document folders.
6. Update create/list/show/rename/deprecate/delete and cleanup paths to report
   repository-relative effective locations and to preserve existing filename,
   ID, link, locking, and rollback contracts.
7. Update CLI workspace and error formatting only as needed to expose resolved
   locations; do not add a configuration command or change strict CLI grammar.
8. Add lifecycle and mutation fixtures that assert custom layouts are created and used,
   default fixtures are unchanged, and a layout change reports missing expected
   documents rather than reading the old location.

## Success criteria

- [x] `harness init` is idempotent and creates only missing configured paths;
      a default fixture retains current output exactly.
- [x] Every supported artifact kind is created and validated in its configured
      logical folder while retaining canonical names and ID agreement.
- [x] Cleanup affects only configured owned disposable output and never sibling
      repository documentation under a broad root such as `docs/`.
- [x] Lock acquisition, rollback, and temporary-file cleanup occur in the
      effective layout and do not create or inspect `docs/harness/` when an
      explicit configuration selects another root.
- [x] All lifecycle and CLI failures expose effective repository-relative paths
      and no operation searches or mutates a former default location.

## Required evidence

- `npm run check && node --test dist/tests/cli-lifecycle.test.js`
- `node --test dist/tests/mutations.test.js`
- Before/after fixture snapshots proving no implicit migration and no unrelated mutation.

### Verification Evidence
- Completed: 2026-07-16
- Evidence: Verified: npm run check && npm run test (96 passing, including custom layout lifecycle, locking, and clean tests).
