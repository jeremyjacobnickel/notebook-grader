import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { state } from "./state";

export function taskDirectory(): string | undefined {
  if (state.taskDir) { return state.taskDir; }
  const file = vscode.window.activeTextEditor?.document.uri.fsPath;
  return file?.endsWith(".py") ? path.dirname(file) : undefined;
}

export async function currentCode(): Promise<string> {
  const folder = taskDirectory();
  if (!folder) { throw new Error("Bitte zuerst ein Praktikum laden oder seine Python-Datei öffnen."); }
  const file = path.join(folder, `${path.basename(folder)}.py`);
  const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === file);
  return document ? document.getText() : fs.readFile(file, "utf8");
}

export function activateTask(folder: string): void {
  state.taskDir = folder;
  state.praktikumId = path.basename(folder);
}
