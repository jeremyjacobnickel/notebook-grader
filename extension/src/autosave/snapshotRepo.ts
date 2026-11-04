// Das lokale Autosave-Repo: ein eigener Klon im Speicher der Extension.
//
// Es enthält nur normalisierte Notebooks, getrennt vom Workspace und von eigenen
// Git-Repos des Studenten. Commits entstehen immer lokal; sync() überträgt sie,
// sobald GitLab erreichbar ist. Kein Force-Push, kein Rebase (siehe DECISIONS.md).

import * as fs from "fs/promises";
import * as path from "path";
import { credentialEnv, describeGitError, GitResult, isSupportedGitVersion, parseGitVersion, runGit } from "./gitRunner";
import { HISTORY_FORMAT, parseHistory, SnapshotEntry } from "./history";

const BRANCH = "main";
const REMOTE_BRANCH = `refs/remotes/origin/${BRANCH}`;

export type SnapshotFile = { path: string; content: string };

/** Prüft die eingetragene Repository-URL; liefert eine Fehlermeldung oder undefined. */
export function checkRepositoryUrl(url: string): string | undefined {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return "Die Repository-URL ist keine gültige URL."; }
  if (parsed.protocol !== "https:") { return "Die Repository-URL muss mit https:// beginnen."; }
  if (parsed.username || parsed.password) { return "Die Repository-URL darf keine Zugangsdaten enthalten. Das Token gehört in »GitLab-Token eintragen«."; }
  return undefined;
}

export class SnapshotRepo {
  constructor(readonly dir: string, readonly remoteUrl: string) {}

  /** Legt das Repo bei Bedarf an; ein neues Gerät übernimmt die vorhandene Historie. */
  async ensure(token: string | undefined): Promise<void> {
    const version = parseGitVersion((await runGit(["--version"], process.cwd())).stdout);
    if (!version || !isSupportedGitVersion(version)) {
      throw new Error("Autosave benötigt Git ab Version 2.31.");
    }
    if (await exists(path.join(this.dir, ".git"))) {
      await this.git(["remote", "set-url", "origin", this.remoteUrl]);
      return;
    }
    await fs.mkdir(this.dir, { recursive: true });
    await this.git(["init", "--quiet", "-b", BRANCH]);
    await this.git(["remote", "add", "origin", this.remoteUrl]);
    await this.git(["config", "commit.gpgSign", "false"]);
    await this.git(["config", "tag.gpgSign", "false"]);
    if (!(await this.run(["config", "user.email"])).stdout.trim()) {
      await this.git(["config", "user.name", "Notebook Grader Autosave"]);
      await this.git(["config", "user.email", "autosave@notebook-grader.invalid"]);
    }
    // Offline ist kein Fehler: sync() führt die Historien später zusammen.
    if ((await this.run(["fetch", "--quiet", "origin"], token)).code === 0 && await this.hasRemoteBranch()) {
      await this.git(["checkout", "--quiet", "-B", BRANCH, REMOTE_BRANCH]);
    }
  }

  /** Schreibt die Dateien und committet; false, wenn sich nichts geändert hat. */
  async commit(files: SnapshotFile[], message: string, allowEmpty: boolean): Promise<boolean> {
    for (const file of files) {
      const target = this.safePath(file.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file.content, "utf8");
    }
    await this.git(["add", "--", ...files.map(file => file.path)]);
    const changed = (await this.run(["diff", "--cached", "--quiet"])).code !== 0;
    if (!changed && !allowEmpty) { return false; }
    // Nachricht über eine Datei, damit Zeilenumbrüche und Trailer sicher ankommen.
    const messageFile = path.join(this.dir, ".git", "AUTOSAVE_MSG");
    await fs.writeFile(messageFile, message, "utf8");
    try {
      await this.git(["commit", "--quiet", ...(changed ? [] : ["--allow-empty"]), "-F", messageFile]);
    } finally {
      await fs.rm(messageFile, { force: true });
    }
    return true;
  }

  async tag(name: string, message: string): Promise<void> {
    await this.git(["tag", "-a", name, "-m", message]);
  }

