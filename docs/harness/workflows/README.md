# Harness Workflow Router and State Machine

This router classifies work into two families before durable mutation:
**Document** workflows create or revise authority and knowledge; **Coding**
workflows ground, design, plan, implement, verify, and report repository
changes. A durable Decision may interrupt either family and return to the
boundary that raised it. Exact lifecycle states and authority rules are defined
by [[workflow-lifecycle]].

## Request Classification

| Requested outcome | Route |
| --- | --- |
| Answer, explanation, review, diagnosis, plan, or status | Read only; do not create durable state unless explicitly requested |
| Existing behavior already satisfies the request | Return evidence and stop |
| Feature, Spec, Decision, Report, Rule, or guidance only | Document workflow; complete the applicable document procedure without requiring coding |
| Maintenance inside approved behavior | Coding workflow; reuse the governing Feature or Spec, then Plan |
| Technical-only change with no Feature | Coding workflow; scout code, define objectives, optionally write Plan-local design, and Plan |
| New or changed observable behavior | Document [Feature Workflow](feature.md); all governing Features must be approved before Coding Plan approval |
| Durable product or technical trade-off | [Decision Workflow](decision.md) at the affected boundary |
| Authorized repository implementation | Coding [Plan Workflow](plan.md), then [Cook Workflow](cook.md) |
| Verified Harness improvement signal | [Self-Improve Workflow](self-improve.md) |

Every code change requires an approved Plan. Feature is an authority document,
not a universal pipeline stage. Classification determines whether a new Feature
or Decision is necessary; it does not bypass Plan or verification gates.

## State Machine

```mermaid
flowchart TD
    Start([Request]) --> Classify{Classify outcome}
    Classify -->|Read-only| ReadOnly[Inspect smallest context and respond]
    Classify -->|Already satisfied| NoChange[Return evidence; no Plan or Cook]
    Classify -->|Document| Document[Run Feature, Decision, Spec, Report, Rule, or guidance procedure]
    Document --> DocumentEnd{Coding requested?}
    DocumentEnd -->|No| End
    DocumentEnd -->|Yes| Authority
    Classify -->|Coding| Authority[Resolve governing authority]
    Classify -->|New or changed behavior| Feature[Feature Discovery]
    Feature --> FeatureGate{Product Authority approved?}
    FeatureGate -->|No| Feature
    FeatureGate -->|Yes| Authority

    Authority --> Closure{All governing Features approved and blocking Decisions resolved?}
    Closure -->|No| Document
    Closure -->|Yes| Ground[Graphify docs and directly scout code]
    Ground --> Design[Write optional design.md beside plan.md]
    Design --> Plan[Draft current Plan with Work Items, Tasks, and coverage]
    Plan --> PlanValidate{Mechanically valid?}
    PlanValidate -->|No| Plan
    PlanValidate -->|Yes| PlanGate{Repository Maintainer approved?}
    PlanGate -->|Changes requested| Plan
    PlanGate -->|Approved| Cook[Cook next eligible Work Item]

    Cook --> Verify{Required evidence passes?}
    Verify -->|Fixable in scope| Cook
    Verify -->|Blocked| Blocked[Record blocker and stop invalid continuation]
    Blocked -->|Resolved in scope| Cook
    Verify -->|Yes| More{Required Work Items remain?}
    More -->|Yes| Cook
    More -->|No| Report[Complete Delivery Report and Plan]
    Report --> Improve{Verified improvement signal?}
    Improve -->|No| End([End])
    Improve -->|Yes| SelfImprove[Self Improve]
    SelfImprove --> End

    Feature -. product trade-off .-> Decision[Decision Workflow]
    Authority -. technical trade-off .-> Decision
    Plan -. planning trade-off .-> Decision
    Cook -. material variance .-> Decision
    SelfImprove -. policy trade-off .-> Decision
    Decision --> DecisionGate{Required authority approved?}
    DecisionGate -->|No| Decision
    DecisionGate -->|Yes| Return[Return to the boundary that raised the Decision]
```

## Transition Contracts

1. **Document workflows ([Feature Workflow](feature.md), [Decision Workflow](decision.md), and [Self-Improve Workflow](self-improve.md))**
   - Trigger: new or changed observable behavior, or a request to formalize
     durable product or technical knowledge.
   - Gate: each document follows its own authority; document-only work can end
     without a Coding Plan.
   - Boundary: documentation may overlap coding, but unapproved Feature behavior
     cannot enter an active Plan or Cook.

2. **Decision Workflow ([Decision Workflow](decision.md)) [Interruptible]**
   - Trigger: multiple viable paths have durable, cross-cutting, material, or
     expensive-to-reverse consequences.
   - Gate: Product Authority approves product choices; Repository Maintainer
     approves technical choices.
   - Return: resume Feature, Plan, Cook, or Self Improve at the affected boundary.

3. **Planning ([Plan Workflow](plan.md))**
   - Trigger: approved behavior or explicit technical-only objectives are ready
     for implementation.
   - Preconditions: all governing Features approved; no blocking Decision;
     Graphify document grounding plus direct code scout; optional linked sibling
     `design.md`; Work Item/Task decomposition; complete requirement or
     technical-objective coverage.
   - Gates: mechanical validation, then one Repository Maintainer Plan approval.
   - Output: an approved current-shape Plan whose `work-item-XX` children serialize
     Work Items with inline Tasks and executable success criteria.

4. **Cooking ([Cook Workflow](cook.md))**
   - Trigger: Plan approval is approved and the next Work Item has completed
     predecessors and approved Decision dependencies.
   - Gate: no Work Item or required Task completes without concrete passing evidence.
   - Variance: local failures remain in the active Work Item; material authority,
     scope, or success-criteria changes return to Decision or Plan approval.

5. **Reporting ([Cook Workflow](cook.md))**
   - Trigger: all required Work Items and success criteria pass.
   - Output: a completed Delivery Report and completed Plan.
   - Product or high-risk acceptance, when required, belongs in approved Plan
     success criteria; there is no second universal Report approval gate.

6. **Self Improve ([Self-Improve Workflow](self-improve.md)) [Optional]**
   - Trigger: completed Report or approved Decision evidence exposes friction,
     stale guidance, missing validation, or a reusable lesson.
   - Gate: every canonical change requires evidence and human approval; Rule
     promotion still requires two independent occurrences with one recurrence key.

## Revision and Terminal Outcomes

- **No change:** Return evidence and end without Plan, Cook, or Report.
- **Feature revision:** Material behavior change returns the Feature to review
  and invalidates affected downstream approval.
- **Plan revision:** Material scope or success-criteria change resets Plan
  approval; routine fixes within approved scope do not.
- **Verification failure:** Preserve user changes and evidence, investigate only
  authorized scope, and never start a dependant Work Item early.
- **Blocked:** Record the concrete condition only when meaningful approved
  progress is impossible.
- **Cancelled:** Preserve completed evidence, record the reason, and never claim
  unfinished work as delivered.
- **Delivered:** Complete from Work Item evidence and a Delivery Report; rejection
  discovered afterward becomes a follow-up change request rather than rewritten history.
