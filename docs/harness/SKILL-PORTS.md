# Skill Port Dependency Inventory

This inventory records the behavioral inputs used by the clean-room
`harness-*` entrypoints. Repository workflows and executable schemas are
canonical; skills are thin projections.

| Source behavior | Retained | Replaced | Optional | Removed |
| --- | --- | --- | --- | --- |
| brainstorm | requirements, approaches, approval gate | output path with `features/` and feature workflow | existing-code discovery | global rules and orchestration |
| ask | alternative and trade-off analysis | personal context with index and linked specs | decision creation | hidden home-directory assumptions |
| scout | source/evidence mapping | free-form output with Feature Relationships | reverse engineering | delegated discovery requirement |
| ck-plan 4.4.0 | phase files, statuses, `YYMMDD-HHmm-slug` naming | global plan root with `docs/harness/plans/` | external CK validation when installed | unrelated task hydration |
| cook | approved-plan gate, phase order, tests, review | global reports with `docs/harness/reports/` | unavailable-check disclosure | automated source-control and delivery actions |
| ck-graphify | relationship visualization | trace roots with canonical Markdown roots | `graphify` executable | trace ledger and required executable |

All local references used by a skill are listed in its `SKILL.md`. No entrypoint
depends on files outside this repository. See [provenance](./PROVENANCE.md) for
version, license, date, and adaptation records.

## Source file inventory

The local ClaudeKit 4.4.0 installation was inspected on 2026-07-14. These are
all files in the six source skill directories that inform this port:

- `brainstorm/SKILL.md`; `ask/SKILL.md`; `ck-graphify/SKILL.md`.
- `scout/SKILL.md` and `references/{internal-scouting,external-scouting,task-management-scouting}.md`.
- `ck-plan/SKILL.md` and `references/{archive-workflow,codebase-understanding,output-standards,plan-organization,red-team-personas,red-team-workflow,research-phase,scope-challenge,solution-design,task-management,validate-question-framework,validate-workflow,verification-roles,workflow-modes}.md`.
- `cook/SKILL.md`, `cook/README.md`, and
  `references/{intent-detection,review-cycle,subagent-patterns,workflow-steps}.md`.

## Reference disposition

| Source reference family | Disposition in harness |
| --- | --- |
| Relative `references/*.md` and shared workflow artifact schema | Replaced by the five canonical workflow documents and templates |
| `./plans/`, global plan roots, active-plan script | Replaced by `docs/harness/plans/`; no hidden active pointer |
| Generic `./docs/*`, global rules, `.ck.json`, personal skill paths | Replaced by `docs/harness/index.md` and its linked specs |
| CK `plan create/check/uncheck/status` | Retained as optional compatibility checks; Markdown remains usable without CK |
| Requirements, alternative analysis, approval, plan-before-code, validation | Retained and simplified in Feature, Decision, Plan, and Cook workflows |
| Task hydration, delegated research/testing/review/finalization | Removed; direct work with recorded evidence is sufficient |
| Automatic journal, archive, commit, push, PR, release, deploy | Removed from canonical skills |
| Gemini/OpenCode scouting, MCP server, semantic LLM graph extraction | Removed from MVP |
| `graphify` executable and `graphify-out/` | Optional visualization with warning-only absence and derived cleanup |
| Upstream report/trace directories and active workflow artifact pointer | Replaced by canonical reports; hidden trace storage removed |

The source directories also reference unrelated ClaudeKit skills such as scout,
project organization/management, journal, test, review, docs, Git, multimodal,
and docs-seeker. Those references are removed rather than transitively ported.
