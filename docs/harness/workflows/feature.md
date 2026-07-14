# Feature Workflow

## Purpose
Discover, clarify, and document new or changed observable behavior from a
Business Analyst perspective without deciding implementation design.

## Use When
Use for a new capability, a material behavior change, an ambiguous business
boundary, or undocumented existing behavior. Do not create a new Feature for a
read-only request, a no-change result, or maintenance already governed by an
approved Feature or active Spec.

## Inputs
- User request or issue description.
- Existing Features, Specs, Decisions, Rules, and relevant source evidence.
- Request classification from the workflow router.

## Hard Gates
- **Scouting Gate:** Inspect relevant repository evidence before authoring.
- **Evidence Labeling Gate:** Classify material findings as **Observed**,
  **Inferred**, or **TBD**.
- **Business Boundary Gate:** Product Authority must approve purpose, scope,
  observable behavior, requirements, and acceptance before downstream work.

## Procedure
1. **Confirm route:** Verify that behavior is new, changing, ambiguous, or
   undocumented. If an approved contract already governs maintenance, link it
   and hand off to Plan without creating a duplicate Feature.
2. **Scout repository:** Read relevant code, docs, Features, Specs, Decisions,
   Rules, Reports, and unfinished Plans.
3. **Collect evidence:** Separate direct facts, inferred interpretations, and
   open questions. Do not convert inference into fact.
4. **Define behavior:** Record purpose, in/out scope, actors, user needs,
   preconditions, trigger, main flow, material alternative and exception flows,
   postconditions, requirements, and acceptance.
5. **Present behavior variants:** When observable business policies remain
   viable, show the smallest set of concrete behavior variants. Do not introduce
   technical architectures or library choices.
6. **Interrupt for product Decision when needed:** If selecting a business
   policy requires durable rationale, create a proposed Decision linked to the
   proposed Feature. Resume Feature discovery after human judgment.
7. **Request approval:** Product Authority reviews the complete business boundary.
8. **Author or revise artifact:** Allocate the next monotonic `FEAT-XXX` only
   through an available safe allocator; otherwise use the documented bootstrap
   procedure. Write exactly the five canonical H2 sections and approval provenance.

## Output
An approved `docs/harness/features/FEAT-XXX-*.md` artifact, or a documented
no-change/existing-contract handoff that creates no duplicate Feature.

## Completion Criteria
- Exactly the five H2 sections exist and content validation passes.
- Actors are people, business roles, or external systems.
- Material evidence is labeled Observed, Inferred, or TBD.
- Every outgoing relationship resolves.
- Approval date and Product Authority are recorded for approved behavior.
- No implementation design appears in the Feature behavior.

## Prohibited Actions
- Do not create a Feature for every repository task.
- Do not create Plans or modify product code during Feature discovery.
- Do not place classes, services, libraries, schemas, or source layout in the
  actor and flow model.
- Do not allocate an ID without advancing the monotonic sequence safely.

## Failure and Recovery
- **Wrong route:** Reuse the governing Feature or Spec and continue at Plan.
- **Missing information:** Keep material gaps as TBD and request Product Authority clarification.
- **Rejected boundary:** Revise the behavior and resubmit; do not authorize implementation.
- **Product trade-off:** Pause Feature approval, run Decision using the proposed
  Feature as context, then resume discovery.
- **Material revision after approval:** Return the Feature to proposed, preserve
  history through version control, and invalidate affected downstream approval.
- **Handoff:** After approval, consult technical authority and proceed to Plan or
  an interrupting technical Decision.
