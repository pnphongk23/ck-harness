# Cook Workflow

## Purpose
Implement an approved Plan one eligible phase at a time, verify every required
criterion, and record delivery evidence without storing duplicate Cook state.

## Use When
Use when Plan approval is approved and a pending phase has completed
predecessors and approved Decision dependencies.

## Inputs
- Approved Plan directory with Plan and phase files.
- Governing Feature, Specs, approved Decisions, and Rules from Plan relationships.
- Current codebase and preserved user changes.

## Hard Gates
- **Eligibility Gate:** Plan approval, predecessors, and Decision dependencies must be satisfied.
- **Single Phase Gate:** At most one phase is `in_progress`.
- **Authority Gate:** Implementation remains inside approved behavior, technical authority, and Plan scope.
- **Evidence Gate:** No phase completes without concrete passing evidence.
- **No Automatic Delivery Gate:** Never automatically commit, push, release, or deploy.

## Procedure
1. **Derive eligibility:** Report current phase, blockers, and next action from
   durable Plan, phase, Decision, and Report state; do not write Cook status.
2. **Prepare phase:** Select the next eligible pending phase, mark it
   `in_progress`, and set the Plan `in_progress` when execution first begins.
3. **Read before writing:** Inspect existing files, generated stubs, user changes,
   and the governing contracts for the phase.
4. **Execute smallest change:** Modify only what the approved phase requires.
5. **Run checks:** Execute compiler, type, test, build, static, or observable
   commands specified by success criteria.
6. **Review changes:** Inspect the diff for unintended side effects, authority conflicts, and scope drift.
7. **Record outcome:**
   - Passing criteria receive exact evidence and the phase becomes `completed`.
   - A failing check under active authorized investigation leaves the phase `in_progress`.
   - If a required check cannot run, write `Tôi không thể xác minh điều này hoạt động vì...`
     plus the concrete reason and leave the criterion incomplete.
   - A concrete condition preventing meaningful progress sets phase and aggregate
     Plan state as required by [[workflow-lifecycle]] and records `status_reason`.
8. **Handle material variance:** Preserve current work and interrupt for Feature,
   Decision, Spec, or Plan revision. Reset affected approval before invalid continuation.
9. **Continue sequentially:** Start no dependant phase until the current required phase passes.
10. **Deliver:** After every required phase passes, create a completed Delivery
    Report, link it to Plan and authority artifacts, then mark the Plan completed.

## Output
- Verified implementation changes.
- Updated Plan and phase execution state with exact evidence.
- A completed `REP-XXX` Delivery Report when all required work passes.

## Completion Criteria
- Every required phase is completed with passing evidence.
- No cancelled phase is silently counted as completed.
- A completed Delivery Report records outcome, changed files, verification,
  variance, and friction.
- Plan state is completed only after the Report exists.
- Relevant builds and automated checks pass.

## Prohibited Actions
- Do not begin an ineligible phase or work on multiple phases concurrently.
- Do not turn a fixable failure into false completion or premature blocked state.
- Do not let implementation evidence silently redefine Feature, Spec, Decision, or Rule authority.
- Do not discard or revert user-owned changes without explicit approval.
- Do not persist a Cook run or trace ledger.
- Do not automatically commit, push, release, or deploy.

## Failure and Recovery
- **Fixable failure:** Keep the phase in progress, preserve evidence, investigate
  within scope, and rerun checks.
- **Blocked verification:** Use the exact Vietnamese disclosure, record the
  reason, and do not complete the phase or Plan.
- **Material variance:** Pause invalid continuation, preserve work, revise the
  owning contract, and obtain affected approval before resuming.
- **Cancellation:** Record the reason, preserve completed evidence, and prevent new phases.
- **Delivery rejection after completion:** Treat it as a follow-up change request;
  do not rewrite completed evidence.
- **Handoff:** A completed Report or approved Decision with improvement evidence
  may enter Self Improve; otherwise conclude.
