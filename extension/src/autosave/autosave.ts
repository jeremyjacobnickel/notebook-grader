// Autosave: sichert den Arbeitsstand regelmäßig sowie bei Laden, Testlauf und
// Abgabe in das GitLab-Repo des Studenten und stellt frühere oder auf anderen
// Geräten gesicherte Stände wieder her. Fehler blockieren nie das Bearbeiten,
// Testen oder Abgeben; sie erscheinen nur in der Statusleiste und im Log.

import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { getConfig } from "../config";
import { taskDirectory } from "../currentTask";
import { state } from "../state";
import { notebookFile } from "../taskSource";
import { clearGitlabToken, getGitlabToken, promptGitlabToken } from "./credentials";
import { describeEntry, SnapshotEntry } from "./history";
import { allowsEmptyCommit, commitMessage, SnapshotEvent, submissionTag } from "./messages";
import { stripNotebook } from "./notebookSnapshot";
import { checkRepositoryUrl, SnapshotRepo } from "./snapshotRepo";
import { registerHistoryView } from "./historyView";

type SnapshotRequest = Omit<SnapshotEvent, "praktikumId">;
type Status = "idle" | "ok" | "pending" | "error";

let instance: Autosave | undefined;

/** Für Commands: reiht einen Snapshot ein, wartet nicht und wirft nie. */
export function recordSnapshot(request: SnapshotRequest): void {
  void instance?.record(request, false);
}

/** Beim ersten Laden eines Praktikums: vorhandenen GitLab-Stand anbieten; true = übernommen. */
export async function offerRemoteState(folder: string): Promise<boolean> {
  return instance ? instance.offerRemoteState(folder) : false;
}

