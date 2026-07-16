---
work_item: 4
title: Workflow adoption and delivery verification
status: in_progress
priority: P1
effort: 1 day
dependencies:
  - 1
  - 2
  - 3
decision_dependencies:
  - "[[DEC-001-cli-command-parsing|DEC-001]]"
  - "[[DEC-002-minimal-file-mutations|DEC-002]]"
  - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
  - "[[DEC-010-defer-graphify-and-select-future-graph-technology|DEC-010]]"
---

# Work Item 4: Workflow adoption and delivery verification

## Kind

Documentation and verification

## Tasks

- [ ] Update Feature, Plan, and Cook workflows to name the exact CLI command at
  every supported create/check/review/transition boundary and require agents to
  consume its result.
- [ ] Update `harness-feature`, `harness-plan`, and `harness-cook` routers with
  concise required-command guidance while preserving canonical workflow authority.
- [ ] Document the command contract, targets, review semantics, stable JSON,
  manual fallback, recovery boundary, and explicit prohibition on agent-granted approval.
- [ ] Add workflow/skill tests that reject stale manual mutation guidance and
  assert the required command sequence before Plan/Cook transitions.
- [ ] Run compatibility and package verification for default/configured layouts,
  existing commands, templates, index, doctor, and packed CLI contents.
- [ ] Create the Delivery Report through the CLI after all Work Items pass, link
  it to the Plan, rebuild the index, and complete the Plan only from evidence.

## Scope and affected files

- Modify: `docs/harness/workflows/feature.md`,
  `docs/harness/workflows/plan.md`, `docs/harness/workflows/cook.md`,
  `docs/harness/workflows/README.md`, `docs/harness/README.md`,
  `.agents/skills/harness-feature/SKILL.md`,
  `.agents/skills/harness-plan/SKILL.md`,
  `.agents/skills/harness-cook/SKILL.md`, `tests/workflows.test.ts`, and
  `tests/skills.test.ts`.
- Rebuild `docs/harness/index.md` only through `ckh index build`.
- Create the final Report through `ckh new report`; do not hand-allocate its ID.

## Success criteria

- [ ] An agent following Feature, Plan, or Cook guidance invokes the supported
  CLI before manually reasoning about or mutating the same mechanical state.
- [ ] Guidance states that request-changes means Feature `proposed` or Plan
  approval `changes_requested`, never a new terminal rejected state.
- [ ] Unsupported or failed CLI operations use a named manual recovery/fallback
  followed by validation; guidance never claims a nonexistent command succeeded.
- [ ] Workflows remain canonical, skills remain thin/local, and no duplicate
  transition contract or external/home-directory dependency is introduced.
- [ ] `npm run verify`, `ckh validate --all`, `ckh index check`, `ckh doctor`,
  package dry-run, packed CLI smoke tests, and `git diff --check` pass.
- [ ] A completed Report records changed files, exact evidence, Plan variance,
  Graphify non-use under DEC-010, and any repeated friction.

## Risks

- Duplicating full command semantics in every skill can create drift; skills
  should name command obligations and route details back to canonical workflows.
- Tests that only search command strings can pass despite wrong ordering;
  assertions must check create/check/review/transition boundaries and prohibitions.
- Package initialization must publish new templates and revised skills without
  overwriting existing repository-authored content.

## Required evidence

- Workflow/skill tests assert exact command obligations, authority boundaries,
  request-changes semantics, fallback, and no automatic Cook/Git/network action.
- End-to-end packed CLI smoke tests cover Plan creation, state/check, Feature and
  Plan review, eligible Work Item start, rejected transition, and configured layout.
- Full verification outputs and package contents are recorded in the Report.
- Whole-Plan consistency search reports zero unresolved TODO/TBD, stale command
  names, dependency conflicts, rejected assumptions, or contradictory criteria.
