import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

test("package boundary excludes forbidden MVP runtimes", async () => {
  const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8")) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const names = [...Object.keys(packageJson.dependencies), ...Object.keys(packageJson.devDependencies)];
  for (const forbidden of ["sqlite", "better-sqlite3", "rust", "graphify", "@modelcontextprotocol/sdk"]) {
    assert.equal(names.some((name) => name.includes(forbidden)), false, `forbidden dependency: ${forbidden}`);
  }
});

test("root instructions stay short and route to canonical docs", async () => {
  for (const file of ["AGENTS.md", "CLAUDE.md"]) {
    const content = await readFile(join(process.cwd(), file), "utf8");
    assert.ok(content.split("\n").length <= 10, `${file} must remain a short router`);
    assert.match(content, /docs\/harness\/(?:index|workflows)/);
  }
});

test("package allowlist ships runtime code without compiled tests", async () => {
  const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8")) as { files: string[]; bin: Record<string, string> };
  assert.ok(packageJson.files.includes("dist/src"));
  assert.equal(packageJson.files.includes("dist"), false);
  assert.equal(packageJson.bin.harness, "dist/src/cli/bin.js");
});
