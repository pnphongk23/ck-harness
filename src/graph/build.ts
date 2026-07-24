import { readFile } from "node:fs/promises";
import { applyMutation } from "../fs/atomic-write.js";
import { HarnessError, repositoryPaths } from "../fs/repository.js";
import { artifactFromGraph, graphOutputPath, serializeGraphArtifact, type GraphArtifact } from "./artifact.js";
import { buildMarkdownDocumentGraph } from "./markdown.js";

export interface GraphBuildResult {
  outcome: "success";
  unchanged: boolean;
  path: string;
  source_digest: string;
}

export async function buildGraphArtifact(root: string): Promise<GraphBuildResult> {
  const paths = await repositoryPaths(root);
  const graph = await buildMarkdownDocumentGraph(paths.root);
  const artifact = artifactFromGraph(graph);
  const content = serializeGraphArtifact(artifact);
  const output = graphOutputPath(paths.harness);
  let persisted: string | undefined;
  try { persisted = await readFile(output, "utf8"); } catch { /* missing output */ }
  if (persisted === content) return { outcome: "success", unchanged: true, path: output, source_digest: artifact.source_digest };
  await applyMutation(paths.root, [{ path: output, content }], (overlay) => {
    const staged = overlay.get(output);
    if (staged === undefined) throw new HarnessError("graph artifact staging content is missing", "invalid");
    const parsed: GraphArtifact = JSON.parse(staged);
    serializeGraphArtifact(parsed);
  });
  return { outcome: "success", unchanged: false, path: output, source_digest: artifact.source_digest };
}
