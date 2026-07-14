---
schema_version: 1
type: decision
id: DEC-004
title: Classify requests and interrupt only for durable decisions
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Repository Maintainer
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions: []
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]"
  source_paths:
    - docs/harness/workflows/README.md
    - docs/harness/workflows/feature.md
    - docs/harness/workflows/decision.md
---

# DEC-004: Classify requests and interrupt only for durable decisions

## Context

A universal `Feature -> Decision? -> Plan` pipeline makes read-only work and
maintenance unnecessarily expensive. It also prevents a product Decision from
helping finalize a proposed Feature and cannot represent technical trade-offs
discovered during planning or implementation.

## Decision

Classify the requested outcome before durable mutation. Require a new Feature
only for new or changed observable behavior; reuse an existing Feature or Spec
for maintenance inside an approved contract; stop without implementation when
existing behavior already satisfies the request.

Treat Decision as an interruptible workflow at the boundary where a durable
trade-off appears. Product Decisions may use a proposed Feature as context;
technical Decisions normally use an approved Feature or active Spec. After
approval, return to the Feature, Plan, Cook, or Self Improve boundary that
raised the choice.

Local, mandated, and cheaply reversible choices remain in the governing Spec or
Plan and do not create Decision artifacts.

## Alternatives

1. **Universal linear workflow.** Always run Feature, optionally Decision, then Plan. This is simple to draw but over-processes maintenance and cannot model decisions discovered later.
2. **Classified intake with interruptible Decisions — selected.** Route each request to the smallest authoritative artifact and pause only the affected boundary for durable human judgment.
3. **Fully dynamic agent routing without a state machine.** This minimizes prescribed process but makes authorization and validation non-deterministic.

## Consequences

- Read-only and no-change outcomes create no unnecessary durable state.
- Maintenance can reuse approved behavior while still requiring a Plan before code changes.
- Product and technical choices use the same durable Decision history without forcing one fixed position in the pipeline.
- Router, Feature, Decision, Plan, Cook, and Self Improve guidance must describe return paths consistently.
- Validation must distinguish a required durable Decision from a local Plan choice.

## Evidence

- [[FEAT-002-govern-traceable-work-lifecycle|FEAT-002]]
- [[workflow-lifecycle]]
- Human approval of the workflow review on 2026-07-14.

## Supersession

This decision supersedes no earlier decision.
