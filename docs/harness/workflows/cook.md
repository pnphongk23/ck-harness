# Cook Workflow

## Purpose
Implement an approved Plan one eligible Work Item at a time, verify every required
criterion, and record delivery evidence without storing duplicate Cook state.
Each Work Item contains its Tasks inline.

## Use When
Use when Plan approval is approved and a pending Work Item has completed
predecessors and approved Decision dependencies. Plan approval already confirms
governing Feature approval, no blocking Decision, any applicable Plan-local design, and complete
requirement or technical-objective coverage.

## Inputs
- Approved Plan directory with Plan and Work Item files.
- Governing Feature, Specs, approved Decisions, and Rules from Plan relationships.
- Current codebase and preserved user changes.

## Hard Gates
- **Eligibility Gate:** Plan approval, predecessors, and Decision dependencies must be satisfied.
- **Single Work Item Gate:** At most one Work Item is `in_progress`.
- **Authority Gate:** Implementation remains inside approved behavior, technical authority, and Plan scope.
- **Evidence Gate:** No Work Item or required Task completes without concrete passing evidence.
- **No Automatic Delivery Gate:** Never automatically commit, push, release, or deploy.

## Procedure
1. **Derive eligibility:** Report current Work Item, blockers, and next action from
   durable Plan, Work Item, Decision, and Report state; do not write Cook status.
2. **Prepare Work Item:** Select the next eligible pending Work Item, mark it
   `in_progress`, and set the Plan `in_progress` when execution first begins.
3. **Read before writing:** Inspect existing files, generated stubs, user changes,
   linked Plan-local design when present, coverage, and governing contracts for the Work Item.
4. **Execute Tasks:** Modify only what the approved Work Item and its inline Tasks require.
5. **Run checks:** Execute compiler, type, test, build, static, or observable
   commands specified by success criteria.
6. **Review changes:** Inspect the diff for unintended side effects, authority conflicts, and scope drift.
7. **Record outcome:**
   - Passing Task and Work Item criteria receive exact evidence and the Work Item becomes `completed`.
   - A failing check under active authorized investigation leaves the Work Item `in_progress`.
   - If a required check cannot run, write `Tôi không thể xác minh điều này hoạt động vì...`
     plus the concrete reason and leave the criterion incomplete.
   - A concrete condition preventing meaningful progress sets Work Item and aggregate
     Plan state as required by [[workflow-lifecycle]] and records `status_reason`.
8. **Handle material variance:** Preserve current work and interrupt for Feature,
   Decision, Spec, or Plan revision. Reset affected approval before invalid continuation.
9. **Continue sequentially:** Start no dependant Work Item until the current required Work Item passes.
10. **Deliver:** After every required Work Item passes, create a completed Delivery
    Report, link it to Plan and authority artifacts, then mark the Plan completed.

## Output
- Verified implementation changes.
- Updated Plan and Work Item execution state with exact evidence.
- A completed `REP-XXX` Delivery Report when all required work passes.

## Completion Criteria
- Every required Work Item and Task is completed with passing evidence.
- No cancelled Work Item is silently counted as completed.
- A completed Delivery Report records outcome, changed files, verification,
  variance, and friction.
- Plan state is completed only after the Report exists.
- Relevant builds and automated checks pass.

## Prohibited Actions
- Do not begin an ineligible Work Item or work on multiple Work Items concurrently.
- Do not turn a fixable failure into false completion or premature blocked state.
- Do not let implementation evidence silently redefine Feature, Spec, Decision, or Rule authority.
- Do not discard or revert user-owned changes without explicit approval.
- Do not persist a Cook run or trace ledger.
- Do not automatically commit, push, release, or deploy.

## Failure and Recovery
- **Fixable failure:** Keep the Work Item in progress, preserve evidence, investigate
  within scope, and rerun checks.
- **Blocked verification:** Use the exact Vietnamese disclosure, record the
  reason, and do not complete the Work Item or Plan.
- **Material variance:** Pause invalid continuation, preserve work, revise the
  owning contract, and obtain affected approval before resuming.
- **Cancellation:** Record the reason, preserve completed evidence, and prevent new Work Items.
- **Delivery rejection after completion:** Treat it as a follow-up change request;
  do not rewrite completed evidence.
- **Handoff:** A completed Report or approved Decision with improvement evidence
  may enter Self Improve; otherwise conclude.
