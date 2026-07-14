# Plan Workflow

## Purpose
Design the smallest deterministic implementation sequence after closing
authority, grounding the work in current documents and code, and writing
Plan-local implementation design when it materially aids execution.

## Use When
Use for every authorized repository implementation. Behavior-changing work may
combine multiple approved Features. Technical-only work may omit a Feature when
it preserves observable behavior and instead defines explicit technical design objectives.

## Inputs
- Every Feature governing the requested behavior, all approved.
- Active Specs, approved Decisions, project Rules, and unfinished related Plans.
- Graphify output for Harness-document relationships when available under DEC-006.
- Direct inspection of current source, dependencies, tests, and preserved user changes.
- Optional implementation design requirements; when needed, one plain
  `design.md` beside `plan.md` and linked through Plan `relationships.source_paths`.

## Hard Gates
- **Authority Closure Gate:** Every governing Feature is approved and no
  blocking Decision remains unresolved. Technical-only work names its technical authority and objectives.
- **Grounding Gate:** Graphify grounds Harness-document relationships when
  available; direct codebase scouting grounds implementation. Derived output is not authority.
- **Design Ownership Gate:** When separate implementation design is needed, it
  is written as linked sibling `design.md`; reusable contracts remain in Specs
  or Decisions and no Change Design artifact is created.
- **Overlap Gate:** Scan unfinished related Plans and reconcile dependencies.
- **Decomposition Gate:** Each `work-item-XX` child is one Work Item with optional
  kind, inline Tasks, risks, and exact evidence expectations in its Markdown
  body; its numeric sequence is stored in `work_item` frontmatter.
- **Coverage Gate:** Every in-scope Feature requirement, or every technical
  objective for technical-only work, maps to at least one Work Item.
- **Mechanical Validation Gate:** Plan and Work Item contracts pass before human review.
- **Human Approval Gate:** Repository Maintainer approves the current Plan
  template, Work Item sequence, risks, coverage, and success criteria before Cook.

These conditions are inputs to one Plan approval. They do not create an
Implementation Readiness artifact, a named readiness gate, or a Plan per Task.

## Procedure
1. **Resolve authority:** Link all governing Features, active Specs, approved
   Decisions, and Rules. Reject Plan approval if any governing Feature is not
   approved or a blocking Decision is unresolved.
2. **Ground documents:** Use Graphify within DEC-006 to inspect derived
   Harness-document relationships. Warn and continue with direct canonical
   inspection when Graphify is unavailable.
3. **Scout codebase:** Directly inspect affected source, dependencies, tests,
   current behavior, and preserved user changes; record relevant source paths.
4. **Write or review design:** When separate design materially aids execution,
   write plain `design.md` beside `plan.md` and link its exact path from the
   owning Plan. Promote reusable constraints to a Spec or Decision.
5. **Scan Plans:** Identify unfinished overlapping work and record `blockedBy` or `blocks`.
6. **Setup directory:** Use the `YYMMDD-HHmm-slug` directory with `plan.md`,
   optional `design.md`, and ordered `work-item-XX-*.md` files.
7. **Draft Plan root:** Use the current Plan template and write execution
   `status: pending`, approval metadata, relationships, priority, effort, branch,
   tags, dependencies, author metadata, and the coverage map.
8. **Draft Work Items:** Treat each Work Item file as one ordered Work Item. In its
   Markdown body record optional kind (`story`, `technical`, `migration`, `docs`,
   or `verification`), inline Tasks, scope, affected files, risks, predecessors,
   `decision_dependencies`, exact success criteria, and required evidence. New
   Work Items start `pending`.
9. **Check coverage:** Map every in-scope Feature requirement to one or more Work
   Items. When no Feature governs technical-only work, map every design objective instead.
10. **Read generated stubs:** Read every generated Plan and Work Item file before replacing content.
11. **Validate mechanically:** Run Harness validation against the Plan, every
    Work Item, their links, dependencies, lifecycle state, and coverage evidence.
12. **Submit for approval:** Repository Maintainer approves or requests changes.
13. **Record outcome:** Approval `approved` records date and required authority;
    changes requested remain non-executable and return to drafting.

## Output
An approved current-shape Plan directory with closed authority, linked grounding
and any applicable Plan-local design, ordered Work Items, inline Tasks, complete coverage, and
executable success criteria; or a non-executable Plan awaiting revision.

## Completion Criteria
- Plan and every Work Item parse under the existing Harness schema.
- Every governing Feature is approved; relationships and Decision dependencies resolve.
- Graphify document grounding and direct codebase scout evidence are recorded as applicable.
- Any separate implementation design is the linked sibling of its owning `plan.md`.
- Every required requirement or technical objective has Work Item coverage.
- Every required success criterion has exact evidence expectations.
- Approval status, date, and required authority are recorded.
- No application code or tests were modified while planning.

## Prohibited Actions
- Do not write implementation code during Plan.
- Do not use Plan to override approved behavior or technical authority.
- Do not approve a Plan with an unapproved governing Feature or blocking Decision.
- Do not treat Graphify output as source-code scouting or canonical authority.
- Do not store Plan-specific design under Specs, a top-level design tree, or another Plan.
- Do not add a Story layer or create a separate Plan for each Task.
- Do not begin Cook before mechanical validation and human approval.
- Do not classify waiting for initial approval as execution blocked.
- Do not create a second Plan when an unfinished overlapping Plan can be safely revised.

## Failure and Recovery
- **Existing contract already satisfied:** End with evidence and create no Plan.
- **Authority not closed:** Identify every unapproved governing Feature or
  blocking Decision and return to its Document workflow.
- **Technical-only authority unclear:** Clarify the design objectives or create
  the necessary Spec or Decision; do not invent a Feature solely to fill a field.
- **Grounding or design insufficient:** Record the missing evidence, scout or
  revise `design.md`, and resubmit the same Plan.
- **Coverage incomplete:** Revise scope, design, or Work Items until every
  requirement or technical objective is covered.
- **Conflicting Plans:** Pause, reconcile dependency and scope with the human, then revalidate.
- **Validation failure:** Correct the Plan contract and rerun checks before approval.
- **Changes requested:** Revise and resubmit; execution remains pending.
- **Material change after approval:** Preserve completed evidence, reset approval,
  and prevent new Work Items until reapproval.
- **Handoff:** Cook may start only the next eligible Work Item of an approved Plan.
