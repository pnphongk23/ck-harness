---
schema_version: 1
type: feature
id: FEAT-007
title: Require verified discovery and planning
status: approved
created: 2026-07-15
approved: 2026-07-15
approved_by: Product Authority
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions: []
  plans:
    - "[[260715-2324-verified-skill-workflows/plan|Plan]]"
    - "[[260715-2343-research-codebase-and-project/plan|Plan]]"
  reports:
    - "[[REP-006-deliver-verified-discovery-and-planning-skills|REP-006]]"
    - "[[REP-008-deliver-research-oriented-scout|REP-008]]"
  rules: []
  features:
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - .agents/skills/scout/SKILL.md
    - .agents/skills/harness-feature/SKILL.md
    - .agents/skills/harness-plan/SKILL.md
    - docs/harness/workflows/feature.md
    - docs/harness/workflows/plan.md
    - docs/harness/SKILL-PORTS.md
---

# FEAT-007: Require verified discovery and planning

## Introduction

**Purpose:** Let repository contributors use focused Ask, Brainstorm, Scout,
Feature, and Plan skills that ground material conclusions in repository
evidence, build a useful mental model of the project and codebase, obtain
clarification for unresolved choices, and verify a complete plan before
implementation authority is requested.

**In scope:**

- Provide repository-local `ask`, `brainstorm`, and `scout` skills with those
  exact names.
- Make Scout research the project and codebase deeply enough to explain project
  purpose, stack, architecture, execution flows, dependencies, tests,
  conventions, operations, active work, risks, and unknowns relevant to the request.
- Let Feature discovery compose Scout, Ask, and Brainstorm behavior without
  depending on personal configuration or agent delegation.
- Require Feature discovery to inspect repository evidence before asking
  questions or proposing behavior variants.
- Require concrete expected output, acceptance criteria, scope exclusions,
  constraints, and affected touchpoints before Feature approval.
- Require Plan work to verify material claims against current documents, code,
  dependencies, tests, and unfinished Plans.
- Require the human authority to decide unresolved product, scope, architecture,
  compatibility, and risk choices before the workflow records a selection.
- Require whole-plan consistency and exact evidence expectations before Plan approval.

**Out of scope:**

- Implementing product code from Ask, Brainstorm, Scout, Feature, or Plan.
- Launching sub-agents, external AI tools, or transmitting repository content.
- Copying dependencies on home-directory rules, Claude commands, hidden task
  state, or global plan roots.
- Treating all questions as blocking when repository evidence already answers them.

### Evidence classification

- **Observed:** `harness-feature` and `harness-plan` remain thin routers to
  canonical workflows, while standalone `ask`, `brainstorm`, and `scout`
  utility skills now exist in `.agents/skills`.
- **Observed:** Skill routing and tests enumerate all eight current local skills
  and protect the short `ask` name from substring collisions.
- **Observed:** Repository rules prohibit personal paths and delegated agent
  requirements in canonical skills.
- **Observed:** The local Claude skill sources provide useful discovery,
  alternative analysis, verification interview, and consistency-sweep behavior.
- **Observed:** Product Authority rejected a file-location-only interpretation
  of Scout and requested the earlier research-oriented behavior covering both
  the project and its codebase.
- **Observed:** The local Ask and Scout source metadata does not declare a
  license, so their behavior must be reimplemented rather than copied verbatim.
- **Inferred and approved:** Focused utility skills reduce ambiguity when the
  canonical Feature and Plan workflows invoke the same local behaviors.
- **Inferred and approved:** A material decision is safe only after its claims
  are either verified or explicitly presented to the responsible human.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Repository Contributor | Business role | Receive grounded guidance and executable plans | State the requested outcome and answer material open questions |
| Product Authority | Business role | Approve observable behavior | Decide unresolved product and scope choices |
| Repository Maintainer | Business role | Approve safe implementation plans | Review evidence, risks, coverage, and verification commands |
| AI coding assistant | External system | Apply the repository workflow consistently | Scout locally, label uncertainty, ask before material choices, and preserve approval boundaries |

### User needs

- A Contributor needs questions and alternatives tied to actual repository evidence.
- A Contributor needs Scout to explain how the relevant project and codebase
  work, not merely list files containing matching terms.
- Product Authority needs every material behavior gap exposed before Feature approval.
- A Maintainer needs paths, symbols, dependencies, risks, and checks verified
  before approving implementation.
- Every human authority needs the assistant to distinguish observed facts,
  supported inferences, and unresolved items instead of guessing.

### Preconditions

- The repository and its canonical Harness documentation are readable.
- The requested outcome has been classified by the workflow router.
- The responsible human remains available for choices that cannot be resolved
  from approved authority or direct evidence.

### Trigger

