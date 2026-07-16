---
work_item: 1
title: "Layout Configuration and Repository Discovery"
status: completed
priority: P1
effort: "3-4 days"
dependencies: []
decision_dependencies: []
---

# Work Item 1: Layout Configuration and Repository Discovery

## Scope

Create the single configuration parser and effective-layout resolver used by
the repository boundary. Extend `RepositoryPaths` to expose every logical
collection, including Plans and workflows, without changing canonical
filenames or the zero-configuration layout.

## Implementation steps

1. Define the strict `harness.yaml` schema: a repository-relative `root` and
   optional logical folders for Features, Specs, Decisions, Plans, Reports,
   Rules, templates, and workflows; reject unknown fields and non-strings.
2. Resolve omitted values to canonical child names under the selected root and
   produce typed absolute paths plus repository-relative display paths.
3. Define one logical-collection allowlist (authored collections, index,
   templates, workflows, and owned disposable output) for every later scan,
   mutation, watch, and adapter consumer; a broad root is never itself an
   authorization to touch sibling documentation.
4. Reuse and extend containment logic to reject absolute paths, `..`, unsafe
   existing or ancestor symlinks, root escapes, duplicate folders, and nested
   folder overlaps before exposing a layout.
5. Preserve the exact `docs/harness/` layout when the configuration file is
   absent; never fall back after an explicit file fails parsing or validation.
6. Update repository-root discovery to recognize a valid configuration marker
   and its resolved index location, including nested working directories and
   uninitialized repositories, with actionable invalid-config errors.
7. Add focused unit and fixture tests for defaults, root-only override,
   collection override, all invalid-layout classes, and macOS/Linux/Windows
   path normalization expectations.

## Success criteria

- [x] The effective layout for no configuration is byte-for-byte equivalent to
      the current `docs/harness/` paths.
- [x] A configuration with `root: docs` and `features: product-features`
      resolves Features to `docs/product-features/` and all omitted folders to
      their canonical names below `docs/`.
- [x] Invalid YAML, unknown fields, absolute paths, repository escapes,
      root escapes, duplicate mappings, overlaps, and symlink escapes identify
      the failing field and cause no default fallback or mutation.
- [x] Repository discovery finds a configured Harness from a nested directory
      and reports the effective index path; no invalid configuration is treated
      as initialized.
- [x] A root such as `docs/` does not authorize any operation to enumerate or
      classify a sibling document unless that document is in a configured
      logical collection.

## Required evidence

- `npm run check && node --test dist/tests/repository-paths.test.js`
- New test fixture output covering default, root-only, and per-collection layouts.

### Verification Evidence
- Completed: 2026-07-16
- Evidence: Supervisor verified: npm run check; npm run build; node --test dist/tests/repository-paths.test.js (16 passing).
