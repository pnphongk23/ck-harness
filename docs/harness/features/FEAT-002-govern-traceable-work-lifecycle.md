---
schema_version: 1
type: feature
id: FEAT-002
title: Govern work through document and coding workflows
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
    - "[[DEC-007-separate-document-authority-from-coding-execution|DEC-007]]"
    - "[[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]]"
    - "[[DEC-009-co-locate-implementation-design-with-its-plan|DEC-009]]"
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
    - "[[260714-2354-co-locate-plan-design/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
  source_paths:
    - docs/harness/workflows/README.md
    - docs/harness/RULES.md
---

# FEAT-002: Govern work through document and coding workflows

## Introduction

**Purpose:** Let people finish product and technical documents independently
from coding while ensuring that every coding Plan is grounded in the codebase,
closed over its governing authority, decomposed into reviewable work, and
traceable back to the requirements it delivers.

**In scope:**

- Separate Harness work into Document and Coding workflows.
- Let document work finish before coding or continue alongside coding.
- Treat Feature as an authority document with its own lifecycle, not as a
  mandatory stage through which every request must pass.
- Require all Features governing a behavior-changing Plan to be approved and
  all blocking Decisions to be resolved before Plan approval.
- Allow technical-only work to proceed without a Feature when it does not
  change observable behavior.
- Ground authority in the Harness document graph and ground implementation in
  direct codebase scouting.
- Keep optional delivery-specific implementation design as `design.md` beside
  its owning `plan.md`; keep reusable contracts in Specs or Decisions.
- Decompose a Plan into Work Items and inline Tasks, and map requirements or
  technical objectives to the Work Items that deliver them.
- Execute eligible Work Items with concrete verification evidence and record
  the delivered outcome in a Report.

**Out of scope:**

- A separate Implementation Readiness artifact or named readiness gate.
- A separate Change Design artifact.
- A Plan for every Task or a mandatory Story layer.
- Choosing project-specific architecture, libraries, APIs, storage, or source layout.
- Automatically approving documents, launching coding agents, committing,
  pushing, releasing, or deploying.

### Evidence classification

- **Observed:** Multiple Features can govern the same actor or component, so a
  Plan based on only one of them can implement an incomplete or conflicting contract.
- **Observed:** Technical migrations such as Android XML to Compose can require
  design, decomposition, and verification without introducing new product behavior.
- **Observed:** Repository code can differ materially from the system described
  by approved documents, so planning needs current codebase evidence.
- **Inferred and approved:** Document and Coding workflows may progress
  independently, but active coding may implement only approved governing behavior.
- **Inferred and approved:** Plan approval is the single execution boundary;
  authority closure, design, grounding, decomposition, and coverage are inputs
  to that approval rather than separate gates.
- **Observed and approved:** Plan execution shall use Work Item as its only unit
  name in documents, filenames, frontmatter, validation, and tooling; retaining
  a second storage alias creates an avoidable duplicate concept.
- **Inferred and approved:** Work Item Tasks do not need individual Plans.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Product Authority | Business role | Preserve intended observable behavior | Approve Features and product Decisions |
| Repository Maintainer | Business role | Authorize coherent repository changes | Confirm technical authority, design, Plan, coverage, and verification |
| Documentation Contributor | Business role | Produce durable product or technical authority | Write and revise Features, Specs, Decisions, and guidance |
| Coding Agent | External system | Deliver authorized work against the real repository | Scout code, prepare the Plan, execute eligible Work Items, and record evidence |
| Graphify | External system | Supply derived Harness-document relationships | Index the explicitly permitted documentation scope and return non-authoritative evidence |
| Validation System | External system | Reject invalid handoffs and unsupported completion | Validate artifacts, links, dependencies, coverage, and evidence |

### User needs

- A Product Authority needs Features to be settled without pretending that
  documentation itself is executable work.
- A Repository Maintainer needs one Plan to combine several approved Features
  without losing requirements at component boundaries.
- A Coding Agent needs current codebase evidence and, when the work needs a
  separate implementation design, an unambiguous Plan-owned place to write it.
