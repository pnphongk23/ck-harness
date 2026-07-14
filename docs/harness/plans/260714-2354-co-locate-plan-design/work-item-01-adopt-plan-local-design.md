---
work_item: 1
title: "Adopt and enforce plan-local design"
status: completed
priority: P1
effort: "2 hours"
dependencies: []
decision_dependencies:
  - "[[DEC-009-co-locate-implementation-design-with-its-plan|DEC-009]]"
---

# Work Item 1: Adopt and enforce plan-local design

## Kind

Technical

## Tasks

- [x] Update FEAT-002, the lifecycle Spec, Rules, schema, workflows, and skill guidance.
- [x] Recognize only exact Plan-local `design.md` as supporting Markdown.
- [x] Validate design ownership and exact Plan `source_paths` linkage.
- [x] Add focused workflow, artifact, integrity, and index evidence.

## Success criteria

- [x] Canonical guidance distinguishes Plan-local design from reusable Specs.
- [x] A linked sibling design passes validation without lifecycle frontmatter.
- [x] Unlinked or externally linked design produces stable actionable findings.
- [x] Supporting design is not cataloged as a standalone lifecycle artifact.

## Risks

- A broad filename exclusion could hide invalid Markdown nested under Plans.
- A source-path-only rule could allow a Plan to claim another Plan's design.

## Evidence

- `npm run build` passed.
- `node --test dist/tests/integrity.test.js dist/tests/workflows.test.js`
  passed 14 tests, 0 failed.
- The focused integrity test covers linked sibling design, unlinked design,
  design outside its owning Plan, and index exclusion.
