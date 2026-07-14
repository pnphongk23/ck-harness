---
schema_version: 1
type: feature
id: FEAT-002
title: Govern work through a traceable and approved lifecycle
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Product Authority
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]]"
    - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
  source_paths:
    - docs/harness/workflows/README.md
    - docs/harness/RULES.md
---

# FEAT-002: Govern work through a traceable and approved lifecycle

## Introduction

**Purpose:** Let humans and coding agents turn authorized business intent into
verified repository outcomes while preserving what governs the work, why
material choices were made, what may execute next, and what evidence proves
completion.

**In scope:**

- Classify requests so read-only, no-change, maintenance, behavior-change,
  durable-decision, and Harness-improvement work use the smallest suitable flow.
- Discover and approve observable business behavior before it authorizes implementation.
- Keep Features, Specs, Decisions, Plans, phases, Reports, and Rules traceable.
- Interrupt the affected workflow when a durable product or technical trade-off
  requires human judgment.
- Require an approved, verifiable Plan before implementation begins.
- Execute eligible Plan phases sequentially and prevent unsupported completion.
- Record delivered outcomes and verification evidence in a Delivery Report.
- Route verified friction into a human-approved Self Improve flow.

**Out of scope:**

- Choosing project-specific architecture, libraries, APIs, storage, or source layout.
- Treating local, mandated, or cheaply reversible choices as durable Decisions.
- Making the deterministic Harness CLI launch or orchestrate coding agents.
- Automatically granting human approval, committing, pushing, releasing, or deploying.
- Defining exact frontmatter fields, status enums, or transition algorithms;
  those belong to [[workflow-lifecycle]].

### Evidence classification

- **Observed:** The project bridges business intent, technical context, and
  coding through repository-local documents, relationships, approval gates, and
  verification before completion.
- **Observed:** Material Feature, Decision, Plan, destructive-action, and Rule
  transitions require explicit human authority.
- **Observed:** Phase and Plan completion require concrete verification evidence.
- **Inferred and approved:** Request classification prevents simple or read-only
  work from being forced through unnecessary Feature creation.
- **Inferred and approved:** Decision is an interruptible workflow rather than a
  single fixed stage after Feature approval.
- **Inferred and approved:** Plan approval is independent from execution, while
  Cook eligibility is derived rather than stored as duplicate durable state.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Product Authority | Business role | Preserve intended business outcomes | Clarify and approve observable behavior and product choices |
| Repository Maintainer | Business role | Keep repository work coherent and executable | Approve technical Decisions, Plans, and material lifecycle changes |
| Coding Agent | External system | Deliver authorized work without losing intent | Read governing artifacts, implement eligible phases, run checks, and record evidence |
| Validation System | External system | Prevent invalid handoffs and unsupported completion | Validate artifacts, relationships, eligibility, and recorded verification results |

### User needs

- A Product Authority needs business behavior to remain understandable without
  reading implementation details.
- A Repository Maintainer needs to know which contract governs the work, which
  choices are approved, and what may execute next.
- A Coding Agent needs the smallest relevant map of behavior, constraints,
  decisions, phase scope, and required proof.
- A Validation System needs explicit contracts so invalid transitions are
  rejected before they authorize downstream work.

### Preconditions

- The repository contains canonical Harness workflow and artifact guidance.
- A requested outcome or verified improvement signal has been identified.
- Relevant repository evidence can be inspected.
- A human authority is available for every material approval boundary.

### Trigger

A human requests an answer or repository outcome, reports behavior to formalize,
or approves evaluation of a verified Harness improvement signal.

### Main flow

1. **Actor:** The requester states the intended outcome. **System:** The Harness
   classifies the request and identifies the smallest authoritative context and workflow.
2. **Actor:** When observable behavior is new or changing, the Product Authority
   clarifies scope and acceptance. **System:** The Harness records evidence as
   Observed, Inferred, or TBD and prevents unresolved material behavior from
   becoming approved.