- A technical migration needs a legitimate Coding workflow even when no Feature exists.
- A reviewer needs to see which Work Item delivers each requirement or technical objective.

### Preconditions

- The requested outcome has been classified as Document work, Coding work, or both.
- Repository-local authority and evidence can be inspected.
- A human authority is available at every required approval boundary.

### Trigger

A person requests a durable document, a repository change, or both.

### Main flow

1. **Actor:** The requester states the outcome. **System:** The Harness
   classifies it as Document work, Coding work, or a combination of both.
2. **Actor:** A Documentation Contributor writes the required Feature, Spec,
   Decision, or guidance. **System:** Each document follows its own
   approval lifecycle and may finish without creating a Coding Plan.
3. **Actor:** For Coding work, the Repository Maintainer identifies every
   governing Feature and Decision. **System:** Behavior-changing work remains
   ineligible for Plan approval until all governing Features are approved and
   no blocking Decision remains unresolved.
4. **Actor:** The Coding Agent uses Graphify when available to inspect
   Harness-document relationships and directly scouts affected source,
   dependencies, tests, and constraints. **System:** The resulting graph and
   scout notes remain derived evidence rather than authority.
5. **Actor:** When separate implementation design is useful, the Coding Agent
   writes `design.md` beside the owning `plan.md` and links its exact path from
   the Plan. **System:** The design explains how approved intent fits the
   observed codebase without becoming a Spec or separate lifecycle artifact.
6. **Actor:** The Coding Agent prepares the current Plan template. **System:**
   The Plan decomposes delivery into ordered Work Items, each with inline Tasks,
   success criteria, risks, and required evidence.
7. **Actor:** The Coding Agent maps each in-scope Feature requirement, or each
   technical design objective for technical-only work, to one or more Work
   Items. **System:** Uncovered or conflicting obligations remain visible.
8. **Actor:** The Repository Maintainer reviews and approves the Plan. **System:**
   Plan approval is the execution boundary and only eligible Work Items may enter Cook.
9. **Actor:** The Coding Agent completes one eligible Work Item and its Tasks.
   **System:** Passing evidence is required before dependants become eligible.
10. **Actor:** After all required Work Items pass, the Coding Agent records the
    delivered outcome, verification, variance, and friction. **System:** The
    Report closes the trace from authority through implementation evidence.

### Alternative flows

- **A1 — Document only.** Source step: 1. Condition: the request changes or
  clarifies durable knowledge but authorizes no repository implementation.
  Behavior: complete the applicable document workflow and stop without a Plan.
  Ends with: approved or otherwise valid document state and no Coding Plan.
- **A2 — Documentation and coding overlap.** Source step: 2. Condition: future
  behavior is still being documented while coding proceeds. Behavior: coding
  continues only for the approved authority already in scope; unapproved new
  behavior cannot enter the active Plan or Cook. Resume at step: 3 for any newly
  approved behavior entering Coding work.
- **A3 — Technical-only change.** Source step: 3. Condition: work such as an XML
  to Compose migration preserves observable behavior. Behavior: omit a new
  Feature, use active technical authority and explicit technical objectives,
  add Plan-local `design.md` when useful, and map objectives to Work Items.
  Resume at step: 4.
- **A4 — Multiple governing Features.** Source step: 3. Condition: one Plan
  changes a component governed by several Features. Behavior: include all of
  them in the authority set and require approval of each before Plan approval.
  Resume at step: 4 after authority closes.
- **A5 — Small coding task.** Source step: 6. Condition: one reviewable and
  verifiable Work Item is sufficient. Behavior: keep one Work Item with inline
  Tasks; do not create a Story layer or a Plan per Task. Resume at step: 7.
- **A6 — Durable Decision is required.** Source step: 2 through 9. Condition: a
  material, cross-cutting, or expensive-to-reverse choice remains unresolved.
  Behavior: pause the affected transition, approve the Decision, update affected
  artifacts, and resume from the boundary that raised it. Resume at step: the
  affected source step.
