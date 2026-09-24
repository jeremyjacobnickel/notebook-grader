import * as path from "path";
import * as vscode from "vscode";
import { state } from "./state";
import { Cell, extractCode, readCells } from "./notebook";
import { notebookFile } from "./taskSource";

export function taskDirectory(): string | undefined {
  if (state.taskDir) { return state.taskDir; }
  const notebook = vscode.window.activeNotebookEditor?.notebook.uri.fsPath;
  return notebook?.endsWith(".ipynb") ? path.dirname(notebook) : undefined;
}

/** Zellen des aktuellen Notebooks nach dem Speichern. */
export async function currentCells(): Promise<Cell[]> {
  const folder = taskDirectory();
  if (!folder) { throw new Error("Bitte zuerst ein Praktikum laden oder sein Notebook öffnen."); }
  const file = await notebookFile(folder);

  // Offenes Notebook zuerst speichern, damit die JSON-Datei denselben Stand hat,
  // der anschließend an pytest und den KI-Tutor geht.
  const open = vscode.workspace.notebookDocuments.find(document => document.uri.fsPath === file);
  if (open?.isDirty) { await open.save(); }
  return readCells(file);
}

export async function currentCode(): Promise<string> {
  return extractCode(await currentCells());
}

export function activateTask(folder: string): void {
  state.taskDir = folder;
  state.praktikumId = path.basename(folder);
}
