---
phase: 3
title: "Workflow and Skill Ports"
status: completed
priority: P1
effort: "5-7 days"
dependencies: [1, 2]
decision_dependencies:
  - "[[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]]"
  - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
---

# Phase 3: Workflow and Skill Ports

## Overview

Define the end-to-end working model and adapt the useful ClaudeKit skills into focused `harness-*` skills. Remove hidden dependencies on user-global rules, unavailable tools, mandatory Claude subagents, and paths outside this repository.

## Workflow Contract

```text
Classify request
  -> Feature only for new or changed observable behavior
  -> consult authority and interrupt for durable Decisions as needed
  -> mechanically valid and human-approved CK-compatible Plan
  -> eligible phase Cook with verification evidence
  -> Delivery Report
  -> optional human-approved Self Improve
```

- **Feature:** adapted from brainstorm, ask, and scout. It may describe a new feature or reverse-engineer existing behavior, but must distinguish observed evidence, inference, and TBD.
- **Decision:** records durable context, alternatives, chosen trade-off,
  consequences, and evidence, then returns to the boundary that raised it.
- **Plan:** preserves CK naming and layout while recording approval, governing
  relationships, and phase Decision dependencies.
- **Cook:** derives eligibility from Plan and phase state, works one phase at a
  time, requires verification, writes a report, and stores no duplicate Cook state.
- **Self Improve:** verified reports/decisions feed a classified improvement loop;
  Rule promotion remains one gated outcome requiring at least two independent
  occurrences with one `recurrence_key` and explicit human approval.

## Skill Port Inventory

- `brainstorm`: retain scout-first discovery, exact requirements, approaches, and approval gate; replace global plan/report paths.
- `ask`: retain architecture consultation; replace `$HOME/.claude/rules/*` assumptions with `docs/harness/index.md` and linked specs.
- `scout`: retain codebase mapping; make output feed Feature Relationships and source paths.
- `ck-plan`: retain CK CLI scaffolding, naming, phases, validation, and status operations; set plan root to `docs/harness/plans/`; remove mandatory task hydration and unrelated global plan behavior.
- `cook`: retain plan-before-code, acceptance, test, review, and side-effect gates; remove mandatory Claude Task/subagent orchestration and automatic Git/finalization actions.
- `ck-graphify`: retain optional graph guidance; update canonical roots and cleanup policy.

## Canonical Skill Layout

- Author canonical skills once in `.agents/skills/harness-*/` for Codex and Antigravity.
- Use names `harness-feature`, `harness-decision`, `harness-plan`, `harness-cook`, and `harness-self-improve` to avoid collisions with personal `ck:*` skills.
- Keep `SKILL.md` concise; move templates to `docs/harness/templates/` and workflow detail to `docs/harness/workflows/`.
- Record source skill, upstream version, license, adaptation date, and removed dependencies.

## Related Code Files

- Create: `docs/harness/workflows/{feature,decision,plan,cook,self-improve}.md`.
- Create: `.agents/skills/harness-*/SKILL.md`.
- Create: skill contract tests and path-reference checker fixtures.

## Implementation Steps

1. Inventory every file and relative/global reference used by the six source skills.
2. Classify each dependency as retained, replaced, optional, or removed.
3. Write the canonical workflow documents before adapting skill entrypoints.
4. Port Feature discovery with the approved five-section BA template and user approval gate.
5. Port Decision capture and repeated-friction metadata.
6. Port Plan while preserving installed CK 4.4.0 command and naming behavior.
7. Port Cook without mandatory subagents; require direct evidence for tests/review and the exact disclosure `Tôi không thể xác minh điều này hoạt động vì...` when checks cannot run.
8. Port optional Graphify behavior with clean skip semantics.
9. Add static checks for missing local references, forbidden `$HOME/.claude` dependencies, stale CK paths, agent-spawning instructions, and uncredited copied material.
10. Test implicit and explicit trigger prompts for each skill.
11. Classify requests before Feature creation and document authority precedence.
12. Separate Plan approval from execution, add Decision dependencies, and keep
    Cook eligibility derived.
13. Remove the universal post-Report approval gate; place material business or
    high-risk acceptance in approved Plan success criteria.

## Risks

- Copying CK skills unchanged reintroduces mandatory subagent orchestration and global paths; all ports require line-by-line dependency review.
- Claude personal skills can override project skills; unique `harness-*` names are mandatory.
- Skills can drift from CLI behavior; workflow docs and CLI schemas are canonical, while adapters are validated projections.
- Plan extensions can drift from ClaudeKit; strict CK validation remains a required compatibility check.

## Success Criteria

- [x] Five focused harness workflows cover Feature, Decision, Plan, Cook, and Self Improve responsibilities without overlap.
- [x] Every ported skill reference resolves within the repository or is explicitly optional.
- [x] Plan skill creates CK-compatible plans under `docs/harness/plans/`.
- [x] Cook has no mandatory subagent, Task tool, commit, push, or deploy behavior.
- [x] Provenance and licensing are recorded for every adapted source.
- [x] Trigger tests select the correct skill and do not activate implementation during Feature discovery.
- [x] Read-only, no-change, maintenance, behavior-change, durable-decision, and
  improvement requests route to the smallest suitable workflow.
- [x] Decision can interrupt and return to Feature, Plan, Cook, or Self Improve.
- [x] Plan approval is separate from execution and phases declare Decision dependencies.
- [x] Cook has no durable status and Plan completion is evidence-based through a Delivery Report.

## Verification Evidence

- ClaudeKit CLI version `4.4.0` and the six installed source skill directories
  were inspected on 2026-07-14; file/reference disposition is recorded in
  `docs/harness/SKILL-PORTS.md` and `docs/harness/PROVENANCE.md`.
- `npm test` passed local-reference, forbidden-operation, provenance, and
  explicit/implicit trigger tests on 2026-07-14.
- FEAT-002, DEC-004, DEC-005, and `workflow-lifecycle.md` record the approved
  lifecycle revision and its evidence on 2026-07-14.
- `npm run verify` passed 19 tests after lifecycle schema, workflow, Plan, and
  snapshot alignment on 2026-07-14.
- `ck plan validate docs/harness/plans/260714-0033-file-based-agent-harness/plan.md --strict`
  passed with 0 errors and 0 warnings on ClaudeKit 4.4.0.
- All 16 Feature, Decision, Spec, Plan, and phase files parsed under the
  executable schema; their non-example wikilinks and source paths resolved.
