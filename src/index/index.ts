import { readFile } from "node:fs/promises";
import { applyMutation } from "../fs/atomic-write.js";
import {
  scanHarness,
  renderExpectedIndex,
  derivedIndexCounters,
  indexCounters,
  indexFrontmatter,
  type IntegrityFinding,
} from "../core/integrity.js";
import { exists, HarnessError, repositoryPaths } from "../fs/repository.js";

export const INDEX_BOUNDARY = "derived-markdown" as const;

export interface IndexBuildResult {
  outcome: "success" | "failure";
  unchanged: boolean;
  findings?: readonly IntegrityFinding[];
}

export async function buildIndex(root: string): Promise<IndexBuildResult> {
  const paths = await repositoryPaths(root);
  if (!(await exists(paths.harness))) {
    throw new HarnessError("Harness is not initialized; run `harness init` first", "precondition");
  }

  const canonical = await scanHarness(paths.root, {}, { requireIndex: false });
  if (canonical.outcome === "failure") {
    return { outcome: "failure", unchanged: true, findings: canonical.findings };
  }

  let persisted: string | undefined;
  const derivedCounters = await derivedIndexCounters(paths.root);
  let counters = derivedCounters;
  try {
    persisted = await readFile(paths.index, "utf8");
    const frontmatter = indexFrontmatter(persisted);
    if (frontmatter.schema_version === 1 && frontmatter.generated === true) {
      const persistedCounters = indexCounters(frontmatter);
      counters = {
        next_feature_sequence: Math.max(persistedCounters.next_feature_sequence, derivedCounters.next_feature_sequence),
        next_decision_sequence: Math.max(persistedCounters.next_decision_sequence, derivedCounters.next_decision_sequence),
        next_report_sequence: Math.max(persistedCounters.next_report_sequence, derivedCounters.next_report_sequence),
        next_rule_sequence: Math.max(persistedCounters.next_rule_sequence, derivedCounters.next_rule_sequence),
      };
    }
  } catch {
    // Counters derived from canonical IDs are used if the index is malformed.
  }

  const expected = await renderExpectedIndex(paths.root, counters);

  if (persisted === expected) {
    return { outcome: "success", unchanged: true };
  }

  await applyMutation(paths.root, [{ path: paths.index, content: expected }]);
  return { outcome: "success", unchanged: false };
}
