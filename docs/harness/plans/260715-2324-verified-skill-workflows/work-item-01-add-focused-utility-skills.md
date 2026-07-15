---
work_item: 1
title: "Add focused utility skills"
status: completed
priority: P1
effort: "2 hours"
dependencies: []
decision_dependencies: []
---

# Work Item 1: Add focused utility skills

## Kind

Feature

## Tasks

- [x] Create concise `.agents/skills/ask/SKILL.md`,
  `.agents/skills/brainstorm/SKILL.md`, and `.agents/skills/scout/SKILL.md`.
- [x] Rename skill metadata to `ask`, `brainstorm`, and `scout` and remove
  Claude commands, personal paths, global state, and delegated-agent behavior.
- [x] Encode evidence-first consultation, exact-requirement discovery, two or
  three alternative analysis, and a local scouting report contract.
- [x] Update R-022, the skill-port inventory, and provenance to distinguish
  focused utility skills from canonical Harness workflow routers.
- [x] Extend deterministic skill inventory and routing tests for explicit and
  implicit Ask, Brainstorm, and Scout prompts.

## Scope and affected files

- Create: `.agents/skills/{ask,brainstorm,scout}/SKILL.md`.
- Modify: `docs/harness/RULES.md`, `docs/harness/SKILL-PORTS.md`,
  `docs/harness/PROVENANCE.md`, `src/core/skill-routing.ts`, and `tests/skills.test.ts`.
- Do not create reference files unless a skill would otherwise exceed the
  concise router boundary.

## Success criteria

- [x] Each new directory name equals its frontmatter `name` and frontmatter
  contains only `name` and `description`.
- [x] Ask provides evidence-backed analysis without implementation.
- [x] Brainstorm scouts first, makes the five discovery fields concrete, and
  presents two or three viable approaches before seeking a human selection.
- [x] Scout uses direct local inspection and returns relevant files, findings,
  constraints, failed checks, and unresolved questions without delegation.
- [x] Existing `harness-*` routing remains unchanged and the three focused
  skills route explicitly and from representative implicit prompts.
- [x] Provenance states the source versions, license limitation, clean-room
  treatment, adaptation date, and removed dependencies.

## Risks

- Generic words such as "ask" or "plan" can cause routing collisions.
- Copying source prose without a declared compatible license would violate the
  repository provenance contract.
- Utility skills can drift into duplicate canonical workflows if they contain
  artifact schema or lifecycle instructions.

## Required evidence

- Read each new `SKILL.md` after creation and inspect its exact frontmatter.
- Search all canonical skill text for personal paths, Claude command syntax,
  sub-agent requirements, external AI tools, and implementation actions.
- Run the focused compiled skill-routing test and repository skill validation.
- Run `git diff --check` and inspect the Work Item diff for unrelated changes.

## Evidence

- The Skill Creator `quick_validate.py` passed independently for `ask`,
  `brainstorm`, and `scout`.
- `npm run build` passed.
- `node --test dist/tests/skills.test.js` passed 2 tests, 0 failed.
- A canonical-skill scan found no personal Claude paths or commands, delegated
  agent requirements, external AI tools, source-control delivery commands, or
  deployment commands.
- Manual frontmatter inspection confirmed exactly `name` and `description` for
  all three skills; the focused test enforces this for every registered skill.
- Diff review confirmed changes are limited to Work Item 1 plus previously
  approved Feature and Plan artifacts. The existing `package.json` modification
  remains untouched and outside this Plan.
- `git diff --check` passed.
