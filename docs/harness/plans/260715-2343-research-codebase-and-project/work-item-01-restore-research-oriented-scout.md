---
work_item: 1
title: "Restore research-oriented Scout"
status: completed
priority: P1
effort: "90 minutes"
dependencies: []
decision_dependencies: []
---

# Work Item 1: Restore research-oriented Scout

## Kind

Feature and verification

## Tasks

- [x] Rewrite Scout metadata and workflow around project/codebase research,
  architecture synthesis, targeted code tracing, and evidence-backed reporting.
- [x] Define a report contract covering research scope, project overview,
  architecture and flows, relevant code, dependencies, tests, conventions,
  operations, active work, risks, evidence, and unknowns as applicable.
- [x] Update Feature and Plan scouting wording so downstream workflows request
  research rather than a minimal file map.
- [x] Update routing for explicit project/repository/codebase research prompts.
- [x] Update skill-port/provenance wording and focused regression tests.
- [x] Validate the revised skill and run focused and full repository gates.

## Scope and affected files

- Modify: `.agents/skills/scout/SKILL.md`, `docs/harness/workflows/feature.md`,
  `docs/harness/workflows/plan.md`, `docs/harness/SKILL-PORTS.md`,
  `docs/harness/PROVENANCE.md`, `src/core/skill-routing.ts`,
  `tests/skills.test.ts`, and `tests/workflows.test.ts`.
- Update FEAT-007, this Plan, its Delivery Report, and the generated index.
- Do not modify the pending init-skill Plan or `package.json`.

## Success criteria

- [x] Scout describes itself as project and codebase research, not fast file discovery.
- [x] Scout establishes project purpose, stack, entry points, build/test commands,
  and architecture before deep targeted tracing when those fields are relevant.
- [x] Scout traces modules, callers, data/control flow, dependencies,
  integrations, tests, conventions, configuration, operations, active Plans,
  working-tree changes, risks, and unknowns as required by the target.
- [x] Scout synthesizes a mental model with direct evidence and cannot complete
  with only a file list or an unstructured exhaustive inventory.
- [x] “Research this project/repository/codebase” routes to Scout without
  regressing existing explicit or implicit skill routing.
- [x] Feature and Plan workflows invoke research-oriented Scout behavior.
- [x] Skill validation, focused tests, full verification, Harness validation,
  index check, doctor, package dry-run, and `git diff --check` pass.

## Risks

- A broad default scan can waste context on unrelated directories.
- A shallow architecture summary can hide the concrete execution path needed downstream.
- Routing the generic word “research” alone would steal unrelated research tasks.
- Concurrent edits from the pending init-skill Plan could overlap shared tests.

## Required evidence

- Read the final Scout skill and verify its frontmatter and complete report contract.
- Assert routing for project, repository, and codebase research plus negative cases.
- Assert Feature and Plan workflows explicitly require project/codebase research.
- Search canonical skills/workflows for forbidden personal, delegated, or external dependencies.
- Run Skill Creator validation, focused compiled tests, `npm run verify`, Harness
  `validate --all`, `index check`, `doctor`, `npm pack --dry-run`, and `git diff --check`.

## Evidence

- Repository Maintainer approved execution on 2026-07-16.
- Skill Creator validation passed for `.agents/skills/scout`.
- Focused compiled tests passed 9 tests, 0 failed.
- `npm run verify` passed TypeScript checks and 77 tests, 0 failed.
- Harness validation, index build/check, doctor, package dry-run, forbidden
  dependency scan, and `git diff --check` passed.
- Delivery evidence is recorded in `REP-008`.
