// Einstiegspunkt: registriert die Commands, die Sidebar und das StatusBar-Item.

import * as vscode from "vscode";
import { hint } from "./commands/hint";
import { loadPraktikum } from "./commands/loadPraktikum";
import { runTests } from "./commands/runTests";
import { submit } from "./commands/submit";
import { ScoreViewProvider } from "./sidebar/scoreViewProvider";
import { createStatusBarItem } from "./statusBar";
import * as path from "path";
import { taskDirectory } from "./currentTask";
import { state } from "./state";
import { output } from "./output";

export function activate(context: vscode.ExtensionContext): void {
  const sidebar = new ScoreViewProvider();
  const statusBarItem = createStatusBarItem();

  context.subscriptions.push(
    statusBarItem, output,
    vscode.window.registerWebviewViewProvider(
      ScoreViewProvider.viewId,
      sidebar
    ),
    vscode.commands.registerCommand(
      "notebookGrader.loadPraktikum",
      async () => {
        if (state.busy) { return; }
        await loadPraktikum();
        sidebar.reset(); statusBarItem.hide();
      }
    ),
    vscode.commands.registerCommand("notebookGrader.runTests", () =>
      runTests(sidebar, statusBarItem)
    ),
    vscode.commands.registerCommand("notebookGrader.submit", submit),
    vscode.commands.registerCommand("notebookGrader.showOutput", () => output.show()),
    vscode.commands.registerCommand("notebookGrader.showAssignment", async () => {
      const folder = taskDirectory();
      if (!folder) { vscode.window.showErrorMessage("Bitte zuerst ein Praktikum laden."); return; }
      try { await vscode.commands.executeCommand("markdown.showPreview", vscode.Uri.file(path.join(folder, "AUFGABEN.md"))); }
      catch { vscode.window.showErrorMessage("Keine Aufgabenbeschreibung gefunden."); }
    }),
    vscode.workspace.onDidChangeTextDocument(event => {
      if (state.taskDir && event.document.uri.fsPath.startsWith(state.taskDir + path.sep) && !state.busy) {
        state.lastResult = undefined; state.lastSource = undefined; state.lastTraceback = "";
        sidebar.reset("Code geändert – bitte erneut testen."); statusBarItem.hide();
      }
    }),
    // hint steht nicht in der Command-Palette (package.json), sondern
    // wird vom Tipp-Button in der Sidebar ausgelöst.
    vscode.commands.registerCommand("notebookGrader.hint", () =>
      hint(sidebar)
    )
  );
}

export function deactivate(): void {}