3. **Actor:** The Product Authority approves the business boundary. **System:**
   The approved Feature becomes the authority for observable behavior.
4. **Actor:** The Coding Agent and Repository Maintainer inspect governing Specs,
   Decisions, Rules, and repository evidence. **System:** The Harness reports
   conflicts or a durable unresolved trade-off instead of allowing a lower-level
   artifact to override its authority.
5. **Actor:** The Coding Agent drafts the smallest phased implementation Plan.
   **System:** The Validation System checks relationships, dependencies, risks,
   and executable success criteria before human review.
6. **Actor:** The Repository Maintainer approves the Plan. **System:** The Harness
   records approval separately from execution and makes only eligible phases available for Cook.
7. **Actor:** The Coding Agent implements one eligible phase and runs its required
   verification. **System:** The Validation System records or checks the evidence
   and prevents the phase or its dependants from completing early.
8. **Actor:** The Coding Agent repeats the verified phase loop. **System:** The
   Harness preserves approval, progress, dependencies, blockers, and approved variance.
9. **Actor:** After all required criteria pass, the Coding Agent records the
   delivery. **System:** The Harness links a completed Delivery Report to the
   governing artifacts and closes the Plan from concrete evidence.
10. **Actor:** The Repository Maintainer reviews any verified friction. **System:**
    The Harness ends the work or routes the signal into Self Improve without
    changing canonical guidance automatically.

### Alternative flows

- **A1 — Read-only request.** Source step: 1. Condition: the requested outcome is
  an answer, explanation, review, diagnosis, plan, or status report without an
  authorized repository change. Behavior: inspect the smallest relevant context
  and return an evidence-backed response without durable Harness mutation. Ends
  with: repository unchanged.
- **A2 — Existing behavior already satisfies the request.** Source step: 1.
  Condition: approved contracts and current evidence already demonstrate the
  requested outcome. Behavior: return the evidence without creating a Plan or
  entering Cook. Ends with: no-change success.
- **A3 — Maintenance inside approved behavior.** Source step: 2. Condition: work
  changes implementation or operations without changing observable behavior.
  Behavior: link the existing governing Feature or Spec and continue at step 4
  without creating a new Feature.
- **A4 — Durable Decision is required.** Source step: 2, 4, 5, 7, or 10.
  Condition: multiple viable product or technical paths have material,
  cross-cutting, or expensive-to-reverse consequences. Behavior: pause only the
  affected transition, obtain Decision approval, update affected artifacts, and
  return to the boundary that raised it.
- **A5 — Plan changes requested.** Source step: 6. Condition: the Plan boundary,
  phase sequence, risk treatment, or success criteria are not approved. Behavior:
  retain non-executable Plan state, revise it, validate again, and resubmit at step 6.
- **A6 — Material variance during Cook.** Source step: 7. Condition: new evidence
  changes approved behavior, technical authority, scope, or success criteria.
  Behavior: preserve current work, block only invalid continuation, revise the
  owning artifact, and obtain every affected approval again before resuming.
- **A7 — Recover from a blocker.** Source step: 7. Condition: a recorded blocker
  is resolved without changing approved scope. Behavior: resume the same phase
  and rerun its required checks without obtaining redundant approval.
- **A8 — Human cancellation.** Source step: 5, 6, or 7. Condition: the responsible
  human ends the work before delivery. Behavior: preserve completed evidence,
  record the cancellation reason, and prevent new phases from starting. Ends
  with: unfinished outcomes are not claimed.
- **A9 — Verified improvement signal.** Source step: 10. Condition: completed
  Report or approved Decision evidence exposes friction, stale guidance, or
  missing validation. Behavior: classify the signal and run Self Improve. Ends
  with: no change, retained candidate, approved correction, Decision, or promoted Rule.

### Exception flows

