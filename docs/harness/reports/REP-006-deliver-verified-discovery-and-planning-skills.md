---
schema_version: 1
type: report
id: REP-006
title: Deliver verified discovery and planning skills
status: completed
delivered: 2026-07-15
relationships:
  specs:
    - "[[workflow-lifecycle]]"
  decisions: []
  plans:
    - "[[260715-2324-verified-skill-workflows/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-007-require-verified-discovery-and-planning|FEAT-007]]"
  source_paths:
    - .agents/skills/ask/SKILL.md
    - .agents/skills/brainstorm/SKILL.md
    - .agents/skills/scout/SKILL.md
    - .agents/skills/harness-feature/SKILL.md
    - .agents/skills/harness-plan/SKILL.md
    - docs/harness/workflows/feature.md
    - docs/harness/workflows/plan.md
    - src/core/skill-routing.ts
    - tests/skills.test.ts
    - tests/workflows.test.ts
---

# REP-006: Deliver verified discovery and planning skills

## Delivered outcome

Harness now exposes focused repository-local `ask`, `brainstorm`, and `scout`
skills with matching names. Feature discovery scouts before material questions,
makes five requirement fields concrete, labels failed and unresolved evidence,
and requires Product Authority to select material behavior variants. Planning
verifies execution-affecting claims, interviews unresolved choices, reviews the
draft adversarially, and blocks Cook until a whole-Plan consistency sweep has
zero unresolved contradictions.

## Changed files

- `.agents/skills/{ask,brainstorm,scout}/SKILL.md` — add concise local-only
  consultation, exact-requirement brainstorming, and repository scouting behavior.
- `.agents/skills/{harness-feature,harness-plan}/SKILL.md` — route to the focused
  utility behaviors while retaining canonical workflow ownership.
- `docs/harness/workflows/{feature,plan}.md` — add scout-first, evidence,
  human-decision, adversarial review, and whole-Plan consistency gates.
- `docs/harness/RULES.md`, `docs/harness/SKILL-PORTS.md`, and
  `docs/harness/PROVENANCE.md` — authorize focused utilities, inventory retained
  behavior, and record clean-room treatment and license limitations.
- `src/core/skill-routing.ts` — register and implicitly route the three utilities
  using word-boundary explicit matching.
- `tests/skills.test.ts` and `tests/workflows.test.ts` — enforce skill inventory,
  two-field frontmatter, routing, scout-first discovery, exact requirements,
  verified decisions, adversarial review, and consistency blocking.
- FEAT-007, this Plan, its Work Items, and the generated Harness index — record
  authority, approval, execution evidence, relationships, and delivery.

## Verification evidence

- Skill Creator `quick_validate.py` — passed for `ask`, `brainstorm`, `scout`,
  `harness-feature`, and `harness-plan`.
- Focused compiled skill and workflow suites — passed 8 tests, 0 failed.
- `npm run verify` — passed TypeScript checks and 76 tests, 0 failed.
- `node dist/src/cli/bin.js validate --all` — passed with no findings.
- `node dist/src/cli/bin.js index check` — passed with no findings.
- `node dist/src/cli/bin.js doctor` — passed with no findings.
- `npm pack --dry-run` — passed with 69 allowlisted package entries.
- Canonical skill/workflow dependency scan — no personal Claude paths or
  commands, delegated-agent requirements, external AI tools, automatic
  source-control delivery commands, or deployment commands.
- Whole-Plan consistency re-read and search — zero unresolved contradictions.
- `git diff --check` — passed.

## Plan variance

No material variance. Skill Creator scaffolding briefly produced optional UI
metadata, which was removed to preserve the approved single-file utility skill
shape. Adversarial review found an in-scope `ask`/`task` substring collision in
the pre-existing explicit matcher; word-boundary matching and a regression test
resolved it before full verification.

## Repeated friction

No independent recurrence is claimed. The routing collision demonstrates the
value of evidence-backed adversarial review, but this delivery alone does not
satisfy the recurrence threshold for a promoted Rule.
