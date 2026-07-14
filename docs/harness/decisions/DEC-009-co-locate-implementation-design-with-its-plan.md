---
schema_version: 1
title: Co-locate implementation design with its Plan
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]]"
  plans:
    - "[[260714-2354-co-locate-plan-design/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
  source_paths:
    - src/core/integrity.ts
    - tests/integrity.test.ts
type: decision
id: DEC-009
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Repository Maintainer
---

# DEC-009: Co-locate implementation design with its Plan

## Context

Before this Decision, implementation design lived outside the canonical Plan
directory because the validator parsed every Markdown file under
`docs/harness/plans/` as a Plan or Work Item. That separated a Plan from design that exists only to
explain its implementation approach, leaves a third top-level document location,
and makes ownership less obvious.

The Repository Maintainer selected a Plan-local design model and asked Harness
to trace and enforce the resulting impact. This Decision interrupts Plan and
returns to the Coding workflow after the storage and validation contract is
updated.

## Decision

An implementation design is an optional supporting document owned by exactly
one Plan.

- Store it as `design.md` beside that Plan's `plan.md`.
- Keep it plain Markdown without a separate lifecycle or artifact frontmatter.
- When it exists, require the containing Plan to include its exact repository
  path in `relationships.source_paths`.
- Do not treat `design.md` as a Spec or index it as a standalone lifecycle artifact.
- Promote reusable, cross-Plan, or durable technical contracts from design into
  an active Spec or approved Decision.
- Reject a Plan relationship that points to a `design.md` outside its own directory.

## Alternatives

1. **Co-locate `design.md` with its Plan — selected.** Ownership, review scope,
   and delivery history are visible in one directory. The scanner needs one
   explicit supporting-file exception and link checks.
2. **Store designs under `docs/harness/specs/`.** This reuses a canonical folder
   but conflates a delivery-specific implementation approach with a durable,
   reusable technical contract.
3. **Keep a top-level `docs/harness/design/` tree.** This avoids scanner changes
   but duplicates Plan organization and permits orphaned or ambiguously owned designs.

## Consequences

- Plan directories may contain `plan.md`, ordered Work Items, and at most one
  optional `design.md`.
- The integrity scanner must skip Plan-local design content when parsing
  lifecycle frontmatter, then validate its ownership and source-path trace.
- The derived lifecycle index catalogs Plan and Work Item artifacts, not the
  supporting design; Graphify may still ground it as Markdown under `docs/harness/`.
- Existing top-level implementation design must move into its owning Plan and
  every recorded source path must migrate atomically.

## Evidence

- [[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]] FR-006.
- [[workflow-lifecycle]].
- Before migration, `src/core/integrity.ts` included every Markdown file
  recursively under `docs/harness/plans/` in strict lifecycle parsing.
- Before migration, `docs/harness/design/work-item-model/design.md` was owned by
  the completed Work Item terminology Plan but stored separately from it.

## Supersession

This Decision replaces only the inherited design-location constraint recorded
by DEC-007 and retained through DEC-008. DEC-008 remains approved and normative
for Work Item terminology; this Decision narrows only where Plan-specific design lives.
