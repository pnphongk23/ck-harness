---
schema_version: 1
title: Choose the CLI command parsing architecture
relationships:
  specs: []
  decisions: []
  plans:
    - "[[260714-0033-file-based-agent-harness/plan|Plan]]"
  reports: []
  rules: []
  features:
    - "[[FEAT-001-harness-cli|FEAT-001]]"
    - "[[FEAT-003-verify-harness-integrity|FEAT-003]]"
    - "[[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]"
    - "[[FEAT-005-provide-harness-access-across-runtimes|FEAT-005]]"
  source_paths:
    - package.json
    - src/cli/index.ts
type: decision
id: DEC-001
status: approved
created: 2026-07-14
approved: 2026-07-14
approved_by: Repository Maintainer
---

# DEC-001: Choose the CLI command parsing architecture

## Context

The Harness CLI Features define a nested but finite command surface with deterministic human and JSON output. The package supports Node.js 20 or newer, currently has no CLI framework dependency, and must not launch agents or perform hidden external actions.

## Decision

Use Node's stable `node:util` `parseArgs` API behind an explicit command registry. The CLI grammar requires the command path to precede command-specific options, for example `harness feature rename FEAT-001 --title "New title"`. Root-only forms such as `harness --help` and `harness --version` are handled before command lookup. After matching the longest known leading command path from raw arguments, parse only the remaining positionals and that command's declared options in strict mode.

Global presentation options such as `--json` are declared by every command that supports them and appear after the command path. Unknown or misplaced options fail rather than being reinterpreted as command words or values. Command handlers receive typed input and return structured results; a single CLI boundary converts results into human or JSON output and stable exit codes.

Do not add a third-party CLI framework unless the command contract later requires behavior that `parseArgs` and the local registry cannot express without material duplication.

## Alternatives

1. **Manual `process.argv` parsing.** This has the smallest apparent implementation surface and no dependency, but pushes option validation, repeated flags, `--` handling, unknown-option rejection, and diagnostics into bespoke code. It is viable only for a much smaller command contract.
2. **Node `parseArgs` plus a grammar-constrained command registry — recommended.** This keeps the runtime dependency-free while providing strict option parsing and token information. Requiring the command path before options removes ambiguous two-pass parsing; nested command selection, help text, and typed command specifications remain small project-owned concerns.
3. **A third-party framework such as Commander or Yargs.** This provides mature nested routing and generated help, but adds runtime supply-chain and upgrade surface. FEAT-001 does not currently need prompts, shell completion, middleware, or other behavior that would justify that cost.

## Consequences

- Command definitions, option schemas, help text, and dispatch behavior have one deterministic source.
- `harness --workspace <path> feature list` is intentionally invalid; the unambiguous form is `harness feature list --workspace <path>` when that command supports the option.
- Tests must cover command-path extraction, strict unknown-option failures, missing values, positionals, `--json`, `--dry-run`, and stable exit codes.
- Adding a command remains explicit; a command is implemented only for the Feature boundary that authorizes its observable behavior.
- If the command surface later exceeds the local registry, a new superseding Decision is required before adding a framework.

## Evidence

- [[FEAT-001-harness-cli|FEAT-001]]
- [[FEAT-003-verify-harness-integrity|FEAT-003]]
- [[FEAT-004-maintain-navigable-harness-knowledge|FEAT-004]]
- [[FEAT-005-provide-harness-access-across-runtimes|FEAT-005]]
- [[260714-0033-file-based-agent-harness/plan|Plan]]
- `package.json` requires Node.js 20 or newer and has no CLI framework dependency.
- `src/cli/index.ts` is currently a routing-only stub.
- Node.js documents `util.parseArgs` as stable and able to return structured options, positionals, and ordered tokens: https://nodejs.org/download/release/latest-v22.x/docs/api/util.html#utilparseargsconfig

## Supersession

This decision supersedes no earlier decision.
