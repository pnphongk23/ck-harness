# Harness Artifact Schema v1

All canonical artifacts use YAML frontmatter parsed by a YAML parser. Unknown
fields are rejected by the executable schemas so schema changes remain
intentional. Dates use `YYYY-MM-DD`; timestamps use ISO 8601.

| Artifact | Location | Filename | Required frontmatter |
| --- | --- | --- | --- |
| Feature | `features/` | `FEAT-XXX-kebab-name.md` | `schema_version`, `type`, `id`, `title`, `status`, `created`, `relationships` |
| Spec | `specs/` | `semantic-name.md` | `schema_version`, `type`, `title`, `status`, `relationships` |
| Decision | `decisions/` | `DEC-XXX-kebab-name.md` | common ID fields plus `decided` and `relationships` |
| Report | `reports/` | `REP-XXX-kebab-name.md` | common ID fields plus `delivered` and `relationships` |
| Rule | `rules/` | `RULE-XXX-kebab-name.md` | common ID fields plus `approved`, `scope`, and `relationships` |
| Plan | `plans/YYMMDD-HHmm-slug/` | `plan.md`, `phase-XX-name.md` | CK-compatible plan or phase fields |

Statuses are `draft`, `proposed`, `approved`, `active`, `deprecated`,
`superseded`, or `completed`; each artifact schema accepts only its relevant
subset. Relationship keys are `specs`, `decisions`, `plans`, `reports`,
`rules`, `features`, and `source_paths`, each containing unique strings.

IDs match `^FEAT-[0-9]{3}$`, `^DEC-[0-9]{3}$`, `^REP-[0-9]{3}$`, or
`^RULE-[0-9]{3}$`. Sequences are monotonic and IDs are immutable and never
reused, including after deprecation or forced deletion. Filename validation
must compare the embedded ID with frontmatter.

Wikilinks use `[[full-basename|ID]]` for ID-bearing artifacts and
`[[semantic-basename]]` for specs. Paths in `source_paths` are repository-
relative POSIX paths and do not use wikilinks.

Plan frontmatter requires title, description, status, priority, effort, branch,
tags, dependency lists, created timestamp, and creator. Phase frontmatter
requires numeric phase, title, status, priority, effort, and numeric
dependencies. Compatibility accepts both CK's `in-progress` spelling and the
repository's `in_progress` spelling when reading; new harness workflows write
`in_progress`.

Feature Markdown has exactly five H2 sections: Introduction, Business
Understanding, Requirements, Acceptance, and Relationships. Optional material
is omitted rather than emitted as empty headings. Actors are people, business
roles, or external systems—not classes, services, packages, or modules.
