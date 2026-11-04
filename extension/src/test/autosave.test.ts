import { after, test } from "node:test";
import * as assert from "node:assert/strict";
import { execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { allowsEmptyCommit, commitMessage, submissionTag } from "../autosave/messages";
import { stripNotebook } from "../autosave/notebookSnapshot";
import { credentialEnv, describeGitError, isSupportedGitVersion, parseGitVersion, runGit } from "../autosave/gitRunner";
import { checkRepositoryUrl, SnapshotRepo } from "../autosave/snapshotRepo";
import { describeEntry } from "../autosave/history";

// Eigene Git-Konfiguration des Rechners (Identität, Signieren, Helper) darf die Tests nicht beeinflussen.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "autosave-test-"));
fs.writeFileSync(path.join(root, "gitconfig"), "");
process.env.GIT_CONFIG_GLOBAL = path.join(root, "gitconfig");
process.env.GIT_CONFIG_NOSYSTEM = "1";
after(() => fs.rmSync(root, { recursive: true, force: true }));

const notebook = (source: string) => JSON.stringify({
  cells: [
    { cell_type: "markdown", metadata: { tags: ["role:prompt", "task:1"] }, source: ["## 1. Aufgabe"] },
    { cell_type: "code", execution_count: 7, metadata: { tags: ["role:answer", "task:1"], execution: { "iopub.status.busy": "x" } },
      outputs: [{ output_type: "display_data", data: { "image/png": "AAAA" } }], source: [source] },
  ],
  metadata: { kernelspec: { name: "python3" }, widgets: { state: {} } },
  nbformat: 4, nbformat_minor: 5,
});

async function bareRemote(name: string): Promise<string> {
  const dir = path.join(root, name);
  fs.mkdirSync(dir);
  await runGit(["init", "--quiet", "--bare", "-b", "main"], dir);
  return dir;
}

async function remoteLog(remote: string): Promise<string[]> {
  return (await runGit(["log", "--format=%s", "main"], remote)).stdout.trim().split("\n");
}

async function remoteFile(remote: string, file: string): Promise<string> {
  return (await runGit(["show", `main:${file}`], remote)).stdout;
}

test("Snapshot entfernt Ausgaben und Laufzeitdaten, behält Tags und Code", () => {
  const stripped = JSON.parse(stripNotebook(notebook("x = 1")));
  const code = stripped.cells[1];
  assert.deepEqual(code.outputs, []);
  assert.equal(code.execution_count, null);
  assert.deepEqual(code.metadata, { tags: ["role:answer", "task:1"] });
  assert.deepEqual(code.source, ["x = 1"]);
  assert.equal(stripped.metadata.widgets, undefined);
  assert.deepEqual(stripped.metadata.kernelspec, { name: "python3" });
  assert.equal(stripNotebook(notebook("x = 1")), stripNotebook(notebook("x = 1")));
  assert.throws(() => stripNotebook("{}"));
});

test("Commit-Nachrichten tragen maschinenlesbare Trailer", () => {
  assert.equal(commitMessage({ reason: "tests", praktikumId: "4_praktikum", tests: { passed: 5, total: 7 } }),
    "Testlauf 4_praktikum: 5/7\n\nPraktikum: 4_praktikum\nAnlass: tests\nTests: 5/7\n");
  assert.match(commitMessage({ reason: "tests", praktikumId: "4_praktikum", subtask: "2", tests: { passed: 3, total: 3 } }),
    /^Teilaufgabe 2 geprüft \(4_praktikum\): 3\/3\n[\s\S]*Teilaufgabe: 2\n$/);
  assert.equal(commitMessage({ reason: "interval", praktikumId: "1_praktikum" }),
    "Autosave 1_praktikum\n\nPraktikum: 1_praktikum\nAnlass: interval\n");
  assert.equal(allowsEmptyCommit("interval"), false);
  assert.equal(allowsEmptyCommit("submit"), true);
  assert.equal(submissionTag("4_praktikum", new Date("2026-11-04T14:32:05Z")), "abgabe/4_praktikum/20261104-143205");
});

test("Git-Version, URL-Prüfung und Fehlermeldungen", () => {
  assert.deepEqual(parseGitVersion("git version 2.39.5 (Apple Git-154)"), [2, 39]);
  assert.equal(isSupportedGitVersion([2, 31]), true);
  assert.equal(isSupportedGitVersion([2, 30]), false);
  assert.equal(isSupportedGitVersion([3, 0]), true);
  assert.equal(checkRepositoryUrl("https://gitlab.com/name/praktika.git"), undefined);
  assert.match(checkRepositoryUrl("http://gitlab.com/name/praktika.git") ?? "", /https/);
  assert.match(checkRepositoryUrl("https://name:glpat-geheim@gitlab.com/x.git") ?? "", /Zugangsdaten/);
  assert.match(describeGitError("remote: HTTP Basic: Access denied\nfatal: Authentication failed"), /Token/);
  assert.match(describeGitError("fatal: unable to access: Could not resolve host: gitlab.com"), /offline/);
});

test("Credential-Helper liefert das Token nur über die Umgebung", async () => {
  const env = credentialEnv("glpat-test123");
  assert.ok(!Object.entries(env).some(([key, value]) => key !== "NOTEBOOK_GRADER_GIT_TOKEN" && value?.includes("glpat-test123")));
  const dir = path.join(root, "credential");
  fs.mkdirSync(dir);
  const input = "protocol=https\nhost=gitlab.example.org\n\n";
  const filled = await new Promise<string>((resolve, reject) => {
    const child = execFile("git", ["credential", "fill"],
      { cwd: dir, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", ...env } },
      (error: Error | null, stdout: string) => error ? reject(error) : resolve(stdout));
    child.stdin?.end(input);
  });
  assert.match(filled, /^username=oauth2$/m);
  assert.match(filled, /^password=glpat-test123$/m);
});

test("Snapshots werden nur bei Änderung committet, Testläufe und Abgaben immer; Tags werden gepusht", async () => {
  const remote = await bareRemote("remote-basic");
  const repo = new SnapshotRepo(path.join(root, "device-basic"), remote);
  await repo.ensure(undefined);
  const file = (source: string) => [{ path: "4_praktikum/4_praktikum.ipynb", content: stripNotebook(notebook(source)) }];

  assert.equal(await repo.commit(file("x = 1"), "Ausgangsstand", false), true);
  assert.equal(await repo.commit(file("x = 1"), "Autosave", false), false);
  assert.equal(await repo.commit(file("x = 1"), "Testlauf", true), true);
  await repo.tag("abgabe/4_praktikum/20261104-143205", "Abgabe");
  assert.equal(await repo.pendingCommits(), 2);
  await repo.sync(undefined);
  assert.equal(await repo.pendingCommits(), 0);

  assert.deepEqual(await remoteLog(remote), ["Testlauf", "Ausgangsstand"]);
  assert.match((await runGit(["tag", "--list"], remote)).stdout, /abgabe\/4_praktikum\/20261104-143205/);
  await assert.rejects(repo.commit([{ path: "../ausserhalb.txt", content: "x" }], "x", false), /Unzulässiger Pfad/);
  await assert.rejects(repo.commit([{ path: ".git/config", content: "x" }], "x", false), /Unzulässiger Pfad/);
});

test("Zwei Geräte: neues Gerät übernimmt die Historie, parallele Stände werden ohne Force-Push zusammengeführt", async () => {
  const remote = await bareRemote("remote-devices");
  const labor = new SnapshotRepo(path.join(root, "labor"), remote);
  await labor.ensure(undefined);
  await labor.commit([{ path: "p/a.ipynb", content: "labor 1\n" }], "Labor 1", false);
  await labor.sync(undefined);

  const zuhause = new SnapshotRepo(path.join(root, "zuhause"), remote);
  await zuhause.ensure(undefined);
  assert.equal(await zuhause.pendingCommits(), 0);
  await zuhause.commit([{ path: "p/a.ipynb", content: "zuhause\n" }], "Zuhause", false);
  await labor.commit([{ path: "p/a.ipynb", content: "labor 2\n" }], "Labor 2", false);
  await labor.tag("abgabe/p/1", "Abgabe Labor");
  await labor.sync(undefined);
  await zuhause.sync(undefined);

  const log = await remoteLog(remote);
  assert.equal(log[0], "Stand eines anderen Geräts zusammengeführt");
  assert.ok(["Labor 1", "Labor 2", "Zuhause"].every(subject => log.includes(subject)));
  assert.equal(await remoteFile(remote, "p/a.ipynb"), "zuhause\n");
  // Das Abgabe-Tag zeigt weiterhin auf den unveränderten Commit.
  assert.equal((await runGit(["log", "-1", "--format=%s", "abgabe/p/1"], remote)).stdout.trim(), "Labor 2");
});

test("Offline begonnenes Gerät wird später mit vorhandener Historie zusammengeführt", async () => {
  const remotePath = path.join(root, "remote-later");
  const offline = new SnapshotRepo(path.join(root, "offline"), remotePath);
  await offline.ensure(undefined);
  await offline.commit([{ path: "p/a.ipynb", content: "offline\n" }], "Offline", false);
  await assert.rejects(offline.sync(undefined));
  assert.equal(await offline.pendingCommits(), 1);

  await bareRemote("remote-later");
  const other = new SnapshotRepo(path.join(root, "other"), remotePath);
  await other.ensure(undefined);
  await other.commit([{ path: "p/a.ipynb", content: "anderes Gerät\n" }], "Anderes Gerät", false);
  await other.sync(undefined);

  await offline.sync(undefined);
  const log = await remoteLog(remotePath);
  assert.ok(log.includes("Offline") && log.includes("Anderes Gerät"));
  assert.equal(await remoteFile(remotePath, "p/a.ipynb"), "offline\n");
});

test("Verlauf zeigt nur Snapshots des Praktikums, neueste zuerst, mit Tests, Tags und Übertragungsstatus", async () => {
  const remote = await bareRemote("remote-history");
  const repo = new SnapshotRepo(path.join(root, "device-history"), remote);
  await repo.ensure(undefined);
  assert.deepEqual(await repo.history("4_praktikum"), []);
  const nb = "4_praktikum/4_praktikum.ipynb";
  await repo.commit([{ path: nb, content: "v1\n" }], commitMessage({ reason: "load", praktikumId: "4_praktikum" }), false);
  await repo.commit([{ path: "1_praktikum/1.ipynb", content: "x\n" }], commitMessage({ reason: "load", praktikumId: "1_praktikum" }), false);
  await repo.sync(undefined);
  await repo.commit([{ path: nb, content: "v2\n" }],
    commitMessage({ reason: "tests", praktikumId: "4_praktikum", subtask: "2", tests: { passed: 3, total: 3 } }), true);
  await repo.commit([{ path: nb, content: "v2\n" }],
    commitMessage({ reason: "submit", praktikumId: "4_praktikum", tests: { passed: 6, total: 7 } }), true);
  await repo.tag("abgabe/4_praktikum/1", "Abgabe");

  const history = await repo.history("4_praktikum");
  assert.deepEqual(history.map(entry => [entry.reason, entry.tests, entry.subtask, entry.pushed]),
    [["submit", "6/7", "", false], ["tests", "3/3", "2", false], ["load", "", "", true]]);
  assert.deepEqual(history[0].tags, ["abgabe/4_praktikum/1"]);

  assert.equal(await repo.readFile(history[1].sha, nb), "v2\n");
  assert.equal(await repo.readFile(`${history[1].sha}^`, nb), "v1\n");
  assert.equal(await repo.readFile(`${history[2].sha}^`, nb), undefined);
  await assert.rejects(repo.readFile("HEAD; rm -rf /", nb), /Unzulässiger Stand/);
  await assert.rejects(repo.readFile(history[0].sha, "../x"), /Unzulässiger Pfad/);
});

test("Verlaufseinträge werden mit Uhrzeit, Anlass, Ergebnis und Status beschriftet", () => {
  const entry = { sha: "a", date: new Date(2026, 10, 4, 14, 32), subject: "", praktikumId: "4_praktikum",
    reason: "tests" as const, tests: "5/7", subtask: "", restoredFrom: "", tags: [], pushed: true };
  assert.deepEqual(describeEntry(entry, new Date(2026, 10, 4, 18, 0)), { label: "14:32", description: "Testlauf · 5/7" });
  assert.deepEqual(describeEntry({ ...entry, subtask: "2c", pushed: false }, new Date(2026, 10, 5, 9, 0)),
    { label: "04.11. 14:32", description: "Teilaufgabe 2c · 5/7 · nur lokal" });
  assert.equal(describeEntry({ ...entry, reason: "interval", tests: "" }, entry.date).description, "Autosave");
});

test("Wiederherstellung wird als eigener Schritt mit Herkunft protokolliert", () => {
  const message = commitMessage({ reason: "restore", praktikumId: "4_praktikum", restoredFrom: "0123456789abcdef" });
  assert.equal(message, "Stand 01234567 wiederhergestellt (4_praktikum)\n\n"
    + "Praktikum: 4_praktikum\nAnlass: restore\nWiederhergestellt: 0123456789abcdef\n");
  assert.equal(allowsEmptyCommit("restore"), true);
});

test("Zweites Gerät holt Stände ohne Push und kann sie lesen; Herkunft steht im Verlauf", async () => {
  const remote = await bareRemote("remote-restore");
  const nb = "4_praktikum/4_praktikum.ipynb";
  const labor = new SnapshotRepo(path.join(root, "labor-restore"), remote);
  await labor.ensure(undefined);
  await labor.commit([{ path: nb, content: "labor\n" }], commitMessage({ reason: "load", praktikumId: "4_praktikum" }), false);
  await labor.sync(undefined);

  const zuhause = new SnapshotRepo(path.join(root, "zuhause-restore"), remote);
  await zuhause.ensure(undefined);
  await labor.commit([{ path: nb, content: "labor weiter\n" }],
    commitMessage({ reason: "tests", praktikumId: "4_praktikum", tests: { passed: 5, total: 7 } }), true);
  await labor.sync(undefined);
  assert.equal((await zuhause.history("4_praktikum")).length, 1);

  await zuhause.pull(undefined);
  const history = await zuhause.history("4_praktikum");
  assert.deepEqual(history.map(entry => entry.reason), ["tests", "load"]);
  assert.equal(await zuhause.readFile(history[0].sha, nb), "labor weiter\n");
  assert.equal(await zuhause.pendingCommits(), 0);

  await zuhause.commit([{ path: nb, content: "labor weiter\n" }],
    commitMessage({ reason: "restore", praktikumId: "4_praktikum", restoredFrom: history[0].sha }), true);
  const restored = (await zuhause.history("4_praktikum"))[0];
  assert.equal(restored.reason, "restore");
  assert.equal(restored.restoredFrom, history[0].sha);
  assert.equal(describeEntry(restored, restored.date).description, "Wiederhergestellt · nur lokal");
});
