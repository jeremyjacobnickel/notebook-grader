import { test } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { copyTask } from "../taskSource";

test("erneutes Kopieren überschreibt keine Bearbeitung", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "grader-copy-"));
  try {
    await fs.mkdir(path.join(temp, "source", "task"), {recursive: true});
    await fs.writeFile(path.join(temp, "source", "task", "task.py"), "starter");
    await copyTask(path.join(temp, "source"), "task", path.join(temp, "target"));
    await fs.writeFile(path.join(temp, "target", "task.py"), "student work");
    await assert.rejects(copyTask(path.join(temp, "source"), "task", path.join(temp, "target")));
    assert.equal(await fs.readFile(path.join(temp, "target", "task.py"), "utf8"), "student work");
  } finally { await fs.rm(temp, {recursive: true, force: true}); }
});