A Contributor requests technical consultation, idea exploration, repository
scouting, Feature discovery, or an implementation Plan.

### Main flow

1. **Actor:** The Contributor states an outcome. **System:** The assistant
   classifies the request and researches the project baseline, architecture,
   relevant execution flows, dependencies, tests, conventions, active work,
   risks, and unknowns before synthesizing the relevant repository surface.
2. **Actor:** The Contributor reviews the evidence summary. **System:** The
   assistant labels observed facts, supported inferences, failed checks, and
   unresolved questions.
3. **Actor:** The responsible human answers material open questions. **System:**
   the assistant records concrete output, acceptance, scope, constraints, and touchpoints.
4. **Actor:** The responsible human considers alternatives. **System:** The
   assistant presents two or three viable approaches with trade-offs and a
   grounded recommendation when more than one material approach remains.
5. **Actor:** Product Authority approves observable behavior when applicable.
   **System:** The assistant writes or revises the Feature without implementation design.
6. **Actor:** Repository Maintainer requests a Plan. **System:** The assistant
   verifies plan claims, coverage, risks, dependencies, success criteria, and
   evidence commands against the current repository.
7. **Actor:** Repository Maintainer resolves remaining Plan choices and reviews
   the complete Plan. **System:** The assistant performs a whole-plan consistency
   sweep and records approval only after mechanical validation succeeds.

### Alternative flows

- **A1 — Evidence answers the question.** Source step: 2. Condition: approved
  authority or direct repository evidence determines the answer. Behavior: the
  assistant cites the evidence and does not ask a redundant question. Resume at step: 4.
- **A2 — One safe approach.** Source step: 4. Condition: only one approach
  satisfies approved constraints. Behavior: the assistant explains why the
  alternatives are non-viable and presents the single supported approach. Resume at step: 5.
- **A3 — Technical-only work.** Source step: 5. Condition: observable behavior
  remains unchanged. Behavior: the assistant records explicit technical
  objectives and skips creation of a duplicate Feature. Resume at step: 6.
- **A4 — Consultation only.** Source step: 4. Condition: no implementation is
  requested. Behavior: the assistant returns grounded advice without creating a Plan. Ends with: no repository mutation.

### Exception flows

- **E1 — Evidence is missing.** Source step: 2. Failure: a material claim cannot
  be verified. Handling: mark it unresolved and ask the responsible human or
  define a concrete verification action. Prohibited: converting uncertainty to fact. Failure postcondition: no affected decision is recorded.
- **E2 — Human choice remains open.** Source step: 4. Failure: multiple viable
  approaches remain without authority selection. Handling: present the trade-off
  and pause at the affected boundary. Prohibited: silently selecting an approach. Failure postcondition: Feature or Plan approval remains pending.
- **E3 — Verification fails.** Source step: 6. Failure: a path, symbol, contract,
  dependency, coverage mapping, or command is false or unavailable. Handling:
  report exact evidence and revise or ask before proceeding. Prohibited:
  claiming the Plan is ready. Failure postcondition: implementation remains unauthorized.
- **E4 — Inconsistent plan.** Source step: 7. Failure: stale or contradictory
  claims remain across Plan files. Handling: reconcile them and repeat the
  consistency sweep. Prohibited: recommending Cook with unresolved contradictions. Failure postcondition: Plan approval is withheld.

### Postconditions

- **Consultation success:** Guidance identifies its evidence, assumptions,
  trade-offs, and unresolved questions without implementation mutation.
- **Scout success:** The research report provides an evidence-backed project
  and codebase mental model sufficient for the downstream question; it does not
  stop at file discovery or dump an unstructured repository inventory.
- **Feature success:** Approved behavior contains concrete boundaries and no material TBD.
- **Plan success:** The complete Plan is mechanically valid, evidence-grounded,
  internally consistent, and explicitly approved by Repository Maintainer.
- **Failure:** No material choice or readiness claim is invented from missing evidence.

## Requirements

- **FR-001 — Focused skills [Observed]:** The repository shall expose local
  skills named `ask`, `brainstorm`, and `scout` alongside the Harness workflow skills.
- **FR-002 — Scout first [Inferred and approved]:** Feature and Plan discovery
  shall research the relevant project context, canonical documents, architecture,
  source flows, dependencies, tests, conventions, operations, and active work
  before asking material questions or proposing approaches.
- **FR-003 — Exact discovery [Inferred and approved]:** Before Feature approval,
  discovery shall make expected output, acceptance criteria, scope exclusions,
  non-negotiable constraints, and affected touchpoints concrete.
- **FR-004 — Alternatives [Inferred and approved]:** When multiple material
  approaches remain viable, Brainstorm shall present two or three approaches
  with trade-offs and shall not record a selection without human confirmation.
