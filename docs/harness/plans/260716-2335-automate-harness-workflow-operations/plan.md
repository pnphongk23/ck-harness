---
title: Automate Harness workflow operations
description: Add deterministic CLI scaffolding, review recording, workflow-state checks, and guarded execution transitions, then require Harness workflows and skills to use them.
status: completed
approval:
  status: approved
  required_by: Repository Maintainer
  decided: 2026-07-16
priority: P1
effort: 5-7 days
branch: codex/automate-harness-workflow-operations
tags:
  - harness
  - cli
  - workflow
  - lifecycle
  - automation
blockedBy: []
blocks: []
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-001-cli-command-parsing|DEC-001]]"
    - "[[DEC-002-minimal-file-mutations|DEC-002]]"
    - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
    - "[[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]]"
    - "[[DEC-012-build-markdown-retrieval-with-an-explicit-graph-and-lexical-index|DEC-012]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
    - "[[260715-2324-verified-skill-workflows/plan|Plan]]"
  reports:
    - "[[REP-010-deliver-automated-harness-workflow-operations|REP-010]]"
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
    - "[[FEAT-007-require-verified-discovery-and-planning|FEAT-007]]"
    - "[[FEAT-008-automate-harness-workflow-operations|FEAT-008]]"
  source_paths:
    - docs/harness/features/FEAT-008-automate-harness-workflow-operations.md
    - docs/harness/specs/workflow-lifecycle.md
    - docs/harness/workflows/README.md
    - docs/harness/workflows/feature.md
    - docs/harness/workflows/plan.md
    - docs/harness/workflows/cook.md
    - docs/harness/RULES.md
    - docs/harness/README.md
    - .agents/skills/harness-feature/SKILL.md
    - .agents/skills/harness-plan/SKILL.md
    - .agents/skills/harness-cook/SKILL.md
    - package.json
    - src/cli/index.ts
    - src/core/lifecycle.ts
    - src/core/integrity.ts
    - src/core/schemas/artifacts.ts
    - src/core/schemas/frontmatter.ts
    - src/fs/repository.ts
    - src/fs/atomic-write.ts
    - tests/cli-lifecycle.test.ts
    - tests/integrity.test.ts
    - tests/mutations.test.ts
    - tests/repository-paths.test.ts
    - tests/templates.test.ts
    - tests/workflows.test.ts
    - tests/skills.test.ts
created: 2026-07-16T23:35:55+07:00
createdBy: Codex
source: Approved FEAT-008 and current repository lifecycle contracts
---

# Automate Harness workflow operations

## Overview

Implement [[FEAT-008-automate-harness-workflow-operations|FEAT-008]] by
extending the existing typed CLI and file lifecycle boundaries. The CLI remains
a deterministic recorder and validator: a human supplies review authority, and
the CLI never infers approval or starts Cook automatically.

No generic state-machine engine or separate database is introduced. Creation
and mutation stay in `src/core/lifecycle.ts`, cross-document checks stay in
`src/core/integrity.ts`, command parsing stays in `src/cli/index.ts`, and all
writes continue through `applyMutation()` and configured `repositoryPaths()`.
Plan-local design is sufficient; no separate `design.md` is needed.

### Proposed command contract

- `ckh feature create --title TITLE [--created YYYY-MM-DD]` remains the Feature
  starter command.
- `ckh plan create --title TITLE --work-item TITLE [--work-item TITLE ...]
  [--created ISO-8601]` creates one Plan root and ordered Work Item starters.
- `ckh workflow status TARGET` reports current review/execution state, blockers,
  and eligible next operations without writing.
- `ckh workflow check TARGET` aggregates the relevant preflight findings without
  writing.
- `ckh feature approve TARGET --approved YYYY-MM-DD --approved-by AUTHORITY`
  records explicit Product Authority approval.
- `ckh feature request-changes TARGET` keeps or returns the Feature to
  `proposed` and clears incompatible approval provenance.
- `ckh plan approve TARGET --decided YYYY-MM-DD` and `ckh plan
  request-changes TARGET --decided YYYY-MM-DD` update approval only; execution
  status remains independent.
- `ckh plan set-status TARGET --status STATUS [--reason TEXT]` and `ckh
  work-item set-status TARGET --status STATUS [--reason TEXT]` apply only legal
  execution transitions.

`TARGET` is an exact Feature ID/basename, Plan directory/repository-relative
`plan.md`, or repository-relative Work Item path as appropriate. Existing
commands, `--workspace`, strict option rejection, human output, and stable JSON
envelopes remain compatible.

## Work Items

| Work Item | Name | Status |
| --- | --- | --- |
| 1 | [Canonical Plan scaffolding](./work-item-01-canonical-plan-scaffolding.md) | Completed |
| 2 | [Workflow state and human review commands](./work-item-02-workflow-state-and-review.md) | Completed |
| 3 | [Guarded execution transitions](./work-item-03-guarded-execution-transitions.md) | Completed |
| 4 | [Workflow adoption and delivery verification](./work-item-04-workflow-adoption-and-verification.md) | In progress |

## Requirement coverage

