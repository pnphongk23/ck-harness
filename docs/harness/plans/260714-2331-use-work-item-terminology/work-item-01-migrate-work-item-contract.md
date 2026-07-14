---
work_item: 1
title: "Migrate the Work Item contract"
status: completed
priority: P1
effort: "6 hours"
dependencies: []
decision_dependencies:
  - "[[DEC-008-use-work-item-as-the-only-plan-execution-unit|DEC-008]]"
---

# Work Item 1: Migrate the Work Item contract

## Kind

Migration

## Tasks

- [x] Rename the strict Plan-child schema, frontmatter field, TypeScript symbols,
      guards, diagnostics, and filename rule to Work Item.
- [x] Rename every existing Plan child and update all inbound links and source paths.
- [x] Update canonical Rules, Specs, workflows, Features, Decisions, reports,
      skills, and project guidance to one Work Item vocabulary.
- [x] Update tests and fixtures for `work_item` and `work-item-XX-*.md`.
- [x] Restore generated-index core-document links required by workflow tests.

## Success criteria

- [x] Active schema and integrity code reject the former Plan-child field and filename.
- [x] All canonical Plan children parse using `work_item` and Work Item filenames.
- [x] Every migrated link resolves and existing lifecycle/evidence states are preserved.
- [x] Focused artifact, integrity, index-resolution, skill-routing, and workflow tests pass.

## Evidence

- `npm run build` passed on 2026-07-14.
- `harness validate --all --json` returned `outcome: success` with no findings.
- `harness index build --json` published the migrated links successfully.
- Focused artifact, integrity, index-resolution, skills, and workflows suite:
  28 tests passed, 0 failed.
