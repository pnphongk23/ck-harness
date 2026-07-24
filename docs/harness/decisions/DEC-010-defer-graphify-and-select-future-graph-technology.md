---
schema_version: 1
type: decision
id: DEC-010
title: Defer Graphify and select future graph technology
status: superseded
created: 2026-07-16
approved: 2026-07-16
approved_by: Repository Maintainer
supersedes: "[[DEC-006-graphify-directory-extraction-boundary|DEC-006]]"
relationships:
  specs: []
  decisions:
    - "[[DEC-006-graphify-directory-extraction-boundary|DEC-006]]"
    - "[[DEC-011-build-the-markdown-graph-with-the-harness-resolver-and-cytoscape-js|DEC-011]]"
  plans:
    - "[[260716-1356-configure-harness-document-folders/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-006-configure-harness-document-folders|FEAT-006]]"
  source_paths:
    - src/adapters/index.ts
    - docs/harness/decisions/DEC-006-graphify-directory-extraction-boundary.md
    - docs/harness/features/FEAT-006-configure-harness-document-folders.md
---

# DEC-010: Defer Graphify and select future graph technology

## Context

DEC-006 limits the current optional Graphify adapter to `docs/harness/`. FEAT-006
allows a broader document root such as `docs/`; applying the old adapter to that
root could include unrelated Markdown and does not determine how a future graph
should be built.

Repository Maintainer does not want to use Graphify for the configurable-folder
delivery. The desired future outcome is a repository-owned graph capability
with a separately selected technology stack.

## Decision

Supersede DEC-006's Graphify extraction decision. FEAT-006 shall not configure,
invoke, migrate, or otherwise adapt Graphify. Existing Graphify behavior remains
historical functionality outside this delivery; it is neither removed nor extended.

A future graph capability requires its own approved Feature and technical
Decision to select the implementation technology, input boundary, privacy
model, output ownership, and verification contract.

## Alternatives

1. **Adapt Graphify to the configured document root.** Rejected because a broad
   root can expose unrelated Markdown and the Maintainer does not want Graphify
   as the future graph technology.
2. **Remove graph behavior permanently.** Rejected because a repository-owned
   graph may still be valuable after its technology and boundary are selected.
3. **Defer Graphify and decide a future graph technology separately — selected.**
   This keeps FEAT-006 focused on folders and preserves a deliberate security
   and architecture choice for later authority.

## Consequences

- The FEAT-006 Plan no longer treats Graphify as an approval blocker or Work Item.
- Folder configuration covers initialization, lifecycle, validation, index,
  watcher, cleanup, and repository-local access; it does not cover graph build.
- No current source code removes Graphify or introduces a replacement graph.
- A later graph effort must not reuse DEC-006 as authority.

## Evidence

- `src/adapters/index.ts` invokes Graphify with one directory root and an
  explicit external-permission boundary.
- [[DEC-006-graphify-directory-extraction-boundary|DEC-006]] limits that root
  to `docs/harness/`.
- [[FEAT-006-configure-harness-document-folders|FEAT-006]] permits a configurable
  root such as `docs/`, making the old extraction boundary unsuitable.

## Supersession

This decision supersedes [[DEC-006-graphify-directory-extraction-boundary|DEC-006]]
and is superseded by
[[DEC-011-build-the-markdown-graph-with-the-harness-resolver-and-cytoscape-js|DEC-011]].