  /** Anzahl lokaler Commits, die GitLab noch nicht kennt. */
  async pendingCommits(): Promise<number> {
    return (await this.unpushed()).size;
  }

  /** Snapshots eines Praktikums, neueste zuerst; leer, solange noch nichts gesichert wurde. */
  async history(praktikumId: string): Promise<SnapshotEntry[]> {
    if (!await exists(path.join(this.dir, ".git")) || !await this.hasHead()) { return []; }
    const log = await this.git(["log", "--no-merges", `--format=${HISTORY_FORMAT}`, "HEAD"]);
    return parseHistory(log.stdout, await this.unpushed()).filter(entry => entry.praktikumId === praktikumId);
  }

  /** Inhalt einer Datei in einem Stand (z. B. "<sha>" oder "<sha>^"); undefined, wenn es sie dort nicht gibt. */
  async readFile(ref: string, file: string): Promise<string | undefined> {
    this.safePath(file);
    if (!/^[0-9a-f]{7,64}\^?$/.test(ref)) { throw new Error(`Unzulässiger Stand: ${ref}`); }
    const result = await this.run(["show", `${ref}:${file}`]);
    return result.code === 0 ? result.stdout : undefined;
  }

  private async unpushed(): Promise<Set<string>> {
    if (!await this.hasHead()) { return new Set(); }
    const range = await this.hasRemoteBranch() ? `${REMOTE_BRANCH}..HEAD` : "HEAD";
    return new Set((await this.git(["rev-list", range])).stdout.split("\n").filter(Boolean));
  }

  private async hasHead(): Promise<boolean> {
    return (await this.run(["rev-parse", "--verify", "--quiet", "HEAD"])).code === 0;
  }

  /** Holt den Stand anderer Geräte, führt ihn bei Bedarf zusammen und pusht. */
  async sync(token: string | undefined): Promise<void> {
    await this.pull(token);
    await this.network(["push", "--quiet", "--follow-tags", "origin", `HEAD:refs/heads/${BRANCH}`], token);
  }

  /** Holt den Stand anderer Geräte und führt ihn bei Bedarf zusammen, ohne zu pushen. */
  async pull(token: string | undefined): Promise<void> {
    await this.network(["fetch", "--quiet", "origin"], token);
    if (await this.hasRemoteBranch() && (await this.run(["merge-base", "--is-ancestor", REMOTE_BRANCH, "HEAD"])).code !== 0) {
      const merge = await this.run(["merge", "--quiet", "--no-edit", "--allow-unrelated-histories", "-X", "ours",
        "-m", "Stand eines anderen Geräts zusammengeführt", REMOTE_BRANCH]);
      if (merge.code !== 0) {
        await this.run(["merge", "--abort"]);
        throw new Error(`Zusammenführen mit dem GitLab-Stand fehlgeschlagen: ${describeGitError(merge.stderr)}`);
      }
    }
  }

  private async hasRemoteBranch(): Promise<boolean> {
    return (await this.run(["rev-parse", "--verify", "--quiet", REMOTE_BRANCH])).code === 0;
  }

  /** Nur relative Pfade innerhalb des Repos, nie in .git hinein. */
  private safePath(relative: string): string {
    const target = path.resolve(this.dir, relative);
    const inside = path.relative(this.dir, target);
    if (!inside || inside.startsWith("..") || path.isAbsolute(inside) || inside.split(path.sep).includes(".git")) {
      throw new Error(`Unzulässiger Pfad im Autosave-Repo: ${relative}`);
    }
    return target;
  }

  private async network(args: string[], token: string | undefined): Promise<void> {
    const result = await this.run(args, token);
    if (result.code !== 0) { throw new Error(describeGitError(result.stderr)); }
  }

  private async git(args: string[]): Promise<GitResult> {
    const result = await this.run(args);
    if (result.code !== 0) { throw new Error(`git ${args[0]}: ${describeGitError(result.stderr)}`); }
    return result;
  }

  private run(args: string[], token?: string): Promise<GitResult> {
    return runGit(args, this.dir, credentialEnv(token));
  }
}

async function exists(file: string): Promise<boolean> {
  return fs.stat(file).then(() => true, () => false);
}
