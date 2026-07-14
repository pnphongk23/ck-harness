---
phase: 3
title: "Workflow and Skill Ports"
status: completed
priority: P1
effort: "5-7 days"
dependencies: [1, 2]
---

# Phase 3: Workflow and Skill Ports

## Overview

Define the end-to-end working model and adapt the useful ClaudeKit skills into focused `harness-*` skills. Remove hidden dependencies on user-global rules, unavailable tools, mandatory Claude subagents, and paths outside this repository.

## Workflow Contract

```text
Explore codebase or request
  -> Feature business document
  -> Shared spec consultation and decisions
  -> CK-compatible plan
  -> Cook implementation and verification
  -> Delivery report
  -> Human-approved repeated lesson promotion to rule
```

- **Feature:** adapted from brainstorm, ask, and scout. It may describe a new feature or reverse-engineer existing behavior, but must distinguish observed evidence, inference, and TBD.
- **Decision:** records context, alternatives, chosen trade-off, consequences, and evidence links.
- **Plan:** preserves CK plan naming and file layout under `docs/harness/plans/`.
- **Cook:** reads an approved plan, works phase by phase, requires verification, writes a report, and never requires subagents, commits, pushes, or deployments.
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

## Risks

- Copying CK skills unchanged reintroduces mandatory subagent orchestration and global paths; all ports require line-by-line dependency review.
- Claude personal skills can override project skills; unique `harness-*` names are mandatory.
- Skills can drift from CLI behavior; workflow docs and CLI schemas are canonical, while adapters are validated projections.

## Success Criteria

- [x] Five focused harness workflows cover Feature, Decision, Plan, Cook, and Self Improve responsibilities without overlap.
- [x] Every ported skill reference resolves within the repository or is explicitly optional.
- [x] Plan skill creates CK-compatible plans under `docs/harness/plans/`.
- [x] Cook has no mandatory subagent, Task tool, commit, push, or deploy behavior.
- [x] Provenance and licensing are recorded for every adapted source.
- [x] Trigger tests select the correct skill and do not activate implementation during Feature discovery.

## Verification Evidence

- ClaudeKit CLI version `4.4.0` and the six installed source skill directories
  were inspected on 2026-07-14; file/reference disposition is recorded in
  `docs/harness/SKILL-PORTS.md` and `docs/harness/PROVENANCE.md`.
- `npm test` passed local-reference, forbidden-operation, provenance, and
  explicit/implicit trigger tests on 2026-07-14.
