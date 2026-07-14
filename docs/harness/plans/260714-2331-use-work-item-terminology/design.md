# Work Item terminology migration design

## Goal

Use Work Item as the only Plan execution-unit concept across authored Markdown,
filenames, frontmatter, TypeScript symbols, diagnostics, skills, tests, and
derived index links.

## Target contract

```text
docs/harness/plans/YYMMDD-HHmm-slug/
├── plan.md
├── work-item-01-kebab-name.md
└── work-item-02-kebab-name.md
```

Each Work Item uses strict frontmatter:

```yaml
work_item: 1
title: Example
status: pending
priority: P1
effort: 1d
dependencies: []
decision_dependencies: []
```

Tasks, optional kind, scope, risks, coverage detail, success criteria, and
verification evidence remain in the Markdown body. Plan owns the aggregate
requirement or technical-objective coverage map.

## Code changes

- Replace the Plan-child Zod schema and TypeScript guards with Work Item names
  and the `work_item` numeric field.
- Validate only `work-item-XX-kebab-name.md`; do not accept the former filename
  or frontmatter as an alias.
- Rename lifecycle aggregation, dependency, and diagnostic vocabulary to Work Item.
- Teach skill routing to recognize `work item` and `work items` for planning.
- Update tests and fixtures to enforce the new field, filenames, links, and diagnostics.
- Preserve required core-document links in the CLI-generated index so the
  existing workflow test and generated output agree.

## Repository migration

The schema/code change and repository artifact migration publish as one logical
change:

1. Rename every Plan child to `work-item-XX-*.md`.
2. Replace its numeric frontmatter key with `work_item`.
3. Update Plan tables, wikilinks, source paths, reports, Decisions, Features,
   Rules, Specs, workflows, skills, and tests to the Work Item vocabulary.
4. Rebuild the CLI-owned index after all canonical links resolve.

Completed and blocked execution states are preserved. Only the unit name and
paths change; evidence, dependencies, approval, and ordering semantics do not.

## Compatibility and rollback

There is no dual-name compatibility window. Inputs using the former Plan-child
contract fail schema or filename validation with a Work Item-specific message.
Rollback requires reverting the complete migration; mixing old and new child
representations is invalid.

## Verification

- No active source, test, skill, or canonical workflow text uses the former
  Plan-child vocabulary.
- `npm run verify` passes.
- `harness validate --all`, `index build`, `index check`, and `doctor` pass,
  allowing only the existing optional Graphify warning.
- `npm pack --dry-run` succeeds and ships the updated skills/workflows.
