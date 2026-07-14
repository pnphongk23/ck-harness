# Skill Provenance and Licensing

The `harness-*` skills are clean, repository-specific adaptations informed by
the behavior inventory in the approved plan. No upstream skill text is copied
verbatim. Before any future copy or close adaptation, contributors must record
the source repository, file, version or commit, license, copyright notice,
adaptation date, and material changes here.

| Canonical skill | Sources considered | Version | License | Adapted | Removed dependencies |
| --- | --- | --- | --- | --- | --- |
| harness-feature | ClaudeKit brainstorm 2.2.1, ask 1.0.0, scout 1.0.0 | CLI 4.4.0 | Upstream metadata says MIT for brainstorm; no source text copied; repository MIT implementation | 2026-07-14 | global rules, mandatory delegation, global paths |
| harness-decision | ClaudeKit ask 1.0.0 | CLI 4.4.0 | No upstream license field found; no source text copied; repository MIT implementation | 2026-07-14 | home-directory rules, hidden context |
| harness-plan | ClaudeKit ck-plan 1.1.0 | CLI 4.4.0 | Upstream metadata says MIT; no source text copied; repository MIT implementation | 2026-07-14 | task hydration, global plan roots |
| harness-cook | ClaudeKit cook SKILL 2.2.0 (README history 2.2.1) | CLI 4.4.0 | No upstream license field found; no source text copied; repository MIT implementation | 2026-07-14 | required delegation, source-control/delivery automation |
| harness-self-improve | ClaudeKit ck-graphify beta plus harness Report/Decision feedback contract | CLI 4.4.0 | Attributed upstream project; no source text copied; repository MIT implementation | 2026-07-14 | required executable, MCP mode, trace storage, automatic mutation |

The repository itself is MIT licensed. An unavailable or incompatible upstream
license is a blocker to copying; reimplement behavior from the public contract
instead.
