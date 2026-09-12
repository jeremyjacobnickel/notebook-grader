// Command: Praktikum aus der Aufgaben-Quelle in den Workspace laden.

import * as path from "path";
import * as fs from "fs/promises";
import * as vscode from "vscode";
import { getConfig } from "../config";
import { state } from "../state";
import { copyTask, listTaskIds } from "../taskSource";

export async function loadPraktikum(): Promise<void> {
  if (state.busy) { return; }
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      "Bitte öffne zuerst einen Ordner (Datei → Ordner öffnen), " +
        "in den das Praktikum geladen werden soll."
    );
    return;
  }
  const workspaceRoot = workspaceFolder.uri.fsPath;

  // Quelle: Einstellung, sonst der tasks/-Ordner im Workspace.
  // Relative Pfade beziehen sich auf den Workspace.
  const configured = getConfig().tasksSource;
  const sourceDir = configured
    ? path.resolve(workspaceRoot, configured)
    : path.join(workspaceRoot, "tasks");

  let taskIds: string[];
  try {
    taskIds = await listTaskIds(sourceDir);
  } catch {
    vscode.window.showErrorMessage(
      `Der Aufgaben-Ordner wurde nicht gefunden: ${sourceDir}. ` +
        "Prüfe die Einstellung notebookGrader.tasksSource."
    );
    return;
  }
  if (taskIds.length === 0) {
    vscode.window.showWarningMessage(
      `Im Aufgaben-Ordner liegen keine Praktika: ${sourceDir}`
    );
    return;
  }

  const id = await vscode.window.showQuickPick(taskIds, {
    placeHolder: "Welches Praktikum möchtest du laden?",
  });
  if (!id) {
    return; // abgebrochen
  }

  const targetDir = path.join(workspaceRoot, id);
  try {
    const exists = await fs.stat(targetDir).then(() => true, () => false);
    // Vorhandene Bearbeitungen nur wieder öffnen, niemals mit dem Starter ersetzen.
    if (!exists) { await copyTask(sourceDir, id, targetDir); }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Das Praktikum konnte nicht kopiert werden: ${(error as Error).message}`
    );
    return;
  }

  // Neues Praktikum = alter Punktestand und Traceback sind hinfällig.
  state.praktikumId = id;
  state.taskDir = targetDir;
  state.lastResult = undefined;
  state.lastTraceback = "";
  state.lastSource = undefined;

  const mainFile = vscode.Uri.file(path.join(targetDir, `${id}.py`));
  try {
    await vscode.window.showTextDocument(mainFile);
  } catch {
    vscode.window.showWarningMessage(
      `Das Praktikum wurde geladen, aber ${id}.py wurde darin nicht gefunden.`
    );
  }
}
