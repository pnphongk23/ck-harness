---
work_item: 1
title: "Canonical Plan scaffolding"
status: completed
priority: P1
effort: "1-2 days"
dependencies: []
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
  - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  - "[[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]]"
---

# Work Item 1: Canonical Plan scaffolding

## Kind

Technical

## Tasks

- [x] Add canonical `plan.md` and `work-item.md` templates under the configured
  templates collection with pending approval/execution state and no filler.
- [x] Add typed Plan and Work Item starter inputs and rendering to
  `src/core/lifecycle.ts`, including local-time directory naming, slugging,
  ordered Work Item filenames, and exact relationship defaults.
- [x] Require one or more repeated `--work-item` values and reject empty titles,
  invalid timestamps, collisions, unsafe paths, and existing content.
- [x] Stage the Plan root and every Work Item in one `applyMutation()` overlay
  and validate each file through the executable frontmatter schema before publish.
- [x] Register `ckh plan create` with strict options, stable human/JSON results,
  configured workspace discovery, and no implicit approval.
- [x] Extend initialization, template snapshots, lifecycle integration tests,
  and configured-layout fixtures for Plan scaffolding and preservation.

## Scope and affected files

- Add: `docs/harness/templates/plan.md`,
  `docs/harness/templates/work-item.md`.
- Modify: `src/core/lifecycle.ts`, `src/cli/index.ts`,
  `tests/cli-lifecycle.test.ts`, `tests/templates.test.ts`, and
  `tests/snapshots/template-hashes.json`.
- Extend `tests/repository-paths.test.ts` only when a configured-layout
  assertion cannot remain in the lifecycle fixture.

## Success criteria

- [x] One command creates exactly one valid pending Plan root and the requested
  ordered pending Work Items under `YYMMDD-HHmm-slug`.
- [x] Generated files parse under `planSchema`/`workItemSchema`, use LF and
  repository-relative POSIX paths, and contain no approval date or execution claim.
- [x] Default and configured Plan directories behave identically, including
  nested workspaces, spaces, non-ASCII titles, and deterministic injected time.
- [x] Duplicate directories, invalid titles/timestamps, zero Work Items,
  staging failures, and divergent targets publish none of the requested files.
- [x] `ckh init` publishes missing Plan/Work Item templates and preserves any
  existing user-authored template bytes.
- [x] Existing Feature and `new` artifact commands remain byte-compatible.

## Risks

- Local-time directory names can make tests flaky unless the clock is injectable
  or an explicit offset timestamp is supplied.
- A Plan root and multiple Work Items form one logical request but DEC-002 does
  not promise crash-atomic multi-file publication; handled failures must retain
  current rollback diagnostics and documentation.
- Template changes alter the complete-directory hash snapshot and package
  contents; tests must assert intended additions only.

## Required evidence

- Focused lifecycle tests cover positive, invalid, collision, configured-layout,
  non-ASCII, spaces, staged-failure, and preservation cases.
- Template hash and LF tests include both new templates.
- `ckh validate --kind plan` accepts generated output and index check remains
  read-only and current after rebuild.
- `npm run check`, focused compiled tests, and `git diff --check` pass.

## Completion evidence

- `npm run check` passed.
- `npm run test` passed 100/100 tests.
- `git diff --check` passed.
- A temporary default-layout workspace passed `ckh init`, deterministic
  `ckh plan create`, `ckh validate --kind plan`, `ckh index build`, and
  `ckh index check`; the JSON result named exactly the Plan root and two Work
  Item paths.
- Lifecycle coverage includes pending authority/execution, schema parsing, LF,
  Unicode and spaces, strict grammar, collision preservation, invalid-template
  no-publication behavior, configured layouts, and template preservation.
