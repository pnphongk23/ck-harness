---
schema_version: 1
title: Deliver configurable Harness document folders
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]]"
  plans:
    - "[[260716-1356-configure-harness-document-folders/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-006-configure-harness-document-folders|FEAT-006]]"
  source_paths:
    - src/fs/repository.ts
    - src/fs/atomic-write.ts
    - src/core/lifecycle.ts
    - src/core/integrity.ts
    - src/watcher/index.ts
    - tests/repository-paths.test.ts
type: report
id: REP-009
status: completed
delivered: 2026-07-16
---

# REP-009: Deliver configurable Harness document folders

## Delivered outcome

Harness now resolves one strict repository-local document layout from an
optional root-level `harness.yaml`. Initialization, lifecycle mutations,
validation, index generation, diagnostics, cleanup, and watching consistently
use the effective logical collection paths. Zero-configuration repositories
retain the canonical `docs/harness/` behavior, while invalid, escaping,
duplicate, overlapping, and symlinked layouts fail without fallback or mutation.

## Changed files

- `src/fs/repository.ts` — parse and validate `harness.yaml`, resolve typed
  logical paths, enforce containment, and discover configured repositories.
- `src/fs/atomic-write.ts` and `src/core/lifecycle.ts` — route locks,
  initialization, artifact operations, backlinks, and cleanup through the
  effective layout.
- `src/core/integrity.ts` and `src/watcher/index.ts` — make validation,
  diagnostics, index inputs, watch scope, and configuration rebind layout-aware.
- Harness guidance and workflows — document strict folder-only configuration,
  defaults, containment, and no-migration behavior.
- Repository, lifecycle, integrity, index, watcher, and mutation tests — cover
  default, custom, invalid, and deterministic layout behavior.

## Verification evidence

- `npm run verify` — passed: 99 tests, 0 failures.
- Work Item 3 focused matrix — passed: 36 tests, 0 failures.
- Default `/tmp` fixture: `init`, `index build`, `validate --all`, and
  `index check` all exited successfully.
- Fully customized `/tmp` fixture with all eight collection overrides: `init`,
  `index build`, `validate --all`, and `index check` all exited successfully.
- `git diff --check` — passed.
- Runtime hard-coded-path audit — only the documented `docs/harness` default
  and unchanged Graphify adapter paths remain; Graphify is outside this Plan.

## Plan variance

No material product or architecture variance. During Work Item 4, AGY attempted
an out-of-scope Graphify adapter edit; supervision stopped the worker and
reverted that edit before verification. Temporary fixture generation was moved
from a proposed repository `scratch/` directory to `/tmp` to avoid workspace
churn. Neither variance changed delivered behavior.

## Repeated friction

AGY's attended terminal requested repeated command approvals and wrapped handoff
tokens at narrow terminal width, preventing automated handoff recording. The
supervisor preserved terminal evidence and independently reran every acceptance
gate; this is execution friction, not a product defect.
