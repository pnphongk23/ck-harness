import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { EXIT_CODES, runCli } from "../src/cli/index.js";

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-graph-cli-"));
  await mkdir(join(root, "docs", "harness", "notes"), { recursive: true });
  await writeFile(join(root, "docs", "harness", "index.md"), "# index\n");
  await writeFile(join(root, "docs", "harness", "notes", "a.md"), "# Alpha\nalpha retrieval\n[[b]]\n");
  await writeFile(join(root, "docs", "harness", "notes", "b.md"), "# Beta\nbeta retrieval\n");
  return root;
}

async function invoke(args: string[], root: string): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const code = await runCli(args, { cwd: root, stdout: (value) => { stdout += value; }, stderr: (value) => { stderr += value; } });
  return { code, stdout, stderr };
}

test("built-in graph CLI builds, checks, searches, and traverses offline", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const built = await invoke(["graph", "build", "--workspace", root, "--json"], root);
  assert.equal(built.code, EXIT_CODES.success, built.stderr);
  const builtPayload = JSON.parse(built.stdout) as { ok: boolean; data: { path: string } };
  assert.equal(builtPayload.ok, true);
  assert.match(builtPayload.data.path, /graph-out\/retrieval-index\.json$/);
  const checked = await invoke(["graph", "check", "--workspace", root, "--json"], root);
  assert.equal(checked.code, EXIT_CODES.success, checked.stderr);
  assert.equal((JSON.parse(checked.stdout) as { data: { fresh: boolean } }).data.fresh, true);
  const searched = await invoke(["graph", "search", "alpha retrieval", "--workspace", root, "--json"], root);
  assert.equal(searched.code, EXIT_CODES.success, searched.stderr);
  assert.equal((JSON.parse(searched.stdout) as { data: { results: { id: string }[] } }).data.results[0]?.id, "docs/harness/notes/a.md");
  const related = await invoke(["graph", "related", "docs/harness/notes/a.md", "--direction", "out", "--workspace", root, "--json"], root);
  assert.equal(related.code, EXIT_CODES.success, related.stderr);
  assert.equal((JSON.parse(related.stdout) as { data: { results: { id: string }[] } }).data.results[0]?.id, "docs/harness/notes/b.md");
  const obsolete = await invoke(["graph", "build", "--allow-external", "--workspace", root, "--json"], root);
  assert.equal(obsolete.code, EXIT_CODES.usage);
});

test("graph check reports stale output without invalidating canonical files", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await invoke(["graph", "build", "--workspace", root], root);
  const source = join(root, "docs", "harness", "notes", "a.md");
  await writeFile(source, `${await readFile(source, "utf8")}changed\n`);
  const checked = await invoke(["graph", "check", "--workspace", root, "--json"], root);
  assert.equal(checked.code, EXIT_CODES.success);
  const payload = JSON.parse(checked.stdout) as { data: { outcome: string; reason: string } };
  assert.equal(payload.data.outcome, "failure");
  assert.equal(payload.data.reason, "stale");
});
