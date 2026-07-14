# Harness Artifact Schema v1

All canonical artifacts use YAML frontmatter parsed by a YAML parser. Unknown
fields are rejected by the executable schemas so schema changes remain
intentional. Dates use `YYYY-MM-DD`; timestamps use ISO 8601.

| Artifact | Location | Filename | Required frontmatter |
| --- | --- | --- | --- |
| Feature | `features/` | `FEAT-XXX-kebab-name.md` | common ID fields, `created`, conditional approval provenance, `relationships` |
| Spec | `specs/` | `semantic-name.md` | `schema_version`, `type`, `title`, `status`, `relationships` |
| Decision | `decisions/` | `DEC-XXX-kebab-name.md` | common ID fields, `created`, conditional approval or rejection provenance, `relationships` |
| Report | `reports/` | `REP-XXX-kebab-name.md` | common ID fields plus `delivered` and `relationships` |
| Rule | `rules/` | `RULE-XXX-kebab-name.md` | common ID fields plus `approved`, `scope`, and `relationships` |
| Plan | `plans/YYMMDD-HHmm-slug/` | `plan.md`, optional plain `design.md`, `work-item-XX-name.md` | Harness Plan or Work Item fields; design has no lifecycle frontmatter |

Artifact statuses are `draft`, `proposed`, `approved`, `rejected`, `active`,
`deprecated`, `superseded`, or `completed`; each artifact schema accepts only
its relevant subset. Relationship keys are `specs`, `decisions`, `plans`, `reports`,
`rules`, `features`, and `source_paths`, each containing unique strings.

IDs match `^FEAT-[0-9]{3}$`, `^DEC-[0-9]{3}$`, `^REP-[0-9]{3}$`, or
`^RULE-[0-9]{3}$`. Sequences are monotonic and IDs are immutable and never
reused, including after deprecation or forced deletion. Filename validation
must compare the embedded ID with frontmatter.

Wikilinks use `[[full-basename|ID]]` for ID-bearing artifacts and
`[[semantic-basename]]` for specs. Paths in `source_paths` are repository-
relative POSIX paths and do not use wikilinks.

Approved, active, or deprecated Features require `approved` and `approved_by`.
Decisions use `proposed`, `approved`, `rejected`, or `superseded`; approved and
superseded Decisions require `approved` and `approved_by`, while rejected
Decisions require `rejected`.

Plan frontmatter requires title, description, execution `status`, nested
`approval`, priority, effort, branch, tags, dependency lists, `relationships`,
created timestamp, and creator. Approval status is `pending`,
`changes_requested`, or `approved`; non-pending approval records `decided`, and
`required_by` names the responsible authority role. A Plan may not be
`in_progress` or `completed` without approved execution authority.

Plan and Work Item execution statuses are `pending`, `in_progress`, `blocked`,
`completed`, or `cancelled`. Compatibility accepts CK's `in-progress` spelling
when reading; new Harness workflows write `in_progress`. Blocked or cancelled
state requires `status_reason`.

Work Item frontmatter requires numeric `work_item`, title, status, priority, effort,
numeric `dependencies`, and `decision_dependencies`. Each Decision dependency
uses a canonical wikilink and must resolve to an approved Decision before the
Work Item becomes eligible.

For workflow semantics, each `work-item-XX-*.md` file persists one Work
Item. Optional Work Item kind, inline Tasks, requirement or technical-objective
coverage, and evidence notes remain Markdown body content; they are not new
frontmatter fields. The Plan body owns the aggregate coverage map. This
interpretation preserves the strict v1 executable schema and does not introduce
a Story artifact or Task-level Plan.

An implementation `design.md` is optional supporting evidence stored beside the
owning `plan.md` and linked through that Plan's `relationships.source_paths`.
It is not a v1 lifecycle artifact and has no Harness frontmatter. Discovery
recognizes only this exact sibling filename as supporting Markdown; every other
Markdown file in a Plan directory must parse as Plan or Work Item. Reusable
technical contracts belong in semantic Specs or approved Decisions.

Feature Markdown has exactly five H2 sections: Introduction, Business
Understanding, Requirements, Acceptance, and Relationships. Optional material
is omitted rather than emitted as empty headings. Actors are people, business
roles, or external systems—not classes, services, packages, or modules.

The cross-artifact authority, transition, aggregation, eligibility, and
completion contract is defined by [[workflow-lifecycle]].
