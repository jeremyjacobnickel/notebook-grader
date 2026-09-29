import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { notebookFile, readManifest } from "../taskSource";

async function fixture(): Promise<string> {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "grader-notebook-"));
  await fs.writeFile(path.join(temp, "manifest.json"), JSON.stringify({
    version: 1, id: "5_praktikum", notebook: "5_praktikum.ipynb"
  }));
  await fs.writeFile(path.join(temp, "5_praktikum.ipynb"), JSON.stringify({
    cells: [
      {cell_type: "markdown", metadata: {tags: ["role:prompt", "task:1", "part:a"]}, source: ["Aufgabe 1a"]},
      {cell_type: "code", metadata: {tags: ["role:setup"]}, source: ["import numpy as np\n"]},
      {cell_type: "code", metadata: {tags: ["role:answer", "task:1", "part:a"]}, source: ["def answer():\n", "    return 42\n"]},
      {cell_type: "code", metadata: {tags: ["role:scratch"]}, source: ["raise RuntimeError('nicht ausführen')\n"]},
      {cell_type: "markdown", metadata: {}, source: ["Erklärung"]}
    ], metadata: {}, nbformat: 4, nbformat_minor: 5
  }));
  return temp;
}

test("manifest legt genau das kanonische Notebook fest", async () => {
  const temp = await fixture();
  try {
    assert.equal((await readManifest(temp)).id, "5_praktikum");
    assert.equal(path.basename(await notebookFile(temp)), "5_praktikum.ipynb");
  } finally { await fs.rm(temp, {recursive: true, force: true}); }
});

test("ungültige Manifest-Pfade werden abgewiesen", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "grader-manifest-"));
  try {
    await fs.writeFile(path.join(temp, "manifest.json"), JSON.stringify({
      version: 1, id: "task", notebook: "../outside.ipynb"
    }));
    await assert.rejects(notebookFile(temp));
  } finally { await fs.rm(temp, {recursive: true, force: true}); }
});