- **A7 — Material variance during Cook.** Source step: 9. Condition: new
  evidence changes approved behavior, design authority, scope, or success
  criteria. Behavior: preserve completed evidence, revise affected authority or
  Plan, and obtain affected approval again before resuming. Resume at step: 8.

### Exception flows

- **E1 — Authority is not closed.** Source step: 3. Failure: a governing Feature
  is not approved or a blocking Decision is unresolved. Handling: identify the
  missing authority and reject Plan approval. Prohibited: treating confidence or
  partial Feature coverage as approval.
- **E2 — Grounding is unavailable or stale.** Source step: 4. Failure: permitted
  Graphify evidence cannot establish document relationships or direct repository
  inspection cannot establish the affected code. Handling: record the limitation
  and continue only after the Repository Maintainer accepts adequate current
  evidence. Prohibited: treating generated graph output as authority.
- **E3 — Coverage is incomplete.** Source step: 7. Failure: a requirement or
  technical objective has no delivering Work Item. Handling: revise scope,
  design, or decomposition before Plan approval.
- **E4 — Verification fails or is unavailable.** Source step: 9. Failure: a
  required check fails or cannot run. Handling: retain evidence and continue
  authorized investigation when possible. Prohibited: completing the Work Item
  or starting a dependant.
- **E5 — Document conflict.** Source step: 2 through 9. Failure: lower authority
  conflicts with an approved Feature, active Spec, Decision, or Rule. Handling:
  identify the owning authority and block only the affected transition.

### Postconditions

- **Documented:** The requested document has a valid lifecycle state and can
  exist without Coding work.
- **Delivered:** Approved authority, codebase evidence, design, Plan, Work Item
  evidence, coverage, and Report form a resolvable trace.
- **Blocked:** The missing approval, Decision, coverage, grounding, dependency,
  or verification is explicit and no invalid execution occurs.
- **No change:** Evidence shows no repository mutation is required.

## Requirements

- **FR-001 [Inferred and approved]:** The Harness shall classify work as
  Document, Coding, or both instead of enforcing a universal Feature-to-Plan-to-Cook pipeline.
- **FR-002 [Inferred and approved]:** A Feature shall have an independent
  document lifecycle and shall not be mandatory for work that changes no observable behavior.
- **FR-003 [Observed]:** Before a behavior-changing Plan is approved, every
  governing Feature shall be approved and every blocking Decision shall be resolved.
- **FR-004 [Inferred and approved]:** Technical-only Coding work may omit a
  Feature when it preserves observable behavior and has explicit technical objectives.
- **FR-005 [Inferred and approved]:** Coding work shall use available scoped
  Graphify output to ground Harness-document relationships and shall use direct
  codebase scouting to ground implementation before Plan approval. Missing
  Graphify shall warn and degrade to direct canonical document inspection.
- **FR-006 [Inferred and approved]:** A Plan may own one optional plain
  `design.md` beside `plan.md`. When present, the Plan shall link its exact path
  through `relationships.source_paths`; reusable or cross-Plan contracts belong
  in Specs or approved Decisions, not in Plan-specific design.
- **FR-007 [Observed]:** Coding work shall use the current Plan template and
  require explicit Plan approval before Cook begins.
- **FR-008 [Inferred and approved]:** A Plan shall decompose work into ordered,
  reviewable Work Items containing inline Tasks; Tasks shall not require separate Plans.
- **FR-009 [Observed and approved]:** The Harness shall use `Work Item` as the
  only name for an executable Plan child across canonical documents, filenames,
  frontmatter, diagnostics, tests, and tooling, and shall not expose a second
  alias for the same concept.
- **FR-010 [Inferred and approved]:** Each Work Item shall identify its kind as
  story, technical, migration, docs, or verification when the distinction aids review.
- **FR-011 [Inferred and approved]:** A Plan shall map every in-scope Feature
  requirement, or every technical objective when no Feature governs the change,
  to one or more Work Items.
- **FR-012 [Observed]:** Cook shall execute at most one eligible Work Item at a
  time and complete it only from concrete passing evidence.
