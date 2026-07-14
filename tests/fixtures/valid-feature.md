---
schema_version: 1
type: feature
id: FEAT-042
title: Recover a basket
status: approved
created: 2026-07-14
relationships:
  specs: []
  decisions: []
  plans: []
  reports: []
  rules: []
  features: []
  source_paths:
    - src/basket.ts
---

# FEAT-042: Recover a basket

## Introduction

Purpose and scope are explicit.

## Business Understanding

### Actors

| Actor | Type | Goal | Responsibility |
| --- | --- | --- | --- |
| Shopper | Business role | Recover a basket | Identify the saved basket |

### User needs

Recover work after a session ends.

### Main flow

1. **Actor:** The shopper returns. **System:** The system restores the saved basket.

### Alternative flows

- Source step: 1. Condition: the basket is empty. Behavior: show an empty state. Ends with: no restored items.

### Exception flows

- Source step: 1. Failure: storage is unavailable. Handling: show a retry option. Prohibited: claim recovery. Failure postcondition: no recovery is reported.

### Postconditions

The previous basket is restored or a truthful failure is shown.

## Requirements

- **FR-001:** When a returning shopper is identified, the system shall restore their saved basket.

## Acceptance

- [ ] The saved basket is observable after return.

## Relationships

- Source: `src/basket.ts`