| FEAT-008 requirement or acceptance evidence | Delivering Work Item |
| --- | --- |
| FR-001 — Feature and Plan starter creation | 1 |
| FR-002/FR-003 — workflow state and aggregate preflight | 2 |
| FR-004/FR-005 — Feature approval and request-changes semantics | 2 |
| FR-006 — Plan approval and request-changes semantics | 2 |
| FR-007 — legal Plan and Work Item execution transitions | 3 |
| FR-008/NFR-001 — required, token-efficient CLI use in workflows and skills | 4 |
| FR-009 — stable target/state/blocker/path/next-operation output | 1, 2, 3, 4 |
| BR-001 — record but never grant authority or auto-start coding | 2, 3, 4 |
| BR-002 — independent approval/execution and dependency closure | 2, 3 |
| BR-003 — canonical Markdown only, no hidden state | 1, 2, 3 |
| BR-004 — staged validation, lock, atomic publication, user-change preservation | 1, 2, 3 |
| NFR-002/NFR-003 — existing command/layout compatibility and portability | 1, 2, 3, 4 |
| Inspect-before-planning scenario | 2, 4 |
| Withhold-approval-from-agent scenario | 2 |
| Preserve-Plan-state-separation scenario | 2 |
| Block-ineligible-Work-Item scenario | 3 |

## Verification ledger

| Claim | Status | Evidence |
| --- | --- | --- |
| The CLI uses strict path-specific Node argument parsing and stable JSON envelopes | Verified | `commands`, `runCli()`, and `command()` in `src/cli/index.ts`; DEC-001. |
| Current CLI has Feature creation and integrity commands but no Plan creation, review, workflow-state, or execution-transition commands | Verified | Command registrations in `src/cli/index.ts`; `ckh feature list`; FEAT-008 discovery. |
| Configured layouts and containment are centralized | Verified | `repositoryPaths()`, `findRepositoryRoot()`, and `assertContained()` in `src/fs/repository.ts`. |
| Safe mutation already stages complete changes and rejects divergent targets | Verified | `applyMutation()` in `src/fs/atomic-write.ts`; DEC-002; `tests/mutations.test.ts`. |
| Feature state, Plan approval, Plan execution, and Work Item execution are distinct executable schemas | Verified | `featureSchema`, `planApprovalSchema`, `planSchema`, and `workItemSchema` in `src/core/schemas/artifacts.ts`. |
| Integrity checks already enforce Decision approval, predecessors, Plan approval, aggregation, Report presence, and plan layout | Verified | `workItemDecisionFindings()`, `planLifecycleFindings()`, and `planLayoutFindings()` in `src/core/integrity.ts`. |
| Plan and Work Item templates are currently absent | Verified | `docs/harness/templates/` contains only Decision, Feature, Report, Rule, and shared Spec templates; `tests/templates.test.ts` snapshots the complete directory. |
| Initialization will publish added Markdown templates without a new copy mechanism | Verified | `initializeHarness()` enumerates every Markdown file in the source templates directory. |
| Existing lifecycle and custom-layout tests provide command, JSON, strict grammar, nested path, non-ASCII, and configured-path seams | Verified | `tests/cli-lifecycle.test.ts`, `tests/repository-paths.test.ts`, and `tests/integrity.test.ts`. |
| The only unfinished overlapping Plan has no active Work Item and is blocked solely on external Linux/Windows evidence for FEAT-001 | Verified | `260714-0033-file-based-agent-harness/plan.md` and its Work Item 5. |
| Graph behavior remains outside this delivery | Verified | DEC-012 assigns the retrieval graph to FEAT-009 and its separate Plan; this Plan does not invoke or extend Graphify. |
| Current repository baseline is valid | Verified | `ckh validate`, `ckh index check`, `ckh doctor`, `npm test` (99/99), and `git diff --check` passed before Plan creation. |

Verification totals: 12 Verified, 0 Failed, 0 Unresolved.

## Dependencies and overlap

- FEAT-001, FEAT-002, FEAT-003, FEAT-007, and FEAT-008 are approved and close
  the governing behavior boundary.
- DEC-001 fixes strict Node parsing; DEC-002 fixes safe file mutation; DEC-005
  requires approval/execution separation; DEC-008 fixes Work Item terminology;
  DEC-012 keeps the retrieval graph in FEAT-009 and its separate Plan.
- The blocked `260714-0033-file-based-agent-harness` Plan retains external
  cross-platform verification for the old FEAT-001 command surface. This Plan
  does not change that success criterion, claim it complete, or depend on its
  external CI run. Shared test files may be extended without changing preserved
  evidence in the blocked Work Item.
- The completed `260715-2324-verified-skill-workflows` Plan is precedent for
  workflow and skill verification, not unfinished execution scope.

## Adversarial review

- **Security and privacy:** Resolve every target through configured repository
  paths and containment checks. Do not invoke Graphify, Git, network, agents,
  release, or deployment. Do not treat a caller-supplied authority string as
  authenticated identity; it is explicit provenance only.
- **Assumptions:** Reuse executable schemas and integrity findings instead of
  copying status rules into a second engine. Inject or explicitly supply clocks
  in tests so Plan directory naming is deterministic.
- **Failure modes:** Stage multi-file Plan creation and coupled Plan/Work Item
  mutations as one validated overlay. Invalid current state, collisions,
  concurrent writers, stale targets, missing reasons, unchecked success
  criteria, or unmet dependencies must leave authored files unchanged.
- **Scope complexity:** Keep typed commands and exact targets. Do not add generic
  arbitrary transitions, prose generation, an event ledger, a daemon, a new
  dependency, or lifecycle support for unrelated artifact types.
- **Compatibility:** Preserve current command grammar and accepted legacy
  `in-progress` reads while writing `in_progress`. Add default and configured
  layout fixtures, LF/template snapshots, and stable JSON assertions.

No adversarial finding changes the selected architecture or requires a new
Decision. Zero unresolved contradictions remain across the Plan and Work Items.

## Approval and execution boundary

This Plan is non-executable while `approval.status` is `pending`. Repository
Maintainer approval accepts the proposed command contract, Work Item sequence,
coverage, risks, and evidence. Approval must not change Plan execution status;
Cook may then start only Work Item 1.
