import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { ScriptDownload } from "../backend/client";
import { ensureScript } from "../script/scriptCache";

async function tempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "script-cache-"));
}

test("lädt das Skript einmal und nutzt danach die ETag-Prüfung", async () => {
  const directory = path.join(await tempDir(), "script");
  const seen: (string | undefined)[] = [];
  const fetcher = async (etag?: string): Promise<ScriptDownload> => {
    seen.push(etag);
    return etag === '"v1"' ? { unchanged: true } : { unchanged: false, bytes: Buffer.from("%PDF v1"), etag: '"v1"' };
  };

  const file = await ensureScript(directory, fetcher);
  assert.equal(await fs.readFile(file, "utf8"), "%PDF v1");
  assert.equal(await ensureScript(directory, fetcher), file);
  assert.deepEqual(seen, [undefined, '"v1"']);
});

test("ersetzt die Kopie, wenn das Backend ein neues Skript liefert", async () => {
  const directory = await tempDir();
  await ensureScript(directory, async () => ({ unchanged: false, bytes: Buffer.from("alt"), etag: '"a"' }));
  const file = await ensureScript(directory, async () => ({ unchanged: false, bytes: Buffer.from("neu"), etag: '"b"' }));
  assert.equal(await fs.readFile(file, "utf8"), "neu");
  assert.equal(await fs.readFile(path.join(directory, "skript.etag"), "utf8"), '"b"');
  assert.deepEqual((await fs.readdir(directory)).sort(), ["skript.etag", "skript.pdf"]);
});

test("ohne Verbindung wird die vorhandene Kopie genutzt, ohne Kopie gibt es einen Fehler", async () => {
  const directory = await tempDir();
  const offline = async (): Promise<ScriptDownload> => { throw new Error("offline"); };
  await assert.rejects(ensureScript(directory, offline), /offline/);

  await ensureScript(directory, async () => ({ unchanged: false, bytes: Buffer.from("%PDF"), etag: '"x"' }));
  const file = await ensureScript(directory, offline);
  assert.equal(await fs.readFile(file, "utf8"), "%PDF");
});
