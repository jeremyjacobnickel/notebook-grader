// Lädt ein Praktikum in den Arbeitsordner work/<id>/ des Workspace.
//
// Naht für später: listAvailableTasks() und copyTask() sind die Stellen,
// die auf einen Backend-Endpoint (Download statt lokaler Ordner)
// umgestellt werden können, ohne dass sich der Command ändert.

import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getTasksSource } from "../config";
import { state } from "../state";
import type { SidebarProvider } from "../sidebar/sidebarProvider";

export async function loadPraktikum(sidebar: SidebarProvider): Promise<void> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    void vscode.window.showErrorMessage(
      "Notebook Grader: Bitte zuerst einen Ordner öffnen."
    );
    return;
  }
  const workspaceRoot = workspace.uri.fsPath;

  const sourceDir = resolveTasksSource(workspaceRoot);
  const ids = await listAvailableTasks(sourceDir);
  if (ids.length === 0) {
    void vscode.window.showErrorMessage(
      `Notebook Grader: Keine Aufgaben in "${sourceDir}" gefunden. ` +
        "Ordner anlegen oder die Einstellung notebookGrader.tasksSource setzen."
    );
    return;
  }

  const id = await vscode.window.showQuickPick(ids, {
    placeHolder: "Welches Praktikum laden?",
  });
  if (!id) {
    return; // abgebrochen
  }

  const targetDir = path.join(workspaceRoot, "work", id);
  const result = await copyTask(path.join(sourceDir, id), targetDir);
  if (result === "existing") {
    // Nicht überschreiben — sonst wären Änderungen des Studierenden weg
    void vscode.window.showInformationMessage(
      `Notebook Grader: "${id}" ist schon im Arbeitsordner — vorhandener Stand wird weiterverwendet.`
    );
  }

  state.praktikumId = id;
  state.taskDir = targetDir;
  sidebar.refresh();

  await openMainFile(targetDir, id);
}

function resolveTasksSource(workspaceRoot: string): string {
  const setting = getTasksSource();
  if (!setting) {
    return path.join(workspaceRoot, "tasks");
  }
  return path.isAbsolute(setting)
    ? setting
    : path.join(workspaceRoot, setting);
}

async function listAvailableTasks(sourceDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return []; // Ordner existiert nicht
  }
}

async function copyTask(
  sourceDir: string,
  targetDir: string
): Promise<"copied" | "existing"> {
  try {
    await fs.stat(targetDir);
    return "existing";
  } catch {
    // Zielordner existiert noch nicht — gut, dann kopieren
  }
  await fs.cp(sourceDir, targetDir, { recursive: true });
  return "copied";
}

async function openMainFile(targetDir: string, id: string): Promise<void> {
  const mainFile = await findMainFile(targetDir, id);
  if (!mainFile) {
    void vscode.window.showWarningMessage(
      `Notebook Grader: In der Aufgabe fehlt ${id}.py bzw. aufgabe_*.py.`
    );
    return;
  }
  const doc = await vscode.workspace.openTextDocument(mainFile);
  await vscode.window.showTextDocument(doc);
}

// Bevorzugt <id>.py; sonst die erste Aufgaben-Datei (aufgabe_1.py, ...),
// wie sie der Konverter grader/task_exporter.py erzeugt.
export async function findMainFile(
  targetDir: string,
  id: string
): Promise<string | undefined> {
  const idFile = path.join(targetDir, `${id}.py`);
  try {
    await fs.stat(idFile);
    return idFile;
  } catch {
    // weiter mit aufgabe_*.py
  }
  try {
    const entries = await fs.readdir(targetDir);
    const aufgaben = entries
      .filter((name) => /^aufgabe_\d+\.py$/.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (aufgaben.length > 0) {
      return path.join(targetDir, aufgaben[0]);
    }
  } catch {
    // Ordner nicht lesbar -- dann gibt es keine Hauptdatei
  }
  return undefined;
}