- **E1 — Insufficient business evidence.** Source step: 2. Failure: material
  intent, scope, actor behavior, or acceptance remains ambiguous. Handling:
  record the gap as TBD and request Product Authority clarification. Prohibited:
  approving an inference as fact. Failure postcondition: downstream implementation remains ineligible.
- **E2 — Required approval is absent.** Source step: 3 or 6. Failure: the required
  authority has not approved the transition. Handling: retain pre-approval state
  and report the exact review required. Prohibited: inferring approval from agent
  confidence or elapsed time. Failure postcondition: Cook remains ineligible.
- **E3 — Contract conflict or unresolved Decision.** Source step: 4, 5, or 7.
  Failure: governing artifacts conflict or an affected phase depends on a
  non-approved Decision. Handling: identify the owner and block the affected
  transition. Prohibited: allowing a Plan, Report, or current code to override
  higher authority. Failure postcondition: last valid authority remains effective.
- **E4 — Verification fails or is unavailable.** Source step: 7. Failure: a
  required check fails or cannot run. Handling: retain evidence and continue
  authorized investigation when meaningful progress remains possible; otherwise
  record the blocker. Prohibited: completing the phase or starting a dependant.
  Failure postcondition: the Plan is not completed.
- **E5 — Artifact transition is invalid.** Source step: 3 through 9. Failure: a
  status, approval, dependency, relationship, identifier, or evidence record
  violates the lifecycle contract. Handling: reject the transition with exact
  diagnostics. Prohibited: silent repair or partial publication. Failure
  postcondition: the last valid lifecycle state remains authoritative.

### Postconditions

- **Delivered:** Governing behavior and constraints, approved Decisions and Plan,
  completed phases, verification evidence, and Delivery Report form a resolvable trace.
- **No change:** Existing evidence satisfies the request without Plan or Cook.
- **Blocked:** The exact owner, approval, Decision, dependency, or verification
  requirement is visible and no invalid transition occurs.
- **Cancelled:** Completed evidence is preserved and unfinished work is not represented as delivered.

## Requirements

- **FR-001 [Observed]:** The Harness shall classify the requested outcome before
  creating or changing durable workflow state.
- **FR-002 [Observed]:** New or changed observable behavior shall require an
  approved Feature whose material evidence is labeled Observed, Inferred, or TBD.
- **FR-003 [Observed]:** Maintenance inside approved behavior shall reuse the
  governing Feature or Spec rather than creating a duplicate Feature.
- **FR-004 [Observed]:** Features, Specs, Decisions, Plans, phases, Reports, and
  Rules shall expose enough explicit relationships for a future actor to resolve
  authority, dependencies, delivery, and evidence.
- **FR-005 [Inferred and approved]:** A durable unresolved trade-off shall
  interrupt only the affected Feature, Plan, Cook, or Self Improve transition and
  shall return to that boundary after approval.
- **FR-006 [Observed]:** Local, mandated, and cheaply reversible choices shall
  remain in the governing Spec or Plan rather than creating durable Decisions.
- **FR-007 [Observed]:** Every implementation shall require a mechanically valid
  and explicitly approved Plan before its first phase starts.
- **FR-008 [Observed]:** Cook shall execute at most one eligible phase at a time
  and shall preserve predecessor and Decision dependencies.
- **FR-009 [Observed]:** A phase shall complete only when every required success
  criterion has concrete passing evidence.
- **FR-010 [Observed]:** A Plan shall complete only after every required phase
  passes and a completed Delivery Report records outcome, changed files,
  verification, variance, and friction.
- **FR-011 [Observed]:** Material scope, behavior, authority, or success-criteria
  changes shall invalidate affected approval before implementation resumes.
- **FR-012 [Observed]:** Verified Report or approved Decision evidence may enter
  Self Improve, but canonical guidance shall change only after human approval.
- **BR-001 [Observed]:** `RULES.md` and active Rules own workflow policy; approved
  Features own observable behavior; active Specs and approved Decisions own
  technical constraints and rationale; Plans sequence work; Reports record outcomes.
