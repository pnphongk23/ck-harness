---
title: "Configure Harness document folders"
description: "Resolve one validated repository-local Harness document layout from an optional root-level harness.yaml file while preserving the default layout and canonical filename rules."
status: completed
approval:
  status: approved
  required_by: Repository Maintainer
  decided: "2026-07-16"
priority: P1
effort: "2-3 weeks"
branch: "main"
tags: [harness, configuration, folders, paths, validation]
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]]"
  plans: []
  reports:
    - "[[REP-009-deliver-configurable-harness-document-folders|REP-009]]"
  rules: []
  features:
    - "[[FEAT-006-configure-harness-document-folders|FEAT-006]]"
  source_paths:
    - docs/harness/features/FEAT-006-configure-harness-document-folders.md
    - docs/harness/RULES.md
    - docs/harness/workflows/plan.md
    - docs/harness/README.md
    - docs/harness/SKILL-PORTS.md
    - docs/harness/decisions/DEC-010-defer-graphify-and-select-future-graph-technology.md
    - AGENTS.md
    - CLAUDE.md
    - package.json
    - src/fs/repository.ts
    - src/fs/atomic-write.ts
    - src/core/lifecycle.ts
    - src/core/integrity.ts
    - src/index/index.ts
    - src/watcher/index.ts
    - src/cli/index.ts
    - tests/cli-lifecycle.test.ts
    - tests/integrity.test.ts
    - tests/index-build.test.ts
    - tests/index-resolution.test.ts
    - tests/index-watch.test.ts
    - tests/mutations.test.ts
    - tests/foundation.test.ts
created: "2026-07-16T13:56:53+07:00"
createdBy: "Codex"
source: "Approved FEAT-006 and Product Authority selection of root-level harness.yaml"
---

# Configure Harness document folders

## Overview

Implement the approved folder-only customization using an optional
repository-root `harness.yaml`. The resolver will merge a configured root and
logical collection-folder overrides with the canonical defaults, reject invalid
layouts before any operation begins, and return one typed effective layout to
all existing consumers. When the file is absent, the observable layout remains
`docs/harness/` exactly.

`harness.yaml` is the Product Authority-approved configuration source. It uses
the existing `yaml` dependency and contains only the document `root` and
per-collection folder values. It neither configures filename rules nor moves
or discovers documents outside the effective layout.

FEAT-004 and FEAT-005 are related scope, not governing dependencies. This Plan
therefore updates the existing index, watcher, and repository-local skill
publication boundaries only; it does not add or redesign cross-platform runtime
adapters. Under [[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]],
Graphify and any replacement graph technology are outside this delivery.

## Work Items

| Work Item | Name | Status |
| --- | --- | --- |
| 1 | [Layout configuration and repository discovery](./work-item-01-layout-configuration-and-discovery.md) | Completed |
| 2 | [Lifecycle and command integration](./work-item-02-lifecycle-and-command-integration.md) | Completed |
| 3 | [Validation, navigation, watching, and graph scope](./work-item-03-derived-consumer-integration.md) | Completed |
| 4 | [Documentation and compatibility verification](./work-item-04-documentation-and-compatibility-verification.md) | Completed |

## Requirement coverage

| Requirement or acceptance evidence | Delivering Work Item |
| --- | --- |
| FR-001/FR-002, BR-003, NFR-003 — root and distinct contained collection folders | 1 |
| FR-003, BR-001/BR-002, NFR-001 — unchanged default paths, identity, and filename rules | 1, 2, 4 |
| FR-004/FR-005, BR-004/BR-005, NFR-002/NFR-004 — one layout across operations and actionable paths | 1, 2, 3, 4 |
| FR-006 — explicit invalid, escaping, duplicate, overlap, and missing-layout failures | 1, 2, 3, 4 |
| Default-layout scenario | 2, 4 |
| Repository-specific folder scenario | 1, 2, 4 |
| Naming-customization rejection scenario | 1, 2, 4 |
| Ambiguous-layout rejection scenario | 1, 3, 4 |
| Configured Specs, Decisions, Plans, Reports, Rules, templates, and workflows | 1, 2, 3, 4 |

## Verification ledger

