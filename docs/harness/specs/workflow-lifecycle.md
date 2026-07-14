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
    - "[[DEC-007-separate-document-authority-from-coding-execution|DEC-007]]"
    - "[[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]]"
    - "[[DEC-009-co-locate-implementation-design-with-its-plan|DEC-009]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
    - "[[260714-2354-co-locate-plan-design/plan|Plan]]"
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

## Workflow families

- **Document workflow:** creates or revises Features, Specs, Decisions, Reports,
  Rules, and other durable knowledge under the lifecycle appropriate to
  each document. Document work may complete without a Coding Plan.
- **Coding workflow:** grounds authority and current code, writes or links
  implementation design, plans, executes, verifies, and reports repository
  changes. Document work may precede or overlap coding, but active coding may
  implement only approved governing behavior.

Feature is an authority document, not a mandatory workflow stage. A
technical-only change that preserves observable behavior may enter the Coding
workflow without a new Feature when an active Spec, approved Decision, or
explicit design objective provides sufficient technical authority.

## Request classification

Classify the requested outcome before mutating durable Harness state:

| Request class | Route |
| --- | --- |
| Answer, explanation, review, diagnosis, plan, or status | Read only; inspect the smallest relevant context and create no durable artifact unless explicitly requested |
| Existing behavior already satisfies the request | Return evidence and stop without Plan or Cook |
| Document-only change | Run the applicable Feature, Decision, Spec, Report, Rule, or guidance procedure and stop without coding |
| Maintenance within approved behavior | Link the governing Feature or Spec and create the smallest appropriate Coding Plan |
| Technical-only change with no governing Feature | Scout current code, define technical objectives, optionally write Plan-local design, and create a Plan |
| New or changed observable behavior | Run Feature discovery and obtain Product Authority approval before Plan approval |
| Durable product or technical trade-off | Run Decision at the affected workflow boundary |
| Harness guidance improvement | Run Self Improve from verified Report or approved Decision evidence |

All implementation work still requires an approved Plan. Request classification
only determines whether a new Feature or Decision is necessary before planning;
it does not force document work into a universal Feature-to-Plan-to-Cook chain.

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
- `approved`: the required authority approved the Plan boundary, Work Items, and
  success criteria. Record `decided` and `required_by`.

Before approval, the Plan must demonstrate:

- every governing Feature is approved and no blocking Decision is unresolved;
- Graphify document grounding, when available within DEC-006, plus direct
  inspection of affected source, dependencies, and tests;
- when useful, one optional `design.md` beside `plan.md`, linked through the
  owning Plan's `relationships.source_paths`;
- ordered Work Items with inline Tasks, risks, and required evidence; and
- coverage from every in-scope Feature requirement, or every explicit technical
  objective when no Feature governs the change, to at least one Work Item.

These are inputs to the existing Plan approval. They do not create an
Implementation Readiness artifact, Change Design artifact, or additional gate.

Execution states:

- `pending`: no Work Item has started.
- `in_progress`: authorized Work Item work has started and meaningful progress remains possible.
- `blocked`: a concrete condition prevents meaningful progress; record `status_reason`.
- `completed`: every required Work Item is completed and a completed Delivery Report exists.
- `cancelled`: a human ended the Plan before completion; record `status_reason`.

Waiting for initial Plan approval is `pending`, not `blocked`. A material change
to Plan scope or success criteria resets approval to `pending` and prevents new
implementation until reapproval. Routine revision within approved scope does not
reset approval.

## Work Item execution and Cook eligibility

Each persisted `work-item-XX-*.md` is one Work Item. Its optional kind (`story`,
`technical`, `migration`, `docs`, or `verification`), inline Tasks, and coverage
remain Markdown body content rather than new frontmatter fields. Work Item states
are `pending`, `in_progress`, `blocked`, `completed`, and `cancelled`. New
Harness documents write `in_progress`; readers also accept the ClaudeKit
spelling `in-progress`.

- At most one Work Item is `in_progress`.
- A Work Item is eligible only when Plan approval is `approved`, predecessor Work Items
  are `completed`, and every `decision_dependencies` entry is an approved Decision.
- A known unresolved dependency before Work Item start leaves the Work Item `pending`.
- A durable trade-off discovered during execution blocks the active Work Item only
  when no further work remains valid within the approved scope.
- A failed check that can still be investigated within approved scope leaves the
  Work Item `in_progress`.
- `blocked` and `cancelled` require `status_reason`.
- `completed` requires passing evidence for every required success criterion.
- A cancelled Work Item is not counted as completed unless an approved Plan revision
  removes it from the required scope and updates acceptance accordingly.

Cook has no durable status. Tools may display eligibility, current Work Item,
blocking reasons, and next action derived from Plan approval and execution,
Work Item state, Decision dependencies, and Report presence.

## Completion and improvement

After all required Work Items pass, Cook writes a completed Delivery Report and the
Plan becomes `completed`. Product or high-risk acceptance, when required, must
be an explicit Plan success criterion and therefore pass before the Report is
completed. There is no second universal Report approval gate.

A rejected business outcome after delivery is new evidence. It creates a
follow-up change request rather than rewriting the completed Report. Verified
Report or approved Decision evidence may then enter Self Improve.

## Trace contract

- Feature, Decision, Spec, Report, and Plan frontmatter carry the shared
  `relationships` object.
- Plan relationships identify every governing Feature, Spec, Decision, Report,
  and, when present, the exact sibling `design.md` source path.
- Plan body coverage maps Feature requirements or technical objectives to Work
  Items; Tasks remain inline within each Work Item body.
- Work Item `decision_dependencies` records approved Decisions inherited by the
  Work Item. A blocking unresolved Decision prevents Plan approval.
- ID-bearing links use full-basename wikilinks with an ID alias.
- The derived index supplies backlinks and diagnostics; it is not a substitute
  for explicit ownership links.

## Verification

Validation must reject unsupported statuses, missing approval provenance,
blocked or cancelled state without a reason, duplicate relationships, invalid
Decision dependencies, and execution that starts without approved authority.
Cross-file validation must additionally check Decision status, Work Item ordering,
Plan aggregation, Report presence, and resolvable wikilinks.
