---
work_item: 2
title: "Harden Feature and Plan verification"
status: completed
priority: P1
effort: "2 hours"
dependencies: [1]
decision_dependencies: []
---

# Work Item 2: Harden Feature and Plan verification

## Kind

Feature and verification

## Tasks

- [x] Update the canonical Feature workflow to compose Scout, Ask, and
  Brainstorm behaviors before behavior approval.
- [x] Require concrete expected output, acceptance, exclusions, constraints,
  and touchpoints; label observed, inferred, failed, and unresolved findings.
- [x] Update the canonical Plan workflow with claim verification, human
  decision interviews, adversarial risk review, and a whole-plan consistency sweep.
- [x] Keep questions evidence-grounded and limited to choices that can
  materially change behavior, scope, architecture, compatibility, risk, or evidence.
- [x] Update `harness-feature` and `harness-plan` thin routers to name the new
  local skills and their hard gates without duplicating the canonical procedures.
- [x] Extend workflow tests for scout-first ordering, exact discovery,
  verification evidence, human choice, and consistency blocking.
- [x] Rebuild the canonical index and validate the Feature, Plan, Work Items,
  links, coverage, lifecycle state, and full repository.

## Scope and affected files

- Modify: `docs/harness/workflows/feature.md`,
  `docs/harness/workflows/plan.md`, `.agents/skills/harness-feature/SKILL.md`,
  `.agents/skills/harness-plan/SKILL.md`, and `tests/workflows.test.ts`.
- Update `docs/harness/index.md` only through the Harness index builder.
- Record delivery through the canonical Report allocator after all evidence passes.

## Success criteria

- [x] Feature asks no material question before repository scouting and cannot
  reach approval with any of the five discovery fields vague or materially unresolved.
- [x] Feature asks Product Authority before selecting among multiple viable
  observable behavior variants.
- [x] Plan records every sampled material claim as verified, failed, or
  unresolved and does not request approval while failures affect execution.
- [x] Plan asks Repository Maintainer before recording unresolved material choices.
- [x] Plan re-reads the root and every Work Item after material revisions and
  blocks Cook until zero unresolved contradictions remain.
- [x] Workflow and skill tests assert the new gates without requiring a
  sub-agent, external service, or home-directory configuration.
- [x] Focused tests, `npm run verify`, Harness validation, index check, doctor,
  package dry-run, and `git diff --check` pass.

## Risks

- Absolute "ask before anything" wording can conflict with repository evidence
  that already provides an authoritative answer.
- Verification can become ceremonial unless exact paths, symbols, contracts,
  commands, dependencies, and coverage are checked.
- Local edits after an interview can leave stale assumptions elsewhere in the Plan.
- Existing tests may assert older workflow phrasing and require precise updates
  without weakening unrelated guarantees.

## Required evidence

- Focused workflow tests demonstrate scout-first discovery, exact requirements,
  evidence classification, human decision gates, and the consistency sweep.
- A repository-wide search finds no forbidden personal or delegated-agent
  dependency in any canonical skill or workflow.
- Harness `validate --all`, `index check`, and `doctor` report no findings.
- `npm run verify` passes with the exact test count reported.
- `npm pack --dry-run` and `git diff --check` pass.

## Evidence

- Skill Creator validation passed for the revised `harness-feature` and
  `harness-plan` routers.
- Focused compiled workflow and skill tests passed 8 tests, 0 failed.
- Adversarial routing review found and fixed the `ask`/`task` substring collision;
  the regression assertion passes.
- Harness index build succeeded, then `validate --all`, `index check`, and
  `doctor` returned success with no findings.
- `npm run verify` passed TypeScript checks and 76 tests, 0 failed.
- `npm pack --dry-run` passed with 69 allowlisted package entries.
- Canonical skill and workflow scan found no personal Claude paths or commands,
  delegated-agent requirements, external AI tools, source-control delivery
  commands, or deployment commands.
- Whole-Plan consistency search found no unresolved stale term, rejected
  assumption, unverified marker, TODO, TBD, or contradiction; the sole match was
  the success criterion requiring zero unresolved contradictions.
- `git diff --check` passed.