export class Autosave implements vscode.Disposable {
  private readonly statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1);
  private readonly log = vscode.window.createOutputChannel("Notebook Grader – Autosave");
  private readonly repos = new Map<string, SnapshotRepo>();
  private readonly changed = new vscode.EventEmitter<void>();
  /** Nach jedem Git-Vorgang, z. B. für den Verlauf in der Seitenleiste. */
  readonly onDidChange = this.changed.event;
  private queue: Promise<unknown> = Promise.resolve();
  private timer: NodeJS.Timeout | undefined;
  private tokenHintShown = false;

  private constructor(private readonly context: vscode.ExtensionContext) {
    this.statusItem.name = "Notebook Grader Autosave";
    this.statusItem.command = "notebookGrader.autosaveNow";
  }

  static register(context: vscode.ExtensionContext): void {
    const autosave = new Autosave(context);
    instance = autosave;
    autosave.configure();
    registerHistoryView(context, autosave);
    context.subscriptions.push(
      autosave,
      vscode.commands.registerCommand("notebookGrader.autosaveOpenSettings", () =>
        vscode.commands.executeCommand("workbench.action.openSettings", "notebookGrader.autosave")),
      vscode.commands.registerCommand("notebookGrader.autosaveNow", () => autosave.record({ reason: "manual" }, true)),
      vscode.commands.registerCommand("notebookGrader.setGitlabToken", async () => {
        if (await promptGitlabToken(context.secrets) && getConfig().autosaveRepositoryUrl) {
          await autosave.record({ reason: "manual" }, true);
        }
      }),
      vscode.commands.registerCommand("notebookGrader.clearGitlabToken", async () => {
        await clearGitlabToken(context.secrets);
        vscode.window.showInformationMessage("GitLab-Token entfernt. Autosave sichert nur noch lokal.");
      }),
      vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration("notebookGrader.autosave")) { autosave.configure(); }
      })
    );
  }

  /** Sichert den aktuellen Stand; true, wenn er danach lokal im Verlauf steht. */
  record(request: SnapshotRequest, interactive: boolean, folder = state.taskDir ?? taskDirectory()): Promise<boolean> {
    if (!folder) {
      if (interactive) { vscode.window.showErrorMessage("Bitte zuerst ein Praktikum laden."); }
      return Promise.resolve(false);
    }
    const event: SnapshotEvent = { ...request, praktikumId: path.basename(folder) };
    return this.enqueue(() => this.run(event, folder, interactive)).catch(() => false);
  }

  /** Holt Stände anderer Geräte in den lokalen Verlauf (ohne den Arbeitsstand zu ändern). */
  refreshFromRemote(interactive: boolean): Promise<void> {
    return this.enqueue(async () => {
      const repo = this.currentRepo();
      const token = await getGitlabToken(this.context.secrets);
      if (!repo) { return; }
      if (!token) { if (interactive) { await this.offerToken(true); } return; }
      await repo.ensure(token);
      await repo.pull(token);
    }).catch(error => this.transferFailed((error as Error).message, interactive));
  }

  /** Stellt einen Stand aus dem Verlauf wieder her; der aktuelle Stand wird vorher gesichert. */
  async restore(entry: SnapshotEntry): Promise<void> {
    const folder = state.taskDir ?? taskDirectory();
    const repo = this.currentRepo();
    if (!folder || !repo) { vscode.window.showErrorMessage("Bitte zuerst ein Praktikum laden und den Autosave einrichten."); return; }
    const { label, description } = describeEntry(entry, new Date());
    const choice = await vscode.window.showWarningMessage(`Stand von ${label} wiederherstellen?`, {
      modal: true,
      detail: `${description}\n\nDein aktueller Stand wird vorher gesichert und bleibt im Verlauf. `
        + "Ausgaben sind nicht gesichert; führe die Zellen danach neu aus.",
    }, "Wiederherstellen");
    if (choice !== "Wiederherstellen") { return; }

    // Nie ungesichert überschreiben: ohne erfolgreichen Snapshot keine Wiederherstellung.
    if (!await this.record({ reason: "manual" }, false, folder)) {
      vscode.window.showErrorMessage("Der aktuelle Stand konnte nicht gesichert werden. Es wurde nichts wiederhergestellt.");
      return;
    }
    if (await this.applySnapshot(repo, entry.sha, folder)) {
      await this.record({ reason: "restore", restoredFrom: entry.sha }, false, folder);
      vscode.window.showInformationMessage(`Stand von ${label} wiederhergestellt. Bitte die Zellen neu ausführen.`);
    }
  }

  async offerRemoteState(folder: string): Promise<boolean> {
    const repo = this.currentRepo();
    if (!repo) { return false; }
    const latest = await this.enqueue(async () => {
      const token = await getGitlabToken(this.context.secrets);
      await repo.ensure(token);
      // Offline: Es zählt, was dieses Gerät schon kennt.
      if (token) { await repo.pull(token).catch(error => this.transferFailed((error as Error).message, false)); }
      return (await repo.history(path.basename(folder)))[0];
    }).catch(() => undefined);
    // Nur ein unbearbeiteter Ausgangsstand ist nichts, was sich zu übernehmen lohnt.
    if (!latest || latest.reason === "load") { return false; }

    const { label, description } = describeEntry(latest, new Date());
    const choice = await vscode.window.showInformationMessage(
      `Für ${path.basename(folder)} gibt es schon einen gesicherten Stand von ${label}. Übernehmen?`, {
        modal: true,
        detail: `${description}\n\nÜbernehmen setzt deine Bearbeitung auf diesem Gerät fort. `
          + "Neu beginnen startet mit dem leeren Aufgaben-Notebook; der gesicherte Stand bleibt im Verlauf.",
      }, "Übernehmen", "Neu beginnen");
    if (choice !== "Übernehmen" || !await this.applySnapshot(repo, latest.sha, folder)) { return false; }
    return this.record({ reason: "restore", restoredFrom: latest.sha }, false, folder);
  }

  /** Repo zur eingetragenen URL; undefined, solange der Autosave nicht eingerichtet ist. */
  currentRepo(): SnapshotRepo | undefined {
    const url = getConfig().autosaveRepositoryUrl;
    return url && !checkRepositoryUrl(url) ? this.repoFor(url) : undefined;
  }

  dispose(): void {
    if (this.timer) { clearInterval(this.timer); }
    this.statusItem.dispose();
    this.log.dispose();
    this.changed.dispose();
    if (instance === this) { instance = undefined; }
  }

  /** Git-Vorgänge nacheinander, damit sie sich nie überschneiden. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.then(() => this.changed.fire(), () => this.changed.fire());
    return result;
  }

  private configure(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
    const { autosaveRepositoryUrl, autosaveIntervalMinutes } = getConfig();
    // Steuert die Hinweise im leeren Verlauf (package.json, viewsWelcome).
    void vscode.commands.executeCommand("setContext", "notebookGrader.autosaveConfigured", Boolean(autosaveRepositoryUrl));
    this.changed.fire();
    if (!autosaveRepositoryUrl) { this.statusItem.hide(); return; }
    this.show("idle", "Autosave aktiv. Noch nichts gesichert.");
    this.timer = setInterval(() => {
      // Während eines Testlaufs speichert der Testlauf selbst einen Snapshot.
      if (!state.busy) { void this.record({ reason: "interval" }, false); }
    }, autosaveIntervalMinutes * 60_000);
    // Stände anderer Geräte im Verlauf zeigen.
    void this.refreshFromRemote(false);
  }

  private async run(event: SnapshotEvent, folder: string, interactive: boolean): Promise<boolean> {
    const url = getConfig().autosaveRepositoryUrl;
    if (!url) {
      if (interactive) { await this.askForRepositoryUrl(); }
      return false;
    }
    const urlError = checkRepositoryUrl(url);
    if (urlError) { this.fail(urlError, interactive); return false; }

    let repo: SnapshotRepo;
    let token: string | undefined;
    let committed = false;
    try {
      const file = await notebookFile(folder);
      const open = vscode.workspace.notebookDocuments.find(document => document.uri.fsPath === file);
      if (open?.isDirty) { await open.save(); }
      const content = stripNotebook(await fs.readFile(file, "utf8"));
      repo = this.repoFor(url);
      token = await getGitlabToken(this.context.secrets);
      await repo.ensure(token);
      const message = commitMessage(event);
      committed = await repo.commit([{ path: repoPath(event.praktikumId, file), content }],
        message, allowsEmptyCommit(event.reason));
      if (event.reason === "submit") { await repo.tag(submissionTag(event.praktikumId, new Date()), message); }
      if (committed) { this.log.appendLine(`${clock()} ${message.split("\n")[0]}`); }
    } catch (error) {
      // Stack nur ins Log (enthält Pfade, nie das Token), Meldung für den Studenten.
      this.log.appendLine(String((error as Error).stack ?? error));
      this.fail((error as Error).message, interactive);
      return false;
    }

    const saved = committed ? "Stand gesichert" : "Keine Änderungen seit der letzten Sicherung";
    if (!token) {
      this.show("pending", "Kein GitLab-Token eingetragen. Der Stand ist nur lokal gesichert.");
      if (interactive) { vscode.window.showInformationMessage(`Autosave: ${saved} (nur lokal).`); }
      void this.offerToken(interactive);
      return true;
    }
    try {
      if (await repo.pendingCommits() > 0) { await repo.sync(token); }
      this.show("ok", `Alles auf GitLab übertragen (${clock()}).`);
      if (interactive) { vscode.window.showInformationMessage(`Autosave: ${saved}, alles ist auf GitLab.`); }
    } catch (error) {
      this.transferFailed((error as Error).message, interactive);
    }
    return true;
  }

  /** Schreibt einen gesicherten Stand ins Notebook und lädt ein offenes Notebook neu. */
  private async applySnapshot(repo: SnapshotRepo, sha: string, folder: string): Promise<boolean> {
    try {
      const file = await notebookFile(folder);
      const content = await repo.readFile(sha, repoPath(path.basename(folder), file));
      if (content === undefined) { throw new Error("Der gesicherte Stand enthält dieses Notebook nicht."); }
      await fs.writeFile(file, content, "utf8");
      const open = vscode.workspace.notebookDocuments.find(document => document.uri.fsPath === file);
      if (open) {
        await vscode.window.showNotebookDocument(open);
        await vscode.commands.executeCommand("workbench.action.files.revert");
      }
      this.log.appendLine(`${clock()} Stand ${sha.slice(0, 8)} in ${path.basename(file)} übernommen`);
      return true;
    } catch (error) {
      this.fail(`Wiederherstellen fehlgeschlagen: ${(error as Error).message}`, true);
      return false;
    }
  }

  private repoFor(url: string): SnapshotRepo {
    let repo = this.repos.get(url);
    if (!repo) {
      const key = crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
      repo = new SnapshotRepo(path.join(this.context.globalStorageUri.fsPath, "autosave", key), url);
      this.repos.set(url, repo);
    }
    return repo;
  }

  private transferFailed(message: string, interactive: boolean): void {
    this.log.appendLine(`${clock()} Übertragung fehlgeschlagen: ${message}`);
    this.show("pending", `Lokal gesichert, Übertragung ausstehend: ${message}`);
    if (interactive) { vscode.window.showWarningMessage(`Autosave: ${message}`); }
  }

  private fail(message: string, interactive: boolean): void {
    this.log.appendLine(`${clock()} Fehler: ${message}`);
    this.show("error", message);
    if (interactive) { vscode.window.showErrorMessage(`Autosave: ${message}`); }
  }

  private show(status: Status, tooltip: string): void {
    const text = { idle: "$(cloud) Autosave", ok: `$(cloud-upload) Gesichert ${clock()}`,
      pending: "$(cloud) Nur lokal gesichert", error: "$(warning) Autosave" }[status];
    this.statusItem.text = text;
    this.statusItem.tooltip = `${tooltip}\nKlicken, um jetzt zu sichern.`;
    this.statusItem.backgroundColor = status === "error"
      ? new vscode.ThemeColor("statusBarItem.warningBackground") : undefined;
    this.statusItem.show();
  }

  private async offerToken(interactive: boolean): Promise<void> {
    if (this.tokenHintShown && !interactive) { return; }
    this.tokenHintShown = true;
    const choice = await vscode.window.showWarningMessage(
      "Autosave: Für die Übertragung auf GitLab fehlt ein Token. Bis dahin wird nur lokal gesichert.",
      "Token eintragen");
    if (choice) { await vscode.commands.executeCommand("notebookGrader.setGitlabToken"); }
  }

  private async askForRepositoryUrl(): Promise<void> {
    const choice = await vscode.window.showWarningMessage(
      "Autosave ist aus. Bitte die HTTPS-URL deines GitLab-Repos eintragen.", "Einstellungen öffnen");
    if (choice) {
      await vscode.commands.executeCommand("workbench.action.openSettings", "notebookGrader.autosave");
    }
  }
}

/** Pfad des Notebooks im Autosave-Repo: <praktikum-id>/<notebook>.ipynb */
function repoPath(praktikumId: string, notebook: string): string {
  return `${praktikumId}/${path.basename(notebook)}`;
}

function clock(): string {
  return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