- **FR-013 [Observed]:** Material variance shall invalidate affected approval;
  routine recovery inside approved scope shall not.
- **FR-014 [Inferred and approved]:** Document work may precede or overlap
  Coding work, but active coding shall not implement unapproved Feature behavior.
- **BR-001 [Observed]:** `RULES.md` and active Rules own workflow policy;
  approved Features own observable behavior; active Specs and approved Decisions
  own technical constraints and rationale; Plans sequence work; Reports record outcomes.
- **BR-002 [Observed]:** Graphify output and scout notes are derived evidence and
  shall not override canonical authority or current source evidence.
- **BR-003 [Observed]:** A lower-authority artifact shall not override a
  higher-authority contract.
- **BR-004 [Observed]:** Harness tooling shall not grant human approval or
  automatically launch agents, commit, push, release, or deploy.
- **NFR-001 [Observed]:** A future human or coding agent shall identify current
  authority, uncovered obligations, next eligible action, blocker, and required proof.
- **NFR-002 [Observed]:** Equivalent artifact state and evidence shall produce
  deterministic eligibility and validation outcomes.
- **NFR-003 [Observed]:** Invalid approval, dependency, coverage, relationship,
  and evidence states shall be rejected before downstream execution.

## Acceptance

- [ ] Document work can complete without creating a Coding Plan.
- [ ] New or changed observable behavior cannot enter Cook before all governing Features are approved.
- [ ] A technical-only change can reach Plan and Cook without inventing a Feature.
- [ ] Available Graphify output grounds Harness-document relationships and
  direct scouting grounds source code without either becoming authority.
- [ ] Optional implementation design is stored as `design.md` beside its owning
  `plan.md`, linked by that Plan, and is not treated as a Spec or lifecycle artifact.
- [ ] Every in-scope requirement or technical objective maps to at least one Work Item.
- [ ] Work Items contain Tasks without requiring a Plan per Task.
- [ ] Plan children are named Work Items consistently in their filename,
  frontmatter, validation messages, documentation, and tooling.
- [ ] Failed or unavailable verification prevents Work Item and Plan completion.
- [ ] Documentation may overlap coding without letting unapproved behavior enter active work.

**Scenario: plan across several Features**
Given one component is governed by two relevant Features
And one Feature is approved while the other is proposed
When a Coding Agent submits a Plan covering both behaviors
Then Plan approval is rejected
And the proposed Feature is identified as missing authority.

**Scenario: migrate Android XML to Compose without a Feature**
Given the migration preserves approved observable behavior
When the Coding Agent scouts the codebase and writes the migration design
Then the Plan maps technical objectives to migration and verification Work Items
And no new Feature is required.

**Scenario: document future behavior alongside coding**
Given coding is executing an approved Plan
And a new Feature for future behavior is still proposed
When documentation and coding progress in parallel
Then current approved work may continue
And the proposed behavior cannot be added to Cook.

**Scenario: keep decomposition lightweight**
Given a small technical change needs three implementation Tasks
When the Plan is prepared
Then one technical Work Item contains the three Tasks
And no Story layer or Task-level Plan is created.

**Scenario: reject uncovered requirements**
Given all governing Features are approved
And one in-scope requirement has no delivering Work Item
When the Repository Maintainer reviews the Plan
Then Plan approval is rejected until coverage is complete or scope is corrected.

## Relationships

- Spec: [[workflow-lifecycle]]
- Decisions: [[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]], [[DEC-005-separate-approval-and-execution-state|DEC-005]], [[DEC-007-separate-document-authority-from-coding-execution|DEC-007]], [[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]], [[DEC-009-co-locate-implementation-design-with-its-plan|DEC-009]]
- Related Features: [[FEAT-001-harness-cli|FEAT-001]], [[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]
- Plans: [[260714-0033-file-based-agent-harness/plan|Plan]], [[260714-2354-co-locate-plan-design/plan|Plan]]
- Source: `docs/harness/workflows/README.md`
- Source: `docs/harness/RULES.md`