- **FR-005 — Evidence labels [Observed]:** Material findings shall remain
  distinguishable as observed, inferred, failed, or unresolved.
- **FR-006 — Claim verification [Inferred and approved]:** Planning shall verify
  material paths, symbols, interfaces, dependencies, tests, and commands against
  the current repository before requesting approval.
- **FR-007 — Verification interview [Inferred and approved]:** Planning shall
  ask the responsible human about unresolved assumptions, risks, compatibility,
  architecture, and scope choices that could materially change implementation.
- **FR-008 — Whole-plan consistency [Inferred and approved]:** Planning shall
  re-read the Plan and every Work Item after material revisions and shall not
  recommend execution while contradictions remain.
- **FR-009 — Research synthesis [Observed and approved]:** Scout shall synthesize
  an evidence-backed project and codebase model that answers the research target,
  including relevant architecture, execution flows, constraints, risks, and
  unknowns; a file list alone shall not satisfy Scout completion.
- **BR-001 [Observed]:** Ask, Brainstorm, Scout, Feature, and Plan shall not
  implement application code or bypass Product Authority or Repository Maintainer approval.
- **BR-002 [Observed]:** Canonical skills shall use repository-local references
  and shall not require sub-agents, external AI tools, or personal configuration.
- **NFR-001 — Useful concision [Inferred and approved]:** Utility skill
  instructions shall retain only reusable behavior and reports shall synthesize
  the evidence needed for the research target without shallow summaries or
  exhaustive unrelated inventories.
- **NFR-002 — Verifiability [Observed]:** Every readiness claim shall cite a
  reproducible check, direct source evidence, or an explicit unresolved status.

## Acceptance

- [ ] `.agents/skills/ask`, `.agents/skills/brainstorm`, and
  `.agents/skills/scout` exist with matching skill names and local-only instructions.
- [ ] Explicit and implicit routing can select each focused utility skill without
  regressing existing `harness-*` routing.
- [ ] A request to research a project, repository, or codebase routes to Scout.
- [ ] Scout reports project purpose and stack, architecture and execution flows,
  dependencies and integrations, tests and conventions, active work and
  operational constraints, risks, evidence, and unresolved questions as relevant.
- [ ] Scout does not complete with only a file list and does not expand into
  unrelated exhaustive inventory, design, planning, or implementation.
- [ ] Feature discovery scouts first and requires concrete output, acceptance,
  exclusions, constraints, and touchpoints before approval.
- [ ] Feature discovery presents two or three grounded behavior variants when
  multiple material variants remain and asks Product Authority to choose.
- [ ] Planning verifies material repository claims and exposes every failed or
  unresolved claim before Plan approval.
- [ ] Planning asks the responsible human before recording unresolved material decisions.
- [ ] Planning performs a whole-plan consistency sweep and blocks Cook while contradictions remain.
- [ ] Skill and workflow validation rejects forbidden personal paths, delegated
  agent requirements, and uncredited upstream adaptations.
- [ ] Focused tests and the full repository verification command pass.

**Scenario: clarify before choosing**
Given repository evidence supports two materially different behavior variants
And approved authority does not select either variant
When Feature discovery reaches the choice
Then the assistant presents both variants with evidence and trade-offs
And no selection is recorded until Product Authority answers.

**Scenario: research before downstream work**
Given a Contributor asks to understand a project or a behavior in its codebase
When Scout researches the repository
Then the report explains the relevant project context, architecture, code flow,
dependencies, tests, constraints, risks, and unknowns with direct evidence
And a list of matching files alone is not reported as complete research.

**Scenario: reject an unverified plan claim**
Given a Plan names a source path or command that does not exist
When the verification pass checks the current repository
Then the claim is reported as failed with direct evidence
And the Plan is not presented as ready for implementation.

**Scenario: preserve consistency after a decision**
Given a human-approved answer changes a name, contract, or dependency in one Work Item
When Plan validation applies that decision
Then the assistant checks the Plan root and every Work Item for stale copies
And Cook is not recommended until no unresolved contradiction remains.

## Relationships

- Spec: [[workflow-lifecycle]]
- Related Features: [[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]], [[FEAT-003-verify-harness-integrity|FEAT-003]]
- Plan: [[260715-2324-verified-skill-workflows/plan|Plan]]
- Plan: [[260715-2343-research-codebase-and-project/plan|Plan]]
- Report: [[REP-006-deliver-verified-discovery-and-planning-skills|REP-006]]
- Source: `.agents/skills/harness-feature/SKILL.md`
- Source: `.agents/skills/harness-plan/SKILL.md`
- Source: `docs/harness/workflows/feature.md`
- Source: `docs/harness/workflows/plan.md`
- Source: `docs/harness/SKILL-PORTS.md`
