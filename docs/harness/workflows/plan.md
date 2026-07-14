# Plan Workflow

## Purpose
Design the smallest phased, deterministic implementation sequence for approved
behavior or an existing governing contract before modifying code.

## Use When
Use for every authorized implementation change after request classification has
identified the governing Feature or Spec. Decisions required to define the Plan
boundary must be approved; a later phase may retain an explicit unresolved
Decision dependency, but that phase remains ineligible until approval and any
material outcome triggers Plan review.

## Inputs
- Approved Feature or active Spec governing the requested outcome.
- Relevant approved Decisions and project Rules.
- Existing or unfinished Plans that may overlap.
- Current repository evidence.

## Hard Gates
- **Authority Gate:** Plan relationships identify governing Feature, Specs, and Decisions.
- **Overlap Gate:** Scan unfinished related Plans and reconcile dependencies.
- **Verification Gate:** Every required phase criterion is executable or has an
  observable output; confidence-only criteria are invalid.
- **Mechanical Validation Gate:** Plan and phase contracts pass before human review.
- **Human Approval Gate:** Repository Maintainer approves the Plan boundary,
  phase sequence, risks, and success criteria before Cook.

## Procedure
1. **Resolve authority:** Link the Feature or Spec, approved Decisions, and Rules
   that the Plan may not override.
2. **Scan Plans:** Identify unfinished overlapping work and record `blockedBy` or `blocks`.
3. **Setup directory:** Preserve the ClaudeKit `YYMMDD-HHmm-slug` directory with
   `plan.md` and ordered `phase-XX-*.md` files.
4. **Draft Plan root:** Write execution `status: pending`, approval metadata,
   relationships, priority, effort, branch, tags, dependencies, and author metadata.
5. **Draft phases:** Record ordered scope, affected files, risks, predecessors,
   `decision_dependencies`, and exact success criteria. New phases start `pending`.
6. **Read generated stubs:** Read every generated Plan and phase file before replacing content.
7. **Validate mechanically:** Run Harness validation and, when available,
   `ck plan validate <plan.md> --strict` plus `ck plan status <plan.md>`.
8. **Submit for approval:** Repository Maintainer approves or requests changes.
9. **Record outcome:** Approval `approved` records date and required authority;
   changes requested remain non-executable and return to drafting.

## Output
An approved Plan directory with resolvable authority links, valid phase
dependencies, and executable success criteria, or a non-executable Plan awaiting revision.

## Completion Criteria
- Plan and every phase parse under the Harness schema.
- ClaudeKit compatibility checks pass when CK is available.
- Relationships and Decision dependencies resolve.
- Every required success criterion has exact evidence expectations.
- Approval status, date, and required authority are recorded.
- No application code or tests were modified while planning.

## Prohibited Actions
- Do not write implementation code during Plan.
- Do not use Plan to override approved behavior or technical authority.
- Do not begin Cook before mechanical validation and human approval.
- Do not classify waiting for initial approval as execution blocked.
- Do not create a second Plan when an unfinished overlapping Plan can be safely revised.

## Failure and Recovery
- **Existing contract already satisfied:** End with evidence and create no Plan.
- **Conflicting Plans:** Pause, reconcile dependency and scope with the human, then revalidate.
- **Unresolved durable choice:** Run Decision and return to Plan after resolution.
- **Validation failure:** Correct the Plan contract and rerun checks before approval.
- **Changes requested:** Revise and resubmit; execution remains pending.
- **Material change after approval:** Preserve completed evidence, reset approval,
  and prevent new phases until reapproval.
- **Handoff:** Cook may start only the next eligible phase of an approved Plan.
