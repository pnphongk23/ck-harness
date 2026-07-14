---
schema_version: 1
type: spec
title: Harness workflow lifecycle
status: active
relationships:
  specs: []
  decisions:
    - "[[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]]"
    - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
  source_paths:
    - docs/harness/workflows/README.md
    - docs/harness/RULES.md
    - src/core/schemas/artifacts.ts
---

# Harness workflow lifecycle

## Scope

This specification defines request classification, artifact authority, approval
and execution states, transition eligibility, and trace relationships for the
workflow governed by [[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]. It
does not make the deterministic Harness CLI an agent orchestrator.

Humans and coding agents perform discovery, planning, implementation, and
verification. Harness workflows define required behavior; repository tooling
scaffolds and validates artifacts and rejects invalid transitions.

## Request classification

Classify the requested outcome before mutating durable Harness state:

| Request class | Route |
| --- | --- |
| Answer, explanation, review, diagnosis, plan, or status | Read only; inspect the smallest relevant context and create no durable artifact unless explicitly requested |
| Existing behavior already satisfies the request | Return evidence and stop without Plan or Cook |
| Maintenance within approved behavior | Link the governing Feature or Spec and create the smallest appropriate Plan |
| New or changed observable behavior | Run Feature discovery and obtain Product Authority approval |
| Durable product or technical trade-off | Run Decision at the affected workflow boundary |
| Harness guidance improvement | Run Self Improve from verified Report or approved Decision evidence |

All implementation work still requires an approved Plan. Request classification
only determines whether a new Feature or Decision is necessary before planning.

## Authority

| Concern | Authoritative artifact | Required human authority |
| --- | --- | --- |
| Repository workflow and safety policy | `RULES.md` and active Rules | Repository Maintainer |
| Observable business behavior | Approved Feature | Product Authority |
| Shared technical constraint | Active Spec | Repository Maintainer |
| Selected durable trade-off and rationale | Approved Decision | Product Authority for product choices; Repository Maintainer for technical choices |
| Implementation sequence and success criteria | Approved Plan | Repository Maintainer |
| Delivered result and verification evidence | Completed Report | Derived from executed checks; no universal human approval gate |

A Plan cannot override an approved Feature, active Spec, approved Decision, or
repository Rule. A Report records what happened and cannot redefine intended
behavior. Source code is evidence of current behavior, not automatic authority
for intended behavior. A detected conflict blocks the affected transition and
returns to the owner of the conflicting artifact.

One human may hold more than one authority role. The artifact records the role
under which approval was granted.

## Feature lifecycle

Feature statuses remain `draft`, `proposed`, `approved`, `active`, and
`deprecated`. An `approved`, `active`, or `deprecated` Feature records
`approved` and `approved_by`. A material change to approved behavior returns the
Feature to `proposed`; downstream authorization remains stale until the revised
Feature is approved and affected Plans are reviewed again.

## Decision lifecycle

```text
proposed -> approved -> superseded
    |
    +-----> rejected
```

- `proposed` is a recommendation and never satisfies a dependency.
- `approved` is normative for its declared scope.
- `rejected` preserves a materially reviewed proposal without making it normative.
- `superseded` preserves an earlier approved Decision replaced by a new Decision.
- Approved and superseded Decisions retain `approved` and `approved_by`.
- A rejected Decision records `rejected`.
- Supersession follows R-013 and is never implemented by rewriting history.

A product Decision may use a proposed Feature as context when the choice is
required to finalize observable behavior. A technical Decision normally uses an
approved Feature or active Spec. Decision is an interruptible workflow: after
approval, execution returns to the boundary that raised it.

## Plan approval and execution

Plan approval and execution are independent dimensions.

Approval states:

- `pending`: not yet approved or resubmitted after revision.
- `changes_requested`: the required authority rejected the current Plan shape;
  execution is not eligible.
- `approved`: the required authority approved the Plan boundary, phases, and
  success criteria. Record `decided` and `required_by`.

Execution states:

- `pending`: no phase has started.
- `in_progress`: authorized phase work has started and meaningful progress remains possible.
- `blocked`: a concrete condition prevents meaningful progress; record `status_reason`.
- `completed`: every required phase is completed and a completed Delivery Report exists.
- `cancelled`: a human ended the Plan before completion; record `status_reason`.

Waiting for initial Plan approval is `pending`, not `blocked`. A material change
to Plan scope or success criteria resets approval to `pending` and prevents new
implementation until reapproval. Routine revision within approved scope does not
reset approval.

## Phase execution and Cook eligibility

Phase states are `pending`, `in_progress`, `blocked`, `completed`, and
`cancelled`. New Harness documents write `in_progress`; readers also accept the
ClaudeKit spelling `in-progress`.

- At most one phase is `in_progress`.
- A phase is eligible only when Plan approval is `approved`, predecessor phases
  are `completed`, and every `decision_dependencies` entry is an approved Decision.
- A known unresolved dependency before phase start leaves the phase `pending`.
- A durable trade-off discovered during execution blocks the active phase only
  when no further work remains valid within the approved scope.
- A failed check that can still be investigated within approved scope leaves the
  phase `in_progress`.
- `blocked` and `cancelled` require `status_reason`.
- `completed` requires passing evidence for every required success criterion.
- A cancelled phase is not counted as completed unless an approved Plan revision
  removes it from the required scope and updates acceptance accordingly.

Cook has no durable status. Tools may display eligibility, current phase,
blocking reasons, and next action derived from Plan approval and execution,
phase state, Decision dependencies, and Report presence.

## Completion and improvement

After all required phases pass, Cook writes a completed Delivery Report and the
Plan becomes `completed`. Product or high-risk acceptance, when required, must
be an explicit Plan success criterion and therefore pass before the Report is
completed. There is no second universal Report approval gate.

A rejected business outcome after delivery is new evidence. It creates a
follow-up change request rather than rewriting the completed Report. Verified
Report or approved Decision evidence may then enter Self Improve.

## Trace contract

- Feature, Decision, Spec, Report, and Plan frontmatter carry the shared
  `relationships` object.
- Plan relationships identify governing Features, Specs, Decisions, and Reports.
- Phase `decision_dependencies` lists Decisions that must be approved before the
  phase can start.
- ID-bearing links use full-basename wikilinks with an ID alias.
- The derived index supplies backlinks and diagnostics; it is not a substitute
  for explicit ownership links.

## Verification

Validation must reject unsupported statuses, missing approval provenance,
blocked or cancelled state without a reason, duplicate relationships, invalid
Decision dependencies, and execution that starts without approved authority.
Cross-file validation must additionally check Decision status, phase ordering,
Plan aggregation, Report presence, and resolvable wikilinks.
