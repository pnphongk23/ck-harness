# Plan-local design contract

## Goal

Make delivery-specific implementation design visibly owned by one Plan without
turning it into a new lifecycle artifact or conflating it with a reusable Spec.

## Directory contract

```text
docs/harness/plans/YYMMDD-HHmm-slug/
├── plan.md
├── design.md                       # optional, at most one
├── work-item-01-kebab-name.md
└── work-item-02-kebab-name.md
```

`design.md` is plain Markdown. If it exists, the sibling `plan.md` must include
its exact repository-relative path in `relationships.source_paths`. A design
path belonging to another Plan or a top-level design tree is invalid.

## Scanner behavior

The integrity scanner separates exact Plan-local `design.md` paths from strict
lifecycle documents before parsing frontmatter. It continues to parse every
other Markdown file under `docs/harness/plans/` as a Plan or Work Item, then
checks the supporting design against its owning Plan:

1. the design is directly inside a valid Plan directory;
2. the directory has a `plan.md` root;
3. the Plan links the exact design path through `relationships.source_paths`;
4. any Plan source path ending in `design.md` resolves to its own sibling file.

The generated artifact index does not catalog or digest supporting design, just
as it does not catalog source code in `relationships.source_paths`. Graphify can
still read the file because it remains Markdown under `docs/harness/`.

## Authority boundary

Plan-local design explains how one approved delivery will fit the observed
codebase. Reusable architecture, APIs, data contracts, security rules, or other
cross-Plan constraints belong in a semantic Spec or approved Decision. Feature
behavior remains implementation-free.

## Migration

Move `docs/harness/design/work-item-model/design.md` into the completed
`260714-2331-use-work-item-terminology` Plan and update its Plan and REP-004
source paths. Remove the empty top-level design directory and retain no alias.

## Verification

- A linked sibling design passes full validation.
- An unlinked sibling design and an external design source path fail with stable diagnostics.
- The design is absent from the lifecycle index catalog.
- Existing Plans, Work Items, relationships, and package boundaries still pass.
