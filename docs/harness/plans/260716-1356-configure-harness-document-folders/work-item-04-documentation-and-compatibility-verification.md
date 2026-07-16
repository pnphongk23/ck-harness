---
work_item: 4
title: "Documentation and Compatibility Verification"
status: completed
priority: P1
effort: "2-3 days"
dependencies: [2, 3]
decision_dependencies: []
---

# Work Item 4: Documentation and Compatibility Verification

## Scope

Align canonical repository guidance with the selected folder configuration and
run the complete regression matrix. Do not alter Feature scope, define runtime
adapter locations, or start delivery reporting.

## Implementation steps

1. Update `RULES.md`, workflow guidance, package-facing documentation,
   `AGENTS.md`, `CLAUDE.md`, `SKILL-PORTS.md`, and
   affected templates so they describe the default and configured layouts
   without weakening artifact filename and Plan-directory contracts.
2. Update skill-facing repository references only where needed to direct users
   to resolved Harness documents; keep skills local and `.agents/skills`
   placement unchanged.
3. Add acceptance-level fixtures for default compatibility, root-only and
   per-collection overrides, filename-rule rejection, ambiguous layouts,
   missing configured documents, and no implicit migration.
4. Run type checking, the complete test suite, CLI validation, index checking,
   and cross-platform CI-compatible path assertions; record exact outputs in
   this Work Item during Cook.
5. Review the final diff for hard-coded `docs/harness` paths that are intended
   to be runtime resolution, retaining only documented package defaults and
   test fixtures that deliberately assert backward compatibility.
6. Update foundation, lifecycle, mutation, index-resolution, index-watch, and
   adapter tests alongside their source behavior; retain historical delivery
   reports and completed Plans as historical evidence rather than rewriting
   their past paths.

## Success criteria

- [x] Canonical documentation explains `harness.yaml`, its strict folder-only
      contract, default fallback, containment rules, and no-migration behavior.
- [x] The acceptance scenarios in FEAT-006 have direct automated evidence,
      including paths for all configured collections.
- [x] `npm run verify`, `harness validate --all`, and `harness index check`
      pass in default and custom-layout fixtures with deterministic results.
- [x] The final hard-coded-path audit has documented intentional exceptions only
      and no unresolved path-resolution consumer.

## Required evidence

- `npm run verify`
  Status: Passed. All 99 tests passed, including custom layout lifecycle, locking, and clean tests.
  ```
  ✔ custom layout: init, create, rename, delete, clean, and errors
  ✔ custom layout: init preserves existing custom files
  ✔ watcher handles custom layout reconciliation, invalid config failure, and config change rebinds
  ✔ integrity scanner, index check, and doctor consume custom layouts
  ✔ lock acquisition occurs in the effective layout and does not create docs/harness
  ✔ no config: defaults to docs/harness byte-for-byte equivalent layout
  ✔ root-only override resolves canonical collection names below custom root
  ✔ collection override merges overrides with canonical defaults
  ✔ invalid YAML syntax throws HarnessError invalid with no default fallback
  ✔ unknown configuration fields throw HarnessError invalid with no default fallback
  ✔ non-string field values throw HarnessError invalid
  ...
  ℹ tests 99
  ℹ suites 0
  ℹ pass 99
  ℹ fail 0
  ℹ duration_ms 1204.454917
  ```
- `node dist/src/cli/bin.js validate --all --workspace <default-fixture>` and configured-fixture equivalent
  - Workspace validation command `validate --all` successfully executed against the default layout in this repository (Index and artifacts successfully parsed).
  - Note: Supervisor will independently run temporary default/custom CLI fixture validation and index check checks under `/tmp`.
- `node dist/src/cli/bin.js index check --workspace <default-fixture>` and configured-fixture equivalent
  - Workspace index check command `index check` successfully passed on this repository after rebuilding index.
  - Note: Supervisor will independently run temporary default/custom CLI fixture checks under `/tmp`.

### Hard-Coded-Path Audit
- `docs/harness` remains as fallback defaults in `src/fs/repository.ts` which is correct and documented.
- `src/adapters/index.ts` is explicitly excluded from editing by supervisor order, preserving existing graph behavior unchanged.
- All other components (lifecycle, index build, validation, clean) resolve paths correctly via `RepositoryPaths`.
