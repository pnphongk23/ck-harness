---
schema_version: 1
title: Deliver research-oriented Scout
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions: []
  plans:
    - "[[260715-2343-research-codebase-and-project/plan|Plan]]"
  reports:
    - "[[REP-006-deliver-verified-discovery-and-planning-skills|REP-006]]"
  rules: []
  features:
    - "[[FEAT-007-require-verified-discovery-and-planning|FEAT-007]]"
  source_paths:
    - .agents/skills/scout/SKILL.md
    - docs/harness/workflows/feature.md
    - docs/harness/workflows/plan.md
    - src/core/skill-routing.ts
    - tests/skills.test.ts
    - tests/workflows.test.ts
type: report
id: REP-008
status: completed
delivered: 2026-07-16
---

# REP-008: Deliver research-oriented Scout

## Delivered outcome

Scout now researches a local project and codebase into an evidence-backed
mental model. It establishes the project baseline and relevant architecture
before targeted implementation tracing, covers dependencies, tests,
conventions, operations, active work, risks, and unknowns as applicable, and
cannot treat a file list or unrelated exhaustive inventory as complete research.
Feature and Plan workflows now request this research posture before material
questions or implementation planning. Explicit project, repository, and
codebase research prompts route to Scout without routing generic research.

## Changed files

- `.agents/skills/scout/SKILL.md` — define the research workflow, evidence
  labels, completion boundary, and synthesized report contract.
- `docs/harness/workflows/feature.md` and `docs/harness/workflows/plan.md` —
  require project baseline, architecture, flows, and targeted code research.
- `src/core/skill-routing.ts` — route explicit project/repository/codebase
  research prompts to Scout.
- `tests/skills.test.ts` and `tests/workflows.test.ts` — protect routing,
  synthesis, evidence, workflow order, and file-list rejection.
- `docs/harness/SKILL-PORTS.md` and `docs/harness/PROVENANCE.md` — record the
  research-oriented clean-room adaptation.
- `docs/harness/features/FEAT-007-require-verified-discovery-and-planning.md` —
  link this delivery evidence.

## Verification evidence

- Skill Creator `quick_validate.py .agents/skills/scout` — passed.
- Focused build and tests — passed 9 tests, 0 failed.
- `npm run verify` — TypeScript checks passed and 77 tests passed, 0 failed.
- Harness `validate --all`, `index build`, `index check`, and `doctor` — passed.
- `npm pack --dry-run` — passed with 67 packaged files including the revised Scout skill.
- Forbidden dependency scan over Scout, Feature, and Plan live sources — no findings.
- `git diff --check` — passed.

## Plan variance

No material variance. The previously overlapping init-skill Plan completed
before Cook began, so its delivered distribution and schema changes were
preserved. An initial verification invocation used a nonexistent CLI path;
the declared package entrypoint was inspected and every affected Harness gate
was rerun successfully through `dist/src/cli/bin.js`.

## Repeated friction

No repeated workflow friction observed. Verification commands should continue
to derive the CLI entrypoint from `package.json` rather than assume a compiled path.
