---
schema_version: 1
type: decision
id: DEC-006
title: Choose the Graphify directory extraction boundary
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Repository Maintainer
relationships:
  specs: []
  decisions:
    - "[[DEC-003-index-watch-and-graph-runtime|DEC-003]]"
  plans:
    - "[[260714-1147-maintain-navigable-harness-knowledge/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
  source_paths:
    - src/adapters/index.ts
    - src/cli/index.ts
---

# DEC-006: Choose the Graphify directory extraction boundary

## Context

DEC-003 requires Graphify to remain optional, local, shell-free, and explicitly
invoked. The original Phase 4 Plan additionally assumed a deterministic JSON
stdin protocol, but installed Graphify 0.8.39 exposes directory-oriented
`extract <path>` input and writes `graphify-out/`; it has no `--stdin` protocol.
The Repository Maintainer requires Graphify to inspect only `docs/harness/` and
to keep its output within that directory.

Graphify semantic extraction of Markdown may use a configured model backend.
R-021 therefore requires informed, explicit permission before a build may
transmit repository content outside the machine.

## Decision

Refine only the Graphify portion of DEC-003. Keep its watcher decision intact.

`harness graph build --allow-external` invokes the discovered executable with
`shell: false`, repository-root `cwd`, and the fixed arguments `extract`,
`docs/harness`, `--out`, `docs/harness`, and `--no-cluster`. The explicit
permission flag acknowledges that Graphify may send Markdown to its configured
semantic backend. Without the flag, the command fails before process spawn.

Graphify input is limited to `docs/harness/`. Derived output is limited to
`docs/harness/graphify-out/`, excluded from index discovery and watch
invalidation, and removable only through the existing explicit cleanup flow.
The adapter rejects symbolic links anywhere in the input tree before process
spawn so path indirection cannot expand that boundary. `graph check` remains
warning-only and never extracts content.

## Alternatives

1. **Keep the assumed stdin adapter.** This provides a narrow deterministic
   payload but is incompatible with Graphify 0.8.39 and would require a separate
   wrapper executable with its own supported protocol.
2. **Run Graphify against the repository root.** This matches common Graphify
   usage but exposes unrelated source and expands output/process scope beyond
   the Harness knowledge boundary.
3. **Extract only `docs/harness/` with explicit transmission permission —
   selected.** This uses the installed CLI contract, minimizes input/output
   scope, and makes R-021 permission visible, while Graphify output itself is
   not promised to be byte-deterministic.

## Consequences

- Graph generation operates on canonical Harness Markdown rather than a custom
  relationship JSON projection.
- `graph build` needs an informed `--allow-external` acknowledgement; missing
  permission, missing Graphify, spawn error, or non-zero exit remains a
  graph-specific failure that cannot invalidate the Markdown index.
- `docs/harness/graphify-out/` becomes an allowlisted disposable directory and
  must be ignored by watch and canonical discovery.
- Graphify may use a configured semantic backend. The Harness CLI does not
  choose credentials, install a backend, or transmit content on any other
  command.

## Evidence

- `graphify --version` reports `graphify 0.8.39` on 2026-07-14.
- `graphify --help` documents `extract <path>`, `--out DIR`, and `--no-cluster`,
  and does not document `--stdin` or the assumed build protocol.
- [[DEC-003-index-watch-and-graph-runtime|DEC-003]]
- [[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]
- [[260714-1147-maintain-navigable-harness-knowledge/plan|Plan]]
- R-021 in `docs/harness/RULES.md`.

## Supersession

This decision refines the Graphify process portion of DEC-003 and does not
supersede its watcher runtime decision.
