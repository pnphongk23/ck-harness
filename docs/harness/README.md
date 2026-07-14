# Repository Harness Contract

The harness is a deterministic, file-first convention for preserving product
and engineering knowledge as readable Markdown. Durable artifacts live below
`docs/harness/`; `index.md` is derived except for its CLI-owned monotonic
artifact sequences.

## Product boundary

The approved FEAT-001 CLI initializes the Harness, scaffolds supported
artifacts, lists and shows Features, safely changes Feature lifecycle state,
and cleans allowlisted disposable output. Public validation, index generation,
watching, graphs, runtime adapters, and doctor diagnostics belong to proposed
Features and are not delivered by this command surface. Repository tooling
never invokes Claude, Codex, Cursor, Antigravity, or another AI agent.

The MVP has one CLI writer. Writes stay under repository-contained allowlists,
use flushed temporary sibling files, validate the staged result, recheck input
content, and replace one target at a time. Each file replacement is atomic;
multiple files are not one atomic transaction. A handled publication failure
attempts best-effort rollback without overwriting a divergent external edit.

## Canonical artifacts and ownership

- Features own observable business behavior and immutable `FEAT-XXX` IDs.
- Specs own project-wide technical context and use semantic filenames.
- Decisions own chosen trade-offs and evidence.
- CK plans own approved implementation sequencing, governing relationships,
  phase Decision dependencies, and execution state.
- Reports own delivered outcomes and verification evidence.
- Rules own human-approved, reusable guidance.
- Templates and workflows define authoring contracts.
- `index.md` is generated; humans must not hand-edit its catalog or backlinks.

Root `AGENTS.md` and `CLAUDE.md` are routers only. They must not duplicate this
manual or workflow content.

Request classification prevents read-only, no-change, and maintenance work from
creating unnecessary Features. Decision is an interruptible workflow for
durable trade-offs; it is not one mandatory fixed stage in every task.

## Artifact lifecycle CLI

Run the installed `harness` binary from the repository or pass an explicit
workspace after the command path:

```text
harness init [--workspace PATH] [--json]
harness feature create --title TITLE [--created YYYY-MM-DD]
harness feature list
harness feature show TARGET
harness feature rename TARGET --title TITLE
harness feature deprecate TARGET
harness feature delete TARGET [--force]
harness validate PATH | --kind KIND | --all
harness index check
harness doctor
harness new spec --title TITLE
harness new decision --title TITLE [--created YYYY-MM-DD]
harness new report --title TITLE --delivered YYYY-MM-DD
harness new rule --title TITLE --approved YYYY-MM-DD --scope SCOPE
harness clean [--dry-run]
```

`TARGET` is an immutable `FEAT-XXX` ID or an exact Feature basename. Options
belong after the command path. Unknown commands and options fail rather than
being reinterpreted. `--json` returns a stable success or error envelope.

`feature create` and `new decision` create non-approved drafts/proposals.
Reports require an explicit delivery date. Rules require an explicit approval
date and at least one scope so the CLI records existing human authority rather
than silently granting it. Generated starters preserve the canonical document
shape and label unresolved content as TBD for the owning authority.

## Naming and links

ID-bearing files are `FEAT-001-checkout.md`, `DEC-001-payment-provider.md`,
`REP-001-checkout-delivery.md`, and `RULE-001-verify-webhooks.md`. The ID in a
filename and frontmatter must agree. Renaming a slug retains the ID. Valid
feature links prefer `[[FEAT-001-checkout|FEAT-001]]`. Specs use links such as
`[[security]]` and filenames such as `security.md`.

Invalid examples include `FEAT-1-name.md`, `feat-001-name.md`, a reused deleted
ID, `SPEC-001-security.md`, or a feature whose frontmatter says `FEAT-002`
while its filename says `FEAT-001-name.md`.

Plans retain the ClaudeKit directory form `YYMMDD-HHmm-slug/`, with `plan.md`
and `phase-XX-name.md` children. For example,
`260714-0033-file-based-agent-harness/plan.md` is valid.

## Rename, deletion, and interruption

A referenced feature is deprecated by default, never silently deleted. Forced
deletion must list every affected wikilink and require explicit human
acceptance. Feature IDs remain reserved forever. A supervised slug rename
stages the new Feature and every resolvable inbound-link rewrite, validates the
complete result, then publishes per-file replacements with best-effort handled
rollback.

There is no transaction manifest, automatic crash recovery, or `harness
recover` command. If the process or machine stops between replacements, inspect
the paths named by the failed operation and restore one consistent authored
state from reviewed content or source-control history. A later relevant
mutation rejects detected invalid or duplicate artifact state; it does not
guess which copy is authoritative. After manual repair, rerun the intended
command. Do not introduce a database or hidden trace store as recovery state.

## Cleanup ownership

`harness clean --dry-run` is the required preview. Confirmed cleanup can remove
only `graphify-out/`, `docs/harness/.harness-tmp/`,
`docs/harness/.cache/`, and stale temporary sibling or rollback files carrying
the Harness-owned marker. It never removes canonical authored Markdown,
Features, Specs, Decisions, Plans, Reports, Rules, templates, or workflows.

## Troubleshooting

- **Harness is not initialized:** run `harness init` at the intended repository
  root or pass `--workspace` after the command.
- **Repository lock is owned:** wait for the active mutation to finish. Do not
  remove an uncertain live lock merely because it is old.
- **Target changed while staged:** review the external edit and retry from the
  new content; the CLI will not overwrite it.
- **Duplicate or invalid artifact state:** repair the named paths manually,
  preserving immutable IDs, before retrying a mutation.
- **Referenced deletion blocked:** prefer deprecation, or review every listed
  inbound link before explicitly using `--force`.

## Non-goals

There is no SQLite database, legacy database importer, MCP server, dashboard,
hosted service, event or trace ledger, multi-writer transaction guarantee,
agent orchestration, automatic recovery, commit, push, deployment, or required
Graphify runtime. `validate`, `index check`, and `doctor` are read-only: index
checks never build or watch the index, while doctor reports a missing optional
Graphify executable as a warning. Index build/watch and runtime adapters remain
separately planned work.
