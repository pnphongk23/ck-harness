---
schema_version: 1
title: Separate document authority from coding execution
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]]"
    - "[[DEC-005-separate-approval-and-execution-state|DEC-005]]"
    - "[[DEC-006-graphify-directory-extraction-boundary|DEC-006]]"
    - "[[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]]"
  plans: []
  reports: []
  rules: []
  features:
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
  source_paths:
    - docs/harness/RULES.md
    - docs/harness/workflows/README.md
    - docs/harness/workflows/plan.md
    - docs/harness/workflows/cook.md
    - src/core/schemas/artifacts.ts
    - src/core/integrity.ts
type: decision
id: DEC-007
status: superseded
created: 2026-07-14
approved: 2026-07-14
approved_by: Repository Maintainer
---

# DEC-007: Separate document authority from coding execution

## Context

The current workflow is commonly read as a universal
Feature-to-Plan-to-Cook pipeline. That model is ambiguous when several Features
govern one component, when documentation is written ahead of or alongside
coding, and when a technical migration preserves observable behavior and has no
new Feature.

At approval time, the executable contract persisted Plan children under a
storage-specific name and strictly validated their frontmatter. DEC-006 also limits Graphify input to
`docs/harness/`; Graphify therefore cannot be described as a source-code index
without changing its privacy and process boundary.

This Decision interrupts Self Improve and returns to the canonical Rules and
workflow documents. It refines how DEC-004 classification and DEC-005 approval
separation are applied; it does not replace their lifecycle choices.

## Decision

Adopt two workflow families:

1. **Document workflow** governs Features, Specs, Decisions, Reports, Rules, and
   other durable knowledge. A document can complete without starting coding.
2. **Coding workflow** grounds, designs, plans, executes, and verifies repository
   changes. Documentation may precede or overlap it, but active coding may use
   only its approved governing behavior.

Before a behavior-changing Plan is approved, all governing Features must be
approved and no blocking Decision may remain unresolved. Technical-only work
may omit a Feature when it preserves observable behavior and instead maps
explicit technical design objectives.

Keep the current Plan and schema. Interpret each persisted Plan child as a Work
Item. Record its optional kind, inline Tasks, and requirement or
technical-objective coverage in Markdown body content; do not add frontmatter
fields, a Story layer, or a Plan per Task.

Use Graphify only for derived Harness-document grounding within the DEC-006
boundary. Scout source code, dependencies, and tests by direct inspection.
Write implementation design in a project-local `design.md` outside the
canonical Plan directory and link it through the Plan's source paths. Do not add
an Implementation Readiness artifact, named readiness gate, or Change Design artifact.

## Alternatives

1. **Keep one universal Feature-to-Plan-to-Cook pipeline.** This is familiar and
   linear, but it either invents Features for internal migrations or permits a
   Plan to start from only part of a component's governing behavior.
2. **Add Story, Task, and Task-level Plan artifacts.** This gives every unit an
   independent lifecycle, but duplicates approval and evidence for ordinary
   work and requires schema, CLI, migration, and validation changes.
3. **Separate Document and Coding workflows while retaining current persisted
   Plan children — selected.** This closes authority at Plan approval, supports
   technical-only work, and adds coverage without changing the executable schema.
4. **Expand Graphify to source code.** This could unify document and code
   exploration, but contradicts DEC-006 and requires a new privacy boundary,
   adapter behavior, tests, and explicit transmission review.

## Consequences

- Feature remains business authority but is no longer a mandatory workflow stage.
- Plan approval becomes the single execution boundary that checks authority
  closure, grounding, linked design, decomposition, and coverage.
- Existing Plan-child files and validators remain compatible while user-facing
  guidance calls them Work Items.
- Graphify output remains optional derived document evidence. Direct source
  scouting must be recorded separately and cannot be replaced by a stale graph.
- A future proposal to rename Work Item files, add structured Work Item fields, put
  `design.md` inside Plan directories, or index source with Graphify requires a
  separate schema or process Decision.

## Evidence

- [[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]
- [[workflow-lifecycle]]
- [[DEC-004-classified-intake-and-interruptible-decisions|DEC-004]]
- [[DEC-005-separate-approval-and-execution-state|DEC-005]]
- [[DEC-006-graphify-directory-extraction-boundary|DEC-006]]
- R-003, R-007, R-014, R-015, and R-021 in `docs/harness/RULES.md`.
- `src/core/schemas/artifacts.ts` strictly validates existing Work Item frontmatter.
- `src/core/integrity.ts` treats Markdown under canonical Plan directories as
  lifecycle artifacts, so an untyped `design.md` cannot be stored there.

## Supersession

This Decision was superseded by
[[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]], which retains
the Document/Coding routing and grounding choices but replaces dual Plan-child
naming with one Work Item contract.