- **BR-002 [Observed]:** A lower-authority artifact shall not override a higher-authority contract.
- **BR-003 [Observed]:** Waiting for initial approval is not an execution blocker.
- **BR-004 [Observed]:** A failed check under active investigation is not a
  completed phase and is not blocked while meaningful approved work remains.
- **BR-005 [Observed]:** Human cancellation is a valid terminal outcome, not a verification failure.
- **BR-006 [Observed]:** Harness tooling shall not grant human approval or
  automatically commit, push, release, or deploy.
- **NFR-001 [Observed]:** A future human or coding agent shall identify current
  authority, next eligible action, blocker, and required proof from repository-local artifacts.
- **NFR-002 [Observed]:** Equivalent artifact state and evidence shall produce
  deterministic eligibility and validation outcomes.
- **NFR-003 [Observed]:** Invalid transitions, unresolved dependencies, broken
  relationships, and stale approvals shall be rejected before downstream execution.
- **NFR-004 [Inferred and approved]:** Actors shall retrieve the smallest relevant
  context without loading unrelated repository history.

## Acceptance

- [ ] Read-only and no-change outcomes create no unnecessary Feature, Plan, or Report.
- [ ] New or changed observable behavior cannot authorize implementation before Feature approval.
- [ ] Maintenance can reuse an existing Feature or Spec without duplicating business documentation.
- [ ] Durable Decisions can interrupt and return to the affected workflow boundary.
- [ ] A lower-authority artifact cannot override approved behavior or technical constraints.
- [ ] Cook cannot start before Plan approval or while a required Decision is unresolved.
- [ ] At most one phase is in progress and no dependant phase starts early.
- [ ] Failed or unavailable verification prevents phase and Plan completion.
- [ ] Material variance invalidates affected approval while routine recovery does not.
- [ ] Completed delivery resolves from governing Feature or Spec through Decisions,
  Plan, phase evidence, and Report.

**Scenario: route maintenance without a duplicate Feature**  
Given approved behavior already governs the requested maintenance  
When the requester authorizes an implementation-only change  
Then the Plan links the existing Feature or Spec  
And no new Feature is created.

**Scenario: interrupt Feature discovery for a product Decision**  
Given a proposed Feature has two viable policies that change acceptance behavior  
When Product Authority judgment is required  
Then the Feature remains unapproved  
And a proposed Decision records the alternatives and evidence  
And Feature discovery resumes only after the Decision is approved or rejected.

**Scenario: prevent Cook before approval**  
Given a mechanically valid Plan has not been approved  
When the Coding Agent attempts to start a phase  
Then the phase remains unstarted  
And the Harness reports the required Repository Maintainer approval.

**Scenario: preserve active investigation**  
Given one approved phase is in progress  
When a required test fails and investigation remains inside approved scope  
Then the phase remains in progress  
And the failure evidence is retained  
And no dependant phase begins.

**Scenario: require reapproval after material variance**  
Given a phase is in progress under an approved Plan  
When new evidence changes scope or success criteria  
Then current work is preserved  
And invalid continuation is blocked  
And the affected artifact and Plan require approval before Cook resumes.

**Scenario: complete from evidence**  
Given every required phase criterion has passing evidence  
When the Delivery Report records outcome, changed files, verification, variance, and friction  
Then the Plan becomes completed  
And the Report can enter Self Improve without a second universal approval gate.

## Relationships

- Spec: [[workflow-lifecycle]]
- Decisions: [[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]], [[DEC-005-separate-approval-and-execution-state|DEC-005]]
- Related Feature: [[FEAT-001-harness-cli|FEAT-001]]
- Plan: [[260714-0033-file-based-agent-harness/plan|Plan]]
- Source: `docs/harness/workflows/README.md`
- Source: `docs/harness/RULES.md`
