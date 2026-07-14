---
schema_version: 1
type: report
id: REP-003
title: Maintain navigable Harness knowledge
status: completed
delivered: 2026-07-14
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
    - "[[DEC-002-minimal-file-mutations|DEC-002]]"
    - "[[DEC-003-index-watch-and-graph-runtime|DEC-003]]"
    - "[[DEC-006-graphify-directory-extraction-boundary|DEC-006]]"
  plans:
    - "[[260714-1147-maintain-navigable-harness-knowledge/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
  source_paths:
    - src/index/index.ts
    - src/watcher/index.ts
    - src/adapters/index.ts
    - src/cli/index.ts
    - src/core/integrity.ts
    - src/core/lifecycle.ts
---

# REP-003: Maintain navigable Harness knowledge

## Delivered outcome

Delivered deterministic Markdown index publication and relationship
resolution, explicit watch reconciliation with last-valid-state preservation,
and an optional Graphify adapter. Graphify reads only `docs/harness/`, writes
only disposable `docs/harness/graphify-out/`, rejects symlink expansion, and
cannot spawn until the actor supplies `--allow-external`.

## Changed files

- `src/index/index.ts`, `src/core/integrity.ts`, and `src/cli/index.ts` — derived
  index publication, validation integration, and strict command routing.
- `src/watcher/index.ts` — explicit reconciliation, burst coalescing, bounded
  recovery, and derived-output exclusion.
- `src/adapters/index.ts` and `src/core/lifecycle.ts` — optional shell-free
  Graphify execution, permission and symlink boundaries, and disposable output.
- `tests/index-build.test.ts`, `tests/index-resolution.test.ts`,
  `tests/index-watch.test.ts`, `tests/graph-adapter.test.ts`, and
  `tests/cli-lifecycle.test.ts` — feature, failure, preservation, and CLI
  evidence.
- Harness Feature, Decisions, Plan phases, and README — approved contracts and
  operator guidance.

## Verification evidence

- `npm run verify` — passed on 2026-07-14: TypeScript checks passed and 74 tests
  passed, 0 failed.
- `npm run build && node --test dist/tests/graph-adapter.test.js dist/tests/index-resolution.test.js dist/tests/index-watch.test.js dist/tests/cli-lifecycle.test.js`
  — passed on 2026-07-14: 31 tests passed, 0 failed.
- `npm pack --dry-run --json` — passed on 2026-07-14 with 66 allowlisted package
  entries and no compiled tests or Graphify output.
- `git diff --check` — passed on 2026-07-14.
- Real `harness graph check --json` detected local Graphify 0.8.39. A real
  extraction was deliberately not run because it may use an external semantic
  backend; the missing-permission CLI path was verified to fail before spawn.
- Direct validation of FEAT-004, DEC-006, and this report passed. The read-only
  workspace `index check` correctly rejected an unrelated pre-existing
  FEAT-005 source path to the removed `phase-06-runtime-adapters-and-doctor.md`;
  no index publication was attempted.
- Independent read-only AGY review completed successfully. Its executable-name
  consistency and successful-CLI-test findings were addressed; a speculative
  watcher case-folding note was not reproduced and was not adopted.

## Plan variance

Phase 4 originally assumed JSON over stdin. Installed Graphify 0.8.39 has no
such protocol, so approved DEC-006 replaced it with fixed directory extraction
over `docs/harness/`, output under the same directory, symlink rejection, and
explicit `--allow-external` acknowledgement. Watcher scope was unchanged.

## Limitations

- Graph output is optional and not promised to be byte-deterministic.
- Actual extraction depends on the operator's Graphify backend and credentials
  and remains an explicit local action outside CI.
- The current workspace index cannot be refreshed until FEAT-005's dangling
  source path is repaired by its owner.
- This delivery does not commit, push, publish, or release the dirty worktree.

## Repeated friction

The stdin assumption blocked Phase 4 once because the Plan had not been checked
against the installed Graphify CLI. DEC-006 records the corrected integration
boundary. This is one observed occurrence, so no reusable harness improvement
is promoted yet.
