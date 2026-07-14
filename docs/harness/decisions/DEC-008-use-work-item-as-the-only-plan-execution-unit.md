---
schema_version: 1
title: Use Work Item as the only Plan execution unit
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions:
    - "[[DEC-007-separate-document-authority-from-coding-execution|DEC-007]]"
  plans: []
  reports: []
  rules: []
  features:
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
  source_paths:
    - src/core/schemas/artifacts.ts
    - src/core/integrity.ts
    - src/core/skill-routing.ts
    - tests/artifacts.test.ts
    - tests/integrity.test.ts
    - tests/index-resolution.test.ts
type: decision
id: DEC-008
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Repository Maintainer
supersedes: "[[DEC-007-separate-document-authority-from-coding-execution|DEC-007]]"
---

# DEC-008: Use Work Item as the only Plan execution unit

## Context

DEC-007 separated Document and Coding workflows but retained a storage-specific
name for the Plan child represented to people as a Work Item. That choice makes
one executable unit carry two names across human guidance and the machine
contract. Product Authority has now required one theoretical and operational
name: Work Item.

The name is embedded in the strict schema, filename validation, diagnostics,
skills, tests, links, and existing Plan children. Eliminating the dual concept
therefore requires an atomic repository migration rather than a documentation alias.

This Decision interrupts Plan. It replaces DEC-007 while carrying forward its
Document/Coding split, authority closure, linked design, Graphify boundary,
inline Tasks, and requirement coverage decisions.

## Decision

Use **Work Item** as the only executable child unit of a Plan.

- Persist Work Items as `work-item-XX-kebab-name.md`.
- Store their sequence number in `work_item` frontmatter.
- Name schema symbols, integrity diagnostics, variables, tests, skills, workflow
  prose, and index links with Work Item terminology only.
- Keep Tasks inline inside each Work Item and keep Plan-level requirement or
  technical-objective coverage.
- Migrate every existing Plan child and inbound link atomically. Do not retain
  the former field, filename, diagnostic, or prose alias in the active contract.

Retain the other DEC-007 outcomes: Document and Coding remain separate workflow
families; all governing Features and blocking Decisions close before Plan
approval; Graphify grounds Harness documents while direct inspection scouts
source code; implementation design is linked through project-local `design.md`.

Because the pre-migration validator understands only the superseded name, the
migration Plan may be authored once in that legacy shape and must migrate itself
with all other Plan children before delivery.

## Alternatives

1. **Retain separate storage and human names.** This is the DEC-007 choice and
   avoids migration, but permanently keeps two concepts for one thing and makes
   documentation, errors, and code harder to reason about.
2. **Accept both names as aliases during a compatibility window.** This eases
   external migration but expands schema and test states and fails the explicit
   requirement to remove the duplicate concept.
3. **Rename the complete active contract and migrate repository artifacts —
   selected.** This has the largest immediate diff but produces one vocabulary
   and one mechanically enforced representation.

## Consequences

- Existing Plan child filenames, frontmatter, links, source paths, diagnostics,
  schemas, tests, skills, and canonical prose must migrate together.
- Consumers using the former Plan-child field or filename receive a validation
  failure after the migration; no compatibility alias is promised.
- Completed Plan evidence retains its status and meaning, but its unit label and
  repository path change to Work Item.
- New Plans contain `plan.md` plus ordered `work-item-XX-*.md` children.
- Future terminology changes require another explicit Decision and migration.

## Evidence

- [[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]] FR-009.
- [[DEC-007-separate-document-authority-from-coding-execution|DEC-007]].
- `src/core/schemas/artifacts.ts` defines strict Plan-child frontmatter.
- `src/core/integrity.ts` validates Work Item filenames, dependencies, lifecycle,
  and diagnostic identifiers.
- `src/core/skill-routing.ts`, workflow tests, and existing Plan children expose
  Work Item terminology to agents and maintainers.

## Supersession

This Decision supersedes DEC-007. It retains DEC-007 outcomes except its dual
Plan-child naming, which it replaces with a single Work Item contract.