| Claim | Status | Evidence |
| --- | --- | --- |
| One function fixes the default Harness root and every logical folder | Verified | `repositoryPaths()` in `src/fs/repository.ts` returns fixed `docs/harness` joins. |
| Lifecycle initialization, artifact allocation, cleanup, and Feature operations consume that function | Verified | `src/core/lifecycle.ts` imports and calls `repositoryPaths()` at each public operation. |
| Validation and index rendering enumerate fixed child directories below `paths.harness` | Verified | `scanHarness()` and index helpers in `src/core/integrity.ts`; `buildIndex()` in `src/index/index.ts`. |
| Watching has a fixed-root assumption that must be replaced | Verified | `src/watcher/index.ts` watches `paths.harness`. |
| The CLI discovers initialized repositories by a fixed index marker | Verified | `findRepositoryRoot()` in `src/fs/repository.ts` and `rootFor()` in `src/cli/index.ts`. |
| Mutation locking remains independent of `repositoryPaths()` | Verified | `withRepositoryLock()` in `src/fs/atomic-write.ts` creates `docs/harness/.harness.lock` directly. |
| Backlink rewrite and temporary-file cleanup recursively enumerate the whole current Harness root | Verified | `findBacklinks()` and `collectTemporarySiblings()` in `src/core/lifecycle.ts`. |
| Plan-local design, plan layout, relationship targets, doctor workflow checks, and remediation output assume canonical folder names | Verified | `src/core/integrity.ts` uses `plans/`, `docs/harness/`, and fixed workflow paths. |
| A broad configured root would make the current watcher observe unrelated documentation | Verified | `watchHarness()` binds Chokidar to `paths.harness` in `src/watcher/index.ts`. |
| Graphify is outside the approved FEAT-006 scope | Verified | DEC-010 supersedes DEC-006 and defers Graphify plus replacement technology to separate authority. |
| A compatible YAML parser already ships with the package | Verified | `yaml` is a production dependency in `package.json` and is used by `src/core/lifecycle.ts` and `src/core/integrity.ts`. |
| Existing tests establish fixed-path behavior and must gain configured-layout fixtures | Verified | `tests/cli-lifecycle.test.ts`, `tests/integrity.test.ts`, `tests/index-build.test.ts`, and `tests/graph-adapter.test.ts`. |
Verification totals: 13 Verified, 0 Failed, 0 Unresolved.

## Dependencies and risks

- `FEAT-006` is approved by Product Authority on 2026-07-16 and is the sole
  governing Feature. FEAT-004 and FEAT-005 are related only, as confirmed by
  Product Authority.
- The configuration marker must be discoverable before `docs/harness/index.md`
  exists; root discovery must recognize `harness.yaml` without treating an
  invalid configuration as an initialized default layout.
- `harness.yaml` must have a strict allowlist. Unknown keys, absolute paths,
  repository escapes, symlink escapes, duplicate folders, and parent/child
  overlaps fail before reads or mutations. Missing configuration alone is the
  only default-fallback condition.
- The document root may be `docs/`, so code must never assume every child of
  that root is Harness-owned; only configured collections plus the derived
  index and owned disposable output may be scanned or mutated.
- Existing skill publication remains in `.agents/skills/`; this Plan does not
  relocate runtime-owned adapters or create adapter behavior.
- Preserve the existing working tree. No plan changes application code or tests.

## Adversarial review

- **Security:** resolve paths through repository containment checks and reject
  symlink escapes before file enumeration, writing, or watching;
  restrict every enumeration and mutation to an explicit logical-collection
  allowlist rather than the broad configured root.
- **Failure mode:** malformed or missing configured documents must name expected
  repository-relative paths and never search the former default directory.
- **Scope:** do not add a configuration command, alternate naming rules,
  automatic migration, adapter redesign, or a second source of configuration.
- **Compatibility:** snapshot default-layout behavior and test the same logical
  operation in a custom layout, including deterministic index output.

Whole-Plan consistency sweep: complete. The selected configuration source,
governing authority, Work Item sequence, coverage, risks, and verification
commands are consistent; graph technology is explicitly out of scope.

## Delivery

Completed with verified evidence in
[[REP-009-deliver-configurable-harness-document-folders|REP-009]].
