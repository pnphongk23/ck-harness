---
phase: 6
title: "Runtime Adapters and Doctor"
status: pending
priority: P1
effort: "4-5 days"
dependencies: [3, 4]
---

# Phase 6: Runtime Adapters and Doctor

## Overview

Generate and validate thin runtime adapters while keeping one canonical skill implementation. Add `doctor` diagnostics for paths, versions, schemas, adapters, CK compatibility, Graphify availability, and stale index state.

## Adapter Contract

- **Codex:** directly discovers `.agents/skills/harness-*/SKILL.md`.
- **Antigravity:** directly discovers the same `.agents/skills/harness-*/SKILL.md`.
- **Claude:** generated `.claude/skills/harness-*/SKILL.md` routers load the canonical workflow and templates without duplicating their bodies.
- **Cursor:** generated `.cursor/commands/harness-*.md` and `.cursor/rules/harness.mdc` route to the canonical workflow; root `AGENTS.md` remains the short shared entrypoint.
- Generated adapters contain a source path, schema version, and content fingerprint so drift is detectable.
- `adapters sync` writes only owned marked files and never overwrites unowned custom runtime configuration.

## Doctor Checks

- Repository and `docs/harness/` discovery.
- Node and CLI version compatibility.
- Index presence, schema version, hash, and staleness.
- Duplicate IDs, invalid frontmatter, broken wikilinks, and unresolved aliases.
- Canonical skill entrypoints and all referenced templates/workflows.
- Adapter fingerprints and unexpected user modifications.
- ClaudeKit availability/version and plan naming compatibility.
- Graphify availability as optional warning.
- Runtime directories and router files in their exact documented locations.
- Explicit confirmation that no MCP server or agent launcher is configured by the harness.

## Related Code Files

- Create: `src/adapters/`, `src/doctor/`.
- Generate: `.claude/skills/harness-*/SKILL.md`.
- Generate: `.cursor/commands/harness-*.md`, `.cursor/rules/harness.mdc`.
- Create or update marked blocks only: `AGENTS.md`, `CLAUDE.md`.
- Create: adapter golden fixtures for all four runtimes.

## Implementation Steps

1. Define the adapter manifest and ownership markers.
2. Implement Codex/Antigravity canonical discovery checks.
3. Implement Claude thin-skill renderers with repository-relative links.
4. Implement Cursor command and rule renderers.
5. Implement safe sync: preview, conflict detection, atomic write, and stale owned-file removal.
6. Implement `adapters check` without mutation.
7. Implement `doctor` with stable check IDs, severity levels, human output, and JSON output.
8. Add checks for current ClaudeKit plan naming and surface configuration warnings without mutating user-global config.
9. Test paths containing spaces, nested working directories, symlinked repositories, and Windows separators.
10. Document how each runtime discovers and invokes the harness workflows.

## Risks

- Runtime discovery contracts can change; keep adapter logic isolated and versioned.
- Generated routers may be edited manually; refuse silent overwrite and provide diff/remediation.
- Relative paths behave differently from nested CWDs; resolve from repository root, not process launch directory.

## Success Criteria

- [ ] `adapters sync` produces the exact expected files for four runtimes.
- [ ] `adapters check` detects missing, stale, modified, and broken routers.
- [ ] User-owned runtime files remain unchanged.
- [ ] `doctor --json` returns stable check identifiers and nonzero status for errors.
- [ ] Missing Graphify is a warning; broken canonical skill references are errors.
- [ ] All generated adapters route to one canonical skill/workflow source.
