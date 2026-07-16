---
work_item: 3
title: Guarded execution transitions
status: completed
priority: P1
effort: 1-2 days
dependencies:
  - 2
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
  - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
  - "[[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]]"
---

# Work Item 3: Guarded execution transitions

## Kind

Technical

## Tasks

- [x] Define allowed typed Plan and Work Item execution transitions from the
  existing lifecycle Spec; write canonical `in_progress` while accepting legacy
  `in-progress` input state.
- [x] Enforce approved Plan authority, one active Work Item, completed
  predecessors, approved Decision dependencies, required status reasons,
  checked success criteria, Plan aggregation, and completed Report presence.
- [x] Implement `plan set-status` and `work-item set-status` through configured
  target resolution and staged aggregate validation.
- [x] Keep Plan approval independent, preserve unrelated body/frontmatter
  content, and report old/new state, blockers, affected paths, and next operations.
- [x] Reject arbitrary skips, unsupported statuses, premature completion,
  cancellation without reason, and mutations from invalid or concurrently
  changed state.
- [x] Add transition matrix, failure, atomic-write, legacy compatibility,
  custom-layout, and stable human/JSON tests.

## Scope and affected files

- Modify: `src/core/lifecycle.ts`, `src/core/integrity.ts`,
  `src/cli/index.ts`, `tests/cli-lifecycle.test.ts`,
  `tests/integrity.test.ts`, and `tests/mutations.test.ts` as required.
- Keep transition contracts in `workflow-lifecycle`; do not introduce a generic
  event engine, database, or second persistent state model.

## Success criteria

- [x] A Work Item enters `in_progress` only under an approved Plan with completed
  predecessors and approved Decision dependencies, and at most one Work Item is active.
- [x] Blocked/cancelled transitions require a non-empty reason; fixable failed
  checks do not force an in-progress Work Item to blocked.
- [x] Work Item completion requires every required Task/success checkbox to be
  complete and produces no confidence-only evidence claim.
- [x] Plan completion requires all required Work Items completed and a linked
  completed Delivery Report; approval state remains approved and unchanged.
- [x] Every rejected transition leaves all files unchanged and reports each
  relevant failed precondition in deterministic order.
- [x] Legal coupled transitions publish the validated aggregate or report the
  exact conflict/rollback inspection paths under DEC-002.

## Risks

- Markdown checkbox interpretation can accidentally count examples or optional
  items; completion checks must be scoped to canonical required sections.
- Updating both Work Item and Plan aggregation increases handled-failure paths;
  tests must exercise divergent external edits and rollback reporting.
- Cancelling scope is not equivalent to completing it; Plan completion must not
  count cancelled Work Items unless a separately approved Plan revision removed them.

## Required evidence

- A table-driven transition suite covers every accepted and rejected state edge.
- Integration fixtures cover predecessor, Decision, approval, active-item,
  checkbox/evidence, reason, Report, aggregation, invalid-current-state, and
  configured-layout predicates.
- Mutation hooks prove no partial successful result is reported on publication failure.
- `ckh validate --all`, focused compiled tests, and `git diff --check` pass.

## Completion evidence

- `npm run check` passed and `npm run test` passed 111/111 tests.
- Transition coverage includes approval, predecessor, Decision, one-active-item,
  checkbox/evidence, Report aggregation, byte-identical rejection, legacy input,
  and configured-layout paths.
- `git diff --check` passed after formatting cleanup.
- A real temporary workspace completed `init`, Plan creation and approval,
  eligible Work Item start, coupled Plan aggregation to `in_progress`, and
  read-only `workflow status`/`workflow check` with zero findings.
