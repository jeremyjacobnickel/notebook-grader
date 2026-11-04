// Seitenleiste „Autosave-Verlauf“: Snapshots des aktuellen Praktikums mit
// Vergleich zum vorherigen bzw. aktuellen Stand, Wiederherstellen und Knopf
// zum manuellen Sichern.

import * as path from "path";
import * as vscode from "vscode";
import { taskDirectory } from "../currentTask";
import { state } from "../state";
import { notebookFile } from "../taskSource";
import { describeEntry, SnapshotEntry } from "./history";
import { SnapshotRepo } from "./snapshotRepo";
import { SNAPSHOT_SCHEME, SnapshotFileSystem, snapshotUri } from "./snapshotFileSystem";

const ICONS: Record<string, string> = {
  load: "package", interval: "history", manual: "save", tests: "beaker", submit: "tag", restore: "discard",
};

export type HistorySource = {
  currentRepo(): SnapshotRepo | undefined;
  refreshFromRemote(interactive: boolean): Promise<void>;
  restore(entry: SnapshotEntry): Promise<void>;
  readonly onDidChange: vscode.Event<void>;
};

export function registerHistoryView(context: vscode.ExtensionContext, source: HistorySource): void {
  const provider = new HistoryProvider(source);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("notebookGrader.autosaveHistory", provider),
    vscode.workspace.registerFileSystemProvider(SNAPSHOT_SCHEME,
      new SnapshotFileSystem(() => source.currentRepo()), { isReadonly: true }),
    source.onDidChange(() => provider.refresh()),
    vscode.window.onDidChangeActiveNotebookEditor(() => provider.refresh()),
    // Aktualisieren holt auch Stände anderer Geräte von GitLab.
    vscode.commands.registerCommand("notebookGrader.autosaveRefresh", () => vscode.window.withProgress(
      { location: { viewId: "notebookGrader.autosaveHistory" } }, () => source.refreshFromRemote(true))),
    vscode.commands.registerCommand("notebookGrader.autosaveRestore", (entry: SnapshotEntry) =>
      source.restore(entry).catch(showError)),
    vscode.commands.registerCommand("notebookGrader.autosaveShowChanges", (entry: SnapshotEntry) =>
      showChanges(source, entry).catch(showError)),
    vscode.commands.registerCommand("notebookGrader.autosaveCompareWithCurrent", (entry: SnapshotEntry) =>
      compareWithCurrent(entry).catch(showError)),
  );
}

class HistoryProvider implements vscode.TreeDataProvider<SnapshotEntry> {
  private readonly changes = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changes.event;

  constructor(private readonly source: HistorySource) {}

  refresh(): void { this.changes.fire(); }

  async getChildren(element?: SnapshotEntry): Promise<SnapshotEntry[]> {
    const folder = state.taskDir ?? taskDirectory();
    const repo = this.source.currentRepo();
    if (element || !folder || !repo) { return []; }
    // Ein Fehler im Verlauf darf die Seitenleiste nicht stören; der Autosave meldet Fehler selbst.
    return repo.history(path.basename(folder)).catch(() => []);
  }

  getTreeItem(entry: SnapshotEntry): vscode.TreeItem {
    const { label, description } = describeEntry(entry, new Date());
    const item = new vscode.TreeItem(label);
    item.description = description;
    item.iconPath = new vscode.ThemeIcon(ICONS[entry.reason] ?? "git-commit");
    item.tooltip = [
      entry.subject,
      `${entry.date.toLocaleString("de-DE")} · ${entry.sha.slice(0, 8)}`,
      ...entry.tags.map(tag => `Tag: ${tag}`),
      ...(entry.restoredFrom ? [`Übernommen aus Stand ${entry.restoredFrom.slice(0, 8)}`] : []),
      entry.pushed ? "Auf GitLab übertragen." : "Nur lokal gesichert, noch nicht auf GitLab.",
      "Klicken: Änderungen dieses Schritts anzeigen.",
    ].join("\n");
    item.contextValue = "snapshot";
    item.command = { command: "notebookGrader.autosaveShowChanges", title: "Änderungen anzeigen", arguments: [entry] };
    return item;
  }
}

/** Pfad des Notebooks im Autosave-Repo und auf der Platte. */
async function notebookPaths(entry: SnapshotEntry): Promise<{ inRepo: string; onDisk: string }> {
  const folder = state.taskDir ?? taskDirectory();
  if (!folder) { throw new Error("Bitte zuerst ein Praktikum laden."); }
  const onDisk = await notebookFile(folder);
  return { inRepo: `${entry.praktikumId}/${path.basename(onDisk)}`, onDisk };
}

/** Vergleicht den Stand mit dem davor; beim ersten Stand wird er nur geöffnet. */
async function showChanges(source: HistorySource, entry: SnapshotEntry): Promise<void> {
  const { inRepo } = await notebookPaths(entry);
  const after = snapshotUri(entry.sha, inRepo);
  const repo = source.currentRepo();
  const hasBefore = repo && await repo.readFile(`${entry.sha}^`, inRepo) !== undefined;
  if (!hasBefore) {
    await vscode.window.showNotebookDocument(await vscode.workspace.openNotebookDocument(after));
    return;
  }
  const { label, description } = describeEntry(entry, new Date());
  await vscode.commands.executeCommand("vscode.diff", snapshotUri(`${entry.sha}^`, inRepo), after,
    `${path.basename(inRepo)} – ${label} ${description}`);
}

async function compareWithCurrent(entry: SnapshotEntry): Promise<void> {
  const { inRepo, onDisk } = await notebookPaths(entry);
  const { label } = describeEntry(entry, new Date());
  await vscode.commands.executeCommand("vscode.diff", snapshotUri(entry.sha, inRepo), vscode.Uri.file(onDisk),
    `${path.basename(inRepo)} – ${label} ↔ aktuell`);
}

function showError(error: unknown): void {
  vscode.window.showErrorMessage(`Autosave-Verlauf: ${(error as Error).message}`);
}
