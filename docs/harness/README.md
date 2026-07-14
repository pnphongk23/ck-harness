# Repository Harness Contract

The harness is a deterministic, file-first convention for preserving product
and engineering knowledge as readable Markdown. Durable artifacts live below
`docs/harness/`; `index.md` is derived except for its CLI-owned monotonic
feature sequence.

## Product boundary

The Node.js 20+ TypeScript package may route commands, scaffold files, validate
content, build an index, watch external edits, synchronize runtime adapters,
clean derived files, and report diagnostics. Repository tooling never invokes
Claude, Codex, Cursor, Antigravity, or any other AI agent.

The MVP has one CLI writer. External edits are reconciled later through
`index build/check`. Writes must stay under approved roots and eventually use a
sibling temporary file, best-effort `fsync`, then atomic rename.

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

## Deletion and recovery

A referenced feature is deprecated by default, never silently deleted. Forced
deletion must list every affected wikilink and require explicit human
acceptance. Feature IDs remain reserved forever. A supervised slug rename must
rewrite inbound links as one atomic logical operation.

If derived state disagrees with canonical files, preserve the Markdown and use
`index build/check` once those commands exist. Do not repair the system by
introducing a database or hidden trace store.

## Non-goals

There is no SQLite database, legacy database importer, MCP server, dashboard,
hosted service, event or trace ledger, multi-writer transaction guarantee,
agent orchestration, commit, push, deployment, or required Graphify runtime in
the MVP. Graphify may be used later as an optional view and must degrade to a
warning when unavailable.
