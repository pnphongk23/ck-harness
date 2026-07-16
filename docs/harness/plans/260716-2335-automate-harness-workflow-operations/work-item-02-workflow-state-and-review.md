---
work_item: 2
title: "Workflow state and human review commands"
status: completed
priority: P1
effort: "1-2 days"
dependencies: [1]
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
  - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
---

# Work Item 2: Workflow state and human review commands

## Kind

Technical

## Tasks

- [x] Add exact Feature/Plan/Work Item target resolution using configured paths;
  reject missing, ambiguous, escaping, or unsupported targets.
- [x] Derive a stable workflow-state result from canonical frontmatter,
  relationships, integrity findings, Work Item dependencies, and Report presence.
- [x] Implement read-only `workflow status` and `workflow check` without writing
  the index or canonical files; report current review/execution state, blockers,
  affected target, and eligible next operations.
- [x] Implement Feature approval with explicit date and authority, and Feature
  request-changes by keeping/returning status to `proposed` while removing
  incompatible approval provenance.
- [x] Implement Plan approve/request-changes by changing `approval` only,
  preserving execution status and requiring the schema-compatible decision date.
- [x] Reuse `scanHarness()` and executable schemas for preflight rather than
  maintaining duplicate status or relationship validation.
- [x] Add strict CLI, human/JSON, no-write, invalid-authority, stale-state,
  custom-layout, and compatibility tests.

## Scope and affected files

- Modify: `src/core/lifecycle.ts`, `src/core/integrity.ts`,
  `src/cli/index.ts`, `tests/cli-lifecycle.test.ts`, and
  `tests/integrity.test.ts`.
- Add a focused core test file only if keeping all state derivation assertions in
  the existing lifecycle/integrity suites would obscure their ownership.
- Do not add authentication, a review log, or a hidden provenance store.

## Success criteria

- [x] State and check commands leave every workspace byte unchanged and produce
  deterministic findings and next-operation order.
- [x] Inspect-before-planning reports every unapproved governing Feature and
  unresolved Decision before presenting Plan creation as eligible.
- [x] Feature approval rejects absent explicit Product Authority provenance;
  request-changes results in `proposed` with no stale `approved` fields.
- [x] Plan approval and request-changes update only `approval`, require
  `decided`, and never start or complete execution.
- [x] Mechanically valid content without supplied human review cannot become
  approved through any command path.
- [x] Existing Feature show/list, validation, index, doctor, and JSON envelopes
  remain compatible.

## Risks

- “Eligible next action” can drift from integrity predicates if implemented as
  parallel business logic; state derivation must consume shared findings and
  schemas.
- An `approved_by` string records declared provenance but does not authenticate
  identity; output and docs must not claim stronger security.
- Returning an already-approved Feature to proposed invalidates downstream
  authority; output must surface that consequence without editing downstream Plans.

## Required evidence

- Snapshot-before/after tests prove read-only state/check operations do not write.
- Positive and negative review tests assert exact old/new state, provenance,
  unchanged execution fields, affected path, and next operations.
- Fixtures cover unapproved Features, unresolved Decisions, invalid links,
  ambiguous targets, configured layouts, and previously approved revisions.
- `ckh validate --all`, focused compiled tests, and `git diff --check` pass.

## Completion evidence

- `npm run check` passed.
- `npm run test` passed 105/105 tests, including positive and negative Feature
  and Plan review, read-only status/check snapshots, target containment, strict
  target types, and configured layout coverage.
- `git diff --check` passed.
- On the real Plan, `ckh workflow status ... --json` reported approved review,
  `in_progress` execution, zero findings, and deterministic next operations;
  `ckh workflow check ... --json` returned success with zero findings.
- The same real-workspace status command resolved Work Item 2 by its exact
  repository-relative path without mutating canonical files.
