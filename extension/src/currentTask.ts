import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { state } from "./state";
import { solutionFiles } from "./taskSource";

export function taskDirectory(): string | undefined {
  if (state.taskDir) { return state.taskDir; }
  const file = vscode.window.activeTextEditor?.document.uri.fsPath;
  return file?.endsWith(".py") ? path.dirname(file) : undefined;
}

export async function currentCode(): Promise<string> {
  const folder = taskDirectory();
  if (!folder) { throw new Error("Bitte zuerst ein Praktikum laden oder seine Python-Datei öffnen."); }
  const files = await solutionFiles(folder);
  if (!files.length) { throw new Error("Keine Praktikums-Datei gefunden."); }
  const contents = await Promise.all(files.map(async file => {
    const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === file);
    const content = document ? document.getText() : await fs.readFile(file, "utf8");
    return files.length === 1 ? content : `# Datei: ${path.basename(file)}\n${content}`;
  }));
  return contents.join("\n\n");
}

export function activateTask(folder: string): void {
  state.taskDir = folder;
  state.praktikumId = path.basename(folder);
}
