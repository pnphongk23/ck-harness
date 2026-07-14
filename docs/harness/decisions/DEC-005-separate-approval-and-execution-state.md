---
schema_version: 1
type: decision
id: DEC-005
title: Separate approval from execution and derive Cook eligibility
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Repository Maintainer
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
  source_paths:
    - docs/harness/schema-v1.md
    - docs/harness/workflows/plan.md
    - docs/harness/workflows/cook.md
---

# DEC-005: Separate approval from execution and derive Cook eligibility

## Context

Plan `status` currently tracks execution but Cook requires an approved Plan.
Approval exists only as conversational handoff, so it is not inspectable or
machine-verifiable. Adding a separate Cook status would duplicate Plan and Work Item
state. A universal human Report approval gate would add another ambiguous state
after verification has already established technical completion.

## Decision

Store Plan approval separately from execution. Approval uses `pending`,
`changes_requested`, or `approved` and records the required authority and
decision date. Plan and Work Item execution use `pending`, `in_progress`, `blocked`,
`completed`, or `cancelled`; blocked and cancelled states record a reason.

Do not persist Cook status. Derive eligibility, current Work Item, blockers, and
next action from Plan approval and execution, Work Item state, approved Decision
dependencies, and Report presence.

Complete a Plan when all required Work Item criteria have passing evidence and a
completed Delivery Report exists. When business or high-risk acceptance is
needed, include it in the approved Plan success criteria rather than adding a
universal post-Report approval gate.

## Alternatives

1. **One Plan status for approval and execution.** This keeps frontmatter small but cannot distinguish waiting for approval from blocked execution.
2. **Separate approval and execution; derive Cook eligibility — selected.** This makes authority and progress independently inspectable without duplicate runtime state.
3. **Create a durable Cook run artifact.** This could capture attempts and resumptions but introduces a parallel execution ledger prohibited by the file-first MVP boundary.

## Consequences

- Plan schema gains approval provenance and relationships.
- Work Item schema gains Decision dependencies and reasons for blocked or cancelled state.
- Material Plan changes reset approval; routine fixes inside approved scope do not.
- Report completion is evidence-based and does not require a second universal human gate.
- CLI status output may compute Cook eligibility but must not store a Cook lifecycle.

## Evidence

- [[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]
- [[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]]
- [[workflow-lifecycle]]
- Human approval of the lifecycle review on 2026-07-14.
- `npm run verify` passed 19 tests after the approved lifecycle change.
- ClaudeKit 4.4.0 strict Plan validation passed with 0 errors and 0 warnings.
- All canonical lifecycle artifacts parsed and their non-example wikilinks resolved.

## Supersession

This decision supersedes no earlier decision.
